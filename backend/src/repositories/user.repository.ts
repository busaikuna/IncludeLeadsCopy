import { pool } from '../config/database';
import type { User, UserRole } from '../models/user';

const userColumns = `
  id,
  name,
  email,
  password_hash AS "passwordHash",
  role,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function findByEmail(email: string): Promise<User | null> {
  const { rows } = await pool.query<User>(
    `SELECT ${userColumns} FROM users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );

  return rows[0] ?? null;
}

export async function findById(id: number): Promise<User | null> {
  const { rows } = await pool.query<User>(
    `SELECT ${userColumns} FROM users WHERE id = $1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function listByRole(
  role: UserRole,
): Promise<Pick<User, 'id' | 'name' | 'email'>[]> {
  const { rows } = await pool.query<Pick<User, 'id' | 'name' | 'email'>>(
    'SELECT id, name, email FROM users WHERE role = $1 ORDER BY name, id',
    [role],
  );

  return rows;
}

export async function create(
  data: Pick<User, 'name' | 'email' | 'passwordHash'>,
): Promise<User> {
  const { rows } = await pool.query<User>(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${userColumns}`,
    [data.name, data.email.trim().toLowerCase(), data.passwordHash],
  );

  return rows[0];
}

export async function createManagerIfNone(
  data: Pick<User, 'name' | 'email' | 'passwordHash'>,
): Promise<User | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');

    const lock = await client.query(
      'SELECT id FROM auth_setup WHERE id = 1 FOR UPDATE',
    );

    if (!lock.rowCount) {
      throw new Error('Controle de cadastro inicial ausente. Execute db:init.');
    }

    // Consultar depois de obter o bloqueio permite enxergar o Gestor
    // que uma tentativa concorrente acabou de cadastrar.
    const existingManager = await client.query(
      "SELECT id FROM users WHERE role = 'GESTOR' LIMIT 1",
    );

    if (existingManager.rowCount) {
      await client.query('COMMIT');
      return null;
    }

    const { rows } = await client.query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'GESTOR')
       RETURNING ${userColumns}`,
      [data.name, data.email.trim().toLowerCase(), data.passwordHash],
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
