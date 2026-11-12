import { Pool } from 'pg';

const connectionTimeoutSeconds = Number(
  process.env.PGCONNECT_TIMEOUT?.trim() || '5',
);

if (
  !Number.isInteger(connectionTimeoutSeconds) ||
  connectionTimeoutSeconds < 0 ||
  connectionTimeoutSeconds > 2_147_483
) {
  throw new Error(
    'PGCONNECT_TIMEOUT deve ser um número inteiro de segundos entre 0 e 2147483.',
  );
}

export const pool = new Pool({
  connectionTimeoutMillis: connectionTimeoutSeconds * 1000,
});

pool.on('error', (error) => {
  console.error('Erro em conexão ociosa com o PostgreSQL:', error);
});
