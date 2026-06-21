<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Jalali Calendar Helper
 * Pure PHP converter for Gregorian <-> Jalali calendar conversion.
 * Avoids dependency on PHP's intl extension for maximum reliability.
 */
class JalaliHelper
{
    private static array $jalaliMonths = [
        1 => 'فروردین',
        2 => 'اردیبهشت',
        3 => 'خرداد',
        4 => 'تیر',
        5 => 'مرداد',
        6 => 'شهریور',
        7 => 'مهر',
        8 => 'آبان',
        9 => 'آذر',
        10 => 'دی',
        11 => 'بهمن',
        12 => 'اسفند'
    ];

    /**
     * Convert Gregorian date components to Jalali
     */
    public static function gregorianToJalali(int $gy, int $gm, int $gd): array
    {
        $g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
        if ($gy > 1600) {
            $jy = 979;
            $gy -= 1600;
        } else {
            $jy = 0;
            $gy -= 621;
        }
        $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
        $days = (365 * $gy) + ((int)(($gy2 + 3) / 4)) - ((int)(($gy2 + 99) / 100)) + ((int)(($gy2 + 399) / 400)) - 80 + $gd + $g_d_m[$gm - 1];
        $jy += 33 * ((int)($days / 12053));
        $days %= 12053;
        $jy += 4 * ((int)($days / 1461));
        $days %= 1461;
        if ($days > 365) {
            $jy += (int)(($days - 1) / 365);
            $days = ($days - 1) % 365;
        }
        $jm = ($days < 186) ? 1 + (int)($days / 31) : 7 + (int)(($days - 186) / 30);
        $jd = 1 + (($days < 186) ? ($days % 31) : (($days - 186) % 30));
        return [$jy, $jm, $jd];
    }

    /**
     * Convert Jalali date components to Gregorian
     */
    public static function jalaliToGregorian(int $jy, int $jm, int $jd): array
    {
        if ($jy > 979) {
            $gy = 1600;
            $jy -= 979;
        } else {
            $gy = 621;
        }
        $days = (365 * $jy) + (((int)($jy / 33)) * 8) + ((int)((($jy % 33) + 3) / 4)) + 78 + $jd + (($jm < 7) ? ($jm - 1) * 31 : (($jm - 7) * 30) + 186);
        $gy += 400 * ((int)($days / 146097));
        $days %= 146097;
        if ($days > 36524) {
            $gy += 100 * ((int)(--$days / 36524));
            $days %= 36524;
            if ($days >= 365) {
                $days++;
            }
        }
        $gy += 4 * ((int)($days / 1461));
        $days %= 1461;
        if ($days > 365) {
            $gy += (int)(($days - 1) / 365);
            $days = ($days - 1) % 365;
        }
        $gd = $days + 1;
        $sal_a = [0, 31, (($gy % 4 === 0 && $gy % 100 !== 0) || ($gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        for ($gm = 0; $gm < 13 && $gd > $sal_a[$gm]; $gm++) {
            $gd -= $sal_a[$gm];
        }
        return [$gy, $gm, $gd];
    }

    /**
     * Convert standard YYYY-MM-DD Gregorian string to YYYY/MM/DD Jalali string.
     */
    public static function toJalaliString(?string $gregorianDateString): string
    {
        if (empty($gregorianDateString)) {
            return '';
        }

        // Handle full datetime strings by extracting just the date part
        $datePart = substr(trim($gregorianDateString), 0, 10);
        $parts = explode('-', $datePart);
        if (count($parts) !== 3) {
            return $gregorianDateString;
        }

        $gy = (int)$parts[0];
        $gm = (int)$parts[1];
        $gd = (int)$parts[2];

        if ($gy === 0 || $gm === 0 || $gd === 0) {
            return '';
        }

        [$jy, $jm, $jd] = self::gregorianToJalali($gy, $gm, $gd);

        return sprintf('%04d/%02d/%02d', $jy, $jm, $jd);
    }

    /**
     * Convert standard YYYY-MM-DD Gregorian string to a verbose Persian text (e.g. ۳۱ خرداد ۱۴۰۵).
     */
    public static function toJalaliText(?string $gregorianDateString): string
    {
        if (empty($gregorianDateString)) {
            return '';
        }

        $datePart = substr(trim($gregorianDateString), 0, 10);
        $parts = explode('-', $datePart);
        if (count($parts) !== 3) {
            return $gregorianDateString;
        }

        $gy = (int)$parts[0];
        $gm = (int)$parts[1];
        $gd = (int)$parts[2];

        if ($gy === 0 || $gm === 0 || $gd === 0) {
            return '';
        }

        [$jy, $jm, $jd] = self::gregorianToJalali($gy, $gm, $gd);
        $monthName = self::$jalaliMonths[$jm] ?? '';

        $text = "{$jd} {$monthName} {$jy}";
        return self::latinToPersianNumbers($text);
    }

    /**
     * Convert Jalali string (format YYYY/MM/DD or YYYY-MM-DD) to Gregorian date string YYYY-MM-DD.
     */
    public static function toGregorianString(?string $jalaliDateString): string
    {
        if (empty($jalaliDateString)) {
            return '';
        }

        // Normalize delimiters and Persian digits
        $normalized = str_replace('-', '/', trim($jalaliDateString));
        $normalized = self::persianToLatinNumbers($normalized);

        $parts = explode('/', $normalized);
        if (count($parts) !== 3) {
            return ''; // Invalid format
        }

        $jy = (int)$parts[0];
        $jm = (int)$parts[1];
        $jd = (int)$parts[2];

        if ($jy === 0 || $jm === 0 || $jd === 0) {
            return '';
        }

        [$gy, $gm, $gd] = self::jalaliToGregorian($jy, $jm, $jd);

        return sprintf('%04d-%02d-%02d', $gy, $gm, $gd);
    }

    /**
     * Replace Latin digits with Persian digits
     */
    public static function latinToPersianNumbers(string $str): string
    {
        $latin = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        $persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return str_replace($latin, $persian, $str);
    }

    /**
     * Replace Persian digits with Latin digits
     */
    public static function persianToLatinNumbers(string $str): string
    {
        $persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        $latin = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        return str_replace($persian, $latin, $str);
    }
}
