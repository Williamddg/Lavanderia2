SET @schema_name = DATABASE();

SET @company_settings_add_nit = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'company_settings'
        AND column_name = 'nit'
    ),
    'SELECT 1',
    'ALTER TABLE company_settings ADD COLUMN nit VARCHAR(50) NULL'
  )
);
PREPARE company_settings_stmt_nit FROM @company_settings_add_nit;
EXECUTE company_settings_stmt_nit;
DEALLOCATE PREPARE company_settings_stmt_nit;

SET @company_settings_add_logo = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'company_settings'
        AND column_name = 'logo_base64'
    ),
    'SELECT 1',
    'ALTER TABLE company_settings ADD COLUMN logo_base64 LONGTEXT NULL'
  )
);
PREPARE company_settings_stmt_logo FROM @company_settings_add_logo;
EXECUTE company_settings_stmt_logo;
DEALLOCATE PREPARE company_settings_stmt_logo;

SET @company_settings_add_policies = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'company_settings'
        AND column_name = 'invoice_policies'
    ),
    'SELECT 1',
    'ALTER TABLE company_settings ADD COLUMN invoice_policies TEXT NULL'
  )
);
PREPARE company_settings_stmt_policies FROM @company_settings_add_policies;
EXECUTE company_settings_stmt_policies;
DEALLOCATE PREPARE company_settings_stmt_policies;
