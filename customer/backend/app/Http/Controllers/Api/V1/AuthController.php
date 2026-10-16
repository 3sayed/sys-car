<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $r)
    {
        $d = $r->validate(['name' => 'required|string|max:100', 'email' => 'required|email|max:255|unique:users', 'password' => 'required|string|min:10|max:128|confirmed', 'phone' => 'nullable|string|max:30']);
        $u = DB::transaction(function () use ($d) {
            $u = User::create($d);
            if (isset($d['phone'])) {
                $u->phone = $d['phone'];
                $u->save();
            }
            $role = DB::table('roles')->where('name', 'customer')->first();
            DB::table('user_roles')->insert(['user_id' => $u->id, 'role_id' => $role->id, 'created_at' => now(), 'updated_at' => now()]);

            return $u;
        });

        return response()->json($this->session($u), 201);
    }

    public function login(Request $r)
    {
        $d = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        $u = User::where('email', $d['email'])->first();
        if (! $u || ! Hash::check($d['password'], $u->password) || $u->status !== 'active') {
            throw ValidationException::withMessages(['email' => 'The credentials are invalid.']);
        }
        if (! $u->hasRole('customer')) {
            throw ValidationException::withMessages(['email' => 'This account cannot use the customer portal.']);
        }

        return $this->session($u);
    }

    private function session(User $u): array
    {
        return ['token' => $u->createToken('mobile', ['*'], now()->addDays(30))->plainTextToken, 'user' => $u];
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()?->delete();

        return response()->noContent();
    }

    public function me(Request $r)
    {
        return ['user' => $r->user(), 'roles' => DB::table('roles')->whereIn('id', DB::table('user_roles')->where('user_id', $r->user()->id)->select('role_id'))->pluck('name')];
    }

    public function update(Request $r)
    {
        $d = $r->validate(['name' => 'required|string|max:100', 'phone' => 'nullable|string|max:30']);
        $r->user()->forceFill($d)->save();

        return ['user' => $r->user()];
    }
}
