<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function save(User $user, array $data, ?int $id = null): object
    {
        return DB::transaction(function () use ($user, $data, $id) {
            $old = $id ? DB::table('shop_parts')->lockForUpdate()->find($id) : null;
            if ($id) {
                abort_unless($old, 404);
            }
            $branch = DB::table('shop_branches')->find($old?->branch_id ?? $data['branch_id']);
            abort_unless($branch, 422, 'Unknown branch.');
            Access::shop($user, $branch->shop_id);
            if ($old) {
                unset($data['branch_id'],$data['part_id'],$data['currency']);
                DB::table('shop_parts')->where('id', $id)->update($data + ['updated_at' => now()]);
            } else {
                $id = DB::table('shop_parts')->insertGetId($data + ['created_at' => now(), 'updated_at' => now()]);
            }
            $current = DB::table('shop_parts')->find($id);
            $delta = $current->quantity - ($old?->quantity ?? 0);
            if ($delta) {
                DB::table('inventory_movements')->insert(['shop_part_id' => $id, 'user_id' => $user->id, 'movement_type' => $old ? 'adjustment' : 'opening', 'quantity_change' => $delta, 'created_at' => now(), 'updated_at' => now()]);
            }
            if ($old && bccomp((string) $old->price, (string) $current->price, 3) !== 0) {
                DB::table('price_history')->insert(['shop_part_id' => $id, 'old_price' => $old->price, 'new_price' => $current->price, 'changed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            }

            return CatalogService::money($current);
        });
    }
}
