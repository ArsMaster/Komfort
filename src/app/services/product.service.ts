import { Injectable, signal, effect, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { SupabaseService } from './supabase.service';

export type StorageMode = 'local' | 'supabase';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  // Внедряем SupabaseService
  private supabaseService = inject(SupabaseService);
  
  // Сигнал для хранения продуктов
  private products = signal<Product[]>([]);
  
  // Сигнал для текущего режима хранения
  private storageMode = signal<StorageMode>('local');
  
  // Сигнал для статуса загрузки
  private isLoading = signal<boolean>(false);
  
  private storageKey = 'komfort_products';

  private fixImageUrl(url: string): string {
    if (!url || url.trim() === '') {
      return '/assets/default-product.jpg';
    }
    
    // Если уже абсолютный URL
    if (url.startsWith('http') || url.startsWith('//')) {
      return url;
    }
    
    // Исправляем ошибку: в логах видно, что пытается загрузить /assets/products/bedroom.jpg
    // Но файл bedroom.jpg находится в /assets/, а не в /assets/products/
    
    if (url.includes('bedroom.jpg') || url.includes('livingroom.jpg') || 
        url.includes('kitchen.jpg') || url.includes('sofa1.jpg') ||
        url.includes('bed1.jpg')) {
      // Эти файлы в корне assets/
      return `/assets/${url.split('/').pop()}`;
    }
    
    // Если начинается с /assets/
    if (url.startsWith('/assets/')) {
      return url;
    }
    
    // Если начинается с assets/ без слеша
    if (url.startsWith('assets/')) {
      return '/' + url;
    }
    
    return '/assets/default-product.jpg';
  }

  // ✅ ДОБАВЛЕН МЕТОД ОЧИСТКИ URL
  private cleanImageUrls(urls: string[]): string[] {
    if (!urls || !Array.isArray(urls)) {
      return ['assets/default-product.jpg'];
    }
    
    return urls.map(url => {
      if (!url || typeof url !== 'string') {
        return 'assets/default-product.jpg';
      }
      
      // Удаляем дублирование домена
      if (url.includes('ваш-сайт.com')) {
        // Извлекаем последнюю часть
        const parts = url.split('/');
        const filename = parts.pop();
        return `assets/products/${filename}`;
      }
      
      // Удаляем дублирование любого домена
      if (url.includes('https://') || url.includes('http://')) {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const filename = pathParts.pop();
        return `assets/products/${filename}`;
      }
      
      // Если URL содержит дублирование (повторяющиеся части)
      if (url.split('assets/products/').length > 2) {
        // Берем последнюю часть после последнего "assets/products/"
        const parts = url.split('assets/products/');
        const lastPart = parts[parts.length - 1];
        return `assets/products/${lastPart}`;
      }
      
      // Если это уже правильный относительный путь
      if (url.startsWith('assets/')) {
        return url;
      }
      
      // Если это полный URL с доменом
      if (url.startsWith('http')) {
        // Извлекаем имя файла
        const filename = url.split('/').pop();
        return `assets/products/${filename}`;
      }
      
      // Если это просто имя файла
      if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png')) {
        return `assets/products/${url}`;
      }
      
      return 'assets/default-product.jpg';
    }).filter(url => url && url.trim() !== '');
  }

  constructor() {
    // Эффект для автосохранения при изменении продуктов (только для local режима)
    effect(() => {
      if (this.storageMode() === 'local') {
        this.saveToStorage(this.products());
      }
    });
    
    // Инициализация при старте
    this.initialize();
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====
  private async initialize(): Promise<void> {
    console.log('=== ProductService инициализирован ===');
    
    // Проверяем, какой режим использовать
    const mode = localStorage.getItem('komfort_storage_mode') as StorageMode || 'supabase';
    this.storageMode.set(mode);
    
    console.log(`Режим хранения: ${mode}`);
    
    // Загружаем данные в зависимости от режима
    if (mode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
  }

  // ===== ЗАГРУЗКА ИЗ LOCALSTORAGE =====
  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const products = parsed.map((product: any) => ({
          ...product,
          // ✅ Очищаем imageUrls при загрузке из localStorage
          imageUrls: this.cleanImageUrls(product.imageUrls || []),
          createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
          updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date()
        }));
        this.products.set(products);
        console.log('Товары загружены из localStorage:', products.length);
      } else {
        console.log('Нет сохраненных товаров, используются начальные');
        this.products.set(this.getInitialProducts());
      }
    } catch (error) {
      console.error('Ошибка загрузки из localStorage:', error);
      this.products.set(this.getInitialProducts());
    }
  }

  // ===== ЗАГРУЗКА ИЗ SUPABASE =====
  private async loadFromSupabase(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      console.log('Загрузка товаров из Supabase...');
      const products = await this.supabaseService.getProducts();
      
      if (products.length > 0) {
        // Конвертируем данные Supabase в формат Product
        const convertedProducts = products.map(item => {
          // ✅ Очищаем imageUrls при конвертации
          const cleanImageUrls = this.cleanImageUrls(item.imageUrls || []);
          
          return {
            id: item.id,
            name: item.name || '',
            description: item.description || '',
            price: item.price || 0,
            categoryId: typeof item.categoryId === 'number' ? item.categoryId : 1,
            categoryName: item.categoryName || 'Без категории',
            imageUrls: cleanImageUrls, // ✅ Используем очищенные URL
            stock: item.stock || 0,
            features: item.features || [],
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
          };
        });
        
        this.products.set(convertedProducts);
        console.log('Товары загружены из Supabase:', convertedProducts.length);
        
        // ✅ Выводим отладочную информацию
        convertedProducts.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name}:`, product.imageUrls);
        });
        
        // Сохраняем в localStorage как кэш
        this.saveToStorage(convertedProducts);
      } else {
        console.log('Supabase пуст, загружаем из localStorage');
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Ошибка загрузки из Supabase:', error);
      console.log('Переключаемся на localStorage');
      this.storageMode.set('local');
      this.loadFromLocalStorage();
    } finally {
      this.isLoading.set(false);
    }
  }

  // ===== СОХРАНЕНИЕ В LOCALSTORAGE =====
  private saveToStorage(products: Product[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(products));
      console.log('Товары сохранены в localStorage (кэш):', products.length);
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  }

  // ===== НАЧАЛЬНЫЕ ДАННЫЕ =====
  private getInitialProducts(): Product[] {
    const basePath = window.location.hostname.includes('github.io') 
      ? '/Komfort/'  // для GitHub Pages
      : '/';         // для локальной разработки

    return [
      {
        id: 1,
        name: 'Диван "Комфорт"',
        description: 'Удобный диван для гостиной',
        price: 29999,
        categoryId: 1,
        categoryName: 'Гостиная',
        imageUrls: ['assets/sofa1.jpg'], // ✅ Исправлено на относительный путь
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
        categoryId: 2,
        categoryName: 'Спальня',
        imageUrls: ['assets/bed1.jpg'], // ✅ Исправлено на относительный путь
        stock: 3,
        features: ['Ортопедическое основание', 'Ящики для белья'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  // ===== ПУБЛИЧНЫЕ МЕТОДЫ =====
  
  // Получить продукты (readonly signal)
  getProducts() {
    return this.products.asReadonly();
  }

  // Получить массив продуктов
  getProductsArray(): Product[] {
    return this.products();
  }

  // Получить продукт по ID
  getProductById(id: number | string): Product | undefined {
    return this.products().find(product => product.id == id);
  }

  // Получить текущий режим хранения
  getStorageMode(): StorageMode {
    return this.storageMode();
  }

  // Получить статус загрузки
  getIsLoading() {
    return this.isLoading.asReadonly();
  }

  // ===== ОПЕРАЦИИ С ПРОДУКТАМИ =====
  
  // Добавить продукт
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    console.log('Добавление товара в режиме:', this.storageMode());
    
    // ✅ Исправляем пути к изображениям с очисткой
    const fixedProduct = {
      ...product,
      imageUrls: this.cleanImageUrls(product.imageUrls || [])
    };
    
    const newProduct: Product = {
      ...fixedProduct,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (this.storageMode() === 'local') {
      // Локальное сохранение
      this.products.update(products => [...products, newProduct]);
      console.log('Товар добавлен в localStorage');
      return newProduct;
    } else {
      // Сохранение в Supabase
      try {
        // Подготавливаем данные для Supabase
        const supabaseProduct = {
          name: newProduct.name,
          description: newProduct.description,
          price: newProduct.price,
          categoryId: newProduct.categoryId,
          categoryName: newProduct.categoryName,
          imageUrls: newProduct.imageUrls,
          stock: newProduct.stock,
          features: newProduct.features
        };
        
        const result = await this.supabaseService.addProduct(supabaseProduct);
        
        if (result) {
          // Обновляем локальный список
          this.products.update(products => [...products, {
            ...newProduct,
            id: result.id // Используем ID из Supabase
          }]);
          console.log('Товар добавлен в Supabase');
          return { ...newProduct, id: result.id };
        } else {
          throw new Error('Не удалось сохранить в Supabase');
        }
      } catch (error) {
        console.error('Ошибка сохранения в Supabase:', error);
        // Возвращаем в локальный режим
        this.storageMode.set('local');
        this.addProduct(product); // Рекурсивно сохраняем локально
        return newProduct;
      }
    }
  }

  // Обновить продукт
  async updateProduct(id: number | string, updatedProduct: Partial<Product>): Promise<void> {
    console.log('Обновление товара ID:', id, 'в режиме:', this.storageMode());
    
    // ✅ Очищаем imageUrls если они есть в обновлении
    if (updatedProduct.imageUrls) {
      updatedProduct.imageUrls = this.cleanImageUrls(updatedProduct.imageUrls);
    }
    
    // Сначала обновляем локально для быстрого отклика
    this.products.update(products =>
      products.map(product =>
        product.id == id 
          ? { 
              ...product, 
              ...updatedProduct, 
              updatedAt: new Date(),
              id: product.id
            } 
          : product
      )
    );
    
    // Если режим Supabase, синхронизируем
    if (this.storageMode() === 'supabase') {
      try {
        const success = await this.supabaseService.updateProduct(String(id), updatedProduct);
        if (!success) {
          console.warn('Не удалось синхронизировать с Supabase');
        }
      } catch (error) {
        console.error('Ошибка синхронизации с Supabase:', error);
      }
    }
  }

  // Удалить продукт
  async deleteProduct(id: number | string): Promise<void> {
    console.log('Удаление товара ID:', id, 'в режиме:', this.storageMode());
    
    // Удаляем локально
    this.products.update(products =>
      products.filter(product => product.id != id)
    );
    
    // Если режим Supabase, удаляем и там
    if (this.storageMode() === 'supabase') {
      try {
        const success = await this.supabaseService.deleteProduct(String(id));
        if (!success) {
          console.warn('Не удалось удалить из Supabase');
        }
      } catch (error) {
        console.error('Ошибка удаления из Supabase:', error);
      }
    }
  }

  // Получить продукты по категории
  getProductsByCategoryId(categoryId: number): Product[] {
    return this.products().filter(product => product.categoryId === categoryId);
  }

  // ===== УПРАВЛЕНИЕ РЕЖИМАМИ =====
  
  // Переключить режим хранения
  async switchStorageMode(mode: StorageMode): Promise<void> {
    if (mode === this.storageMode()) return;
    
    console.log(`Переключение режима с ${this.storageMode()} на ${mode}`);
    this.storageMode.set(mode);
    localStorage.setItem('komfort_storage_mode', mode);
    
    // Загружаем данные для нового режима
    if (mode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
  }

  // Тестирование подключения к Supabase
  async testSupabase(): Promise<boolean> {
    try {
      const products = await this.supabaseService.getProducts();
      console.log('✅ Supabase подключен! Товаров в базе:', products.length);
      return true;
    } catch (error) {
      console.error('❌ Ошибка подключения к Supabase:', error);
      return false;
    }
  }

  // Синхронизация локальных данных с Supabase
  async syncToSupabase(): Promise<void> {
    console.log('Синхронизация локальных данных с Supabase...');
    
    const localProducts = this.products();
    let successCount = 0;
    
    for (const product of localProducts) {
      try {
        const productData = {
          name: product.name,
          description: product.description,
          price: product.price,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          imageUrls: product.imageUrls,
          stock: product.stock,
          features: product.features
        };
        
        const result = await this.supabaseService.addProduct(productData);
        if (result) {
          successCount++;
          console.log(`Синхронизирован товар: ${product.name}`);
        }
      } catch (error) {
        console.error(`Ошибка синхронизации товара ${product.name}:`, error);
      }
    }
    
    console.log(`✅ Синхронизация завершена: ${successCount}/${localProducts.length} товаров`);
  }

  // ===== СЛУЖЕБНЫЕ МЕТОДЫ =====
  private generateId(): number {
    const products = this.products();
    const numericIds = products
      .map(p => typeof p.id === 'number' ? p.id : parseInt(p.id as string))
      .filter(id => !isNaN(id));
    
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }

  // Очистить все продукты
  clearProducts(): void {
    this.products.set([]);
  }

  // Сбросить к начальным данным
  resetToInitial(): void {
    this.products.set(this.getInitialProducts());
  }

  switchToSupabase(): void {
    console.warn('Метод switchToSupabase устарел, используйте switchStorageMode');
    this.switchStorageMode('supabase');
  }

  // ✅ НОВЫЙ МЕТОД: Принудительная очистка всех URL
  async fixAllImageUrls(): Promise<void> {
    console.log('🧹 Очистка всех imageUrls...');
    
    const fixedProducts = this.products().map(product => ({
      ...product,
      imageUrls: this.cleanImageUrls(product.imageUrls || [])
    }));
    
    this.products.set(fixedProducts);
    console.log('✅ Все imageUrls очищены');
    
    // Если в режиме Supabase, синхронизируем обратно
    if (this.storageMode() === 'supabase') {
      await this.syncToSupabase();
    }
  }
}