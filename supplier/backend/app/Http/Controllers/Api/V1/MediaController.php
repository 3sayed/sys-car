<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function requestImage(Request $r, int $id)
    {
        abort_unless(DB::table('part_requests')->where('user_id', $r->user()->id)->where('status', 'open')->where('id', $id)->exists(), 404);
        abort_if(DB::table('part_request_images')->where('request_id', $id)->count() >= 5, 422, 'Maximum five images.');
        $r->validate(['image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120']);
        // Request photos stay on the private disk and require authorization to read.
        $path = $r->file('image')->store('request-images', 'local');
        $image = DB::table('part_request_images')->insertGetId(['request_id' => $id, 'image_path' => $path, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['id' => $image], 201);
    }

    public function show(Request $r, int $id)
    {
        $image = DB::table('part_request_images')->find($id);
        abort_unless($image, 404);
        $request = DB::table('part_requests')->find($image->request_id);
        abort_unless($request->user_id === $r->user()->id || count(Access::shopIds($r->user())) || $r->user()->hasRole('admin'), 403);

        return Storage::disk('local')->response($image->image_path);
    }
}
