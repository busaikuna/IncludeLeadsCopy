import type { Request, Response } from 'express';
import { getLeadMetrics } from '../services/lead.service';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const metrics = await getLeadMetrics(req.user);
  res.status(200).json(metrics);
}
