// app/services/storage.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private get supabaseClient() {
  const service = this.supabaseService as any;
  return service.getClient ? service.getClient() : service.supabase;
}
  // Для локального хранилища
  private readonly PREFIX = 'komfort_';
  
  // Для Supabase Storage
  private readonly BUCKET_NAME = 'product-images';
  private readonly CATEGORIES_BUCKET = 'category-images';
  private readonly SLIDES_BUCKET = 'slides';
  private readonly SHOPS_BUCKET = 'shop-images';

  constructor(private supabaseService: SupabaseService) {}

  private get supabase() {
  // Если есть getClient - используем его
  if ((this.supabaseService as any).getClient) {
    return (this.supabaseService as any).getClient();
  }
  // Иначе пытаемся получить клиент напрямую
  return (this.supabaseService as any).supabase || 
         (this.supabaseService as any).supabaseClient;
}

  // ==================== ЛОКАЛЬНОЕ ХРАНИЛИЩЕ (sessionStorage/localStorage) ====================
  
  /**
   * Сохраняет данные в локальное хранилище
   */
  save(key: string, data: any): void {
    try {
      const fullKey = this.PREFIX + key;
      sessionStorage.setItem(fullKey, JSON.stringify(data));
      // Дублируем в localStorage для надежности
      localStorage.setItem(fullKey, JSON.stringify(data));
      console.log(`💾 Локальные данные сохранены: ${fullKey}`, data);
    } catch (error) {
      console.error('❌ Ошибка сохранения в локальное хранилище:', error);
    }
  }
  
  /**
   * Загружает данные из локального хранилища
   */
  load<T>(key: string): T | null {
    try {
      const fullKey = this.PREFIX + key;
      // Сначала пробуем sessionStorage
      let saved = sessionStorage.getItem(fullKey);
      
      // Если нет в sessionStorage, пробуем localStorage
      if (!saved) {
        saved = localStorage.getItem(fullKey);
      }
      
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('❌ Ошибка загрузки из локального хранилища:', error);
      return null;
    }
  }
  
  /**
   * Очищает локальное хранилище
   */
  clear(): void {
    // Очищаем оба хранилища
    const keysToRemove: string[] = [];
    
    // Находим все ключи с префиксом
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // Удаляем из обоих хранилищ
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    console.log('🧹 Локальное хранилище очищено');
  }

  // ==================== SUPABASE STORAGE ====================

  /**
   * Загружает файл в Supabase Storage
   * @param file - Файл для загрузки
   * @param bucket - Название bucket'а (по умолчанию 'product-images')
   * @param folder - Папка внутри bucket (опционально)
   * @returns Публичный URL загруженного файла
   */
  async uploadFile(file: File, bucket: string = this.BUCKET_NAME, folder?: string): Promise<string> {
    try {
      // Валидация файла
      if (!this.isImageFile(file)) {
        throw new Error('Файл должен быть изображением');
      }

      if (!this.validateFileSize(file, 10)) {
        throw new Error('Размер файла не должен превышать 10MB');
      }

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = this.generateUniqueFileName(fileExt);
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      console.log(`📤 Загрузка файла в Supabase Storage:`);
      console.log(`   Bucket: ${bucket}`);
      console.log(`   Путь: ${filePath}`);
      console.log(`   Размер: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Тип: ${file.type}`);

      // Загружаем файл в Supabase Storage
        const { data, error } = await this.supabase
        .storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        console.error('❌ Ошибка загрузки файла в Supabase:', error);
        throw error;
      }

      console.log('✅ Файл успешно загружен:', data);

      // Получаем публичный URL
      const publicUrl = this.getPublicUrl(filePath, bucket);
      console.log('🔗 Публичный URL:', publicUrl);

      return publicUrl;

    } catch (error) {
      console.error('❌ Ошибка в uploadFile:', error);
      throw error;
    }
  }

  /**
   * Загружает несколько файлов в Supabase Storage
   */
  async uploadMultipleFiles(files: File[], bucket?: string, folder?: string): Promise<string[]> {
    console.log(`📤 Начинаю загрузку ${files.length} файлов...`);
    
    const uploadPromises = files.map((file, index) => {
      console.log(`   Файл ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      return this.uploadFile(file, bucket, folder);
    });
    
    try {
      const urls = await Promise.all(uploadPromises);
      console.log(`✅ Все файлы успешно загружены: ${urls.length} шт.`);
      return urls;
    } catch (error) {
      console.error('❌ Ошибка загрузки нескольких файлов:', error);
      throw error;
    }
  }

  /**
   * Получает публичный URL файла из Supabase Storage
   */
  getPublicUrl(filePath: string, bucket: string = this.BUCKET_NAME): string {
    try {
      const { data } = this.supabase
        .storage
        .from(bucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('❌ Ошибка получения публичного URL:', error);
      throw error;
    }
  }

  /**
   * Удаляет файл из Supabase Storage
   */
  async deleteFile(filePath: string, bucket: string = this.BUCKET_NAME): Promise<void> {
    try {
      console.log(`🗑️ Удаление файла из Supabase: ${filePath} (bucket: ${bucket})`);
      
      const { error } = await this.supabase
        .storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('❌ Ошибка удаления файла:', error);
        throw error;
      }

      console.log('✅ Файл успешно удален');
    } catch (error) {
      console.error('❌ Ошибка в deleteFile:', error);
      throw error;
    }
  }

  /**
   * Удаляет несколько файлов из Supabase Storage
   */
  async deleteMultipleFiles(filePaths: string[], bucket?: string): Promise<void> {
    if (filePaths.length === 0) return;

    try {
      console.log(`🗑️ Удаление ${filePaths.length} файлов из Supabase...`);
      
      const { error } = await this.supabase
        .storage
        .from(bucket || this.BUCKET_NAME)
        .remove(filePaths);

      if (error) throw error;
      
      console.log('✅ Файлы успешно удалены');
    } catch (error) {
      console.error('❌ Ошибка удаления нескольких файлов:', error);
      throw error;
    }
  }

  /**
   * Загружает изображение товара
   */
  async uploadProductImage(file: File): Promise<string> {
    return this.uploadFile(file, this.BUCKET_NAME, 'products');
  }

  /**
   * Загружает изображение категории
   */
  async uploadCategoryImage(file: File): Promise<string> {
    return this.uploadFile(file, this.CATEGORIES_BUCKET, 'categories');
  }

  /**
   * Загружает изображение магазина
   */
  async uploadShopImage(file: File): Promise<string> {
    return this.uploadFile(file, this.SHOPS_BUCKET, 'shops');
  }

  /**
   * Загружает изображение для слайдера
   */
  async uploadSlideImage(file: File): Promise<string> {
    return this.uploadFile(file, this.SLIDES_BUCKET, 'slides');
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

  /**
   * Проверяет, является ли файл изображением
   */
  isImageFile(file: File): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml'
    ];
    
    return allowedTypes.includes(file.type.toLowerCase());
  }

  /**
   * Валидирует размер файла
   */
  validateFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * Генерирует уникальное имя файла
   */
  private generateUniqueFileName(extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${timestamp}_${random}.${extension}`;
  }

  /**
   * Извлекает имя файла из URL
   */
  extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch (error) {
      // Если не URL, возвращаем как есть
      return url;
    }
  }

  /**
   * Извлекает путь файла из URL Supabase Storage
   */
  extractFilePathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      // Удаляем часть с bucket'ом (например, '/storage/v1/object/public/product-images/')
      const match = path.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      return match ? match[1] : path;
    } catch (error) {
      return url;
    }
  }

  /**
   * Определяет bucket из URL
   */
  getBucketFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const match = path.match(/\/storage\/v1\/object\/public\/([^/]+)/);
      return match ? match[1] : this.BUCKET_NAME;
    } catch (error) {
      return this.BUCKET_NAME;
    }
  }

  /**
   * Проверяет, является ли URL ссылкой на Supabase Storage
   */
  isSupabaseStorageUrl(url: string): boolean {
    return url.includes('supabase.co/storage') || url.includes('/storage/v1/object/public/');
  }

  /**
   * Конвертирует Base64 в File
   */
  base64ToFile(base64: string, fileName: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], fileName, { type: mime });
  }

  /**
   * Загружает файл по URL
   */
  async downloadFileFromUrl(url: string): Promise<File> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const fileName = this.extractFileNameFromUrl(url) || `downloaded_${Date.now()}.jpg`;
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      console.error('❌ Ошибка загрузки файла по URL:', error);
      throw error;
    }
  }

  // ==================== УПРАВЛЕНИЕ BUCKET'АМИ ====================

  /**
   * Создает bucket в Supabase Storage (требует права администратора)
   */
  async createBucket(bucketName: string, isPublic: boolean = true): Promise<void> {
    try {
      console.log(`🛠️ Создание bucket'а: ${bucketName} (public: ${isPublic})`);
      
      // В Supabase API нет прямого метода создания bucket через клиент
      // Bucket'ы создаются через панель администратора Supabase
      console.warn('⚠️ Bucket\'ы создаются через панель администратора Supabase');
      console.warn('   Перейдите в: Supabase → Storage → Create New Bucket');
      console.warn(`   Название: ${bucketName}`);
      console.warn(`   Public: ${isPublic ? 'Yes' : 'No'}`);
      
      // Проверяем существование bucket'а
      await this.checkBucketExists(bucketName);
      
    } catch (error) {
      console.error('❌ Ошибка работы с bucket\'ом:', error);
      throw error;
    }
  }

  async compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    console.log(`📐 Сжатие изображения: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target?.result as string;
      
      img.onload = () => {
        // Рассчитываем новые размеры
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Создаем canvas для сжатия
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Не удалось создать контекст canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Конвертируем в WebP если поддерживается, иначе JPEG
        const mimeType = file.type.includes('png') ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Не удалось сжать изображение'));
              return;
            }
            
            const compressedFile = new File(
              [blob], 
              file.name.replace(/\.[^/.]+$/, '') + '.jpg', // Всегда jpg для лучшего сжатия
              { type: mimeType }
            );
            
            console.log(`✅ Изображение сжато:`);
            console.log(`   До: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   После: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Сжатие: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);
            
            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
    };
    
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}


  /**
   * Проверяет существование bucket'а
   */
  private async checkBucketExists(bucketName: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .storage
        .from(bucketName)
        .list();
      
      // Если ошибка "bucket not found", значит bucket не существует
      if (error && error.message.includes('not found')) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Инициализирует необходимые bucket'ы для приложения
   */
  async initializeBuckets(): Promise<void> {
    console.log('🛠️ Инициализация bucket\'ов...');
    
    const buckets = [
      { name: this.BUCKET_NAME, description: 'Изображения товаров' },
      { name: this.CATEGORIES_BUCKET, description: 'Изображения категорий' },
      { name: this.SLIDES_BUCKET, description: 'Изображения слайдов' },
      { name: this.SHOPS_BUCKET, description: 'Изображения магазинов' }
    ];

    for (const bucket of buckets) {
      try {
        const exists = await this.checkBucketExists(bucket.name);
        if (!exists) {
          console.warn(`⚠️ Bucket "${bucket.name}" не существует!`);
          console.warn(`   Создайте его в панели Supabase: Storage → New Bucket`);
          console.warn(`   Название: ${bucket.name}`);
          console.warn(`   Public: Yes`);
          console.warn(`   Описание: ${bucket.description}`);
        } else {
          console.log(`✅ Bucket "${bucket.name}" доступен`);
        }
      } catch (error) {
        console.error(`❌ Ошибка проверки bucket'а "${bucket.name}":`, error);
      }
    }
  }

  // ==================== ИНФОРМАЦИЯ О СТОРАДЖЕ ====================

  /**
   * Получает информацию об использовании Storage
   */
  async getStorageInfo(): Promise<{
    totalFiles: number;
    totalSize: number;
    buckets: { name: string; fileCount: number; size: number }[];
  }> {
    try {
      console.log('📊 Получение информации о Storage...');
      
      const buckets = [this.BUCKET_NAME, this.CATEGORIES_BUCKET, this.SLIDES_BUCKET, this.SHOPS_BUCKET];
      const bucketsInfo = [];
      let totalFiles = 0;
      let totalSize = 0;

      for (const bucket of buckets) {
        try {
          const { data: files, error } = await this.supabase
            .storage
            .from(bucket)
            .list();

          if (error) {
            console.warn(`⚠️ Ошибка получения файлов из bucket'а ${bucket}:`, error.message);
            continue;
          }

          if (files) {
            const fileCount = files.length;
            const size = files.reduce((sum: number, file: any) => sum + (file.metadata?.size || 0), 0);
            
            bucketsInfo.push({
              name: bucket,
              fileCount,
              size: size
            });
            
            totalFiles += fileCount;
            totalSize += size;
          }
        } catch (error) {
          console.warn(`⚠️ Пропускаем bucket ${bucket}:`, error);
        }
      }

      return {
        totalFiles,
        totalSize,
        buckets: bucketsInfo
      };
    } catch (error) {
      console.error('❌ Ошибка получения информации о Storage:', error);
      throw error;
    }
  }

  async uploadFileWithCompression(
  file: File, 
  bucket: string = this.BUCKET_NAME, 
  folder?: string,
  maxWidth = 1200,
  quality = 0.7
): Promise<string> {
  try {
    console.log(`📤 Загрузка с сжатием: ${file.name}`);
    
    // Сжимаем изображение
    const compressedFile = await this.compressImage(file, maxWidth, quality);
    
    // Загружаем сжатое изображение
    return await this.uploadFile(compressedFile, bucket, folder);
    
  } catch (error) {
    console.error('❌ Ошибка сжатия, загружаем оригинал:', error);
    // Если сжатие не удалось, загружаем оригинал
    return await this.uploadFile(file, bucket, folder);
  }
}

  /**
   * Показывает информацию о Storage в консоли
   */
  async logStorageInfo(): Promise<void> {
    try {
      const info = await this.getStorageInfo();
      
      console.log('📊 =========== ИНФОРМАЦИЯ О STORAGE ===========');
      console.log(`📁 Всего файлов: ${info.totalFiles}`);
      console.log(`💾 Общий размер: ${(info.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('');
      
      info.buckets.forEach(bucket => {
        console.log(`🪣 ${bucket.name}:`);
        console.log(`   📄 Файлов: ${bucket.fileCount}`);
        console.log(`   💾 Размер: ${(bucket.size / 1024 / 1024).toFixed(2)} MB`);
      });
      
      console.log('=============================================');
    } catch (error) {
      console.error('❌ Ошибка логирования информации о Storage:', error);
    }
  }
}