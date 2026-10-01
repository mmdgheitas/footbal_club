-- اقلام مالی و نگهداری قیمت تاریخی هر قلم در زمان صدور رسید
CREATE TABLE IF NOT EXISTS fc_financial_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_financial_items_active (is_active),
    UNIQUE KEY uq_financial_items_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fc_payment_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    financial_item_id INT NULL,
    item_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    line_total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_payment_financial_item (payment_id, financial_item_id),
    INDEX idx_payment_items_payment (payment_id),
    CONSTRAINT fk_payment_items_payment FOREIGN KEY (payment_id) REFERENCES fc_payments(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_payment_items_financial_item FOREIGN KEY (financial_item_id) REFERENCES fc_financial_items(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
