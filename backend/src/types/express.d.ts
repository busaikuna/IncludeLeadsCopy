import type { User } from '../models/user';

declare module 'express-serve-static-core' {
  interface Request {
    user?: Pick<User, 'id' | 'role'>;
  }
}
