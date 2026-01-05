import { Component, OnInit, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../services/catalog.service';
import { CatalogCategory } from '../../models/catalog.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-catalog.component.html',
  styleUrls: ['./admin-catalog.component.scss']
})
export class AdminCatalogComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  categories = signal<CatalogCategory[]>([]);
  showForm = false;
  editingCategory = false;
  showSlugField = false;
  currentCategory: Partial<CatalogCategory> = this.getEmptyCategory();
  
  selectedFile: File | null = null;
  filePreview: string = '';
  
  notification = signal<{type: 'success' | 'error', message: string} | null>(null);
  isLoading = signal(false);
  
  private subscription?: Subscription;

  constructor(private catalogService: CatalogService) {}

  ngOnInit(): void {
    // Подписываемся на изменения категорий из сервиса
    this.subscription = this.catalogService.categories$.subscribe(categories => {
      this.categories.set(categories);
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getEmptyCategory(): Partial<CatalogCategory> {
    return {
      title: '',
      image: '',
      slug: '',
      order: 0,
      isActive: true
    };
  }

  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[а-яё]/g, (char) => {
        const map: {[key: string]: string} = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
          'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
          'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
          'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
          'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
          'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '',
          'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Новый метод для очистки slug
  cleanSlug(slug: string): string {
    if (!slug) return '';
    
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-zа-яё0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Проверка валидности slug
  isSlugValid(slug: string): boolean {
    if (!slug) return true;
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  }

  // Проверка уникальности slug
  isSlugUnique(slug: string, excludeId?: number): boolean {
    if (!slug) return true;
    const categories = this.categories();
    const existing = categories.find(cat => 
      cat.slug === slug && (!excludeId || cat.id !== excludeId)
    );
    return !existing;
  }

  // Обработчик blur для поля slug
  onSlugBlur(): void {
    if (this.currentCategory.slug) {
      this.currentCategory.slug = this.cleanSlug(this.currentCategory.slug);
    } else if (this.currentCategory.title) {
      this.currentCategory.slug = this.generateSlug(this.currentCategory.title);
    }
  }

  onTitleChange(): void {
    if (!this.editingCategory || !this.currentCategory.slug) {
      this.currentCategory.slug = this.generateSlug(this.currentCategory.title || '');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (!file.type.match('image.*')) {
        this.showNotification('error', 'Пожалуйста, выберите изображение (JPG, PNG, GIF)');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        this.showNotification('error', 'Файл слишком большой. Максимальный размер: 5MB');
        return;
      }
      
      this.selectedFile = file;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.filePreview = e.target?.result as string;
        this.currentCategory.image = this.filePreview;
      };
      reader.readAsDataURL(file);
    }
  }

  getShortFileName(filename: string | null, maxLength: number): string {
    if (!filename) return '';
    if (filename.length <= maxLength) return filename;
    
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return filename.substring(0, maxLength - 3) + '...';
    }
    
    const name = filename.substring(0, lastDotIndex);
    const extension = filename.substring(lastDotIndex + 1);
    
    if (name.length <= maxLength - extension.length - 4) {
      return filename;
    }
    
    const truncatedName = name.substring(0, maxLength - extension.length - 4);
    return `${truncatedName}...${extension}`;
  }

  clearFile(): void {
    this.selectedFile = null;
    this.filePreview = '';
    this.currentCategory.image = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  showAddForm(): void {
    this.currentCategory = this.getEmptyCategory();
    this.editingCategory = false;
    this.showForm = true;
    this.showSlugField = false;
    this.clearFile();
  }

  editCategory(category: CatalogCategory): void {
    this.currentCategory = { ...category };
    this.editingCategory = true;
    this.showForm = true;
    this.showSlugField = true;
    this.clearFile();
  }

  saveCategory(): void {
    if (!this.currentCategory.title?.trim()) {
      this.showNotification('error', 'Пожалуйста, укажите название категории');
      return;
    }

    // Всегда генерируем slug перед сохранением, если его нет
    if (!this.currentCategory.slug?.trim()) {
      this.currentCategory.slug = this.generateSlug(this.currentCategory.title);
    } else {
      // Очищаем существующий slug
      this.currentCategory.slug = this.cleanSlug(this.currentCategory.slug);
    }

    // Проверяем валидность slug
    if (!this.isSlugValid(this.currentCategory.slug!)) {
      this.showNotification('error', 'URL адрес содержит недопустимые символы. Используйте только латинские буквы, цифры и дефисы');
      return;
    }

    // Проверяем уникальность slug
    if (!this.isSlugUnique(this.currentCategory.slug!, this.currentCategory.id)) {
      this.showNotification('error', 'Этот URL уже используется другой категорией');
      return;
    }

    if (this.selectedFile && !this.currentCategory.image) {
      this.currentCategory.image = this.filePreview;
    }
    
    this.isLoading.set(true);
    
    setTimeout(() => {
      try {
        if (this.editingCategory && this.currentCategory.id) {
          const updatedCategory = this.catalogService.updateCategory(
            this.currentCategory.id, 
            this.currentCategory
          );
          
          if (updatedCategory) {
            this.showNotification('success', `Категория "${updatedCategory.title}" успешно обновлена!`);
          }
        } else {
          const newCategory = this.catalogService.addCategory({
            title: this.currentCategory.title!,
            image: this.currentCategory.image || '',
            slug: this.currentCategory.slug!,
            order: this.currentCategory.order || 0,
            isActive: this.currentCategory.isActive ?? true
          });
          
          this.showNotification('success', `Категория "${newCategory.title}" успешно добавлена!`);
        }
        
        this.cancelEdit();
      } catch (error) {
        console.error('Ошибка при сохранении категории:', error);
        this.showNotification('error', 'Произошла ошибка при сохранении категории');
      } finally {
        this.isLoading.set(false);
      }
    }, 500);
  }

  deleteCategory(category: CatalogCategory): void {
    if (confirm(`Удалить категорию "${category.title}"?\nЭта операция необратима.`)) {
      this.isLoading.set(true);
      
      setTimeout(() => {
        const deleted = this.catalogService.deleteCategory(category.id);
        if (deleted) {
          this.showNotification('success', `Категория "${category.title}" удалена`);
        }
        this.isLoading.set(false);
      }, 300);
    }
  }

  cancelEdit(): void {
    this.showForm = false;
    this.editingCategory = false;
    this.showSlugField = false;
    this.currentCategory = this.getEmptyCategory();
    this.clearFile();
  }

  showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    
    setTimeout(() => {
      this.notification.set(null);
    }, 5000);
  }

  hideNotification(): void {
    this.notification.set(null);
  }
}