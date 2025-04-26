WITH tables AS (
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    AND table_type = 'BASE TABLE'
),
columns AS (
  SELECT table_schema, table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
),
policies AS (
  SELECT
    schemaname AS table_schema,
    tablename AS table_name,
    policyname AS policy_name,
    cmd AS command,
    permissive,
    qual AS using_expression,
    withcheck AS with_check_expression
  FROM
    pg_policies
)
SELECT
  t.table_schema,
  t.table_name,
  c.column_name,
  c.data_type,
  p.policy_name,
  p.command,
  p.permissive,
  p.using_expression,
  p.with_check_expression
FROM tables t
LEFT JOIN columns c ON t.table_schema = c.table_schema AND t.table_name = c.table_name
LEFT JOIN policies p ON t.table_schema = p.table_schema AND t.table_name = p.table_name
ORDER BY t.table_schema, t.table_name, c.column_name;
