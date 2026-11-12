import { Router } from 'express';
import { login, me, register, setup } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const authRoutes = Router();

authRoutes.post('/setup', setup);
authRoutes.post('/login', login);
authRoutes.post('/register', authenticate, authorize('GESTOR'), register);
authRoutes.get('/me', authenticate, me);

export default authRoutes;
