<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function garage(Request $r, CatalogService $catalog)
    {
        return ['data' => $catalog->variants()->join('user_vehicles as uv', 'uv.vehicle_variant_id', '=', 'v.id')->where('uv.user_id', $r->user()->id)->addSelect('uv.id as garage_id', 'uv.nickname')->get()];
    }

    public function saveVehicle(Request $r)
    {
        $d = $r->validate(['vehicle_variant_id' => 'required|integer|exists:vehicle_variants,id', 'nickname' => 'required|string|max:100']);
        DB::table('user_vehicles')->updateOrInsert(['user_id' => $r->user()->id, 'vehicle_variant_id' => $d['vehicle_variant_id']], $d + ['created_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => 'Vehicle saved.'], 201);
    }

    public function removeVehicle(Request $r, int $id)
    {
        abort_unless(DB::table('user_vehicles')->where('user_id', $r->user()->id)->where('id', $id)->delete(), 404);

        return response()->noContent();
    }

    public function favorites(Request $r, CatalogService $catalog)
    {
        return ['data' => $catalog->parts()->whereIn('parts.id', DB::table('favorites')->where('user_id', $r->user()->id)->select('part_id'))->get()];
    }

    public function favorite(Request $r, int $id)
    {
        abort_unless(DB::table('parts')->where('id', $id)->exists(), 404);
        DB::table('favorites')->insertOrIgnore(['user_id' => $r->user()->id, 'part_id' => $id, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => 'Part saved.'], 201);
    }

    public function unfavorite(Request $r, int $id)
    {
        DB::table('favorites')->where('user_id', $r->user()->id)->where('part_id', $id)->delete();

        return response()->noContent();
    }

    public function review(Request $r, int $id)
    {
        abort_unless(DB::table('shops')->where('id', $id)->where('status', 'active')->exists(), 404);
        $d = $r->validate(['rating' => 'required|integer|min:1|max:5', 'comment' => 'nullable|string|max:2000']);
        DB::table('shop_reviews')->updateOrInsert(['user_id' => $r->user()->id, 'shop_id' => $id], $d + ['created_at' => now(), 'updated_at' => now()]);

        return ['message' => 'Review saved.'];
    }

    public function notifications(Request $r)
    {
        $p = DB::table('notifications')->where('user_id', $r->user()->id)->latest()->paginate(50);
        $p->getCollection()->transform(function ($n) {
            $n->payload = json_decode($n->payload);

            return $n;
        });

        return $p;
    }

    public function readNotification(Request $r, int $id)
    {
        abort_unless(DB::table('notifications')->where('user_id', $r->user()->id)->where('id', $id)->update(['read_at' => now(), 'updated_at' => now()]), 404);

        return ['message' => 'Marked as read.'];
    }
}
