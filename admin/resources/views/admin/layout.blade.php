<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101112"><title>infiCarX / Administration</title><link rel="stylesheet" href="/admin.css"></head>
<body><header class="border-b border-line bg-panel/70"><div class="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4 px-6 py-5"><a class="text-2xl font-black tracking-tight text-white" href="/admin">infiCar<span class="text-lime">X</span><span class="text-xs text-stone-400 font-medium uppercase tracking-widest ml-3">/ administration</span></a>@auth<form method="post" action="/admin/logout">@csrf<button>Sign out</button></form>@endauth</div></header>
<main class="mx-auto max-w-7xl px-6 py-9 md:py-12 space-y-8">
@if(session('status'))<div class="card border-lime text-lime" role="status">{{ session('status') }}</div>@endif
@if($errors->any())<div class="card text-red-300" role="alert">@foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach</div>@endif
@yield('content')</main><footer class="mx-auto max-w-7xl p-6 muted">infiCarX · Catalog, suppliers & simulation review</footer></body></html>
