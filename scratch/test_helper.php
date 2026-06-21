<?php

define('BASE_PATH', dirname(__DIR__));
define('APP_PATH', BASE_PATH . '/app');
define('CONFIG_PATH', BASE_PATH . '/config');

require_once APP_PATH . '/Core/Autoloader.php';
\App\Core\Autoloader::register();

use App\Helpers\JalaliHelper;

// Test standard date: 2026-06-21 -> 1405/03/31
$gDate = '2026-06-21';
$jDate = JalaliHelper::toJalaliString($gDate);
$jText = JalaliHelper::toJalaliText($gDate);
$backToG = JalaliHelper::toGregorianString($jDate);

echo "Gregorian: {$gDate}\n";
echo "Jalali: {$jDate}\n";
echo "Jalali Text: {$jText}\n";
echo "Back to Gregorian: {$backToG}\n";

if ($backToG === $gDate) {
    echo "SUCCESS: Conversion matches!\n";
} else {
    echo "FAILURE: Mismatch in date conversion!\n";
    exit(1);
}
