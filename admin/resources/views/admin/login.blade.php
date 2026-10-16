@extends('admin.layout')
@section('content')
<div class="max-w-lg mx-auto py-10 md:py-16">
  <div class="admin-hero mb-6"><div class="relative z-10"><p class="text-lime text-xs tracking-widest uppercase mb-4">Administration / control center</p><h1 class="text-4xl md:text-5xl font-bold tracking-tight leading-tight">A clearer view of the road ahead.</h1><p class="text-stone-300 mt-4">The whole marketplace, at your fingertips.</p></div></div>
  <form method="post" action="/admin/login" class="card form">@csrf<h2>Administrator sign in</h2><label>Email<input name="email" type="email" value="{{ old('email') }}" required autocomplete="username"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><button>Sign in</button></form>
  @env('local')<p class="muted mt-6">Demo: admin@inficarx.test / DemoPass123!</p>@endenv
</div>
@endsection
