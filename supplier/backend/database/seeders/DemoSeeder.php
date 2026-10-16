<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoSeeder extends Seeder
{
    private function add(string $table, array $data): int
    {
        return DB::table($table)->insertGetId($data + ['created_at' => now(), 'updated_at' => now()]);
    }

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('Do not seed demo data in production.');
        }
        if (DB::table('parts')->exists()) {
            return;
        }
        DB::transaction(function () {
            foreach (['customer', 'supplier', 'admin'] as $role) {
                $roles[$role] = $this->add('roles', ['name' => $role]);
            }
            foreach (['customer' => 'Omar Ahmed', 'supplier' => 'Auto Parts Center', 'supplier2' => 'Gulf Spare Parts', 'admin' => 'Catalog Administrator'] as $email => $name) {
                $users[$email] = User::firstOrCreate(['email' => $email.'@inficarx.test'], ['name' => $name, 'password' => 'DemoPass123!']);
                $this->add('user_roles', ['user_id' => $users[$email]->id, 'role_id' => $roles[$email === 'supplier2' ? 'supplier' : $email]]);
            }
            $make = $this->add('vehicle_makes', ['name' => 'Toyota']);
            $model = $this->add('vehicle_models', ['make_id' => $make, 'name' => 'Camry']);
            $variant = $this->add('vehicle_variants', ['model_id' => $model, 'year_from' => 2018, 'year_to' => 2022, 'engine_code' => 'A25A-FKS 2.5L', 'trim' => 'LE', 'market' => 'GCC']);
            $this->add('user_vehicles', ['user_id' => $users['customer']->id, 'vehicle_variant_id' => $variant, 'nickname' => 'My Camry 2020']);
            $manufacturer = $this->add('part_manufacturers', ['name' => 'Demo Components']);
            foreach (['Braking', 'Filters', 'Electrical', 'Engine'] as $name) {
                $categories[$name] = $this->add('part_categories', ['name' => $name]);
            }
            foreach ([['BP-1001', 'Front Brake Pad Set', 'Braking'], ['BR-2001', 'Ventilated Brake Disc', 'Braking'], ['OF-1001', 'Engine Oil Filter', 'Filters'], ['AF-1001', 'Engine Air Filter', 'Filters'], ['AL-1001', 'Alternator Assembly', 'Electrical'], ['SP-1001', 'Spark Plug Set', 'Engine']] as [$number,$name,$category]) {
                $part = $this->add('parts', ['manufacturer_id' => $manufacturer, 'category_id' => $categories[$category], 'part_number' => $number, 'normalized_part_number' => str_replace('-', '', $number), 'name' => $name, 'description' => 'Illustrative catalog item. Verify manufacturer fitment against VIN before purchase.']);
                $this->add('part_compatibility', ['part_id' => $part, 'vehicle_variant_id' => $variant, 'fitment_notes' => 'DEMO ONLY: not manufacturer-verified fitment.']);
                $this->add('part_attributes', ['part_id' => $part, 'attribute_name' => 'Data quality', 'attribute_value' => 'Illustrative sample']);
                $parts[] = $part;
            }
            foreach (['supplier', 'supplier2'] as $i => $key) {
                $shop = $this->add('shops', ['owner_id' => $users[$key]->id, 'name' => $users[$key]->name, 'description' => 'Sample supplier for the Bahrain marketplace scenario.']);
                $branch = $this->add('shop_branches', ['shop_id' => $shop, 'name' => $i ? 'Riffa' : 'Manama', 'address' => $i ? 'Riffa, Bahrain (demo)' : 'Manama, Bahrain (demo)', 'latitude' => 26.22 - $i * .08, 'longitude' => 50.58]);
                foreach ($parts as $j => $part) {
                    $listing = $this->add('shop_parts', ['branch_id' => $branch, 'part_id' => $part, 'supplier_sku' => "DEMO-{$i}-{$j}", 'price' => number_format(12 + $j * 5 + $i * 2.5, 3, '.', ''), 'quantity' => 8 + $j, 'currency' => 'BHD', 'condition' => 'new', 'status' => 'active']);
                    $this->add('inventory_movements', ['shop_part_id' => $listing, 'user_id' => $users[$key]->id, 'movement_type' => 'opening', 'quantity_change' => 8 + $j]);
                }
            }
            $this->add('catalog_sources', ['name' => 'infiCarX sample catalog', 'source_type' => 'manual', 'license_reference' => 'Project-authored fictional data; not OEM evidence.']);
            $model = $this->add('simulation_models', ['name' => 'Concept brake assembly', 'model_type' => 'procedural', 'version' => 1]);
            foreach (['rotor', 'caliper', 'pad_inner', 'pad_outer'] as $mesh) {
                $components[$mesh] = $this->add('simulation_components', ['simulation_model_id' => $model, 'mesh_name' => $mesh, 'part_id' => str_starts_with($mesh, 'pad') ? $parts[0] : null]);
            }
            $procedure = $this->add('repair_procedures', ['title' => 'Explore a brake assembly', 'description' => 'A simplified component illustration, not a mechanical replacement procedure.', 'status' => 'approved', 'source_reference' => 'Project-authored conceptual geometry', 'is_concept' => true, 'reviewed_by' => $users['admin']->id, 'reviewed_at' => now()]);
            $this->add('repair_procedure_vehicles', ['procedure_id' => $procedure, 'vehicle_variant_id' => $variant]);
            $this->add('repair_procedure_parts', ['procedure_id' => $procedure, 'part_id' => $parts[0]]);
            foreach (['Explore the assembly and rotate the model.', 'Highlight the caliper.', 'Separate the illustrated pads.', 'Compare the components.', 'Return to the assembled view.'] as $i => $instruction) {
                $step = $this->add('repair_steps', ['procedure_id' => $procedure, 'step_number' => $i + 1, 'instruction' => $instruction, 'warning' => 'Concept only. Not repair instructions.']);
                $this->add('repair_step_animations', ['step_id' => $step, 'component_id' => $components['pad_outer'], 'animation_name' => 'explode', 'start_time' => $i, 'end_time' => $i + 1]);
            }
        });
    }
}
