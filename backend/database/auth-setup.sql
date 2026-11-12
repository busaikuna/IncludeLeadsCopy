-- Linha única para coordenar o cadastro inicial e a recuperação de Gestor.
-- O repository deverá bloqueá-la com SELECT FOR UPDATE dentro da transação
-- antes de verificar se já existe um Gestor e criar o usuário.
CREATE TABLE IF NOT EXISTS auth_setup (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1)
);

INSERT INTO auth_setup (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
