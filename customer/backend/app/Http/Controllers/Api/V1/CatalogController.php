<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function __construct(private CatalogService $catalog) {}

    public function vehicles()
    {
        return $this->catalog->variants()->paginate(100);
    }

    public function categories()
    {
        return ['data' => DB::table('part_categories')->orderBy('name')->get()];
    }

    public function parts(Request $r)
    {
        $d = $r->validate(['q' => 'nullable|string|max:100', 'vehicle_variant_id' => 'nullable|integer|exists:vehicle_variants,id', 'category_id' => 'nullable|integer|exists:part_categories,id']);
        $p = $this->catalog->parts($d['q'] ?? null, $d['vehicle_variant_id'] ?? null, $d['category_id'] ?? null)->paginate(24);
        $p->getCollection()->transform(function ($part) {
            $part->listings = $this->catalog->listings($part->id);
            $part->images = $this->catalog->images($part->id);

            return $part;
        });

        return $p;
    }

    public function part(int $id)
    {
        $p = $this->catalog->parts()->where('parts.id', $id)->first();
        abort_unless($p, 404);
        $p->listings = $this->catalog->listings($id);
        $p->images = $this->catalog->images($id);
        $p->compatibility = DB::table('part_compatibility')->where('part_id', $id)->get();
        $p->attributes = DB::table('part_attributes')->where('part_id', $id)->get();
        $p->cross_references = DB::table('part_cross_references')->where('part_id', $id)->get();

        return $p;
    }

    public function shop(int $id)
    {
        $s = DB::table('shops')->where('status', 'active')->find($id);
        abort_unless($s, 404);
        unset($s->owner_id);
        $s->branches = DB::table('shop_branches')->where('shop_id', $id)->get();
        $s->reviews = DB::table('shop_reviews')->where('shop_id', $id)->select('rating', 'comment', 'created_at')->latest()->limit(50)->get();

        return $s;
    }
}
