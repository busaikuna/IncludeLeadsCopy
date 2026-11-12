import type { Request, Response } from 'express';
import { listCommercialUsers } from '../services/user.service';

export async function listCommercial(
  _req: Request,
  res: Response,
): Promise<void> {
  res.set('Cache-Control', 'no-store');
  const users = await listCommercialUsers();
  res.status(200).json(users);
}
