export interface CatalogCategory {
  id: number;
  title: string;
  image: string;
  slug: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
}