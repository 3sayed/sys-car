<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CatalogService
{
    public static function normalize(string $number): string
    {
        return strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $number));
    }

    public function parts(?string $query = null, ?int $variant = null, ?int $category = null)
    {
        $q = DB::table('parts')->join('part_manufacturers as m', 'm.id', '=', 'parts.manufacturer_id')->join('part_categories as c', 'c.id', '=', 'parts.category_id')
            ->select('parts.*', 'm.name as manufacturer', 'c.name as category');
        if ($query) {
            $q->where(function ($q) use ($query) {
                $q->where('parts.name', 'like', "%{$query}%")->orWhere('parts.normalized_part_number', 'like', '%'.self::normalize($query).'%')
                    ->orWhereIn('parts.id', DB::table('part_cross_references')->where('reference_number', 'like', "%{$query}%")->select('part_id'));
            });
        }
        if ($variant) {
            $q->whereIn('parts.id', DB::table('part_compatibility')->where('vehicle_variant_id', $variant)->select('part_id'));
        }
        if ($category) {
            $q->where('parts.category_id', $category);
        }

        return $q->orderBy('parts.name');
    }

    public function listings(int $part)
    {
        return DB::table('shop_parts as sp')->join('shop_branches as b', 'b.id', '=', 'sp.branch_id')->join('shops as s', 's.id', '=', 'b.shop_id')
            ->where('sp.part_id', $part)->where('sp.status', 'active')->where('s.status', 'active')
            ->select('sp.*', 's.id as shop_id', 's.name as shop_name', 'b.name as branch_name', 'b.address', 'b.phone', 'b.latitude', 'b.longitude')
            ->orderBy('sp.currency')->orderBy('sp.price')->get()->map(fn ($row) => self::money($row));
    }

    public function images(int $part)
    {
        return DB::table('part_images')->where('part_id', $part)->orderBy('sort_order')->get()->map(function ($image) {
            $disk = Storage::disk(config('marketplace.asset_disk'));
            $image->url = config('marketplace.asset_disk') === 's3' ? $disk->temporaryUrl($image->image_path, now()->addMinutes(15)) : $disk->url($image->image_path);

            return $image;
        });
    }

    public static function money(object $row): object
    {
        $row->price = number_format((float) $row->price, 3, '.', '');

        return $row;
    }

    public function variants()
    {
        return DB::table('vehicle_variants as v')->join('vehicle_models as m', 'm.id', '=', 'v.model_id')->join('vehicle_makes as b','b.id','=','m.make_id')
            ->select('v.*','m.name as model','b.name as make')->orderBy('b.name')->orderBy('m.name');
    }
}
