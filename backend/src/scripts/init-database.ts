import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pool } from '../config/database';

async function initializeDatabase() {
  try {
    const { values } = parseArgs({
      options: { 'lead-stage-review': { type: 'string' } },
    });
    const reviewFile = values['lead-stage-review'];
    const review = reviewFile ? await readFile(reviewFile, 'utf8') : '[]';
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('includeleads.lead_stage_review', $1::jsonb::text, false)",
        [review],
      );
      for (const file of [
        'users.sql',
        'user-role-comercial.sql',
        'auth-setup.sql',
        'leads.sql',
        'interactions.sql',
      ]) {
        const sql = await readFile(
          resolve(__dirname, '../../database', file),
          'utf8',
        );

        await client.query(sql);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    console.log('Estrutura inicial do banco preparada com sucesso.');
  } catch (error) {
    console.error('Erro ao preparar o banco de dados:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void initializeDatabase();
