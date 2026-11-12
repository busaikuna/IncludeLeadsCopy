import 'dotenv/config';
import app from './app';
import { pool } from './config/database';

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, (error?: Error) => {
  if (error) {
    console.error('Erro ao iniciar a API:', error);
    process.exitCode = 1;
    return;
  }

  console.log(`IncludeLeads disponível na porta ${port}`);
});

let shuttingDown = false;

function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;

  server.close((error) => {
    if (error) {
      console.error('Erro ao fechar o servidor HTTP:', error);
      process.exitCode = 1;
    }

    void pool.end().catch((error: unknown) => {
      console.error('Erro ao fechar as conexões com o PostgreSQL:', error);
      process.exitCode = 1;
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
