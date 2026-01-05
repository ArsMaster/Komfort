import { Injectable, signal, effect } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products = signal<Product[]>(this.loadFromStorage());
  private storageKey = 'komfort_products';

  constructor() {
    effect(() => {
      this.saveToStorage(this.products());
    });
    
    console.log('=== ProductService инициализирован ===');
    console.log('Загружено товаров:', this.products().length);
    this.products().forEach((product, index) => {
      console.log(`Товар ${index + 1}: "${product.name}", categoryId=${product.categoryId}, categoryName="${product.categoryName}"`);
    });
  }

  private loadFromStorage(): Product[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const products = parsed.map((product: any) => ({
          ...product,
          createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
          updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date()
        }));
        console.log('Товары загружены из localStorage');
        return products;
      }
    } catch (error) {
      console.error('Ошибка загрузки из localStorage:', error);
    }
    
    console.log('Нет сохраненных товаров, используются начальные');
    return this.getInitialProducts();
  }

  private saveToStorage(products: Product[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(products));
      console.log('Товары сохранены в localStorage:', products.length);
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  }

  private getInitialProducts(): Product[] {
    return [
      {
        id: 1,
        name: 'Диван "Комфорт"',
        description: 'Удобный диван для гостиной',
        price: 29999,
        categoryId: 1, // Совпадает с ID категории "Гостиная"
        categoryName: 'Гостиная',
        imageUrls: ['/products/sofa1.jpg'],
        stock: 5,
        features: ['Раскладной', 'Ткань - велюр'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Кровать "Орто"',
        description: 'Ортопедическая кровать',
        price: 45999,
        categoryId: 2, // Совпадает с ID категории "Спальня"
        categoryName: 'Спальня',
        imageUrls: ['/products/bed1.jpg'],
        stock: 3,
        features: ['Ортопедическое основание', 'Ящики для белья'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  getProducts() {
    return this.products.asReadonly();
  }

  getProductsArray(): Product[] {
    return this.products();
  }

  getProductById(id: number | string): Product | undefined {
    return this.products().find(product => product.id === id);
  }

  addProduct(product: Omit<Product, 'id'>): Product {
    console.log('Добавление товара:', product);
    
    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Создан новый товар:', newProduct);
    this.products.update(products => [...products, newProduct]);
    return newProduct;
  }

  updateProduct(id: number | string, updatedProduct: Partial<Product>): void {
    console.log('Обновление товара ID:', id, 'данные:', updatedProduct);
    
    this.products.update(products =>
      products.map(product =>
        product.id === id 
          ? { 
              ...product, 
              ...updatedProduct, 
              updatedAt: new Date(),
              id: product.id
            } 
          : product
      )
    );
  }

  deleteProduct(id: number | string): void {
    console.log('Удаление товара ID:', id);
    this.products.update(products =>
      products.filter(product => product.id !== id)
    );
  }

  getProductsByCategoryId(categoryId: number): Product[] {
    console.log('Поиск товаров по categoryId:', categoryId);
    const result = this.products().filter(product => product.categoryId === categoryId);
    console.log('Найдено товаров:', result.length);
    return result;
  }

  clearProducts(): void {
    this.products.set([]);
  }

  resetToInitial(): void {
    this.products.set(this.getInitialProducts());
  }

  private generateId(): number {
    const products = this.products();
    const numericIds = products
      .map(p => typeof p.id === 'number' ? p.id : parseInt(p.id as string))
      .filter(id => !isNaN(id));
    
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}