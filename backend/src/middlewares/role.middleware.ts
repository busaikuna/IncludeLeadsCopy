import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error';
import type { UserRole } from '../models/user';

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.set('WWW-Authenticate', 'Bearer realm="IncludeLeads"');
      next(new AppError(401, 'Autenticação necessária.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, 'Acesso não permitido para o seu perfil.'));
      return;
    }

    next();
  };
}
