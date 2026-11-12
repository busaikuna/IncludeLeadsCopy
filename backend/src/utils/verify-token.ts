import jwt from 'jsonwebtoken';
import type { UserRole } from '../models/user';

export interface TokenPayload {
  sub: string;
  role: UserRole;
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim() || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Configure JWT_SECRET com pelo menos 32 bytes.');
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });

    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.sub !== 'string' ||
      !/^[1-9]\d*$/.test(payload.sub) ||
      !Number.isSafeInteger(Number(payload.sub)) ||
      (payload.role !== 'GESTOR' && payload.role !== 'COMERCIAL') ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp)
    ) {
      throw new jwt.JsonWebTokenError('Payload do token inválido.');
    }

    return { sub: payload.sub, role: payload.role };
  } catch (error) {
    if (error instanceof TypeError || error instanceof SyntaxError) {
      throw new jwt.JsonWebTokenError('Payload do token inválido.');
    }

    throw error;
  }
}
