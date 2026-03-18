// catalog.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { CatalogCategory } from '../models/catalog.model';
import { SupabaseService } from './supabase.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  // Начинаем с пустого массива, чтобы избежать моковых данных при инициализации
  private categoriesSubject = new BehaviorSubject<CatalogCategory[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  
  // Публичные Observable
  categories$: Observable<CatalogCategory[]> = this.categoriesSubject.asObservable();
  loading$: Observable<boolean> = this.loadingSubject.asObservable();
  error$: Observable<string | null> = this.errorSubject.asObservable();
  
  // Режим работы
  private storageMode: 'local' | 'supabase' = 'supabase';
  private storageKey = 'komfort_categories';
  
  // Кэширование запросов
  private categoriesCache: CatalogCategory[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 минут
  
  // Флаги инициализации
  private isInitialized = false;
  private isInitializing = false;

  constructor(
    private supabaseService: SupabaseService,
    private storageService: StorageService
  ) {
    // Асинхронная инициализация
    this.initialize();
  }

  /**
   * Инициализация сервиса
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    
    try {
      // Проверяем сохраненный режим
      const savedMode = localStorage.getItem('komfort_storage_mode');
      this.storageMode = (savedMode === 'local' || savedMode === 'supabase') 
        ? savedMode 
        : 'supabase';
      
      console.log('=== CatalogService инициализирован ===');
      console.log('Режим работы:', this.storageMode);
      
      // Загружаем категории
      await this.loadCategories();
      
      console.log('✅ Загружено категорий:', this.categoriesSubject.getValue().length);
    } catch (error) {
      console.error('❌ Ошибка инициализации CatalogService:', error);
      this.errorSubject.next('Ошибка загрузки категорий');
    } finally {
      this.isInitializing = false;
      this.isInitialized = true;
    }
  }

  /**
   * Моковые данные для резервного режима
   */
  private getInitialCategories(): CatalogCategory[] {
    return [
      {
        id: 1,
        title: 'Гостиная',
        image: 'assets/livingroom.jpg',
        slug: 'gostinaya',
        description: 'Мебель для гостиной',
        order: 1,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        title: 'Спальня',
        image: 'assets/bedroom.jpg',
        slug: 'spalnya',
        description: 'Мебель для спальни',
        order: 2,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 3,
        title: 'Кухня',
        image: 'assets/kitchen.jpg',
        slug: 'kuhnya',
        description: 'Мебель для кухни',
        order: 3,
        isActive: true,
        createdAt: new Date(),
      }
    ];
  }

  /**
   * Основной метод загрузки категорий
   */
  private async loadCategories(): Promise<void> {
  this.loadingSubject.next(true);
  this.errorSubject.next(null);

  try {
    if (this.storageMode === 'local') {
      await this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
    
  } catch (error) {
    console.error('❌ Ошибка загрузки категорий:', error);
    this.errorSubject.next('Не удалось загрузить категории');
    throw error;
  } finally {
    this.loadingSubject.next(false);
  }
}

  /**
   * Загрузка из localStorage
   */
  private async loadFromLocalStorage(): Promise<void> {
    console.log('💾 Загрузка категорий из localStorage...');
    
    try {
      const saved = localStorage.getItem(this.storageKey);
      
      if (saved) {
        const categories = JSON.parse(saved);
        console.log('✅ Категории загружены из localStorage:', categories.length);
        this.categoriesSubject.next(categories);
        this.categoriesCache = categories;
      } else {
        console.log('📭 Нет сохраненных категорий в localStorage');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки из localStorage:', error);
      throw error;
    }
  }

  /**
   * Загрузка из Supabase
   */
  private async loadFromSupabase(): Promise<void> {
    // Проверяем кэш
    const cacheAge = Date.now() - this.cacheTimestamp;
    if (this.categoriesCache && cacheAge < this.CACHE_DURATION) {
      console.log(`💾 Используем кэш (возраст: ${Math.round(cacheAge / 1000)} сек)`);
      this.categoriesSubject.next(this.categoriesCache);
      return;
    }

    console.log('⏱️ [НАЧАЛО] Загрузка категорий из Supabase...');
    const startTime = performance.now();

    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true })
        .limit(50);

      const queryTime = performance.now() - startTime;
      
      if (error) {
        console.error('❌ Ошибка запроса к Supabase:', error);
        throw error;
      }

      console.log(`⏱️ [ЗАПРОС] Время выполнения: ${queryTime.toFixed(0)}ms`);
      console.log(`📊 Получено записей: ${data?.length || 0}`);

      if (data && data.length > 0) {
        const processingStart = performance.now();
        
        const categories: CatalogCategory[] = data.map(item => ({
          id: item.id,
          title: item.title,
          image: this.normalizeImageUrl(item.image),
          slug: item.slug,
          description: item.description || '',
          order: item.order || 0,
          isActive: item.is_active !== false,
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        }));

        const processingTime = performance.now() - processingStart;
        const totalTime = performance.now() - startTime;
        
        console.log(`⏱️ [ОБРАБОТКА] Время: ${processingTime.toFixed(0)}ms`);
        console.log(`⏱️ [ОБЩЕЕ] Время: ${totalTime.toFixed(0)}ms`);
        
        // Сохраняем в кэш
        this.categoriesCache = categories;
        this.cacheTimestamp = Date.now();
        
        // Обновляем состояние
        this.categoriesSubject.next(categories);
        
        // Сохраняем в localStorage как кэш
        // this.saveToLocalStorage(categories);
        
         console.log(`✅ Категории загружены из Supabase: ${categories.length}`);
          } else {
            console.log('📭 В Supabase нет категорий');
            // НЕ загружаем моковые данные для Supabase режима
            // Просто оставляем пустой массив
          }
        } catch (error) {
          console.error('❌ Ошибка загрузки из Supabase:', error);
          
        throw error;
    }
  }

  /**
   * Нормализация URL изображения
   */
  private normalizeImageUrl(imageUrl: string | null): string {
  if (!imageUrl || imageUrl.trim() === '') {
    return ''; // ← Пустая строка вместо дефолтного изображения
  }

  const trimmedUrl = imageUrl.trim();
  
  // Если это URL из Supabase Storage
  if (trimmedUrl.includes('supabase.co')) {
    return trimmedUrl;
  }

  // Если это локальный путь (уже существующие изображения)
  if (trimmedUrl.startsWith('/assets/')) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith('assets/')) {
    return '/' + trimmedUrl;
  }

  // Во всех остальных случаях возвращаем как есть
  return trimmedUrl;
}

  /**
   * Сохранение в localStorage
   */
  private saveToLocalStorage(categories: CatalogCategory[]): void {
    try {
      // ⚠️ ЗАКОММЕНТИРУЙТЕ:
    // localStorage.setItem(this.storageKey, JSON.stringify(categories));
    // console.log('💾 Категории сохранены в localStorage (кэш):', categories.length);
    
    console.log('⛔ Сохранение в localStorage отключено');
    } catch (error) {
      console.error('❌ Ошибка сохранения в localStorage:', error);
    }
  }

  /**
   * Сжатие изображения
   */
  async compressImage(
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

      if (!ctx) {
        reject(new Error('Не удалось получить контекст canvas'));
        return;
      }

      reader.onload = (e) => {
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;
            
            console.log(`📏 Исходные размеры: ${width}x${height}`);
            
            if (width > maxWidth) {
              const ratio = maxWidth / width;
              height = Math.round(height * ratio);
              width = maxWidth;
              console.log(`📐 Новые размеры: ${width}x${height}`);
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
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
   * Определение параметров сжатия
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
      quality: isPNG ? 0.9 : 0.85,
      format: isPNG ? 'image/png' : 'image/jpeg'
    };
  }

  /**
   * Загрузка изображения категории
   */
  async uploadCategoryImage(file: File): Promise<string> {
    try {
      console.log('📤 Загрузка изображения категории...');
      
      const settings = this.getCompressionSettings(file);
      console.log(`🎛️ Параметры сжатия:`, settings);
      
      const compressedFile = await this.compressImage(
        file, 
        settings.maxWidth, 
        settings.quality,
        settings.format
      );
      
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExt = compressedFile.type === 'image/png' ? 'png' : 'jpg';
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `categories/${fileName}`;
      
      const supabase = this.supabaseService.getClient();
      
      console.log(`📁 Загружаем сжатый файл: ${fileName}`);
      
      const { data, error } = await supabase.storage
        .from('category-images')
        .upload(filePath, compressedFile, {
          cacheControl: '86400',
          upsert: false,
          contentType: compressedFile.type
        });
      
      if (error) {
        console.error('❌ Ошибка загрузки в Supabase:', error);
        throw error;
      }
      
      const { data: urlData } = supabase.storage
        .from('category-images')
        .getPublicUrl(filePath);
      
      console.log('✅ Изображение загружено:', urlData.publicUrl);
      
      return urlData.publicUrl;
      
    } catch (error: any) {
      console.error('❌ Ошибка загрузки:', error);
      
      // Fallback без сжатия
      if (error.message.includes('сжатие') || error.message.includes('canvas')) {
        console.log('🔄 Fallback: загрузка без сжатия...');
        return await this.uploadImageWithoutCompression(file);
      }
      
      throw error;
    }
  }

  /**
   * Загрузка без сжатия (fallback)
   */
  private async uploadImageWithoutCompression(file: File): Promise<string> {
    console.warn('⚠️ Загружаем без сжатия (fallback)');
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}_${randomString}.${fileExt}`;
    const filePath = `categories/${fileName}`;
    
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase.storage
      .from('category-images')
      .upload(filePath, file, {
        cacheControl: '86400',
        upsert: false,
        contentType: file.type
      });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('category-images')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  }

  /**
   * Создание оптимизированного URL
   */
  createOptimizedImageUrl(originalUrl: string, width: number = 800): string {
    if (!originalUrl.includes('supabase.co')) {
      return originalUrl;
    }
    
    // Убираем существующие параметры запроса
    const baseUrl = originalUrl.split('?')[0];
    return `${baseUrl}?width=${width}&quality=85&format=auto`;
  }

  /**
   * Обновление категории
   */
  async updateCategory(id: number, updates: Partial<CatalogCategory>): Promise<CatalogCategory | null> {
    console.log('✏️ Обновление категории ID:', id);
    
    const categories = this.categoriesSubject.getValue();
    const index = categories.findIndex(item => item.id === id);
    
    if (index === -1) {
      console.error(`❌ Категория с id ${id} не найдена`);
      this.errorSubject.next(`Категория с id ${id} не найдена`);
      return null;
    }
    
    const updatedCategory = { 
      ...categories[index], 
      ...updates, 
      updatedAt: new Date() 
    };
    const updatedCategories = [...categories];
    updatedCategories[index] = updatedCategory;
    
    // Обновляем локально для быстрого отклика
    this.categoriesSubject.next(updatedCategories);
    this.categoriesCache = updatedCategories;
    
    // Сохраняем в localStorage
    // this.saveToLocalStorage(updatedCategories);
    
    if (this.storageMode === 'supabase') {
      try {
        // Подготавливаем данные для Supabase (конвертируем camelCase в snake_case)
        const supabaseData = {
          title: updatedCategory.title,
          slug: updatedCategory.slug,
          image: updatedCategory.image,
          description: updatedCategory.description,
          order: updatedCategory.order,
          is_active: updatedCategory.isActive,
          updated_at: new Date().toISOString()
        };
        
        const success = await this.supabaseService.updateCategory(id, supabaseData);
        if (success) {
          console.log('✅ Категория синхронизирована с Supabase');
        } else {
          console.warn('⚠️ Не удалось синхронизировать с Supabase');
        }
      } catch (error) {
        console.error('❌ Ошибка синхронизации с Supabase:', error);
      }
    }
    
    console.log('✅ Категория обновлена:', updatedCategory.title);
    return updatedCategory;
  }

  /**
   * Добавление категории
   */
  async addCategory(category: Omit<CatalogCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatalogCategory> {
    console.log('➕ Добавление категории:', category.title);
    
    const newCategory: CatalogCategory = {
      ...category,
      id: this.generateId(),
      createdAt: new Date(),
    };
    
    const updatedCategories = [...this.categoriesSubject.getValue(), newCategory];
    
    // Обновляем локально
    this.categoriesSubject.next(updatedCategories);
    this.categoriesCache = updatedCategories;
    
    // Сохраняем в localStorage
    // this.saveToLocalStorage(updatedCategories);
    
    if (this.storageMode === 'supabase') {
      try {
        // Подготавливаем данные для Supabase
        const supabaseData = {
          title: newCategory.title,
          slug: newCategory.slug,
          image: newCategory.image,
          description: newCategory.description,
          order: newCategory.order,
          is_active: newCategory.isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const result = await this.supabaseService.addCategory(supabaseData);
        if (result) {
          // Обновляем ID с тем, что вернул Supabase
          const finalCategory = { ...newCategory, id: result.id };
          const finalCategories = updatedCategories.map(cat => 
            cat.id === newCategory.id ? finalCategory : cat
          );
          
          this.categoriesSubject.next(finalCategories);
          this.categoriesCache = finalCategories;
          this.saveToLocalStorage(finalCategories);
          
          console.log('✅ Категория добавлена в Supabase:', result.title);
          return finalCategory;
        }
      } catch (error) {
        console.error('❌ Ошибка сохранения в Supabase:', error);
      }
    }
    
    console.log('✅ Категория добавлена локально:', newCategory.title);
    return newCategory;
  }

  /**
   * Удаление категории
   */
  async deleteCategory(id: number): Promise<boolean> {
    console.log('🗑️ Удаление категории ID:', id);
    
    const categories = this.categoriesSubject.getValue();
    const category = this.getCategoryById(id);
    
    if (!category) {
      console.error(`❌ Категория с id ${id} не найдена`);
      this.errorSubject.next(`Категория с id ${id} не найдена`);
      return false;
    }
    
    // Удаляем изображение из Storage если оно в Supabase
    if (this.storageMode === 'supabase' && 
        category.image.includes('supabase.co') && 
        category.image.includes('/storage/v1/object/public/')) {
      try {
        await this.deleteCategoryImageFromStorage(category.image);
        console.log('✅ Изображение категории удалено из Storage');
      } catch (error) {
        console.warn('⚠️ Не удалось удалить изображение из Storage:', error);
      }
    }
    
    const updatedCategories = categories.filter(item => item.id !== id);
    
    // Обновляем локально
    this.categoriesSubject.next(updatedCategories);
    this.categoriesCache = updatedCategories;
    
    // Сохраняем в localStorage
    // this.saveToLocalStorage(updatedCategories);
    
    if (this.storageMode === 'supabase') {
      try {
        const success = await this.supabaseService.deleteCategory(id);
        if (success) {
          console.log('✅ Категория удалена из Supabase');
          return true;
        } else {
          console.warn('⚠️ Не удалось удалить из Supabase');
          return false;
        }
      } catch (error) {
        console.error('❌ Ошибка удаления из Supabase:', error);
        return false;
      }
    }
    
    console.log('✅ Категория удалена локально');
    return true;
  }

  /**
   * Удаление изображения из Storage
   */
  private async deleteCategoryImageFromStorage(imageUrl: string): Promise<void> {
    try {
      const filePath = this.extractFilePathFromUrl(imageUrl);
      if (!filePath) {
        console.log('⚠️ Не удалось извлечь путь файла из URL:', imageUrl);
        return;
      }
      
      console.log(`🗑️ Удаляем изображение категории из Storage: ${filePath}`);
      
      const supabase = this.supabaseService.getClient();
      const { error } = await supabase.storage
        .from('category-images')
        .remove([filePath]);
      
      if (error) {
        console.warn('⚠️ Ошибка удаления изображения категории:', error);
      } else {
        console.log('✅ Изображение категории удалено из Storage');
      }
    } catch (error) {
      console.error('❌ Ошибка удаления изображения категории:', error);
    }
  }

  /**
   * Извлечение пути файла из URL
   */
  private extractFilePathFromUrl(url: string): string | null {
    if (!url.includes('supabase.co') || !url.includes('/storage/v1/object/public/')) {
      return null;
    }
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex !== -1 && publicIndex + 1 < pathParts.length) {
        return pathParts.slice(publicIndex + 1).join('/');
      }
    } catch (error) {
      console.warn('Не удалось распарсить URL:', url);
    }
    
    return null;
  }

  /**
   * Генерация ID (для локального режима)
   */
  private generateId(): number {
    const categories = this.categoriesSubject.getValue();
    if (categories.length === 0) return 1;
    
    const maxId = Math.max(...categories.map(cat => cat.id));
    return maxId + 1;
  }

  /**
   * Получение всех категорий
   */
  getCategories(): CatalogCategory[] {
    return this.categoriesSubject.getValue();
  }

  /**
   * Получение категории по ID
   */
  getCategoryById(id: number): CatalogCategory | undefined {
    return this.categoriesSubject.getValue().find(cat => cat.id === id);
  }

  /**
   * Получение категории по slug
   */
  getCategoryBySlug(slug: string): CatalogCategory | undefined {
    return this.categoriesSubject.getValue().find(cat => cat.slug === slug);
  }

  /**
   * Получение режима хранения
   */
  getStorageMode(): 'local' | 'supabase' {
    return this.storageMode;
  }

  /**
   * Переключение режима хранения
   */
  async switchStorageMode(mode: 'local' | 'supabase'): Promise<void> {
    if (this.storageMode === mode) return;
    
    console.log(`🔄 Переключение режима с ${this.storageMode} на ${mode}`);
    this.storageMode = mode;
    localStorage.setItem('komfort_storage_mode', mode);
    
    // Очищаем кэш при переключении режима
    this.categoriesCache = null;
    this.cacheTimestamp = 0;
    
    await this.loadCategories();
  }

  /**
   * Принудительная перезагрузка
   */
  async forceReload(): Promise<void> {
    console.log('🔄 Принудительная перезагрузка категорий...');
    this.categoriesCache = null;
    this.cacheTimestamp = 0;
    await this.loadCategories();
  }

  /**
   * Очистка кэша
   */
  clearCache(): void {
    console.log('🗑️ Очистка кэша категорий...');
    this.categoriesCache = null;
    this.cacheTimestamp = 0;
    localStorage.removeItem(this.storageKey);
    
    // Перезагружаем
    this.loadCategories();
  }

  /**
   * Получение информации о кэше
   */
  getCacheInfo(): { hasCache: boolean; ageSeconds: number; itemCount: number } {
    const ageSeconds = this.categoriesCache 
      ? Math.round((Date.now() - this.cacheTimestamp) / 1000) 
      : 0;
    
    return {
      hasCache: !!this.categoriesCache,
      ageSeconds,
      itemCount: this.categoriesCache?.length || 0
    };
  }

  /**
   * Получение состояния загрузки
   */
  isLoading(): boolean {
    return this.loadingSubject.getValue();
  }

  /**
   * Получение текущей ошибки
   */
  getError(): string | null {
    return this.errorSubject.getValue();
  }

  /**
   * Очистка ошибки
   */
  clearError(): void {
    this.errorSubject.next(null);
  }
}