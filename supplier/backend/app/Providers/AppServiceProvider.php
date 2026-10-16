<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', fn ($r) => Limit::perMinute(120)->by($r->user()?->id ?? $r->ip()));
        RateLimiter::for('login', fn ($r) => [
            Limit::perMinute(30)->by('ip:'.$r->ip()),
            Limit::perMinute(5)->by('account:'.$r->ip().':'.strtolower((string) $r->input('email'))),
        ]);
        RateLimiter::for('ai', fn ($r) => Limit::perMinute(10)->by($r->user()?->id ?? $r->ip()));
    }
}
