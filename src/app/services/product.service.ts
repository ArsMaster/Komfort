// app/services/product.service.ts
import { Injectable, signal, effect, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { SupabaseService } from './supabase.service';
import { StorageService } from './storage.service';

export type StorageMode = 'local' | 'supabase';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  // Внедряем зависимости
  private supabaseService = inject(SupabaseService);
  private storageService = inject(StorageService);
  
  // Сигналы
  private products = signal<Product[]>([]);
  private storageMode = signal<StorageMode>('supabase'); // По умолчанию Supabase
  private isLoading = signal<boolean>(false);
  private isUploadingImages = signal<boolean>(false);
  
  private storageKey = 'komfort_products';

  constructor() {
    // Эффект для автосохранения
    effect(() => {
      if (this.storageMode() === 'local') {
        this.saveToLocalStorage(this.products());
      }
    });
    
    // Инициализация при старте
    this.initialize();
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====
  private async initialize(): Promise<void> {
    console.log('=== ProductService инициализирован ===');
    
    // Проверяем режим хранения
    const mode = localStorage.getItem('komfort_storage_mode') as StorageMode || 'supabase';
    this.storageMode.set(mode);
    
    console.log(`Режим хранения: ${mode}`);
    
    // Загружаем данные
    if (mode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
  }

  // ===== ПРИВАТНЫЕ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const products = parsed.map((product: any) => ({
          ...product,
          imageUrls: this.cleanImageUrls(product.imageUrls || []),
          createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
          updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date()
        }));
        this.products.set(products);
        console.log('📦 Товары загружены из localStorage:', products.length);
      } else {
        console.log('📭 Нет сохраненных товаров, используются начальные');
        this.products.set(this.getInitialProducts());
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки из localStorage:', error);
      this.products.set(this.getInitialProducts());
    }
  }

  private saveToLocalStorage(products: Product[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(products));
      console.log('💾 Товары сохранены в localStorage (кэш):', products.length);
    } catch (error) {
      console.error('❌ Ошибка сохранения в localStorage:', error);
    }
  }

  private getInitialProducts(): Product[] {
    return [
      {
        id: 1,
        name: 'Диван "Комфорт"',
        description: 'Удобный диван для гостиной',
        price: 29999,
        categoryId: 1,
        categoryName: 'Гостиная',
        imageUrls: ['/assets/sofa1.jpg'],
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
        imageUrls: ['/assets/bed1.jpg'],
        stock: 3,
        features: ['Ортопедическое основание', 'Ящики для белья'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private generateId(): number {
    const products = this.products();
    const numericIds = products
      .map(p => typeof p.id === 'number' ? p.id : parseInt(p.id as string))
      .filter(id => !isNaN(id));
    
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }

  // ===== МЕТОДЫ ДЛЯ РАБОТЫ С ИЗОБРАЖЕНИЯМИ (СЖАТИЕ) =====

  /**
   * Сжимает изображение перед загрузкой
   */
  private async compressImage(
    file: File, 
    maxWidth: number = 1200, 
    quality: number = 0.8,
    format: string = 'image/jpeg'
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      console.log(`📊 Начинаем сжатие: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      
      const reader = new FileReader();
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      reader.onload = (e) => {
        img.onload = () => {
          try {
            // Рассчитываем новые размеры
            let width = img.width;
            let height = img.height;
            
            console.log(`📏 Исходные размеры: ${width}x${height}`);
            
            // Если изображение шире максимальной ширины, уменьшаем пропорционально
            if (width > maxWidth) {
              const ratio = maxWidth / width;
              height = Math.round(height * ratio);
              width = maxWidth;
              console.log(`📐 Новые размеры: ${width}x${height}`);
            }
            
            // Устанавливаем размеры canvas
            canvas.width = width;
            canvas.height = height;
            
            // Рисуем сжатое изображение
            ctx!.drawImage(img, 0, 0, width, height);
            
            // Конвертируем обратно в File
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  // Определяем расширение файла
                  const fileExt = format === 'image/png' ? 'png' : 'jpg';
                  const fileName = file.name.replace(/\.[^/.]+$/, '') + `_compressed.${fileExt}`;
                  
                  const compressedFile = new File(
                    [blob],
                    fileName,
                    { type: format, lastModified: Date.now() }
                  );
                  
                  console.log(`✅ Сжатие завершено:`);
                  console.log(`   Оригинал: ${(file.size / 1024).toFixed(1)} KB`);
                  console.log(`   После сжатия: ${(compressedFile.size / 1024).toFixed(1)} KB`);
                  console.log(`   Экономия: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);
                  
                  resolve(compressedFile);
                } else {
                  reject(new Error('Не удалось создать сжатое изображение'));
                }
              },
              format,
              quality
            );
          } catch (error) {
            console.error('❌ Ошибка при сжатии:', error);
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Не удалось загрузить изображение для сжатия'));
        };
        
        img.src = e.target!.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('Не удалось прочитать файл'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Определяет оптимальные параметры сжатия для типа изображения
   */
  private getCompressionSettings(file: File): {
    maxWidth: number;
    quality: number;
    format: string;
  } {
    const isPNG = file.type === 'image/png';
    const isLargeFile = file.size > 2 * 1024 * 1024; // > 2MB
    
    return {
      maxWidth: isLargeFile ? 1000 : 1200,
      quality: isPNG ? 0.9 : 0.85, // PNG сохраняет лучше при высоком качестве
      format: isPNG ? 'image/png' : 'image/jpeg'
    };
  }

  private cleanImageUrls(urls: string[]): string[] {
    if (!urls || !Array.isArray(urls)) {
      return ['/assets/default-product.jpg'];
    }
    
    return urls
      .filter(url => url && typeof url === 'string')
      .map(url => {
        let cleanedUrl = url.trim();
        
        // Если это Base64, заменяем на дефолтное изображение
        if (cleanedUrl.startsWith('data:image')) {
          return '/assets/default-product.jpg';
        }
        
        // Если это URL из Supabase Storage, оставляем как есть
        if (this.isSupabaseStorageUrl(cleanedUrl)) {
          return cleanedUrl;
        }
        
        // Если это локальный путь, исправляем его
        if (!cleanedUrl.startsWith('http')) {
          // Убираем фигурные скобки если есть
          if (cleanedUrl.startsWith('{') && cleanedUrl.endsWith('}')) {
            cleanedUrl = cleanedUrl.slice(1, -1).trim();
          }
          
          // Убираем двойные пути
          if (cleanedUrl.includes('assets//assets/')) {
            cleanedUrl = cleanedUrl.replace('assets//assets/', '/assets/');
          }
          
          // Убедимся что путь начинается с /assets/
          if (!cleanedUrl.startsWith('/assets/')) {
            if (cleanedUrl.startsWith('assets/')) {
              cleanedUrl = '/' + cleanedUrl;
            } else if (cleanedUrl.startsWith('/')) {
              cleanedUrl = '/assets' + cleanedUrl;
            } else {
              // Если это просто имя файла
              if (cleanedUrl.endsWith('.jpg') || cleanedUrl.endsWith('.jpeg') || 
                  cleanedUrl.endsWith('.png') || cleanedUrl.endsWith('.gif') ||
                  cleanedUrl.endsWith('.webp')) {
                cleanedUrl = '/assets/' + cleanedUrl;
              } else {
                cleanedUrl = '/assets/default-product.jpg';
              }
            }
          }
        }
        
        return cleanedUrl;
      })
      .filter(url => url && url.trim() !== '');
  }

  // ===== ЗАГРУЗКА ДАННЫХ =====

  private async loadFromSupabase(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      console.log('Загрузка товаров из Supabase...');
      const products = await this.supabaseService.getProducts();
      
      console.log('📦 RAW данные из Supabase:', products);
      
      if (products.length > 0) {
        const convertedProducts = await Promise.all(
          products.map(async (item) => {
            const cleanImageUrls = this.cleanImageUrls(item.imageUrls || []);
            
            console.log(`🔄 Конвертация товара "${item.name}":`);
            console.log('  Исходные imageUrls:', item.imageUrls);
            console.log('  Очищенные imageUrls:', cleanImageUrls);
            
            return {
              id: item.id,
              name: item.name || '',
              description: item.description || '',
              price: item.price || 0,
              categoryId: typeof item.categoryId === 'number' ? item.categoryId : 1,
              categoryName: item.categoryName || 'Без категории',
              imageUrls: cleanImageUrls,
              stock: item.stock || 0,
              features: item.features || [],
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
            };
          })
        );
        
        this.products.set(convertedProducts);
        
        console.log('✅ Товары загружены из Supabase:');
        convertedProducts.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name}:`, product.imageUrls);
        });
        
        // Сохраняем в localStorage как кэш
        this.saveToLocalStorage(convertedProducts);
      } else {
        console.log('📭 В Supabase нет товаров');
        this.products.set(this.getInitialProducts());
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки из Supabase:', error);
      // Пробуем загрузить из localStorage как fallback
      this.loadFromLocalStorage();
    } finally {
      this.isLoading.set(false);
    }
  }

  // ===== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ =====

  getProducts() {
    return this.products.asReadonly();
  }

  getProductsArray(): Product[] {
    return this.products();
  }

  getProductById(id: number | string): Product | undefined {
    return this.products().find(product => product.id == id);
  }

  getProductsByCategoryId(categoryId: number): Product[] {
    return this.products().filter(product => product.categoryId === categoryId);
  }

  getStorageMode(): StorageMode {
    return this.storageMode();
  }

  getIsLoading() {
    return this.isLoading.asReadonly();
  }

  getIsUploadingImages() {
    return this.isUploadingImages.asReadonly();
  }

  // ===== МЕТОДЫ ДЛЯ РАБОТЫ С ИЗОБРАЖЕНИЯМИ =====

  /**
   * Загружает изображения товара в Supabase Storage со сжатием
   */
  async uploadProductImages(files: File[]): Promise<string[]> {
    this.isUploadingImages.set(true);
    
    try {
      console.log(`📤 Загрузка ${files.length} изображений товара со сжатием...`);
      
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Определяем параметры сжатия
          const settings = this.getCompressionSettings(file);
          console.log(`🎛️ [${index + 1}] Параметры сжатия: ${JSON.stringify(settings)}`);
          
          // Сжимаем изображение
          const compressedFile = await this.compressImage(
            file, 
            settings.maxWidth, 
            settings.quality,
            settings.format
          );
          
          // Генерируем имя файла
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 8);
          const fileExt = compressedFile.type === 'image/png' ? 'png' : 'jpg';
          const fileName = `product_${timestamp}_${index}_${randomString}.${fileExt}`;
          const filePath = `products/${fileName}`;
          
          const supabase = this.supabaseService.getClient();
          
          console.log(`📁 [${index + 1}] Загружаем сжатый файл: ${fileName}`);
          
          const { data, error } = await supabase.storage
            .from('product-images')
            .upload(filePath, compressedFile, {
              cacheControl: '86400',
              upsert: false,
              contentType: compressedFile.type
            });
          
          if (error) {
            console.error(`❌ Ошибка загрузки файла ${index + 1}:`, error);
            
            // Fallback: попробуем загрузить без сжатия
            console.log(`🔄 [${index + 1}] Fallback: загрузка без сжатия...`);
            return await this.uploadSingleImageWithoutCompression(file, index);
          }
          
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          
          console.log(`✅ [${index + 1}] Изображение загружено:`, urlData.publicUrl);
          return urlData.publicUrl;
          
        } catch (error) {
          console.error(`❌ Ошибка обработки файла ${index + 1}:`, error);
          
          // В крайнем случае, возвращаем URL дефолтного изображения
          return '/assets/default-product.jpg';
        }
      });
      
      const imageUrls = await Promise.all(uploadPromises);
      
      console.log('✅ Все изображения загружены:', imageUrls);
      return imageUrls;
      
    } catch (error) {
      console.error('❌ Общая ошибка загрузки изображений:', error);
      throw error;
    } finally {
      this.isUploadingImages.set(false);
    }
  }

  /**
   * Fallback метод для загрузки одного изображения без сжатия
   */
  private async uploadSingleImageWithoutCompression(file: File, index: number): Promise<string> {
    console.warn(`⚠️ [${index + 1}] Загружаем без сжатия (fallback)`);
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `product_${timestamp}_${index}_${randomString}.${fileExt}`;
    const filePath = `products/${fileName}`;
    
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '86400',
        upsert: false,
        contentType: file.type
      });
    
    if (error) {
      console.error(`❌ Ошибка fallback загрузки:`, error);
      return '/assets/default-product.jpg';
    }
    
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  }

  /**
   * Загружает изображения БЕЗ сжатия (для обратной совместимости)
   */
  async uploadProductImagesWithoutCompression(files: File[]): Promise<string[]> {
    console.log(`📤 Загрузка ${files.length} изображений БЕЗ сжатия...`);
    
    try {
      const imageUrls: string[] = [];
      
      for (const file of files) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `product_${timestamp}_${randomString}.${fileExt}`;
        const filePath = `products/${fileName}`;
        
        const supabase = this.supabaseService.getClient();
        
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '86400',
            upsert: false,
            contentType: file.type
          });
        
        if (error) {
          console.error('❌ Ошибка загрузки:', error);
          throw error;
        }
        
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        imageUrls.push(urlData.publicUrl);
      }
      
      console.log('✅ Изображения загружены (без сжатия):', imageUrls);
      return imageUrls;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки изображений:', error);
      throw error;
    }
  }

  /**
   * Удаляет изображения товара из Supabase Storage
   */
  async deleteProductImages(imageUrls: string[]): Promise<void> {
    try {
      console.log(`🗑️ Удаление ${imageUrls.length} изображений товара...`);
      
      // Извлекаем пути файлов из URL
      const filePaths = imageUrls
        .map(url => this.extractFilePathFromUrl(url))
        .filter((path): path is string => 
          path !== null && !path.includes('default-product.jpg')
        );
      
      if (filePaths.length > 0) {
        const supabase = this.supabaseService.getClient();
        
        // Удаляем каждый файл
        for (const filePath of filePaths) {
          const { error } = await supabase.storage
            .from('product-images')
            .remove([filePath]);
          
          if (error) {
            console.warn(`⚠️ Не удалось удалить файл ${filePath}:`, error);
          }
        }
        
        console.log('✅ Изображения удалены');
      }
    } catch (error) {
      console.error('❌ Ошибка удаления изображений:', error);
      throw error;
    }
  }

  createOptimizedImageUrl(originalUrl: string, width: number = 800, quality: number = 85): string {
    if (!originalUrl.includes('supabase.co')) {
      return originalUrl;
    }
    
    return `${originalUrl}?width=${width}&quality=${quality}&format=auto`;
  }

  /**
   * Получает все оптимизированные URL для товара
   */
  getOptimizedImageUrls(product: Product, deviceWidth?: number): string[] {
    if (!product.imageUrls || product.imageUrls.length === 0) {
      return ['/assets/default-product.jpg'];
    }
    
    const effectiveWidth = deviceWidth || window.innerWidth;
    let width = 800;
    
    if (effectiveWidth < 768) {
      width = 400;
    } else if (effectiveWidth < 1200) {
      width = 600;
    } else {
      width = 1000;
    }
    
    return product.imageUrls.map(url => 
      this.createOptimizedImageUrl(url, width, 85)
    );
  }

  // ===== ОПЕРАЦИИ С ПРОДУКТАМИ =====

  /**
   * Добавляет новый товар с возможностью загрузки изображений
   */
  async addProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    imageFiles?: File[]
  ): Promise<Product> {
    console.log('➕ Добавление нового товара в режиме:', this.storageMode());
    
    let imageUrls: string[] = [];
    
    try {
      // 1. Загружаем изображения со сжатием если есть
      if (imageFiles && imageFiles.length > 0) {
        console.log(`📤 Загружаем ${imageFiles.length} изображений со сжатием...`);
        imageUrls = await this.uploadProductImages(imageFiles);
      } else {
        // Используем очищенные URL из productData или дефолтные
        imageUrls = this.cleanImageUrls(productData.imageUrls || []);
      }
      
      const newProduct: Product = {
        ...productData,
        id: this.generateId(),
        imageUrls: imageUrls,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if (this.storageMode() === 'local') {
        // Локальное сохранение
        this.products.update(products => [...products, newProduct]);
        console.log('✅ Товар добавлен в localStorage:', newProduct.name);
        return newProduct;
      } else {
        // Сохранение в Supabase
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
          const finalProduct = {
            ...newProduct,
            id: result.id
          };
          
          this.products.update(products => [...products, finalProduct]);
          console.log('✅ Товар добавлен в Supabase:', finalProduct.name);
          return finalProduct;
        } else {
          throw new Error('Не удалось сохранить в Supabase');
        }
      }
    } catch (error) {
      console.error('❌ Ошибка добавления товара:', error);
      
      // Если ошибка при загрузке изображений, удаляем их
      if (imageUrls.length > 0 && imageUrls.some(url => this.isSupabaseStorageUrl(url))) {
        try {
          await this.deleteProductImages(imageUrls);
        } catch (deleteError) {
          console.error('❌ Ошибка удаления загруженных изображений:', deleteError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Обновляет существующий товар
   */
  async updateProduct(
    id: number | string,
    updatedProduct: Partial<Product>,
    newImageFiles?: File[]
  ): Promise<void> {
    console.log('✏️ Обновление товара ID:', id);
    
    let imageUrls = updatedProduct.imageUrls ? [...updatedProduct.imageUrls] : [];
    
    try {
      // 1. Если есть новые файлы, загружаем их со сжатием
      if (newImageFiles && newImageFiles.length > 0) {
        console.log(`📤 Загружаем ${newImageFiles.length} новых изображений со сжатием...`);
        const newUrls = await this.uploadProductImages(newImageFiles);
        imageUrls = [...imageUrls, ...newUrls];
      }
      
      // 2. Очищаем URL
      if (imageUrls.length > 0) {
        imageUrls = this.cleanImageUrls(imageUrls);
      }
      
      // 3. Сначала обновляем локально для быстрого отклика
      this.products.update(products =>
        products.map(product =>
          product.id == id 
            ? { 
                ...product, 
                ...updatedProduct,
                imageUrls: imageUrls.length > 0 ? imageUrls : product.imageUrls,
                updatedAt: new Date(),
                id: product.id
              } 
            : product
        )
      );
      
      // 4. Если режим Supabase, синхронизируем
      if (this.storageMode() === 'supabase') {
        const productToUpdate = {
          ...updatedProduct,
          imageUrls: imageUrls.length > 0 ? imageUrls : updatedProduct.imageUrls
        };
        
        const success = await this.supabaseService.updateProduct(
          String(id), 
          productToUpdate
        );
        
        if (!success) {
          console.warn('⚠️ Не удалось синхронизировать с Supabase');
        }
      }
      
      console.log('✅ Товар обновлен');
    } catch (error) {
      console.error('❌ Ошибка обновления товара:', error);
      throw error;
    }
  }

  /**
   * Удаляет товар и его изображения
   */
  async deleteProduct(id: number | string): Promise<void> {
  console.log('🗑️ Удаление товара ID:', id);
  
  const product = this.getProductById(id);
  
  // 1. Удаляем изображения из Storage если они из Supabase
  if (product && this.storageMode() === 'supabase') {
    const supabaseUrls = product.imageUrls.filter(url =>
      this.isSupabaseStorageUrl(url)
    );
    
    if (supabaseUrls.length > 0) {
      try {
        await this.deleteProductImagesFromStorage(supabaseUrls);
      } catch (error) {
        console.warn('⚠️ Не удалось удалить изображения из Storage:', error);
      }
    }
  }
  
  // 2. Удаляем товар из списка
  this.products.update(products =>
    products.filter(product => product.id != id)
  );
  
  // 3. Удаляем из Supabase таблицы
  if (this.storageMode() === 'supabase') {
    try {
      const success = await this.supabaseService.deleteProduct(String(id));
      if (!success) {
        console.warn('⚠️ Не удалось удалить из таблицы Supabase');
      } else {
        console.log('✅ Товар удален из таблицы Supabase');
      }
    } catch (error) {
      console.error('❌ Ошибка удаления из Supabase:', error);
    }
  }
  
  console.log('✅ Товар удален');
}

/**
 * Удаляет изображения товара из Supabase Storage
 */
private async deleteProductImagesFromStorage(imageUrls: string[]): Promise<void> {
  try {
    console.log(`🗑️ Удаление ${imageUrls.length} изображений товара из Storage...`);
    
    const filePaths = imageUrls
      .map(url => this.extractFilePathFromUrl(url))
      .filter((path): path is string => 
        path !== null && !path.includes('default-product.jpg')
      );
    
    if (filePaths.length > 0) {
      console.log(`Найдено ${filePaths.length} файлов для удаления:`, filePaths);
      
      const supabase = this.supabaseService.getClient();
      
      // Удаляем все файлы одним запросом (Supabase поддерживает массив)
      const { error } = await supabase.storage
        .from('product-images')
        .remove(filePaths);
      
      if (error) {
        console.error('❌ Ошибка удаления изображений из Storage:', error);
      } else {
        console.log(`✅ ${filePaths.length} изображений удалено из Storage`);
      }
    } else {
      console.log('⚠️ Нет файлов для удаления из Storage');
    }
  } catch (error) {
    console.error('❌ Ошибка удаления изображений:', error);
    // Не бросаем ошибку, чтобы не прерывать удаление товара
  }
}

private isSupabaseStorageUrl(url: string): boolean {
  return url.includes('supabase.co') && url.includes('/storage/v1/object/public/');
}

/**
 * Извлекает путь файла из Supabase Storage URL (добавьте этот метод если его нет)
 */
private extractFilePathFromUrl(url: string): string | null {
  if (!url.includes('supabase.co') || !url.includes('/storage/v1/object/public/')) {
    return null;
  }
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Пример URL: /storage/v1/object/public/product-images/products/product_123456789_0_abc123.jpg
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex !== -1 && publicIndex + 1 < pathParts.length) {
      return pathParts.slice(publicIndex + 1).join('/');
    }
  } catch (error) {
    console.warn('Не удалось распарсить URL:', url);
  }
  
  return null;
}

  // ===== УПРАВЛЕНИЕ РЕЖИМАМИ =====

  async switchStorageMode(mode: StorageMode): Promise<void> {
    if (mode === this.storageMode()) return;
    
    console.log(`🔄 Переключение режима с ${this.storageMode()} на ${mode}`);
    this.storageMode.set(mode);
    localStorage.setItem('komfort_storage_mode', mode);
    
    // Загружаем данные для нового режима
    if (mode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
  }

  // ===== ТЕСТИРОВАНИЕ И СИНХРОНИЗАЦИЯ =====

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

  async syncToSupabase(): Promise<void> {
    console.log('🔗 Синхронизация локальных данных с Supabase...');
    
    const localProducts = this.products();
    let successCount = 0;
    
    for (const product of localProducts) {
      try {
        let imageUrls = product.imageUrls;
        
        // Если изображения локальные, используем дефолтные
        const localImages = imageUrls.filter(url => 
          !this.isSupabaseStorageUrl(url) && 
          !url.startsWith('data:image')
        );
        
        if (localImages.length > 0) {
          console.log(`📤 Загрузка локальных изображений для ${product.name}...`);
          imageUrls = ['/assets/default-product.jpg'];
        }
        
        const productData = {
          name: product.name,
          description: product.description,
          price: product.price,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          imageUrls: imageUrls,
          stock: product.stock,
          features: product.features
        };
        
        const result = await this.supabaseService.addProduct(productData);
        if (result) {
          successCount++;
          console.log(`✅ Синхронизирован: ${product.name}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка синхронизации ${product.name}:`, error);
      }
    }
    
    console.log(`📊 Синхронизация завершена: ${successCount}/${localProducts.length} товаров`);
  }

  // ===== УТИЛИТНЫЕ МЕТОДЫ =====

  clearProducts(): void {
    this.products.set([]);
    localStorage.removeItem(this.storageKey);
    console.log('🧹 Все товары очищены');
  }

  resetToInitial(): void {
    this.products.set(this.getInitialProducts());
    console.log('🔄 Товары сброшены к начальным');
  }

  async fixAllImageUrls(): Promise<void> {
    console.log('🧹 Очистка всех imageUrls...');
    
    const fixedProducts = this.products().map(product => ({
      ...product,
      imageUrls: this.cleanImageUrls(product.imageUrls || [])
    }));
    
    this.products.set(fixedProducts);
    console.log('✅ Все imageUrls очищены');
    
    if (this.storageMode() === 'supabase') {
      await this.syncToSupabase();
    }
  }

  /**
   * Исправляет битые изображения товаров
   */
  async fixBrokenProductImages(): Promise<void> {
    console.log('🔧 Исправление битых изображений товаров...');
    
    const products = this.products();
    let fixedCount = 0;
    
    for (const product of products) {
      try {
        const hasBrokenImages = product.imageUrls?.some(url => 
          url.includes('20101581_1.jpg') && !url.startsWith('http')
        );
        
        if (hasBrokenImages) {
          console.log(`🔄 Исправляем товар "${product.name}"...`);
          
          const validImageUrls = product.imageUrls.filter(url => 
            !(url.includes('20101581_1.jpg') && !url.startsWith('http'))
          );
          
          if (validImageUrls.length === 0) {
            validImageUrls.push('/assets/default-product.jpg');
          }
          
          if (this.storageMode() === 'supabase') {
            await this.supabaseService.updateProduct(String(product.id), {
              imageUrls: validImageUrls
            });
          }
          
          this.products.update(products =>
            products.map(p =>
              p.id === product.id 
                ? { ...p, imageUrls: validImageUrls }
                : p
            )
          );
          
          fixedCount++;
          console.log(`✅ Товар "${product.name}" исправлен`);
        }
      } catch (error) {
        console.error(`❌ Ошибка исправления товара "${product.name}":`, error);
      }
    }
    
    console.log(`✅ Исправлено ${fixedCount} товаров`);
  }

  /**
   * Получает статистику по изображениям с информацией о сжатии
   */
  async getImageStats(): Promise<{
    totalImages: number;
    supabaseImages: number;
    localImages: number;
    base64Images: number;
    defaultImages: number;
    estimatedSavingsMB: number;
  }> {
    const products = this.products();
    let totalImages = 0;
    let supabaseImages = 0;
    let localImages = 0;
    let base64Images = 0;
    let defaultImages = 0;
    
    products.forEach(product => {
      product.imageUrls?.forEach(url => {
        totalImages++;
        
        if (this.isSupabaseStorageUrl(url)) {
          supabaseImages++;
        } else if (url.includes('default-product.jpg')) {
          defaultImages++;
        } else if (url.startsWith('data:image')) {
          base64Images++;
        } else if (url.startsWith('/assets/')) {
          localImages++;
        }
      });
    });
    
    const estimatedSavingsMB = parseFloat((supabaseImages * 0.7 * 0.5).toFixed(2));
    
    return {
      totalImages,
      supabaseImages,
      localImages,
      base64Images,
      defaultImages,
      estimatedSavingsMB
    };
  }

  /**
   * Пакетное сжатие существующих изображений (админская функция)
   */
  async compressExistingImages(): Promise<void> {
    console.log('🔄 Пакетное сжатие существующих изображений...');
    
    const products = this.products();
    let processedCount = 0;
    
    for (const product of products) {
      try {
        const uncompressedImages = product.imageUrls?.filter(url => 
          this.isSupabaseStorageUrl(url) && !url.includes('?width=')
        ) || [];
        
        if (uncompressedImages.length > 0) {
          console.log(`  Товар "${product.name}" имеет ${uncompressedImages.length} несжатых изображений`);
          processedCount++;
        }
      } catch (error) {
        console.error(`❌ Ошибка обработки товара "${product.name}":`, error);
      }
    }
    
    console.log(`✅ Проанализировано ${processedCount} товаров для сжатия`);
    console.log(`💡 Совет: Для сжатия существующих изображений перезагрузите их через форму редактирования`);
  }
}