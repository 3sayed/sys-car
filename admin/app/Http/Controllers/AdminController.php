<?php

namespace App\Http\Controllers;

use App\Jobs\ImportCatalog;
use App\Jobs\ProcessSimulation;
use App\Services\Access;
use App\Services\CatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    private function result(Request $request, string $message)
    {
        return $request->expectsJson()
            ? response()->json(['message' => $message])
            : back()->with('status', $message);
    }

    public function login(Request $r)
    {
        $d = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        if (! Auth::attempt($d + ['status' => 'active'])) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }
        if (! $r->user()->hasRole('admin')) {
            Auth::logout();
            throw ValidationException::withMessages(['email' => 'Administrator access required.']);
        }
        $r->session()->regenerate();

        return redirect('/admin');
    }

    public function logout(Request $r)
    {
        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return redirect('/admin/login');
    }

    public function index(Request $r)
    {
        Access::admin($r->user());
        $stats = [];
        foreach (['parts', 'shops', 'vehicle_variants', 'part_requests', 'catalog_imports', 'simulation_jobs'] as $t) {
            $stats[$t] = DB::table($t)->count();
        }
        $data = ['stats' => $stats, 'parts' => DB::table('parts')->latest()->paginate(20), 'variants' => (new CatalogService)->variants()->get()];
        foreach (['shops', 'repair_procedures', 'catalog_imports', 'simulation_jobs', 'catalog_import_errors', 'simulation_models', 'catalog_sources', 'part_manufacturers', 'part_categories'] as $t) {
            $data[$t] = DB::table($t)->latest()->limit(100)->get();
        }

        return view('admin.index', $data);
    }

    public function source(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['name' => 'required|string|max:100', 'source_type' => 'required|in:csv,manual,licensed_model', 'license_reference' => 'required|string|max:255']);
        DB::table('catalog_sources')->insert($d + ['created_at' => now(), 'updated_at' => now()]);

        return $this->result($r, 'Source recorded.');
    }

    public function vehicle(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['make' => 'required|string|max:100', 'model' => 'required|string|max:100', 'year_from' => 'required|integer|between:1900,2100', 'year_to' => 'required|integer|gte:year_from|lte:2100', 'engine_code' => 'required|string|max:100', 'trim' => 'required|string|max:100', 'market' => 'required|string|max:100']);
        DB::transaction(function () use ($d) {
            DB::table('vehicle_makes')->insertOrIgnore(['name' => $d['make'], 'created_at' => now(), 'updated_at' => now()]);
            $make = DB::table('vehicle_makes')->where('name', $d['make'])->value('id');
            DB::table('vehicle_models')->insertOrIgnore(['make_id' => $make, 'name' => $d['model'], 'created_at' => now(), 'updated_at' => now()]);
            $model = DB::table('vehicle_models')->where('make_id', $make)->where('name', $d['model'])->value('id');
            unset($d['make'],$d['model']);
            DB::table('vehicle_variants')->insertOrIgnore($d + ['model_id' => $model, 'created_at' => now(), 'updated_at' => now()]);
        });

        return $this->result($r, 'Vehicle variant saved.');
    }

    public function taxonomy(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['type' => 'required|in:category,manufacturer', 'name' => 'required|string|max:100', 'parent_id' => 'nullable|integer|exists:part_categories,id']);
        $table = $d['type'] === 'category' ? 'part_categories' : 'part_manufacturers';
        $values = ['name' => $d['name'], 'created_at' => now(), 'updated_at' => now()];
        if ($d['type'] === 'category') {
            $values['parent_id'] = $d['parent_id'] ?? null;
        }
        DB::table($table)->insertOrIgnore($values);

        return $this->result($r, 'Catalog taxonomy saved.');
    }

    public function partImage(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['part_id' => 'required|integer|exists:parts,id', 'source_id' => 'required|integer|exists:catalog_sources,id', 'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120']);
        $path = $r->file('image')->store('part-images', config('marketplace.asset_disk'));
        DB::transaction(function () use ($d, $path) {
            $count = DB::table('part_images')->where('part_id', $d['part_id'])->count();
            DB::table('part_images')->insert(['part_id' => $d['part_id'], 'image_path' => $path, 'is_primary' => $count === 0, 'sort_order' => $count, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('media_assets')->insert(['file_path' => $path, 'media_type' => 'image', 'source_id' => $d['source_id'], 'license_reference' => DB::table('catalog_sources')->find($d['source_id'])->license_reference, 'created_at' => now(), 'updated_at' => now()]);
        });

        return $this->result($r, 'Part image uploaded with source attribution.');
    }

    public function import(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['source_id' => 'required|integer|exists:catalog_sources,id', 'file' => 'required|file|mimes:csv,txt|max:5120']);
        $id = DB::table('catalog_imports')->insertGetId(['source_id' => $d['source_id'], 'file_path' => $r->file('file')->store('imports', 'local'), 'created_at' => now(), 'updated_at' => now()]);
        ImportCatalog::dispatch($id);

        return $this->result($r, 'Import queued.');
    }

    public function part(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['manufacturer_id' => 'required|integer|exists:part_manufacturers,id', 'category_id' => 'required|integer|exists:part_categories,id', 'part_number' => 'required|string|max:100', 'name' => 'required|string|max:255', 'description' => 'nullable|string|max:5000', 'vehicle_variant_id' => 'required|integer|exists:vehicle_variants,id']);
        $normal = CatalogService::normalize($d['part_number']);
        abort_unless($normal, 422, 'Invalid part number.');
        DB::transaction(function () use ($d, $normal) {
            $variant = $d['vehicle_variant_id'];
            unset($d['vehicle_variant_id']);
            DB::table('parts')->updateOrInsert(['manufacturer_id' => $d['manufacturer_id'], 'normalized_part_number' => $normal], $d + ['created_at' => now(), 'updated_at' => now()]);
            $id = DB::table('parts')->where('manufacturer_id', $d['manufacturer_id'])->where('normalized_part_number', $normal)->value('id');
            DB::table('part_compatibility')->insertOrIgnore(['part_id' => $id, 'vehicle_variant_id' => $variant, 'created_at' => now(), 'updated_at' => now()]);
        });

        return $this->result($r, 'Part and fitment saved.');
    }

    public function shopStatus(Request $r, int $id)
    {
        Access::admin($r->user());
        $d = $r->validate(['status' => 'required|in:active,suspended']);
        DB::table('shops')->where('id', $id)->update($d + ['updated_at' => now()]);

        return $this->result($r, 'Supplier status updated.');
    }

    public function uploadModel(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['name' => 'required|string|max:100', 'source_id' => 'required|integer|exists:catalog_sources,id', 'model' => 'required|file|max:10240', 'mesh_names' => 'required|string|max:1000']);
        abort_unless(substr(file_get_contents($r->file('model')->getRealPath()), 0, 4) === 'glTF', 422, 'Upload a GLB model.');
        $names = array_values(array_filter(array_map('trim', explode(',', $d['mesh_names']))));
        abort_unless(count($names) > 0 && count($names) === count(array_unique($names)), 422, 'Mesh names must be unique.');
        $path = $r->file('model')->storeAs('models', Str::uuid().'.glb', config('marketplace.asset_disk'));
        DB::transaction(function () use ($d, $path, $names) {
            $id = DB::table('simulation_models')->insertGetId(['name' => $d['name'], 'model_file_path' => $path, 'created_at' => now(), 'updated_at' => now()]);
            foreach ($names as $name) {
                DB::table('simulation_components')->insert(['simulation_model_id' => $id, 'mesh_name' => $name, 'created_at' => now(), 'updated_at' => now()]);
            }
            DB::table('media_assets')->insert(['file_path' => $path, 'media_type' => 'model/gltf-binary', 'source_id' => $d['source_id'], 'license_reference' => DB::table('catalog_sources')->find($d['source_id'])->license_reference, 'created_at' => now(), 'updated_at' => now()]);
        });

        return $this->result($r, 'Model recorded.');
    }

    public function procedure(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['title' => 'required|string|max:255', 'description' => 'required|string|max:3000', 'source_reference' => 'required|string|max:255', 'vehicle_variant_id' => 'required|integer|exists:vehicle_variants,id', 'part_id' => 'required|integer|exists:parts,id', 'steps' => 'required|string|max:10000']);
        DB::transaction(function () use ($d) {
            $id = DB::table('repair_procedures')->insertGetId(['title' => $d['title'], 'description' => $d['description'], 'source_reference' => $d['source_reference'], 'status' => 'draft', 'is_concept' => false, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('repair_procedure_vehicles')->insert(['procedure_id' => $id, 'vehicle_variant_id' => $d['vehicle_variant_id'], 'created_at' => now(), 'updated_at' => now()]);
            DB::table('repair_procedure_parts')->insert(['procedure_id' => $id, 'part_id' => $d['part_id'], 'created_at' => now(), 'updated_at' => now()]);
            foreach (array_values(array_filter(array_map('trim', explode("\n", $d['steps'])))) as $i => $step) {
                DB::table('repair_steps')->insert(['procedure_id' => $id, 'step_number' => $i + 1, 'instruction' => $step, 'created_at' => now(), 'updated_at' => now()]);
            }
        });

        return $this->result($r, 'Draft procedure created.');
    }

    public function simulate(Request $r)
    {
        Access::admin($r->user());
        $d = $r->validate(['procedure_id' => 'required|integer|exists:repair_procedures,id', 'source_model_id' => 'required|integer|exists:simulation_models,id']);
        $id = DB::transaction(function () use ($d) {
            DB::table('repair_procedures')->where('id', $d['procedure_id'])->lockForUpdate()->first();
            abort_if(DB::table('simulation_jobs')->where('procedure_id', $d['procedure_id'])->whereIn('status', ['queued', 'processing'])->exists(), 409, 'A job is running.');
            DB::table('repair_procedures')->where('id', $d['procedure_id'])->update(['status' => 'draft', 'reviewed_by' => null, 'reviewed_at' => null, 'updated_at' => now()]);

            return DB::table('simulation_jobs')->insertGetId($d + ['created_at' => now(), 'updated_at' => now()]);
        });
        ProcessSimulation::dispatch($id);

        return $this->result($r, 'Simulation queued; review required before publishing.');
    }

    public function review(Request $r, int $id)
    {
        Access::admin($r->user());
        $d = $r->validate(['status' => 'required|in:approved,rejected', 'review_confirmation' => 'accepted']);
        DB::transaction(function () use ($r, $id, $d) {
            $p = DB::table('repair_procedures')->lockForUpdate()->find($id);
            abort_unless($p, 404);
            abort_unless($p->status === 'pending_review', 409, 'Only pending procedures can be reviewed.');
            abort_unless(DB::table('simulation_jobs')->where('procedure_id', $id)->where('status', 'completed')->exists(), 422, 'Completed simulation required.');
            abort_unless($p->source_reference, 422, 'Source reference required.');
            DB::table('repair_procedures')->where('id', $id)->update(['status' => $d['status'], 'reviewed_by' => $r->user()->id, 'reviewed_at' => now(), 'updated_at' => now()]);
        });

        return $this->result($r, 'Review recorded.');
    }

    public function preview(Request $r, int $id)
    {
        Access::admin($r->user());
        $job = DB::table('simulation_jobs')->where('status', 'completed')->find($id);
        abort_unless($job, 404);

        return redirect('/viewer/index.html?model='.urlencode(url('/admin/simulations/'.$id.'/asset')));
    }

    public function asset(Request $r, int $id)
    {
        Access::admin($r->user());
        $job = DB::table('simulation_jobs')->where('status','completed')->find($id);
        abort_unless($job,404);

        return Storage::disk(config('marketplace.simulation_disk','local'))->response($job->output_path,null,['Content-Type' => 'model/gltf-binary']);
    }
}
