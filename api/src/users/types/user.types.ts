import { users } from '../entities/users.entity';

export type UserRow = typeof users.$inferSelect;

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}
