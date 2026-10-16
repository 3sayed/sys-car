<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class Access
{
    public static function shopIds(User $user): array
    {
        return DB::table('shops')->where('status', 'active')->where(function ($q) use ($user) {
            $q->where('owner_id', $user->id)->orWhereIn('id', DB::table('shop_members')->where('user_id', $user->id)->select('shop_id'));
        })->pluck('id')->all();
    }

    public static function shop(User $user, int $id, bool $manage = false): object
    {
        $shop = DB::table('shops')->find($id);
        abort_unless($shop && $shop->status === 'active', 404);
        $member = DB::table('shop_members')->where('shop_id', $id)->where('user_id', $user->id)->first();
        abort_unless($shop->owner_id === $user->id || ($member && (! $manage || $member->role === 'manager')), 403, 'You do not have permission for this shop.');

        return $shop;
    }

    public static function admin(User $user): void
    {
        abort_unless($user->hasRole('admin'), 403);
    }

    public static function notify(int $user, string $type, array $payload): void
    {
        DB::table('notifications')->insert(['user_id' => $user, 'type' => $type, 'payload' => json_encode($payload), 'created_at' => now(), 'updated_at' => now()]);
    }
}
