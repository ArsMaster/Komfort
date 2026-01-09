import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CatalogCategory } from '../models/catalog.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private categoriesSubject = new BehaviorSubject<CatalogCategory[]>(this.getInitialCategories());
  categories$: Observable<CatalogCategory[]> = this.categoriesSubject.asObservable();
  
  // Режим работы: 'local' или 'supabase'
  private storageMode: 'local' | 'supabase' = 'local';
  private storageKey = 'komfort_categories';

  constructor(private supabaseService: SupabaseService) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Проверяем сохраненный режим
    this.storageMode = localStorage.getItem('komfort_storage_mode') as 'local' | 'supabase' || 'supabase';
    
    console.log('=== CatalogService инициализирован ===');
    console.log('Режим работы:', this.storageMode);
    
    if (this.storageMode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
    
    console.log('Загружено категорий:', this.getCategories().length);
    this.getCategories().forEach((cat, index) => {
      console.log(`Категория ${index + 1}: ID=${cat.id}, Название="${cat.title}"`);
    });
  }

  private getInitialCategories(): CatalogCategory[] {
    return [
      {
        id: 1,
        title: 'Гостиная',
        image: 'assets/livingroom.jpg',
        slug: 'livingroom',
        order: 1,
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 2,
        title: 'Спальня',
        image: 'assets/bedroom.jpg',
        slug: 'bedroom',
        order: 2,
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 3,
        title: 'Кухня',
        image: 'assets/kitchen.jpg',
        slug: 'kitchen',
        order: 3,
        isActive: true,
        createdAt: new Date()
      }
    ];
  }

  // ===== ЗАГРУЗКА ИЗ LOCALSTORAGE =====
  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const categoriesWithDates = parsed.map((cat: any) => ({
          ...cat,
          createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date()
        }));
        this.categoriesSubject.next(categoriesWithDates);
        console.log('Категории загружены из localStorage');
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        this.categoriesSubject.next(this.getInitialCategories());
      }
    } else {
      console.log('Нет сохраненных категорий, используются начальные');
      this.categoriesSubject.next(this.getInitialCategories());
    }
  }

  // ===== ЗАГРУЗКА ИЗ SUPABASE =====
  private async loadFromSupabase(): Promise<void> {
    try {
      console.log('Загрузка категорий из Supabase...');
      const categories = await this.supabaseService.getCategories();
      
      if (categories && categories.length > 0) {
        this.categoriesSubject.next(categories);
        console.log('Категории загружены из Supabase:', categories.length);
        
        // Сохраняем в LocalStorage как кэш
        this.saveToLocalStorage(categories);
      } else {
        console.log('Supabase пуст, загружаем из localStorage');
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Ошибка загрузки из Supabase:', error);
      console.log('Переключаемся на LocalStorage');
      this.storageMode = 'local';
      this.loadFromLocalStorage();
    }
  }

  // ===== СОХРАНЕНИЕ =====
  private saveToLocalStorage(categories?: CatalogCategory[]): void {
    const catsToSave = categories || this.getCategories();
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(catsToSave));
      console.log('Категории сохранены в localStorage (кэш)');
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  }

  // ===== ПУБЛИЧНЫЕ МЕТОДЫ (остаются почти без изменений) =====
  getCategories(): CatalogCategory[] {
    return this.categoriesSubject.getValue();
  }

  // Добавление категории с поддержкой обоих режимов
  async addCategory(category: Omit<CatalogCategory, 'id' | 'createdAt'>): Promise<CatalogCategory> {
    console.log('Добавление категории в режиме:', this.storageMode);
    
    const newCategory: CatalogCategory = {
      ...category,
      id: this.generateId(),
      createdAt: new Date()
    };
    
    if (this.storageMode === 'local') {
      // Локальное сохранение
      const updated = [...this.getCategories(), newCategory];
      this.categoriesSubject.next(updated);
      this.saveToLocalStorage(updated);
      
      console.log('Категория добавлена в LocalStorage:', newCategory);
      return newCategory;
    } else {
      // Сохранение в Supabase
      try {
        const result = await this.supabaseService.addCategory(newCategory);
        if (result) {
          const updated = [...this.getCategories(), result];
          this.categoriesSubject.next(updated);
          this.saveToLocalStorage(updated); // Кэшируем
          
          console.log('Категория добавлена в Supabase:', result);
          return result;
        } else {
          throw new Error('Не удалось сохранить в Supabase');
        }
      } catch (error) {
        console.error('Ошибка сохранения в Supabase:', error);
        // Возвращаем в локальный режим и сохраняем локально
        this.storageMode = 'local';
        return this.addCategory(category);
      }
    }
  }

  // Обновление категории
  async updateCategory(id: number, updates: Partial<CatalogCategory>): Promise<CatalogCategory | null> {
    console.log('Обновление категории ID:', id, 'в режиме:', this.storageMode);
    
    const categories = this.getCategories();
    const index = categories.findIndex(item => item.id === id);
    
    if (index === -1) {
      console.error(`Категория с id ${id} не найдена`);
      return null;
    }
    
    const updatedCategory = { ...categories[index], ...updates };
    const updatedCategories = [...categories];
    updatedCategories[index] = updatedCategory;
    
    // Сначала обновляем локально для быстрого отклика
    this.categoriesSubject.next(updatedCategories);
    
    if (this.storageMode === 'local') {
      this.saveToLocalStorage(updatedCategories);
      console.log('Категория обновлена в LocalStorage');
    } else {
      // Синхронизируем с Supabase
      try {
        const success = await this.supabaseService.updateCategory(id, updates);
        if (success) {
          this.saveToLocalStorage(updatedCategories); // Обновляем кэш
          console.log('Категория синхронизирована с Supabase');
        } else {
          console.warn('Не удалось синхронизировать с Supabase');
        }
      } catch (error) {
        console.error('Ошибка синхронизации с Supabase:', error);
      }
    }
    
    return updatedCategory;
  }

  // Удаление категории
  async deleteCategory(id: number): Promise<boolean> {
    console.log('Удаление категории ID:', id, 'в режиме:', this.storageMode);
    
    const categories = this.getCategories();
    const exists = categories.some(item => item.id === id);
    
    if (!exists) {
      console.error(`Категория с id ${id} не найдена`);
      return false;
    }
    
    const updated = categories.filter(item => item.id !== id);
    
    // Сначала удаляем локально
    this.categoriesSubject.next(updated);
    
    if (this.storageMode === 'local') {
      this.saveToLocalStorage(updated);
      console.log('Категория удалена из LocalStorage');
      return true;
    } else {
      // Удаляем из Supabase
      try {
        const success = await this.supabaseService.deleteCategory(id);
        if (success) {
          this.saveToLocalStorage(updated);
          console.log('Категория удалена из Supabase');
          return true;
        } else {
          console.warn('Не удалось удалить из Supabase');
          return false;
        }
      } catch (error) {
        console.error('Ошибка удаления из Supabase:', error);
        return false;
      }
    }
  }

  private generateId(): number {
    const categories = this.getCategories();
    if (categories.length === 0) return 1;
    
    const maxId = Math.max(...categories.map(cat => cat.id));
    return maxId + 1;
  }

  getCategoryById(id: number): CatalogCategory | undefined {
    return this.getCategories().find(cat => cat.id === id);
  }

  getCategoryBySlug(slug: string): CatalogCategory | undefined {
    return this.getCategories().find(cat => cat.slug === slug);
  }

  

  // ===== МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ РЕЖИМАМИ =====
  
  getStorageMode(): 'local' | 'supabase' {
    return this.storageMode;
  }

  async switchStorageMode(mode: 'local' | 'supabase'): Promise<void> {
    if (this.storageMode === mode) return;
    
    console.log(`Переключение режима CatalogService с ${this.storageMode} на ${mode}`);
    this.storageMode = mode;
    
    if (mode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
  }

  // Синхронизация локальных данных с Supabase
  async syncToSupabase(): Promise<void> {
    if (this.storageMode === 'supabase') {
      console.log('Уже в режиме Supabase, синхронизация не требуется');
      return;
    }
    
    console.log('Синхронизация категорий с Supabase...');
    const localCategories = this.getCategories();
    let successCount = 0;
    
    for (const category of localCategories) {
      try {
        const result = await this.supabaseService.addCategory(category);
        if (result) {
          successCount++;
          console.log(`Синхронизирована категория: ${category.title}`);
        }
      } catch (error) {
        console.error(`Ошибка синхронизации категории ${category.title}:`, error);
      }
    }
    
    console.log(`✅ Синхронизация завершена: ${successCount}/${localCategories.length} категорий`);
  }
}