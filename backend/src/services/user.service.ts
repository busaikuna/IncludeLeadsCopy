import { listByRole } from '../repositories/user.repository';

export function listCommercialUsers() {
  return listByRole('COMERCIAL');
}
