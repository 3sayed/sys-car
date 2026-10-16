<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\AdminController;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Access;
use App\Services\CatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

class AdminMobileController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::where('email', $credentials['email'])->first();
        if (! $user || ! Hash::check($credentials['password'], $user->password) || $user->status !== 'active' || ! $user->hasRole('admin')) {
            throw ValidationException::withMessages(['email' => 'Administrator credentials are invalid.']);
        }

        return ['token' => $user->createToken('admin-mobile', ['*'], now()->addDays(30))->plainTextToken, 'user' => $user];
    }

    public function dashboard(Request $request)
    {
        Access::admin($request->user());
        $stats = [];
        foreach (['parts', 'shops', 'vehicle_variants', 'part_requests', 'catalog_imports', 'simulation_jobs'] as $table) {
            $stats[$table] = DB::table($table)->count();
        }
        $data = ['stats' => $stats, 'parts' => DB::table('parts')->latest()->limit(50)->get(), 'variants' => (new CatalogService)->variants()->limit(100)->get()];
        foreach (['shops', 'repair_procedures', 'catalog_imports', 'simulation_jobs', 'catalog_import_errors', 'simulation_models', 'catalog_sources', 'part_manufacturers', 'part_categories'] as $table) {
            $data[$table] = DB::table($table)->latest()->limit(100)->get();
        }

        return $data;
    }

    public function preview(Request $request, int $id)
    {
        Access::admin($request->user());
        abort_unless(DB::table('simulation_jobs')->where('status', 'completed')->where('id', $id)->exists(), 404);
        $asset = URL::temporarySignedRoute('admin-mobile.asset', now()->addMinutes(10), ['id' => $id]);

        return ['url' => url('/viewer/index.html').'?model='.urlencode($asset)];
    }

    public function asset(int $id)
    {
        $job = DB::table('simulation_jobs')->where('status', 'completed')->find($id);
        abort_unless($job, 404);

        return Storage::disk(config('marketplace.simulation_disk', 'local'))->response($job->output_path, null, ['Content-Type' => 'model/gltf-binary']);
    }

    public function action(Request $request, string $action, ?int $id = null)
    {
        Access::admin($request->user());
        $methods = [
            'sources' => 'source', 'vehicles' => 'vehicle', 'taxonomy' => 'taxonomy',
            'part-images' => 'partImage', 'imports' => 'import', 'parts' => 'part',
            'shops' => 'shopStatus', 'models' => 'uploadModel', 'procedures' => 'procedure',
            'simulations' => 'simulate', 'reviews' => 'review',
        ];
        abort_unless(isset($methods[$action]), 404);
        $requiresId = in_array($action, ['shops', 'reviews'], true);
        abort_unless($requiresId === ($id !== null), 404);
        $admin = app(AdminController::class);
        $method = $methods[$action];
        return $requiresId ? $admin->{$method}($request, $id) : $admin->{$method}($request);
    }
}
