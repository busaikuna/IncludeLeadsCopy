import jwt from 'jsonwebtoken';
import type { User } from '../models/user';

export function generateToken(user: Pick<User, 'id' | 'role'>): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim() || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Configure JWT_SECRET com pelo menos 32 bytes.');
  }

  if (
    !Number.isSafeInteger(user?.id) ||
    user.id <= 0 ||
    (user.role !== 'GESTOR' && user.role !== 'COMERCIAL')
  ) {
    throw new TypeError('Usuário inválido para gerar o token.');
  }

  const expiration = /^([1-9]\d*)([smhd])$/.exec(
    (process.env.JWT_EXPIRES_IN ?? '8h').trim(),
  );

  if (!expiration) {
    throw new Error('JWT_EXPIRES_IN deve usar um formato como 30m, 8h ou 1d.');
  }

  const secondsPerUnit: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  const expiresIn = Number(expiration[1]) * secondsPerUnit[expiration[2]];

  if (!Number.isSafeInteger(expiresIn)) {
    throw new Error('JWT_EXPIRES_IN está fora do intervalo permitido.');
  }

  return jwt.sign({ sub: String(user.id), role: user.role }, secret, {
    algorithm: 'HS256',
    expiresIn,
  });
}
