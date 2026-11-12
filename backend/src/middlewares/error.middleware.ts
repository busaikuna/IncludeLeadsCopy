import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number' &&
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 500 &&
    'expose' in error &&
    error.expose === true
  ) {
    const message =
      error instanceof SyntaxError
        ? 'JSON inválido no corpo da requisição.'
        : 'Requisição inválida.';

    res.status(error.status).json({ message });
    return;
  }

  console.error('Erro inesperado:', error);
  res.status(500).json({ message: 'Erro interno do servidor.' });
}
