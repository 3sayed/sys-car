<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Access;
use App\Services\CatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequestController extends Controller
{
    public function index(Request $r)
    {
        $q = DB::table('part_requests')->where('user_id', $r->user()->id)->latest()->paginate(30);
        $q->getCollection()->transform(fn ($x) => $this->details($x));

        return $q;
    }

    public function supplier(Request $r)
    {
        $shops = Access::shopIds($r->user());
        abort_unless(count($shops), 403);
        $q = DB::table('part_requests')->where('status', 'open')->latest()->paginate(30);
        $q->getCollection()->transform(function ($x) use ($shops) {
            unset($x->user_id);
            $x->vehicle = (new CatalogService)->variants()->where('v.id', $x->vehicle_variant_id)->first();
            $x->offers = DB::table('request_offers')->where('request_id', $x->id)->whereIn('shop_id', $shops)->get()->map(fn ($o) => CatalogService::money($o));
            $x->images = DB::table('part_request_images')->where('request_id', $x->id)->get();

            return $x;
        });

        return $q;
    }

    private function details(object $x): object
    {
        $x->vehicle = (new CatalogService)->variants()->where('v.id', $x->vehicle_variant_id)->first();
        $x->offers = DB::table('request_offers as o')->join('shops as s', 's.id', '=', 'o.shop_id')->where('request_id', $x->id)->select('o.*', 's.name as shop_name')->get()->map(fn ($o) => CatalogService::money($o));
        $x->images = DB::table('part_request_images')->where('request_id', $x->id)->get();

        return $x;
    }

    public function store(Request $r)
    {
        $d = $r->validate(['vehicle_variant_id' => 'required|integer|exists:vehicle_variants,id', 'part_id' => 'nullable|integer|exists:parts,id', 'description' => 'required|string|min:10|max:3000', 'quantity' => 'required|integer|min:1|max:999']);
        if (! empty($d['part_id'])) {
            abort_unless(DB::table('part_compatibility')->where('part_id', $d['part_id'])->where('vehicle_variant_id', $d['vehicle_variant_id'])->exists(), 422, 'This part has no recorded fitment for your vehicle.');
        }
        $id = DB::transaction(function () use ($r, $d) {
            $id = DB::table('part_requests')->insertGetId($d + ['user_id' => $r->user()->id, 'status' => 'open', 'created_at' => now(), 'updated_at' => now()]);
            $users = DB::table('shops')->where('status', 'active')->pluck('owner_id')->merge(DB::table('shop_members')->whereIn('shop_id', DB::table('shops')->where('status', 'active')->select('id'))->pluck('user_id'))->unique();
            foreach ($users as $u) {
                Access::notify($u, 'part_request', ['request_id' => $id, 'message' => 'New part request: '.$d['description']]);
            }

            return $id;
        });

        return response()->json($this->details(DB::table('part_requests')->find($id)), 201);
    }

    public function offer(Request $r, int $id)
    {
        $d = $r->validate(['shop_id' => 'required|integer|exists:shops,id', 'price' => ['required', 'numeric', 'decimal:0,3', 'min:0.001', 'max:999999999.999'], 'currency' => 'required|in:BHD,SAR,AED,USD', 'availability' => 'required|in:available_now,by_order']);
        Access::shop($r->user(), $d['shop_id']);

        return DB::transaction(function () use ($d, $id) {
            $req = DB::table('part_requests')->lockForUpdate()->find($id);
            abort_unless($req, 404);
            abort_unless($req->status === 'open', 409, 'Request is closed.');
            DB::table('request_offers')->updateOrInsert(['request_id' => $id, 'shop_id' => $d['shop_id']], $d + ['status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);
            Access::notify($req->user_id, 'quotation', ['request_id' => $id, 'message' => 'A supplier sent a quotation.']);

            return ['message' => 'Quotation sent.'];
        });
    }

    public function accept(Request $r, int $id, int $offer)
    {
        return DB::transaction(function () use ($r, $id, $offer) {
            $req = DB::table('part_requests')->lockForUpdate()->where('user_id', $r->user()->id)->find($id);
            abort_unless($req, 404);
            abort_unless($req->status === 'open', 409, 'Request is closed.');
            $o = DB::table('request_offers')->where('request_id', $id)->where('status', 'pending')->find($offer);
            abort_unless($o, 404);
            $shop = DB::table('shops')->where('status', 'active')->find($o->shop_id);
            abort_unless($shop, 409, 'Supplier is unavailable.');
            DB::table('request_offers')->where('request_id', $id)->update(['status' => 'declined', 'updated_at' => now()]);
            DB::table('request_offers')->where('id', $offer)->update(['status' => 'accepted', 'updated_at' => now()]);
            DB::table('part_requests')->where('id', $id)->update(['status' => 'fulfilled', 'updated_at' => now()]);
            Access::notify($shop->owner_id, 'offer_accepted', ['request_id' => $id, 'message' => 'Your quotation was accepted. Contact the customer through the agreed shop channel.']);

            return ['message' => 'Quotation accepted. Contact the shop to arrange purchase.'];
        });
    }

    public function cancel(Request $r, int $id)
    {
        return DB::transaction(function () use ($r, $id) {
            $req = DB::table('part_requests')->lockForUpdate()->where('user_id', $r->user()->id)->find($id);
            abort_unless($req, 404);
            abort_unless($req->status === 'open', 409, 'Request is closed.');
            DB::table('part_requests')->where('id', $id)->update(['status' => 'cancelled', 'updated_at' => now()]);
            DB::table('request_offers')->where('request_id',$id)->update(['status' => 'declined', 'updated_at' => now()]);

            return ['message' => 'Request cancelled.'];
        });
    }
}
