<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('order');
});

Route::get('/order', function () {
    return view('order');
})->name('order');

Route::get('/poc/wire-bridge', function () {
    return view('poc.wire-bridge');
})->name('poc.wire-bridge');

Route::get('/poc/second-page', function () {
    return view('poc.second-page');
})->name('poc.second-page');
