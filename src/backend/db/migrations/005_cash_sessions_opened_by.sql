SET @schema_name = DATABASE();

SET @cash_sessions_add_opened_by_name = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'cash_sessions'
        AND column_name = 'opened_by_name'
    ),
    'SELECT 1',
    'ALTER TABLE cash_sessions ADD COLUMN opened_by_name VARCHAR(120) NULL AFTER opened_by'
  )
);
PREPARE cash_sessions_stmt_name FROM @cash_sessions_add_opened_by_name;
EXECUTE cash_sessions_stmt_name;
DEALLOCATE PREPARE cash_sessions_stmt_name;

SET @cash_sessions_add_opened_by_phone = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'cash_sessions'
        AND column_name = 'opened_by_phone'
    ),
    'SELECT 1',
    'ALTER TABLE cash_sessions ADD COLUMN opened_by_phone VARCHAR(30) NULL AFTER opened_by_name'
  )
);
PREPARE cash_sessions_stmt_phone FROM @cash_sessions_add_opened_by_phone;
EXECUTE cash_sessions_stmt_phone;
DEALLOCATE PREPARE cash_sessions_stmt_phone;
