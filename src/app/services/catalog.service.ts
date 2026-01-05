import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CatalogCategory } from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private categoriesSubject = new BehaviorSubject<CatalogCategory[]>(this.getInitialCategories());
  categories$: Observable<CatalogCategory[]> = this.categoriesSubject.asObservable();

  constructor() {
    this.loadFromLocalStorage();
    console.log('=== CatalogService инициализирован ===');
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
        image: '/livingroom.jpg',
        slug: 'livingroom',
        order: 1,
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 2,
        title: 'Спальня',
        image: '/bedroom.jpg',
        slug: 'bedroom',
        order: 2,
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 3,
        title: 'Кухня',
        image: '/kitchen.jpg',
        slug: 'kitchen',
        order: 3,
        isActive: true,
        createdAt: new Date()
      }
    ];
  }

  getCategories(): CatalogCategory[] {
    return this.categoriesSubject.getValue();
  }

  addCategory(category: Omit<CatalogCategory, 'id' | 'createdAt'>): CatalogCategory {
    const newCategory: CatalogCategory = {
      ...category,
      id: this.generateId(),
      createdAt: new Date()
    };
    
    const updated = [...this.getCategories(), newCategory];
    this.categoriesSubject.next(updated);
    this.saveToLocalStorage();
    
    console.log('Добавлена новая категория:', newCategory);
    return newCategory;
  }

  updateCategory(id: number, updates: Partial<CatalogCategory>): CatalogCategory | null {
    const categories = this.getCategories();
    const index = categories.findIndex(item => item.id === id);
    
    if (index === -1) {
      console.error(`Категория с id ${id} не найдена`);
      return null;
    }
    
    const updatedCategory = { ...categories[index], ...updates };
    const updatedCategories = [...categories];
    updatedCategories[index] = updatedCategory;
    
    this.categoriesSubject.next(updatedCategories);
    this.saveToLocalStorage();
    
    return updatedCategory;
  }

  deleteCategory(id: number): boolean {
    const categories = this.getCategories();
    const exists = categories.some(item => item.id === id);
    
    if (!exists) {
      console.error(`Категория с id ${id} не найдена`);
      return false;
    }
    
    const updated = categories.filter(item => item.id !== id);
    this.categoriesSubject.next(updated);
    this.saveToLocalStorage();
    
    return true;
  }

  private generateId(): number {
    const categories = this.getCategories();
    if (categories.length === 0) return 1;
    
    // Находим максимальный ID и добавляем 1
    const maxId = Math.max(...categories.map(cat => cat.id));
    return maxId + 1;
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('komfort_categories', JSON.stringify(this.getCategories()));
      console.log('Категории сохранены в localStorage');
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem('komfort_categories');
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
      }
    } else {
      console.log('Нет сохраненных категорий, используются начальные');
    }
  }

  getCategoryById(id: number): CatalogCategory | undefined {
    return this.getCategories().find(cat => cat.id === id);
  }

  getCategoryBySlug(slug: string): CatalogCategory | undefined {
    return this.getCategories().find(cat => cat.slug === slug);
  }
}