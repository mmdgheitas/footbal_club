/**
 * Jalali (Shamsi) date picker - self-contained, no dependencies.
 *
 * Every date entry point in the app uses this. The visible input is readonly so
 * a date can only be chosen from the calendar, never typed.
 *
 * Markup contract, per field:
 *   <input type="hidden" class="jalali-date-value" id="X" name="X"
 *          data-format="gregorian|jalali" value="...">
 *   <input type="text" class="jalali-date-input" data-for="X" readonly>
 *
 * The hidden input keeps the original id/name so existing form posts and any JS
 * reading `#X.value` keep working; it always holds the SUBMIT format. The
 * visible input shows Persian digits and is what the user interacts with.
 */
(function () {
  'use strict';

  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  // --- conversion: byte-identical port of JalaliHelper -------------------
  function trunc(n) { return Math.trunc(n); }

  function gregorianToJalali(gy, gm, gd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
    var jy;
    if (gy > 1600) { jy = 979; gy -= 1600; } else { jy = 0; gy -= 621; }
    var gy2 = gm > 2 ? gy + 1 : gy;
    var days = 365 * gy + trunc((gy2 + 3) / 4) - trunc((gy2 + 99) / 100) +
               trunc((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * trunc(days / 12053); days %= 12053;
    jy += 4 * trunc(days / 1461);   days %= 1461;
    if (days > 365) { jy += trunc((days - 1) / 365); days = (days - 1) % 365; }
    var jm = days < 186 ? 1 + trunc(days / 31) : 7 + trunc((days - 186) / 30);
    var jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
  }

  function jalaliToGregorian(jy, jm, jd) {
    var gy;
    if (jy > 979) { gy = 1600; jy -= 979; } else { gy = 621; }
    var days = 365 * jy + trunc(jy / 33) * 8 + trunc(((jy % 33) + 3) / 4) +
               78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
    gy += 400 * trunc(days / 146097); days %= 146097;
    if (days > 36524) {
      days = days - 1;
      gy += 100 * trunc(days / 36524);
      days %= 36524;
      if (days >= 365) days++;
    }
    gy += 4 * trunc(days / 1461); days %= 1461;
    if (days > 365) { gy += trunc((days - 1) / 365); days = (days - 1) % 365; }
    var gd = days + 1;
    var sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28,
                 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gm = 0;
    for (; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return [gy, gm, gd];
  }

  function toPersianDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) {
      return String.fromCharCode(0x06F0 + parseInt(d, 10));
    });
  }
  function toLatinDigits(s) {
    return String(s).replace(/[\u06F0-\u06F9\u0660-\u0669]/g, function (d) {
      var c = d.charCodeAt(0);
      return String(c >= 0x06F0 ? c - 0x06F0 : c - 0x0660);
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  function jalaliToText(y, m, d) { return toPersianDigits(y + '/' + pad(m) + '/' + pad(d)); }

  /** Days in a Jalali month, derived by round-tripping through the same
   *  conversion the server uses, so client and server can never disagree. */
  function daysInJalaliMonth(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    var g = jalaliToGregorian(jy, 12, 30);
    var back = gregorianToJalali(g[0], g[1], g[2]);
    return (back[1] === 12 && back[2] === 30) ? 30 : 29;
  }

  /** Weekday index of a Jalali date, Saturday-first (Iranian week). */
  function jalaliWeekday(jy, jm, jd) {
    var g = jalaliToGregorian(jy, jm, jd);
    var jsDay = new Date(g[0], g[1] - 1, g[2]).getDay(); // 0=Sunday
    return (jsDay + 1) % 7;                              // 0=Saturday
  }

  function todayJalali() {
    var n = new Date();
    return gregorianToJalali(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }

  // --- value <-> Jalali, honouring data-format --------------------------
  function parseSubmit(value, format) {
    var s = toLatinDigits(String(value || '')).trim();
    if (!s) return null;
    var parts = s.replace(/-/g, '/').split('/');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    if (!y || !m || !d) return null;
    if (format === 'gregorian') {
      // Stored as YYYY-MM-DD; show it as Jalali.
      return gregorianToJalali(y, m, d);
    }
    return [y, m, d];
  }

  function formatSubmit(jy, jm, jd, format) {
    if (format === 'gregorian') {
      var g = jalaliToGregorian(jy, jm, jd);
      return g[0] + '-' + pad(g[1]) + '-' + pad(g[2]);
    }
    return jy + '/' + pad(jm) + '/' + pad(jd);
  }

  // --- picker UI --------------------------------------------------------
  var open = null;

  function closePicker() {
    if (!open) return;
    open.el.remove();
    open = null;
  }

  function render(state, ctx) {
    var jy = state.jy, jm = state.jm;
    var grid = ctx.grid;
    grid.textContent = '';

    ctx.title.textContent = MONTHS[jm - 1] + ' ' + toPersianDigits(jy);

    var first = jalaliWeekday(jy, jm, 1);
    var total = daysInJalaliMonth(jy, jm);
    var today = todayJalali();

    for (var i = 0; i < first; i++) {
      var blank = document.createElement('button');
      blank.type = 'button';
      blank.className = 'jdp-cell jdp-blank';
      blank.disabled = true;
      blank.tabIndex = -1;
      grid.appendChild(blank);
    }

    for (var d = 1; d <= total; d++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'jdp-cell';
      btn.textContent = toPersianDigits(d);
      btn.dataset.day = String(d);
      btn.tabIndex = -1;
      if (jy === today[0] && jm === today[1] && d === today[2]) btn.classList.add('jdp-today');
      if (state.jd === d) { btn.classList.add('jdp-selected'); btn.tabIndex = 0; }
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        select(ctx, jy, jm, parseInt(this.dataset.day, 10));
      });
      grid.appendChild(btn);
    }
  }

  function moveFocus(ctx, offsetDays) {
    var cells = Array.prototype.slice.call(ctx.grid.querySelectorAll('.jdp-cell:not(.jdp-blank)'));
    if (!cells.length) return;
    var idx = cells.findIndex(function (c) { return c.classList.contains('jdp-selected'); });
    if (idx < 0) idx = cells.findIndex(function (c) { return c.tabIndex === 0; });
    if (idx < 0) idx = 0;
    var next = idx + offsetDays;
    if (next < 0 || next >= cells.length) {
      shiftMonth(ctx, next < 0 ? -1 : 1);
      cells = Array.prototype.slice.call(ctx.grid.querySelectorAll('.jdp-cell:not(.jdp-blank)'));
      next = next < 0 ? cells.length - 1 : 0;
    }
    cells.forEach(function (c) { c.classList.remove('jdp-selected'); c.tabIndex = -1; });
    cells[next].classList.add('jdp-selected');
    cells[next].tabIndex = 0;
    cells[next].focus();
    ctx.state.jd = parseInt(cells[next].dataset.day, 10);
  }

  function shiftMonth(ctx, delta) {
    var jm = ctx.state.jm + delta;
    var jy = ctx.state.jy;
    while (jm < 1) { jm += 12; jy--; }
    while (jm > 12) { jm -= 12; jy++; }
    ctx.state.jm = jm;
    ctx.state.jy = jy;
    var max = daysInJalaliMonth(jy, jm);
    if (ctx.state.jd > max) ctx.state.jd = max;
    render(ctx.state, ctx);
  }

  function select(ctx, jy, jm, jd) {
    ctx.state.jy = jy; ctx.state.jm = jm; ctx.state.jd = jd;
    ctx.hidden.value = formatSubmit(jy, jm, jd, ctx.format);
    ctx.input.value = jalaliToText(jy, jm, jd);
    ctx.input.dispatchEvent(new Event('change', { bubbles: true }));
    ctx.hidden.dispatchEvent(new Event('change', { bubbles: true }));
    closePicker();
  }

  function openPicker(input, hidden) {
    closePicker();
    var format = hidden.dataset.format || 'jalali';
    var current = parseSubmit(hidden.value, format) || todayJalali();
    var state = { jy: current[0], jm: current[1], jd: current[2] };

    var el = document.createElement('div');
    el.className = 'jdp-popup';
    el.setAttribute('dir', 'rtl');
    el.innerHTML =
      '<div class="jdp-head">' +
        '<button type="button" class="jdp-nav" data-nav="-12" title="سال قبل">&laquo;</button>' +
        '<button type="button" class="jdp-nav" data-nav="-1" title="ماه قبل">&lsaquo;</button>' +
        '<span class="jdp-title"></span>' +
        '<button type="button" class="jdp-nav" data-nav="1" title="ماه بعد">&rsaquo;</button>' +
        '<button type="button" class="jdp-nav" data-nav="12" title="سال بعد">&raquo;</button>' +
      '</div>' +
      '<div class="jdp-weekdays"></div>' +
      '<div class="jdp-grid"></div>' +
      '<div class="jdp-foot">' +
        '<button type="button" class="jdp-today-btn">امروز</button>' +
        '<button type="button" class="jdp-clear">پاک کردن</button>' +
      '</div>';

    var weekdays = el.querySelector('.jdp-weekdays');
    WEEKDAYS.forEach(function (w) {
      var s = document.createElement('span');
      s.textContent = w;
      weekdays.appendChild(s);
    });

    var ctx = {
      el: el, input: input, hidden: hidden, format: format, state: state,
      grid: el.querySelector('.jdp-grid'),
      title: el.querySelector('.jdp-title'),
    };

    el.querySelectorAll('.jdp-nav').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var n = parseInt(this.dataset.nav, 10);
        if (n === 12 || n === -12) { ctx.state.jy += n / 12; render(ctx.state, ctx); }
        else shiftMonth(ctx, n);
      });
    });
    el.querySelector('.jdp-today-btn').addEventListener('click', function (ev) {
      ev.stopPropagation();
      var t = todayJalali();
      select(ctx, t[0], t[1], t[2]);
    });
    el.querySelector('.jdp-clear').addEventListener('click', function (ev) {
      ev.stopPropagation();
      ctx.hidden.value = '';
      ctx.input.value = '';
      ctx.input.dispatchEvent(new Event('change', { bubbles: true }));
      ctx.hidden.dispatchEvent(new Event('change', { bubbles: true }));
      closePicker();
    });

    el.addEventListener('keydown', function (ev) {
      var k = ev.key;
      if (k === 'Escape') { ev.preventDefault(); closePicker(); ctx.input.focus(); return; }
      if (k === 'Enter' || k === ' ') {
        ev.preventDefault();
        select(ctx, ctx.state.jy, ctx.state.jm, ctx.state.jd);
        return;
      }
      if (k === 'ArrowLeft')  { ev.preventDefault(); moveFocus(ctx, 1);  return; }  // RTL: left = forward
      if (k === 'ArrowRight') { ev.preventDefault(); moveFocus(ctx, -1); return; }
      if (k === 'ArrowUp')    { ev.preventDefault(); moveFocus(ctx, -7); return; }
      if (k === 'ArrowDown')  { ev.preventDefault(); moveFocus(ctx, 7);  return; }
      if (k === 'PageUp')     { ev.preventDefault(); shiftMonth(ctx, -1); return; }
      if (k === 'PageDown')   { ev.preventDefault(); shiftMonth(ctx, 1);  return; }
    });

    el.addEventListener('click', function (ev) { ev.stopPropagation(); });

    var rect = input.getBoundingClientRect();
    el.style.position = 'absolute';
    el.style.top = (window.scrollY + rect.bottom + 4) + 'px';
    el.style.left = (window.scrollX + rect.left) + 'px';
    document.body.appendChild(el);

    render(state, ctx);
    open = { el: el };

    var sel = el.querySelector('.jdp-selected');
    if (sel) sel.focus(); else input.focus();
  }

  function init(root) {
    (root || document).querySelectorAll('.jalali-date-input').forEach(function (input) {
      if (input.dataset.jdpBound === '1') return;
      input.dataset.jdpBound = '1';

      // Typing must not be possible: the calendar is the only input path.
      input.setAttribute('readonly', 'readonly');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('inputmode', 'none');
      if (!input.getAttribute('placeholder')) input.setAttribute('placeholder', 'انتخاب تاریخ');

      var target = input.dataset.for ? document.getElementById(input.dataset.for) : null;
      if (!target) {
        // Fall back to the adjacent hidden value input.
        target = input.parentElement
          ? input.parentElement.querySelector('.jalali-date-value')
          : null;
      }
      if (!target) return;

      var format = target.dataset.format || 'jalali';
      var parsed = parseSubmit(target.value, format);
      if (parsed) input.value = jalaliToText(parsed[0], parsed[1], parsed[2]);

      input.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (open && open.el && open.el.dataset.owner === input.id) { closePicker(); return; }
        openPicker(input, target);
      });
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
          ev.preventDefault();
          openPicker(input, target);
        }
      });
      // readonly blocks keystrokes, but block paste/drop too.
      input.addEventListener('paste', function (ev) { ev.preventDefault(); });
      input.addEventListener('drop', function (ev) { ev.preventDefault(); });
    });
  }

  document.addEventListener('click', function () { closePicker(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }

  // Expose for tests and for forms rendered after load.
  window.JalaliPicker = {
    init: init,
    gregorianToJalali: gregorianToJalali,
    jalaliToGregorian: jalaliToGregorian,
    daysInJalaliMonth: daysInJalaliMonth,
    formatSubmit: formatSubmit,
    parseSubmit: parseSubmit,
  };
})();
