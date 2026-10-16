<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('phone')->nullable();
            $t->string('status')->default('active');
        });
        Schema::create('roles', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->timestamps();
        });
        Schema::create('user_roles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('role_id')->constrained()->cascadeOnDelete();
            $t->unique(['user_id', 'role_id']);
            $t->timestamps();
        });
        Schema::create('shops', function (Blueprint $t) {
            $t->id();
            $t->foreignId('owner_id')->constrained('users');
            $t->string('name');
            $t->text('description')->nullable();
            $t->string('logo_path')->nullable();
            $t->string('status')->default('active')->index();
            $t->timestamps();
        });
        Schema::create('shop_members', function (Blueprint $t) {
            $t->id();
            $t->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('role')->default('staff');
            $t->unique(['shop_id', 'user_id']);
            $t->timestamps();
        });
        Schema::create('shop_branches', function (Blueprint $t) {
            $t->id();
            $t->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->string('address');
            $t->decimal('latitude', 10, 7)->nullable();
            $t->decimal('longitude', 10, 7)->nullable();
            $t->string('phone')->nullable();
            $t->timestamps();
        });
        Schema::create('vehicle_makes', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->timestamps();
        });
        Schema::create('vehicle_models', function (Blueprint $t) {
            $t->id();
            $t->foreignId('make_id')->constrained('vehicle_makes');
            $t->string('name');
            $t->unique(['make_id', 'name']);
            $t->timestamps();
        });
        Schema::create('vehicle_variants', function (Blueprint $t) {
            $t->id();
            $t->foreignId('model_id')->constrained('vehicle_models');
            $t->unsignedSmallInteger('year_from');
            $t->unsignedSmallInteger('year_to');
            $t->string('engine_code');
            $t->string('trim');
            $t->string('market');
            $t->unique(['model_id', 'year_from', 'year_to', 'engine_code', 'trim', 'market'], 'variant_unique');
            $t->timestamps();
        });
        Schema::create('vehicle_identifiers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('variant_id')->constrained('vehicle_variants')->cascadeOnDelete();
            $t->string('identifier_type');
            $t->string('identifier_value')->index();
            $t->timestamps();
        });
        Schema::create('user_vehicles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('vehicle_variant_id')->constrained();
            $t->string('nickname');
            $t->unique(['user_id', 'vehicle_variant_id']);
            $t->timestamps();
        });
        Schema::create('part_categories', function (Blueprint $t) {
            $t->id();
            $t->foreignId('parent_id')->nullable()->constrained('part_categories')->nullOnDelete();
            $t->string('name')->unique();
            $t->timestamps();
        });
        Schema::create('part_manufacturers', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->timestamps();
        });
        Schema::create('parts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('manufacturer_id')->constrained('part_manufacturers');
            $t->foreignId('category_id')->constrained('part_categories');
            $t->string('part_number');
            $t->string('normalized_part_number');
            $t->string('name')->index();
            $t->text('description')->nullable();
            $t->unique(['manufacturer_id', 'normalized_part_number'], 'manufacturer_part_unique');
            $t->timestamps();
        });
        Schema::create('part_images', function (Blueprint $t) {
            $t->id();
            $t->foreignId('part_id')->constrained()->cascadeOnDelete();
            $t->string('image_path');
            $t->boolean('is_primary')->default(false);
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
        });
        Schema::create('part_compatibility', function (Blueprint $t) {
            $t->id();
            $t->foreignId('part_id')->constrained()->cascadeOnDelete();
            $t->foreignId('vehicle_variant_id')->constrained()->cascadeOnDelete();
            $t->text('fitment_notes')->nullable();
            $t->unique(['part_id', 'vehicle_variant_id']);
            $t->timestamps();
        });
        Schema::create('part_cross_references', function (Blueprint $t) {
            $t->id();
            $t->foreignId('part_id')->constrained()->cascadeOnDelete();
            $t->string('reference_number')->index();
            $t->string('reference_brand');
            $t->timestamps();
        });
        Schema::create('part_attributes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('part_id')->constrained()->cascadeOnDelete();
            $t->string('attribute_name');
            $t->string('attribute_value');
            $t->timestamps();
        });
        Schema::create('shop_parts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('branch_id')->constrained('shop_branches');
            $t->foreignId('part_id')->constrained();
            $t->string('supplier_sku', 100);
            $t->decimal('price', 12, 3);
            $t->char('currency', 3)->default('BHD');
            $t->unsignedInteger('quantity')->default(0);
            $t->string('condition', 30)->default('new');
            $t->string('status', 30)->default('active');
            $t->unique(['branch_id', 'part_id', 'supplier_sku', 'condition'], 'listing_unique');
            $t->index(['part_id', 'branch_id', 'status']);
            $t->timestamps();
        });
        Schema::create('inventory_movements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('shop_part_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('movement_type');
            $t->integer('quantity_change');
            $t->timestamps();
        });
        Schema::create('price_history', function (Blueprint $t) {
            $t->id();
            $t->foreignId('shop_part_id')->constrained()->cascadeOnDelete();
            $t->decimal('old_price', 12, 3);
            $t->decimal('new_price', 12, 3);
            $t->timestamp('changed_at');
            $t->timestamps();
        });
        Schema::create('favorites', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('part_id')->constrained()->cascadeOnDelete();
            $t->unique(['user_id', 'part_id']);
            $t->timestamps();
        });
        Schema::create('shop_reviews', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $t->unsignedTinyInteger('rating');
            $t->text('comment')->nullable();
            $t->unique(['user_id', 'shop_id']);
            $t->timestamps();
        });
        Schema::create('part_requests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained();
            $t->foreignId('vehicle_variant_id')->constrained();
            $t->foreignId('part_id')->nullable()->constrained();
            $t->text('description');
            $t->unsignedInteger('quantity')->default(1);
            $t->string('status')->default('open')->index();
            $t->timestamps();
        });
        Schema::create('part_request_images', function (Blueprint $t) {
            $t->id();
            $t->foreignId('request_id')->constrained('part_requests')->cascadeOnDelete();
            $t->string('image_path');
            $t->timestamps();
        });
        Schema::create('request_offers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('request_id')->constrained('part_requests')->cascadeOnDelete();
            $t->foreignId('shop_id')->constrained();
            $t->decimal('price', 12, 3);
            $t->char('currency', 3)->default('BHD');
            $t->string('availability');
            $t->string('status')->default('pending');
            $t->unique(['request_id', 'shop_id']);
            $t->timestamps();
        });
        Schema::create('notifications', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('type');
            $t->json('payload');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
        });
        Schema::create('simulation_models', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('model_file_path')->nullable();
            $t->string('model_type')->default('glb');
            $t->unsignedInteger('version')->default(1);
            $t->timestamps();
        });
        Schema::create('simulation_components', function (Blueprint $t) {
            $t->id();
            $t->foreignId('simulation_model_id')->constrained()->cascadeOnDelete();
            $t->foreignId('parent_component_id')->nullable()->constrained('simulation_components')->nullOnDelete();
            $t->foreignId('part_id')->nullable()->constrained()->nullOnDelete();
            $t->string('mesh_name');
            $t->unique(['simulation_model_id', 'mesh_name']);
            $t->timestamps();
        });
        Schema::create('repair_procedures', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->text('description')->nullable();
            $t->string('status')->default('draft')->index();
            $t->string('source_reference')->nullable();
            $t->boolean('is_concept')->default(true);
            $t->foreignId('reviewed_by')->nullable()->constrained('users');
            $t->timestamp('reviewed_at')->nullable();
            $t->timestamps();
        });
        Schema::create('repair_procedure_vehicles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('procedure_id')->constrained('repair_procedures')->cascadeOnDelete();
            $t->foreignId('vehicle_variant_id')->constrained();
            $t->unique(['procedure_id', 'vehicle_variant_id']);
            $t->timestamps();
        });
        Schema::create('repair_procedure_parts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('procedure_id')->constrained('repair_procedures')->cascadeOnDelete();
            $t->foreignId('part_id')->constrained();
            $t->unique(['procedure_id', 'part_id']);
            $t->timestamps();
        });
        Schema::create('repair_steps', function (Blueprint $t) {
            $t->id();
            $t->foreignId('procedure_id')->constrained('repair_procedures')->cascadeOnDelete();
            $t->unsignedInteger('step_number');
            $t->text('instruction');
            $t->text('warning')->nullable();
            $t->unique(['procedure_id', 'step_number']);
            $t->timestamps();
        });
        Schema::create('repair_step_animations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('step_id')->constrained('repair_steps')->cascadeOnDelete();
            $t->foreignId('component_id')->constrained('simulation_components');
            $t->string('animation_name');
            $t->decimal('start_time', 8, 3);
            $t->decimal('end_time', 8, 3);
            $t->timestamps();
        });
        Schema::create('simulation_jobs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('procedure_id')->constrained('repair_procedures');
            $t->foreignId('source_model_id')->constrained('simulation_models');
            $t->string('status')->default('queued');
            $t->string('output_path')->nullable();
            $t->text('error_message')->nullable();
            $t->timestamps();
        });
        Schema::create('ai_conversations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title');
            $t->timestamps();
        });
        Schema::create('ai_messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('conversation_id')->constrained('ai_conversations')->cascadeOnDelete();
            $t->string('role');
            $t->text('content');
            $t->timestamps();
        });
        Schema::create('catalog_sources', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('source_type');
            $t->string('license_reference');
            $t->timestamps();
        });
        Schema::create('catalog_imports', function (Blueprint $t) {
            $t->id();
            $t->foreignId('source_id')->constrained('catalog_sources');
            $t->string('file_path');
            $t->string('status')->default('queued');
            $t->unsignedInteger('total_rows')->default(0);
            $t->unsignedInteger('processed_rows')->default(0);
            $t->timestamps();
        });
        Schema::create('catalog_import_errors', function (Blueprint $t) {
            $t->id();
            $t->foreignId('import_id')->constrained('catalog_imports')->cascadeOnDelete();
            $t->unsignedInteger('row_number');
            $t->text('error_message');
            $t->timestamps();
        });
        Schema::create('media_assets', function (Blueprint $t) {
            $t->id();
            $t->string('file_path');
            $t->string('media_type');
            $t->foreignId('source_id')->nullable()->constrained('catalog_sources');
            $t->string('license_reference');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_assets');
        Schema::dropIfExists('catalog_import_errors');
        Schema::dropIfExists('catalog_imports');
        Schema::dropIfExists('catalog_sources');
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_conversations');
        Schema::dropIfExists('simulation_jobs');
        Schema::dropIfExists('repair_step_animations');
        Schema::dropIfExists('repair_steps');
        Schema::dropIfExists('repair_procedure_parts');
        Schema::dropIfExists('repair_procedure_vehicles');
        Schema::dropIfExists('repair_procedures');
        Schema::dropIfExists('simulation_components');
        Schema::dropIfExists('simulation_models');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('request_offers');
        Schema::dropIfExists('part_request_images');
        Schema::dropIfExists('part_requests');
        Schema::dropIfExists('shop_reviews');
        Schema::dropIfExists('favorites');
        Schema::dropIfExists('price_history');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('shop_parts');
        Schema::dropIfExists('part_attributes');
        Schema::dropIfExists('part_cross_references');
        Schema::dropIfExists('part_compatibility');
        Schema::dropIfExists('part_images');
        Schema::dropIfExists('parts');
        Schema::dropIfExists('part_manufacturers');
        Schema::dropIfExists('part_categories');
        Schema::dropIfExists('user_vehicles');
        Schema::dropIfExists('vehicle_identifiers');
        Schema::dropIfExists('vehicle_variants');
        Schema::dropIfExists('vehicle_models');
        Schema::dropIfExists('vehicle_makes');
        Schema::dropIfExists('shop_branches');
        Schema::dropIfExists('shop_members');
        Schema::dropIfExists('shops');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('roles');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['phone', 'status']));
    }
};
