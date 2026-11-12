import type { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { AppError } from '../errors/app-error';
import { verifyToken } from '../utils/verify-token';

const UNAUTHORIZED_MESSAGE = 'Token de autenticação ausente ou inválido.';

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const match = req.get('Authorization')?.match(/^Bearer +(\S+)$/i);

  if (!match) {
    res.set('WWW-Authenticate', 'Bearer realm="IncludeLeads"');
    next(new AppError(401, UNAUTHORIZED_MESSAGE));
    return;
  }

  try {
    const payload = verifyToken(match[1]);
    req.user = { id: Number(payload.sub), role: payload.role };
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      res.set(
        'WWW-Authenticate',
        'Bearer realm="IncludeLeads", error="invalid_token"',
      );
      next(new AppError(401, UNAUTHORIZED_MESSAGE));
      return;
    }

    next(error);
    return;
  }

  next();
}
