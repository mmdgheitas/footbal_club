-- افزایش ظرفیت توضیحات صورتحساب بدون حذف یا تغییر داده‌های موجود
ALTER TABLE fc_payments MODIFY COLUMN description TEXT NULL;
