<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AIService;
use App\Services\CatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AIController extends Controller
{
    public function conversations(Request $r)
    {
        return ['data' => DB::table('ai_conversations')->where('user_id', $r->user()->id)->latest()->limit(50)->get()];
    }

    public function messages(Request $r, int $id)
    {
        abort_unless(DB::table('ai_conversations')->where('user_id', $r->user()->id)->where('id', $id)->exists(), 404);

        return ['data' => DB::table('ai_messages')->where('conversation_id', $id)->orderBy('id')->get()];
    }

    public function chat(Request $r, CatalogService $catalog, AIService $ai)
    {
        $d = $r->validate(['message' => 'required|string|min:2|max:2000', 'vehicle_variant_id' => 'required|integer|exists:vehicle_variants,id', 'conversation_id' => 'nullable|integer']);
        $cid = $d['conversation_id'] ?? null;
        if ($cid) {
            abort_unless(DB::table('ai_conversations')->where('id', $cid)->where('user_id', $r->user()->id)->exists(), 404);
        }
        $history = $cid ? DB::table('ai_messages')->where('conversation_id', $cid)->orderByDesc('id')->limit(10)->get(['role', 'content'])->reverse()->values()->map(fn ($x) => (array) $x)->all() : [];
        $query = null;
        foreach (['brake', 'filter', 'alternator', 'battery', 'spark', 'belt'] as $term) {
            if (str_contains(strtolower($d['message']), $term)) {
                $query = $term;
                break;
            }
        }
        $parts = $catalog->parts($query ?? $d['message'], $d['vehicle_variant_id'])->limit(8)->get()->all();
        $vehicle = $catalog->variants()->where('v.id', $d['vehicle_variant_id'])->first();
        try {
            $answer = $ai->reply($d['message'], $history, $vehicle, $parts);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'The AI provider is unavailable. Please retry or search the marketplace.'], 503);
        }
        $cid = DB::transaction(function () use ($r, $cid, $d, $answer) {
            $cid ??= DB::table('ai_conversations')->insertGetId(['user_id' => $r->user()->id, 'title' => mb_substr($d['message'], 0, 100), 'created_at' => now(), 'updated_at' => now()]);
            foreach (['user' => $d['message'], 'assistant' => $answer['content']] as $role => $content) {
                DB::table('ai_messages')->insert(['conversation_id' => $cid, 'role' => $role, 'content' => $content, 'created_at' => now(), 'updated_at' => now()]);
            }

            return $cid;
        });

        return $answer + ['conversation_id' => $cid, 'parts' => $parts];
    }
}
