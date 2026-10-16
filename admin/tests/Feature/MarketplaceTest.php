<?php

namespace Tests\Feature;

use App\Jobs\ImportCatalog;
use App\Jobs\ProcessSimulation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketplaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function asUser(string $name): User
    {
        $u = User::where('email', $name.'@inficarx.test')->firstOrFail();
        Sanctum::actingAs($u);

        return $u;
    }

    private function requestPart(): int
    {
        $this->asUser('customer');

        return $this->postJson('/api/v1/requests', ['vehicle_variant_id' => 1, 'part_id' => 1, 'description' => 'I need front brake pads for my Camry.', 'quantity' => 1])->assertCreated()->json('id');
    }

    public function test_login_returns_token_and_logout_revokes_it(): void
    {
        $token = $this->postJson('/api/v1/auth/login', ['email' => 'customer@inficarx.test', 'password' => 'DemoPass123!'])->assertOk()->json('token');
        $this->withToken($token)->getJson('/api/v1/me')->assertOk()->assertJsonPath('user.email', 'customer@inficarx.test');
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_catalog_traffic_does_not_use_up_login_allowance(): void
    {
        for ($i = 0; $i < 8; $i++) {
            $this->getJson('/api/v1/categories')->assertOk();
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'customer@inficarx.test', 'password' => 'DemoPass123!'])->assertOk();
    }

    public function test_registration_cannot_assign_admin_role(): void
    {
        $id = $this->postJson('/api/v1/auth/register', ['name' => 'New Customer', 'email' => 'new@example.test', 'password' => 'StrongPass123!', 'password_confirmation' => 'StrongPass123!', 'role' => 'admin'])->assertCreated()->json('user.id');
        $this->assertFalse(User::find($id)->hasRole('admin'));
        $this->assertTrue(User::find($id)->hasRole('customer'));
    }

    public function test_catalog_filters_fitment_and_normalizes_part_numbers(): void
    {
        $this->getJson('/api/v1/parts?q=bp1001&vehicle_variant_id=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.part_number', 'BP-1001')->assertJsonPath('data.0.listings.0.price', '12.000');
        $this->getJson('/api/v1/parts?category_id=2')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_supplier_cannot_update_another_shops_inventory(): void
    {
        $this->asUser('supplier2');
        $this->patchJson('/api/v1/supplier/inventory/1', ['supplier_sku' => 'DEMO-0-0', 'price' => '1.000', 'quantity' => 0, 'condition' => 'new', 'status' => 'active'])->assertForbidden();
        $this->assertDatabaseHas('shop_parts', ['id' => 1, 'quantity' => 8]);
    }

    public function test_inventory_changes_write_audit_history(): void
    {
        $this->asUser('supplier');
        $this->patchJson('/api/v1/supplier/inventory/1', ['supplier_sku' => 'DEMO-0-0', 'price' => '13.125', 'quantity' => 5, 'condition' => 'new', 'status' => 'active'])->assertOk()->assertJsonPath('price', '13.125');
        $this->assertDatabaseHas('inventory_movements', ['shop_part_id' => 1, 'quantity_change' => -3]);
        $this->assertDatabaseHas('price_history', ['shop_part_id' => 1, 'old_price' => 12, 'new_price' => 13.125]);
    }

    public function test_negative_stock_and_excess_price_precision_are_rejected(): void
    {
        $this->asUser('supplier');
        $this->patchJson('/api/v1/supplier/inventory/1', ['supplier_sku' => 'DEMO-0-0', 'price' => '13.1234', 'quantity' => -1, 'condition' => 'new', 'status' => 'active'])->assertUnprocessable()->assertJsonValidationErrors(['price', 'quantity']);
    }

    public function test_customer_request_supplier_quote_and_acceptance(): void
    {
        $id = $this->requestPart();
        $this->asUser('supplier');
        $this->postJson("/api/v1/supplier/requests/{$id}/offers", ['shop_id' => 1, 'price' => '11.500', 'currency' => 'BHD', 'availability' => 'available_now'])->assertOk();
        $offer = DB::table('request_offers')->first();
        $this->asUser('customer');
        $this->getJson('/api/v1/requests')->assertOk()->assertJsonPath('data.0.offers.0.price', '11.500');
        $this->postJson("/api/v1/requests/{$id}/offers/{$offer->id}/accept")->assertOk();
        $this->postJson("/api/v1/requests/{$id}/offers/{$offer->id}/accept")->assertConflict();
        $this->assertDatabaseHas('part_requests', ['id' => $id, 'status' => 'fulfilled']);
        $this->assertDatabaseHas('notifications', ['type' => 'offer_accepted']);
        $this->asUser('supplier');
        $this->postJson("/api/v1/supplier/requests/{$id}/offers", ['shop_id' => 1, 'price' => '10', 'currency' => 'BHD', 'availability' => 'available_now'])->assertConflict();
    }

    public function test_request_and_offer_ownership_are_enforced(): void
    {
        $id = $this->requestPart();
        $this->asUser('supplier2');
        $this->postJson("/api/v1/supplier/requests/{$id}/offers", ['shop_id' => 1, 'price' => '12', 'currency' => 'BHD', 'availability' => 'by_order'])->assertForbidden();
        $this->postJson("/api/v1/requests/{$id}/cancel")->assertNotFound();
        $this->getJson('/api/v1/requests')->assertJsonCount(0, 'data');
    }

    public function test_unlisted_part_request_is_supported(): void
    {
        $this->asUser('customer');
        $this->postJson('/api/v1/requests', ['vehicle_variant_id' => 1, 'description' => 'Unknown squeaking brake component', 'quantity' => 1])->assertCreated()->assertJsonPath('part_id', null);
    }

    public function test_suspending_shop_hides_listings_and_blocks_updates(): void
    {
        DB::table('shops')->where('id', 1)->update(['status' => 'suspended']);
        $this->getJson('/api/v1/parts/1')->assertJsonCount(1, 'listings');
        $this->asUser('supplier');
        $this->patchJson('/api/v1/supplier/inventory/1', ['supplier_sku' => 'DEMO-0-0', 'price' => '12', 'quantity' => 5, 'condition' => 'new', 'status' => 'active'])->assertNotFound();
    }

    public function test_staff_cannot_manage_members_or_shop_profile(): void
    {
        $u = User::where('email', 'customer@inficarx.test')->first();
        DB::table('shop_members')->insert(['shop_id' => 1, 'user_id' => $u->id, 'role' => 'staff']);
        $this->asUser('customer');
        $this->patchJson('/api/v1/supplier/shops/1', ['name' => 'Changed'])->assertForbidden();
        $this->postJson('/api/v1/supplier/shops/1/members', ['email' => 'supplier2@inficarx.test', 'role' => 'manager'])->assertForbidden();
    }

    public function test_ai_without_key_is_honest_and_scoped_to_user(): void
    {
        config(['marketplace.ai_key' => null]);
        $this->asUser('customer');
        $id = $this->postJson('/api/v1/ai/chat', ['message' => 'My brakes squeak', 'vehicle_variant_id' => 1])->assertOk()->assertJsonPath('provider', 'catalog_assistant')->json('conversation_id');
        $this->asUser('supplier');
        $this->getJson('/api/v1/ai/conversations/'.$id)->assertNotFound();
        $this->postJson('/api/v1/ai/chat', ['message' => 'Hello', 'vehicle_variant_id' => 1, 'conversation_id' => $id])->assertNotFound();
    }

    public function test_ai_provider_errors_do_not_create_fake_replies(): void
    {
        config(['marketplace.ai_key' => 'test-key']);
        Http::fake(['api.openai.com/*' => Http::response(['error' => 'unavailable'], 503)]);
        $this->asUser('customer');
        $this->postJson('/api/v1/ai/chat', ['message' => 'Find brake pads', 'vehicle_variant_id' => 1])->assertStatus(503);
        $this->assertDatabaseCount('ai_messages', 0);
    }

    public function test_private_request_photos_require_authorization(): void
    {
        Storage::fake('local');
        $id = $this->requestPart();
        $image = $this->postJson("/api/v1/requests/{$id}/images", ['image' => UploadedFile::fake()->image('brakes.jpg')])->assertCreated()->json('id');
        $this->get('/api/v1/request-images/'.$image, ['Accept' => 'application/json'])->assertOk();
        $outsider = User::factory()->create();
        Sanctum::actingAs($outsider);
        $this->getJson('/api/v1/request-images/'.$image)->assertForbidden();
    }

    public function test_only_approved_simulations_are_public(): void
    {
        DB::table('repair_procedures')->where('id', 1)->update(['status' => 'pending_review']);
        $this->getJson('/api/v1/simulations')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/simulations/1')->assertNotFound();
    }

    public function test_csv_import_records_row_errors_and_deduplicates_fitment(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('imports/test.csv', "manufacturer,category,part_number,name,description,vehicle_variant_id\nDemo Components,Braking,BP-1001,Front Brake Pad Set,Updated,1\nDemo Components,Braking,NEW-2,New part,Description,999\n");
        $id = DB::table('catalog_imports')->insertGetId(['source_id' => 1, 'file_path' => 'imports/test.csv']);
        (new ImportCatalog($id))->handle();
        $this->assertDatabaseHas('catalog_imports', ['id' => $id, 'status' => 'completed_with_errors', 'processed_rows' => 2]);
        $this->assertDatabaseHas('catalog_import_errors', ['import_id' => $id, 'row_number' => 3]);
        $this->assertDatabaseCount('parts', 6);
        $this->assertDatabaseCount('part_compatibility', 6);
    }

    public function test_simulation_job_stores_candidate_and_requires_review(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        config(['marketplace.simulation_token' => 'worker-test', 'marketplace.asset_disk' => 'public']);
        Http::fake(['*/jobs' => Http::response(['glb_base64' => base64_encode('glTFtest-output')], 200)]);
        $id = DB::table('simulation_jobs')->insertGetId(['procedure_id' => 1, 'source_model_id' => 1]);
        (new ProcessSimulation($id))->handle();
        $this->assertDatabaseHas('simulation_jobs', ['id' => $id, 'status' => 'completed']);
        $this->assertDatabaseHas('repair_procedures', ['id' => 1, 'status' => 'pending_review', 'reviewed_by' => null]);
        Storage::disk('local')->assertExists("simulations/{$id}/assembly.glb");
        $this->getJson('/api/v1/simulations/1/model')->assertNotFound();
    }

    public function test_admin_requires_admin_role_and_explicit_review(): void
    {
        $this->actingAs(User::where('email', 'customer@inficarx.test')->first())->get('/admin')->assertForbidden();
        $this->actingAs(User::where('email', 'admin@inficarx.test')->first())->get('/admin')->assertOk();
        DB::table('repair_procedures')->where('id',1)->update(['status' => 'pending_review']);
        $this->postJson('/admin/procedures/1/review',['status' => 'approved', 'review_confirmation' => 1])->assertUnprocessable();
    }

    public function test_admin_mobile_requires_admin_and_saves_without_browser_session(): void
    {
        $this->postJson('/api/v1/admin/login', ['email' => 'customer@inficarx.test', 'password' => 'DemoPass123!'])->assertUnprocessable();
        $token = $this->postJson('/api/v1/admin/login', ['email' => 'admin@inficarx.test', 'password' => 'DemoPass123!'])->assertOk()->json('token');
        $this->withToken($token)->getJson('/api/v1/admin/dashboard')->assertOk()->assertJsonPath('stats.parts', 6);
        $this->withToken($token)->postJson('/api/v1/admin/sources', ['name' => 'Mobile source', 'source_type' => 'manual', 'license_reference' => 'Mobile test'])->assertOk()->assertJsonPath('message', 'Source recorded.');
        $this->assertDatabaseHas('catalog_sources', ['name' => 'Mobile source']);
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();
    }

    public function test_admin_mobile_preview_uses_a_short_lived_signed_asset_url(): void
    {
        Storage::fake('local');
        config(['marketplace.simulation_disk' => 'local']);
        $id = DB::table('simulation_jobs')->insertGetId(['procedure_id' => 1, 'source_model_id' => 1, 'status' => 'completed', 'output_path' => 'simulations/test.glb']);
        Storage::disk('local')->put('simulations/test.glb', 'glTFtest-output');
        $this->asUser('admin');
        $preview = $this->getJson("/api/v1/admin/simulations/{$id}/preview")->assertOk()->json('url');
        parse_str(parse_url($preview, PHP_URL_QUERY), $query);
        $this->get($query['model'])->assertOk();
        $this->getJson("/api/v1/admin/simulations/{$id}/asset")->assertForbidden();
    }
}
