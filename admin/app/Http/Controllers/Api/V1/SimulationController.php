<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SimulationController extends Controller
{
    public function index(Request $r)
    {
        $r->validate(['vehicle_variant_id' => 'nullable|integer|exists:vehicle_variants,id']);
        $q = DB::table('repair_procedures')->where('status', 'approved');
        if ($r->filled('vehicle_variant_id')) {
            $q->whereIn('id', DB::table('repair_procedure_vehicles')->where('vehicle_variant_id', $r->integer('vehicle_variant_id'))->select('procedure_id'));
        }

        return ['data' => $q->get()];
    }

    public function show(int $id)
    {
        $p = DB::table('repair_procedures')->where('status', 'approved')->find($id);
        abort_unless($p, 404);
        $p->steps = DB::table('repair_steps')->where('procedure_id', $id)->orderBy('step_number')->get();
        $p->parts = DB::table('repair_procedure_parts')->where('procedure_id', $id)->pluck('part_id');
        $job = DB::table('simulation_jobs')->where('procedure_id', $id)->where('status', 'completed')->latest()->first();
        $p->model_url = $job ? url('/api/v1/simulations/'.$id.'/model') : null;
        $p->viewer_url = url('/viewer/index.html').($p->model_url ? '?model='.urlencode($p->model_url) : '');

        return $p;
    }

    public function model(int $id)
    {
        abort_unless(DB::table('repair_procedures')->where('id', $id)->where('status', 'approved')->exists(), 404);
        $job = DB::table('simulation_jobs')->where('procedure_id', $id)->where('status', 'completed')->latest()->first();
        abort_unless($job, 404);

        return Storage::disk(config('marketplace.simulation_disk', 'local'))->response($job->output_path, null, ['Content-Type' => 'model/gltf-binary']);
    }
}
