import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import {
  getAuthenticatedUser,
  loginUser,
  registerUser,
  setupManager,
} from '../services/auth.service';

export async function setup(req: Request, res: Response): Promise<void> {
  res.set('Cache-Control', 'no-store');

  const user = await setupManager(req.get('X-Setup-Token'), req.body);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  res.set('Cache-Control', 'no-store');

  const result = await loginUser(req.body);
  res.status(200).json(result);
}

export async function register(req: Request, res: Response): Promise<void> {
  res.set('Cache-Control', 'no-store');

  const user = await registerUser(req.user ?? null, req.body);
  res.status(201).json({ user });
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  res.set('Cache-Control', 'no-store');

  try {
    const user = await getAuthenticatedUser(req.user ?? null);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      res.set('WWW-Authenticate', 'Bearer realm="IncludeLeads"');
    }

    next(error);
  }
}
