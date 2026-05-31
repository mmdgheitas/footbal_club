/**
 * Main JavaScript
 * PSR-12 compliant client-side interactions
 */

'use strict';

const APP = {
    baseUrl: window.location.origin,

    /**
     * Initialize application
     */
    init() {
        this.setupEventListeners();
        this.setupAjaxDefaults();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close alerts on click
        document.querySelectorAll('.alert-close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.parentElement.style.display = 'none';
            });
        });

        // Form submissions with AJAX
        document.querySelectorAll('form[data-ajax="true"]').forEach(form => {
            form.addEventListener('submit', this.submitFormAjax.bind(this));
        });

        // Delete confirmations
        document.querySelectorAll('a[data-confirm], button[data-confirm]').forEach(el => {
            el.addEventListener('click', (e) => {
                if (!confirm(el.getAttribute('data-confirm'))) {
                    e.preventDefault();
                }
            });
        });
    },

    /**
     * Setup AJAX defaults
     */
    setupAjaxDefaults() {
        // Set default CSRF token for all AJAX requests
        const csrfToken = document.querySelector('input[name="_csrf_token"]');
        if (csrfToken) {
            window.defaultCsrfToken = csrfToken.value;
        }
    },

    /**
     * Submit form via AJAX
     */
    submitFormAjax(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        fetch(form.action, {
            method: form.method || 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                APP.showMessage('success', data.message || 'Operation successful!');
                if (data.redirect) {
                    setTimeout(() => window.location.href = data.redirect, 1500);
                }
            } else {
                APP.showMessage('error', data.error || 'An error occurred');
            }
        })
        .catch(error => {
            APP.showMessage('error', 'Request failed: ' + error.message);
        });
    },

    /**
     * Show message alert
     */
    showMessage(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-' + type;
        alertDiv.innerHTML = `
            ${message}
            <button class="alert-close" onclick="this.parentElement.style.display='none';">&times;</button>
        `;
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.page-header'));

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    },

    /**
     * Make API request
     */
    async request(url, options = {}) {
        const defaults = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            }
        };

        if (window.defaultCsrfToken) {
            defaults.headers['X-CSRF-Token'] = window.defaultCsrfToken;
        }

        const config = { ...defaults, ...options };

        const response = await fetch(url, config);

        if (response.status === 403) {
            const base = document.querySelector('meta[name="app-url"]')?.content
                || window.location.pathname.replace(/\/[^/]*$/, '');
            window.location.href = base + '/403';
            return { error: 'Forbidden' };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => APP.init());
