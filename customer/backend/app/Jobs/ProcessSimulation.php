<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ProcessSimulation implements ShouldQueue
{
    use Queueable;

    public int $timeout = 240;

    public int $tries = 2;

    public function __construct(public int $jobId) {}

    public function handle(): void
    {
        $job = DB::table('simulation_jobs')->find($this->jobId);
        if (! $job || $job->status === 'completed') {
            return;
        }
        DB::table('simulation_jobs')->where('id', $job->id)->update(['status' => 'processing', 'error_message' => null, 'updated_at' => now()]);
        $model = DB::table('simulation_models')->find($job->source_model_id);
        $disk = Storage::disk(config('marketplace.asset_disk'));
        $components = DB::table('simulation_components')->where('simulation_model_id', $model->id)->pluck('mesh_name')->all();
        $bytes = $model->model_file_path ? $disk->get($model->model_file_path) : null;
        if ($bytes && strlen($bytes) > 10 * 1024 * 1024) {
            throw new \RuntimeException('Source model exceeds 10 MB.');
        }
        $result = Http::withToken(config('marketplace.simulation_token'))->timeout(210)->post(rtrim(config('marketplace.simulation_url'), '/').'/jobs', [
            'template' => 'brake_replacement', 'source_base64' => $bytes ? base64_encode($bytes) : null, 'components' => $components,
        ])->throw()->json();
        $output = base64_decode($result['glb_base64'] ?? '', true);
        if (! $output || substr($output, 0, 4) !== 'glTF') {
            throw new \RuntimeException('Worker returned an invalid GLB.');
        }
        $path = "simulations/{$job->id}/assembly.glb";
        Storage::disk(config('marketplace.simulation_disk', 'local'))->put($path, $output);
        DB::transaction(function () use ($job, $path, $result) {
            DB::table('simulation_jobs')->where('id', $job->id)->update(['status' => 'completed', 'output_path' => $path, 'updated_at' => now()]);
            $updates = ['status' => 'pending_review', 'reviewed_by' => null, 'reviewed_at' => null, 'updated_at' => now()];
            if ($result['is_concept'] ?? false) {
                $updates['is_concept'] = true;
            }
            DB::table('repair_procedures')->where('id', $job->procedure_id)->update($updates);
        });
    }

    public function failed(?\Throwable $e): void
    {
        DB::table('simulation_jobs')->where('id', $this->jobId)->update(['status' => 'failed', 'error_message' => mb_substr($e?->getMessage() ?? 'Unknown worker error', 0, 2000), 'updated_at' => now()]);
    }
}
