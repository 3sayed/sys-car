<?php

use App\Http\Controllers\Api\V1\AIController;
use App\Http\Controllers\Api\V1\AdminMobileController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\RequestController;
use App\Http\Controllers\Api\V1\SimulationController;
use App\Http\Controllers\Api\V1\SupplierController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:api')->group(function () {
    Route::post('admin/login', [AdminMobileController::class, 'login'])->middleware('throttle:login');
    Route::get('admin/simulations/{id}/asset', [AdminMobileController::class, 'asset'])->middleware('signed')->whereNumber('id')->name('admin-mobile.asset');
    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:login');
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::get('vehicles', [CatalogController::class, 'vehicles']);
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('parts', [CatalogController::class, 'parts']);
    Route::get('parts/{id}', [CatalogController::class, 'part'])->whereNumber('id');
    Route::get('shops/{id}', [CatalogController::class, 'shop'])->whereNumber('id');
    Route::get('simulations', [SimulationController::class, 'index']);
    Route::get('simulations/{id}', [SimulationController::class, 'show'])->whereNumber('id');
    Route::get('simulations/{id}/model', [SimulationController::class, 'model'])->whereNumber('id');
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::prefix('admin')->middleware('administrator')->group(function () {
            Route::get('dashboard', [AdminMobileController::class, 'dashboard']);
            Route::get('simulations/{id}/preview', [AdminMobileController::class, 'preview'])->whereNumber('id');
            Route::post('{action}/{id?}', [AdminMobileController::class, 'action'])->whereNumber('id');
        });
        Route::get('me', [AuthController::class, 'me']);
        Route::patch('me', [AuthController::class, 'update']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('garage', [CustomerController::class, 'garage']);
        Route::post('garage', [CustomerController::class, 'saveVehicle']);
        Route::delete('garage/{id}', [CustomerController::class, 'removeVehicle']);
        Route::get('favorites', [CustomerController::class, 'favorites']);
        Route::put('favorites/{id}', [CustomerController::class, 'favorite']);
        Route::delete('favorites/{id}', [CustomerController::class, 'unfavorite']);
        Route::post('shops/{id}/reviews', [CustomerController::class, 'review']);
        Route::get('notifications', [CustomerController::class, 'notifications']);
        Route::patch('notifications/{id}', [CustomerController::class, 'readNotification']);
        Route::get('requests', [RequestController::class, 'index']);
        Route::post('requests', [RequestController::class, 'store']);
        Route::post('requests/{id}/cancel', [RequestController::class, 'cancel']);
        Route::post('requests/{id}/offers/{offer}/accept', [RequestController::class, 'accept']);
        Route::post('requests/{id}/images', [MediaController::class, 'requestImage']);
        Route::get('request-images/{id}', [MediaController::class, 'show']);
        Route::get('supplier/shops', [SupplierController::class, 'shops']);
        Route::post('supplier/shops', [SupplierController::class, 'createShop']);
        Route::patch('supplier/shops/{id}', [SupplierController::class, 'updateShop']);
        Route::post('supplier/shops/{id}/branches', [SupplierController::class, 'branch']);
        Route::post('supplier/shops/{id}/members', [SupplierController::class, 'member']);
        Route::delete('supplier/shops/{id}/members/{member}', [SupplierController::class, 'removeMember']);
        Route::get('supplier/inventory', [SupplierController::class, 'inventory']);
        Route::post('supplier/inventory', [SupplierController::class, 'saveInventory']);
        Route::patch('supplier/inventory/{id}', [SupplierController::class, 'saveInventory']);
        Route::get('supplier/inventory/{id}/history', [SupplierController::class, 'history']);
        Route::get('supplier/requests', [RequestController::class, 'supplier']);
        Route::post('supplier/requests/{id}/offers', [RequestController::class, 'offer']);
        Route::get('ai/conversations', [AIController::class, 'conversations']);
        Route::get('ai/conversations/{id}', [AIController::class, 'messages']);
        Route::post('ai/chat',[AIController::class, 'chat'])->middleware('throttle:ai');
    });
});
