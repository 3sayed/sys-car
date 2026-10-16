<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Access;
use App\Services\CatalogService;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    public function shops(Request $r)
    {
        return ['data' => DB::table('shops')->whereIn('id', Access::shopIds($r->user()))->get()->map(function ($s) {
            $s->branches = DB::table('shop_branches')->where('shop_id', $s->id)->get();
            $s->members = DB::table('shop_members')->where('shop_id', $s->id)->select('id', 'user_id', 'role')->get();

            return $s;
        })];
    }

    public function createShop(Request $r)
    {
        $d = $r->validate(['name' => 'required|string|max:120', 'description' => 'nullable|string|max:2000']);
        $id = DB::table('shops')->insertGetId($d + ['owner_id' => $r->user()->id, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(DB::table('shops')->find($id), 201);
    }

    public function updateShop(Request $r, int $id)
    {
        Access::shop($r->user(), $id, true);
        $d = $r->validate(['name' => 'required|string|max:120', 'description' => 'nullable|string|max:2000']);
        DB::table('shops')->where('id', $id)->update($d + ['updated_at' => now()]);

        return DB::table('shops')->find($id);
    }

    public function branch(Request $r, int $id)
    {
        Access::shop($r->user(), $id, true);
        $d = $r->validate(['name' => 'required|string|max:100', 'address' => 'required|string|max:255', 'latitude' => 'nullable|numeric|between:-90,90', 'longitude' => 'nullable|numeric|between:-180,180', 'phone' => 'nullable|string|max:30']);
        $bid = DB::table('shop_branches')->insertGetId($d + ['shop_id' => $id, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(DB::table('shop_branches')->find($bid), 201);
    }

    public function member(Request $r, int $id)
    {
        $shop = Access::shop($r->user(), $id, true);
        abort_unless($shop->owner_id === $r->user()->id, 403, 'Only the owner manages membership.');
        $d = $r->validate(['email' => 'required|email|exists:users,email', 'role' => 'required|in:manager,staff']);
        $u = DB::table('users')->where('email', $d['email'])->first();
        DB::table('shop_members')->updateOrInsert(['shop_id' => $id, 'user_id' => $u->id], ['role' => $d['role'], 'created_at' => now(), 'updated_at' => now()]);

        return ['message' => 'Member saved.'];
    }

    public function removeMember(Request $r, int $id, int $member)
    {
        $shop = Access::shop($r->user(), $id, true);
        abort_unless($shop->owner_id === $r->user()->id, 403);
        DB::table('shop_members')->where('shop_id', $id)->where('id', $member)->delete();

        return response()->noContent();
    }

    public function inventory(Request $r)
    {
        return DB::table('shop_parts as sp')->join('shop_branches as b', 'b.id', '=', 'sp.branch_id')->join('parts as p', 'p.id', '=', 'sp.part_id')->whereIn('b.shop_id', Access::shopIds($r->user()))
            ->select('sp.*', 'p.name as part_name', 'p.part_number', 'b.name as branch_name', 'b.shop_id')->orderBy('sp.id', 'desc')->paginate(100)->through(fn ($x) => CatalogService::money($x));
    }

    public function saveInventory(Request $r, InventoryService $service, ?int $id = null)
    {
        $rules = ['supplier_sku' => 'required|string|max:100', 'price' => ['required', 'numeric', 'decimal:0,3', 'min:0.001', 'max:999999999.999'], 'quantity' => 'required|integer|min:0|max:1000000', 'condition' => 'required|in:new,used,refurbished', 'status' => 'required|in:active,inactive'];
        if (! $id) {
            $rules += ['branch_id' => 'required|integer|exists:shop_branches,id', 'part_id' => 'required|integer|exists:parts,id', 'currency' => 'required|in:BHD,SAR,AED,USD'];
        }
        $d = $r->validate($rules);
        $old = $id ? DB::table('shop_parts')->find($id) : null;
        if ($id) {
            abort_unless($old, 404);
        }
        $r->validate(['supplier_sku' => [Rule::unique('shop_parts')->where('branch_id', $old?->branch_id ?? $d['branch_id'])->where('part_id', $old?->part_id ?? $d['part_id'])->where('condition', $d['condition'])->ignore($id)]]);

        return response()->json($service->save($r->user(), $d, $id), $id ? 200 : 201);
    }

    public function history(Request $r, int $id)
    {
        $listing = DB::table('shop_parts')->find($id);
        abort_unless($listing, 404);
        Access::shop($r->user(), DB::table('shop_branches')->find($listing->branch_id)->shop_id);

        return ['movements' => DB::table('inventory_movements')->where('shop_part_id', $id)->latest()->limit(100)->get(), 'prices' => DB::table('price_history')->where('shop_part_id',$id)->latest()->limit(100)->get()];
    }
}
