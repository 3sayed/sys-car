<?php

use App\Http\Controllers\AdminController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect('/admin'));
Route::get('/admin/login', fn () => view('admin.login'))->name('login');
Route::post('/admin/login', [AdminController::class, 'login'])->middleware('throttle:login');
Route::prefix('admin')->middleware(['auth', 'active', 'administrator'])->group(function () {
    Route::get('/', [AdminController::class, 'index']);
    Route::post('/logout', [AdminController::class, 'logout']);
    Route::post('/sources', [AdminController::class, 'source']);
    Route::post('/vehicles', [AdminController::class, 'vehicle']);
    Route::post('/taxonomy', [AdminController::class, 'taxonomy']);
    Route::post('/part-images', [AdminController::class, 'partImage']);
    Route::post('/imports', [AdminController::class, 'import']);
    Route::post('/parts', [AdminController::class, 'part']);
    Route::post('/shops/{id}/status', [AdminController::class, 'shopStatus']);
    Route::post('/models', [AdminController::class, 'uploadModel']);
    Route::post('/procedures', [AdminController::class, 'procedure']);
    Route::post('/simulations', [AdminController::class, 'simulate']);
    Route::post('/procedures/{id}/review', [AdminController::class, 'review']);
    Route::get('/simulations/{id}/preview', [AdminController::class, 'preview']);
    Route::get('/simulations/{id}/asset',[AdminController::class, 'asset']);
});
