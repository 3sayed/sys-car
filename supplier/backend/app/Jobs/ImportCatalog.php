<?php

namespace App\Jobs;

use App\Services\CatalogService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ImportCatalog implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public int $importId) {}

    public function handle(): void
    {
        $import = DB::table('catalog_imports')->find($this->importId);
        if (! $import || in_array($import->status, ['completed', 'completed_with_errors'])) {
            return;
        }
        DB::table('catalog_imports')->where('id', $import->id)->update(['status' => 'processing', 'updated_at' => now()]);
        $file = Storage::disk('local')->readStream($import->file_path);
        if (! $file) {
            throw new \RuntimeException('Import file cannot be read.');
        }
        try {
            $header = fgetcsv($file, 0, ',', '"', '');
            $expected = ['manufacturer', 'category', 'part_number', 'name', 'description', 'vehicle_variant_id'];
            if ($header !== $expected) {
                throw new \RuntimeException('CSV header must be: '.implode(',', $expected));
            }
            $row = 0;
            $errors = 0;
            while (($values = fgetcsv($file, 0, ',', '"', '')) !== false) {
                $row++;
                try {
                    if (count($values) !== count($header)) {
                        throw new \RuntimeException('Wrong number of columns.');
                    }
                    $d = array_combine($header, $values);
                    Validator::make($d, ['manufacturer' => 'required|string|max:100', 'category' => 'required|string|max:100', 'part_number' => 'required|string|max:100', 'name' => 'required|string|max:255', 'description' => 'nullable|string|max:5000', 'vehicle_variant_id' => 'required|integer|exists:vehicle_variants,id'])->validate();
                    $normal = CatalogService::normalize($d['part_number']);
                    if (! $normal) {
                        throw new \RuntimeException('Part number has no letters or digits.');
                    }
                    DB::transaction(function () use ($d, $normal) {
                        foreach (['manufacturer' => 'part_manufacturers', 'category' => 'part_categories'] as $key => $table) {
                            DB::table($table)->insertOrIgnore(['name' => $d[$key], 'created_at' => now(), 'updated_at' => now()]);
                            $ids[$key] = DB::table($table)->where('name', $d[$key])->value('id');
                        }
                        DB::table('parts')->updateOrInsert(['manufacturer_id' => $ids['manufacturer'], 'normalized_part_number' => $normal], ['category_id' => $ids['category'], 'part_number' => $d['part_number'], 'name' => $d['name'], 'description' => $d['description'], 'created_at' => now(), 'updated_at' => now()]);
                        $part = DB::table('parts')->where('manufacturer_id', $ids['manufacturer'])->where('normalized_part_number', $normal)->value('id');
                        DB::table('part_compatibility')->insertOrIgnore(['part_id' => $part, 'vehicle_variant_id' => $d['vehicle_variant_id'], 'fitment_notes' => 'Imported catalog fitment; verify source.', 'created_at' => now(), 'updated_at' => now()]);
                    });
                } catch (\Throwable $e) {
                    $errors++;
                    DB::table('catalog_import_errors')->insert(['import_id' => $import->id, 'row_number' => $row + 1, 'error_message' => mb_substr($e->getMessage(), 0, 2000), 'created_at' => now(), 'updated_at' => now()]);
                }
                DB::table('catalog_imports')->where('id', $import->id)->update(['processed_rows' => $row, 'total_rows' => $row, 'updated_at' => now()]);
            }
            DB::table('catalog_imports')->where('id', $import->id)->update(['status' => $errors ? 'completed_with_errors' : 'completed', 'updated_at' => now()]);
        } finally {
            fclose($file);
        }
    }

    public function failed(?\Throwable $e): void
    {
        DB::table('catalog_imports')->where('id', $this->importId)->update(['status' => 'failed', 'updated_at' => now()]);
        DB::table('catalog_import_errors')->insert(['import_id' => $this->importId, 'row_number' => 0, 'error_message' => mb_substr($e?->getMessage() ?? 'Import failed', 0, 2000), 'created_at' => now(), 'updated_at' => now()]);
    }
}
