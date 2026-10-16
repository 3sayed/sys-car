<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ActiveUser
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user()?->status === 'active', 403, 'Account is inactive.');

        return $next($request);
    }
}
