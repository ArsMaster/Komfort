// models/product.model.ts
export interface Product {
  category?: string;
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number; // ID категории для связи
  categoryName: string; // Название для отображения
  imageUrls: string[];
  stock: number;
  features: string[];
  createdAt?: Date;
  updatedAt?: Date;
}