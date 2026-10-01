-- ایندکس‌های مستقل برای کلیدهای خارجی اقلام صورتحساب.
-- وجود این ایندکس‌ها باعث می‌شود ابزارهای بررسی Schema بتوانند ایندکس مرکب
-- را بدون برخورد با خطای ER_DROP_INDEX_FK بازسازی کنند.
ALTER TABLE fc_payment_items
    ADD INDEX idx_payment_items_payment_fk (payment_id),
    ADD INDEX idx_payment_items_financial_item_fk (financial_item_id);
