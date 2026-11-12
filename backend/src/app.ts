import cors from 'cors';
import express from 'express';
import { AppError } from './errors/app-error';
import { errorMiddleware } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import healthRoutes from './routes/health.routes';
import leadRouter from './routes/lead.routes';
import userRoutes from './routes/user.routes';

const app = express();

app.use(cors());
app.use('/leads', leadRouter);
app.use(express.json());
app.use(healthRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/dashboard', dashboardRoutes);
app.use((_req, _res, next) => {
  next(new AppError(404, 'Rota não encontrada.'));
});
app.use(errorMiddleware);

export default app;
