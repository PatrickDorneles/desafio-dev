import { categories } from '../entities/category.entity';

export type CategoryRow = typeof categories.$inferSelect;

export interface CreateCategoryData {
  userId: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
  icon?: string;
  updatedAt: number;
}
