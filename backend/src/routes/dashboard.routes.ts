import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const dashboardRoutes = Router();

dashboardRoutes.get('/', authenticate, getDashboard);

export default dashboardRoutes;
