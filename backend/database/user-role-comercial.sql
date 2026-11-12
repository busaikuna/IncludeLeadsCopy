-- Executar depois de users.sql para atualizar também os bancos existentes.
BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users
SET role = 'COMERCIAL', updated_at = CURRENT_TIMESTAMP
WHERE role = 'VENDEDOR';

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'COMERCIAL',
  ADD CONSTRAINT users_role_check CHECK (role IN ('GESTOR', 'COMERCIAL'));

COMMIT;
