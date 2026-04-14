-- Run once in Supabase → SQL Editor if inserts fail with:
--   duplicate key value violates unique constraint "expenses_pkey"
-- Cause: identity sequence out of sync (e.g. after import with explicit ids).

select setval(
  pg_get_serial_sequence('public.expenses', 'id'),
  coalesce((select max(id) from public.expenses), 0) + 1,
  false
);
