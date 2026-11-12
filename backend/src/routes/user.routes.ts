import { Router } from 'express';
import { listCommercial } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const userRoutes = Router();

userRoutes.get(
  '/commercial',
  authenticate,
  authorize('GESTOR'),
  listCommercial,
);

export default userRoutes;
