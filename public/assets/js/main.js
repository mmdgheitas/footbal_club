/**
 * Football Club — Interactive UI + animations
 */

'use strict';

const APP = {
    baseUrl: window.location.origin,

    init() {
        document.body.classList.add('is-loaded');

        this.setupNav();
        this.setupMobileMenu();
        this.setupRipple();
        this.setupEventListeners();
        this.setupAjaxDefaults();
        this.initReveals();
        this.initBarCharts();
        this.initDashboardCounters();
        this.initMobileTables();
        this.initFloatingDecor();
        this.initJalaliInputs();
    },

    setupNav() {
        const toggle = document.getElementById('navToggle');
        const nav = document.getElementById('mainNav');
        const backdrop = document.getElementById('navBackdrop');

        if (!toggle) return;

        const closeNav = () => {
            nav?.classList.remove('is-open');
            backdrop?.classList.remove('is-active');
            toggle.textContent = '☰';
            toggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        };

        const openNav = () => {
            nav?.classList.add('is-open');
            backdrop?.classList.add('is-active');
            toggle.textContent = '✕';
            toggle.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        };

        toggle.addEventListener('click', () => {
            if (nav?.classList.contains('is-open')) {
                closeNav();
            } else {
                openNav();
            }
        });

        backdrop?.addEventListener('click', closeNav);

        nav?.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeNav);
        });
    },

    setupMobileMenu() {
        const moreBtn = document.getElementById('bottomNavMore');
        const menu = document.getElementById('mobileMenu');
        if (!moreBtn || !menu) return;

        moreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            menu.classList.toggle('is-open');
            moreBtn.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !moreBtn.contains(e.target)) {
                menu.classList.remove('is-open');
                moreBtn.classList.remove('active');
            }
        });
    },

    setupRipple() {
        document.querySelectorAll('.btn').forEach((btn) => {
            btn.addEventListener('click', function (e) {
                const rect = this.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                this.style.setProperty('--ripple-x', x + '%');
                this.style.setProperty('--ripple-y', y + '%');
            });
        });
    },

    setupEventListeners() {
        document.querySelectorAll('.alert-close').forEach((btn) => {
            btn.addEventListener('click', function () {
                const alert = this.closest('.alert');
                alert.style.animation = 'slideInAlert 0.3s ease reverse';
                setTimeout(() => alert.remove(), 280);
            });
        });

        document.querySelectorAll('form[data-ajax="true"]').forEach((form) => {
            if (form.id === 'playerForm' || form.id === 'medicalForm' || form.id === 'recordForm') return;
            form.addEventListener('submit', this.submitFormAjax.bind(this));
        });

        document.querySelectorAll('[data-confirm]').forEach((el) => {
            el.addEventListener('click', (e) => {
                if (!confirm(el.getAttribute('data-confirm'))) {
                    e.preventDefault();
                }
            });
        });

        const openRecord = document.getElementById('openRecordModal');
        const recordModal = document.getElementById('recordModal');
        const closeRecord = document.getElementById('closeRecordModal');
        const cancelRecord = document.getElementById('cancelRecord');

        const openModal = (modal) => {
            modal?.classList.add('is-open');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };
        const closeModal = (modal) => {
            modal?.classList.remove('is-open');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        };

        openRecord?.addEventListener('click', () => openModal(recordModal));
        closeRecord?.addEventListener('click', () => closeModal(recordModal));
        cancelRecord?.addEventListener('click', () => closeModal(recordModal));
        recordModal?.addEventListener('click', (e) => {
            if (e.target === recordModal) closeModal(recordModal);
        });
    },

    setupAjaxDefaults() {
        const csrfInput = document.querySelector('input[name="_csrf_token"]');
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        window.defaultCsrfToken = csrfInput?.value || csrfMeta?.content || '';
    },

    initReveals() {
        const targets = document.querySelectorAll(
            '.stat-card, .chart-container, .panel, .page-header, .quick-action-btn, .players-section, .financial-section, .attendance-section'
        );

        targets.forEach((el, i) => {
            el.classList.add('reveal');
            if (i % 4 < 4) el.classList.add('reveal-delay-' + ((i % 4) + 1));
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
        );

        document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

        document.querySelectorAll('table tbody tr').forEach((row, i) => {
            row.classList.add('reveal-row');
            row.style.transitionDelay = Math.min(i * 0.04, 0.4) + 's';
            observer.observe(row);
        });
    },

    initDashboardCounters() {
        document.querySelectorAll('[data-count]').forEach((el) => {
            const target = parseFloat(el.getAttribute('data-count')) || 0;
            const isMoney = el.hasAttribute('data-money');
            const duration = 1400;
            const start = performance.now();

            const tick = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                const current = target * eased;
                if (isMoney) {
                    el.textContent = '$' + current.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                } else {
                    el.textContent = Math.round(current).toLocaleString('fa-IR');
                }
                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.classList.add('celebrate');
                }
            };
            setTimeout(() => requestAnimationFrame(tick), 400);
        });
    },

    initBarCharts() {
        const bars = document.querySelectorAll('.bar-fill');
        bars.forEach((bar, index) => {
            const w = bar.getAttribute('data-width') || '0';
            bar.style.setProperty('--bar-target', w + '%');
            setTimeout(() => {
                bar.classList.add('is-animated');
            }, 300 + index * 80);
        });
    },

    initMobileTables() {
        if (window.innerWidth > 768) return;

        document.querySelectorAll('.table-wrap table').forEach((table) => {
            table.classList.add('table-mobile-cards');
            const headers = [];
            table.querySelectorAll('thead th').forEach((th) => {
                headers.push(th.textContent.trim());
            });
            table.querySelectorAll('tbody tr').forEach((tr) => {
                tr.querySelectorAll('td').forEach((td, i) => {
                    if (headers[i]) {
                        td.setAttribute('data-label', headers[i]);
                    }
                });
            });
        });
    },

    initFloatingDecor() {
        if (!document.querySelector('.dashboard')) return;
        const emojis = ['⚽', '🏆', '⭐'];
        emojis.forEach((emoji) => {
            const span = document.createElement('span');
            span.className = 'float-emoji';
            span.textContent = emoji;
            span.setAttribute('aria-hidden', 'true');
            document.body.appendChild(span);
        });
    },

    submitFormAjax(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) submitBtn.classList.add('loading');

        fetch(form.action, {
            method: form.method || 'POST',
            body: new FormData(form),
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((response) => {
                if (response.status === 403) {
                    window.location.href = (document.querySelector('meta[name="app-url"]')?.content || '') + '/403';
                    return null;
                }
                return response.json();
            })
            .then((data) => {
                if (!data) return;
                if (data.success) {
                    APP.showMessage('success', data.message || 'انجام شد! 🎉');
                    if (data.redirect) {
                        setTimeout(() => { window.location.href = data.redirect; }, 800);
                    }
                } else {
                    let msg = data.error || 'خطایی رخ داد';
                    if (data.errors?.length) msg = data.errors.join(' — ');
                    APP.showMessage('error', msg);
                }
            })
            .catch((error) => APP.showMessage('error', 'درخواست ناموفق: ' + error.message))
            .finally(() => {
                if (submitBtn) submitBtn.classList.remove('loading');
            });
    },

    showMessage(type, message) {
        const container = document.querySelector('.container') || document.body;
        const header = container.querySelector('.page-header');
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-' + type;
        alertDiv.style.animation = 'slideInAlert 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        alertDiv.innerHTML = `
            <span>${icons[type] || ''} ${message}</span>
            <button type="button" class="alert-close">&times;</button>
        `;
        alertDiv.querySelector('.alert-close').addEventListener('click', () => alertDiv.remove());

        if (header) {
            container.insertBefore(alertDiv, header);
        } else {
            container.prepend(alertDiv);
        }

        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.style.animation = 'slideInAlert 0.3s ease reverse';
                setTimeout(() => alertDiv.remove(), 280);
            }
        }, 5000);
    },

    async request(url, options = {}) {
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            ...(options.headers || {}),
        };

        if (window.defaultCsrfToken) {
            headers['X-CSRF-Token'] = window.defaultCsrfToken;
        }

        const body = options.body;
        const isFormBody = body instanceof FormData || body instanceof URLSearchParams;
        if (!isFormBody && body !== undefined && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
            method: options.method || 'GET',
            ...options,
            headers,
        });

        if (response.status === 403) {
            const base = document.querySelector('meta[name="app-url"]')?.content || '';
            window.location.href = base + '/403';
            return { error: 'Forbidden' };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    },

    initJalaliInputs() {
        document.querySelectorAll('.jalali-date-input').forEach((input) => {
            input.setAttribute('placeholder', 'مثال: ۱۴۰۵/۰۳/۳۱');
            input.setAttribute('maxlength', '10');
            
            // Format input as user types
            input.addEventListener('input', function() {
                let val = this.value;
                
                // Convert Persian numbers to English
                const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
                for (let i = 0; i < 10; i++) {
                    val = val.replace(persianDigits[i], i.toString());
                }
                // Strip non-digits
                val = val.replace(/[^0-9]/g, '');
                
                let formatted = '';
                if (val.length > 0) {
                    formatted = val.substring(0, 4);
                }
                if (val.length > 4) {
                    formatted += '/' + val.substring(4, 6);
                }
                if (val.length > 6) {
                    formatted += '/' + val.substring(6, 8);
                }
                this.value = formatted;
            });
            
            // Validate on blur
            input.addEventListener('blur', function() {
                if (this.value === '') return;
                const parts = this.value.split('/');
                let valid = false;
                if (parts.length === 3) {
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    const d = parseInt(parts[2], 10);
                    if (y >= 1300 && y <= 1500 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                        valid = true;
                    }
                }
                if (!valid) {
                    APP.showMessage('warning', 'تاریخ وارد شده معتبر نیست. لطفاً فرمت YYYY/MM/DD (مثل ۱۳۸۸/۰۵/۲۴) را رعایت کنید.');
                }
            });
        });
    },
};

document.addEventListener('DOMContentLoaded', () => APP.init());

window.addEventListener('resize', () => {
    APP.initMobileTables();
});
