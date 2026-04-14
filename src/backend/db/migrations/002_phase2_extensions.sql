ALTER TABLE order_items ADD COLUMN color VARCHAR(80) NULL;
ALTER TABLE order_items ADD COLUMN brand VARCHAR(80) NULL;
ALTER TABLE order_items ADD COLUMN size_reference VARCHAR(80) NULL;
ALTER TABLE order_items ADD COLUMN material VARCHAR(80) NULL;
ALTER TABLE order_items ADD COLUMN received_condition TEXT NULL;
ALTER TABLE order_items ADD COLUMN work_detail TEXT NULL;
ALTER TABLE order_items ADD COLUMN stains TEXT NULL;
ALTER TABLE order_items ADD COLUMN damages TEXT NULL;
ALTER TABLE order_items ADD COLUMN missing_accessories TEXT NULL;
ALTER TABLE order_items ADD COLUMN customer_observations TEXT NULL;
ALTER TABLE order_items ADD COLUMN internal_observations TEXT NULL;
ALTER TABLE order_items ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN surcharge_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN total DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE invoices ADD COLUMN legal_text TEXT NULL;
ALTER TABLE invoices ADD COLUMN whatsapp_sent_at DATETIME NULL;

ALTER TABLE delivery_records ADD COLUMN receiver_document VARCHAR(60) NULL;
ALTER TABLE delivery_records ADD COLUMN receiver_phone VARCHAR(30) NULL;
ALTER TABLE delivery_records ADD COLUMN relationship_to_client VARCHAR(80) NULL;
ALTER TABLE delivery_records ADD COLUMN receiver_signature TEXT NULL;

INSERT INTO order_statuses (code, name, color, is_final)
SELECT 'RECEIVED', 'Recibido', 'slate', 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM order_statuses WHERE code = 'RECEIVED');

INSERT INTO order_statuses (code, name, color, is_final)
SELECT 'READY_FOR_DELIVERY', 'Listo para entregar', 'green', 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM order_statuses WHERE code = 'READY_FOR_DELIVERY');

INSERT INTO order_statuses (code, name, color, is_final)
SELECT 'WARRANTY', 'En garantía', 'amber', 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM order_statuses WHERE code = 'WARRANTY');

INSERT INTO order_statuses (code, name, color, is_final)
SELECT 'CANCELED', 'Cancelado', 'red', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM order_statuses WHERE code = 'CANCELED');

INSERT INTO permissions (code, name, module)
SELECT 'orders.manage', 'Gestionar órdenes', 'orders' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'orders.manage');

INSERT INTO permissions (code, name, module)
SELECT 'payments.manage', 'Gestionar pagos', 'payments' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'payments.manage');

INSERT INTO permissions (code, name, module)
SELECT 'invoices.manage', 'Gestionar facturas', 'invoices' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'invoices.manage');

INSERT INTO permissions (code, name, module)
SELECT 'cash.manage', 'Gestionar caja', 'cash' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'cash.manage');

INSERT INTO permissions (code, name, module)
SELECT 'deliveries.manage', 'Gestionar entregas', 'deliveries' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'deliveries.manage');