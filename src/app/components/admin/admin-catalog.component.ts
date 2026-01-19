import { Component, OnInit, signal, ViewChild, ElementRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../services/catalog.service';
import { CatalogCategory } from '../../models/catalog.model';
import { Subscription } from 'rxjs';
import { StorageService } from '../../services/storage.service';


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
  private storageService = inject(StorageService);

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
      this.currentCategory.image = this.filePreview; // ← Здесь правильное обновление
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

  // === ИСПРАВЛЕННЫЕ МЕТОДЫ (добавлены async/await) ===

async saveCategory(): Promise<void> {
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

  this.isLoading.set(true);
  
  try {
    let finalImage = this.currentCategory.image || '';
    
    // Если есть выбранный файл, загружаем его в Supabase Storage
    if (this.selectedFile) {
      console.log('📤 Загрузка изображения категории...');
      
      try {
        // Используем CatalogService для загрузки одного файла
        const imageUrl = await this.catalogService.uploadCategoryImage(this.selectedFile);
        
        finalImage = imageUrl;
        console.log('✅ Изображение загружено через CatalogService:', imageUrl);
      } catch (uploadError: any) {
        console.error('❌ Ошибка загрузки файла:', uploadError);
        
        // Более информативное сообщение
        if (uploadError.message.includes('bucket') || uploadError.message.includes('policy')) {
          this.showNotification('error', 
            'Ошибка конфигурации Storage. Проверьте bucket "category-images" в Supabase Dashboard'
          );
        } else {
          this.showNotification('error', `Не удалось загрузить изображение: ${uploadError.message}`);
        }
        
        this.isLoading.set(false);
        return;
      }
    } 
    // Если текущее изображение - Base64, конвертируем и загружаем
    else if (this.currentCategory.image && this.currentCategory.image.startsWith('data:image')) {
      console.log('🔄 Конвертация Base64 изображения категории...');
      
      try {
        // Конвертируем Base64 в File
        const file = this.base64ToFile(
          this.currentCategory.image,
          `${this.currentCategory.slug || 'category'}-${Date.now()}.jpg`
        );
        
        // Загружаем в Supabase Storage
        const imageUrl = await this.storageService.uploadFile(
          file,
          'category-images',
          'categories'
        );
        
        finalImage = imageUrl;
        console.log('✅ Base64 изображение загружено:', imageUrl);
      } catch (conversionError) {
        console.error('❌ Ошибка конвертации Base64:', conversionError);
        // Используем дефолтное изображение
        finalImage = '/assets/default-category.jpg';
      }
    }
    // Если изображение локальное (не из Supabase), оставляем как есть
    else if (this.currentCategory.image && 
             !this.currentCategory.image.includes('supabase.co') && 
             !this.currentCategory.image.startsWith('/assets/')) {
      // Если это просто имя файла, используем дефолтное
      finalImage = '/assets/default-category.jpg';
    }

    // Используем тип Omit<CatalogCategory, 'id' | 'createdAt'> вместо Partial
    const categoryData: Omit<CatalogCategory, 'id' | 'createdAt'> = {
      title: this.currentCategory.title!.trim(),
      image: finalImage,
      slug: this.currentCategory.slug!.trim(),
      description: this.currentCategory.description?.trim() || '',
      order: this.currentCategory.order || 0,
      isActive: this.currentCategory.isActive ?? true
    };

    if (this.editingCategory && this.currentCategory.id) {
      // Для updateCategory используем Partial
      const updateData: Partial<CatalogCategory> = {
        ...categoryData
      };
      
      const success = await this.catalogService.updateCategory(
        this.currentCategory.id, 
        updateData
      );
      
      if (success) {
        this.showNotification('success', `Категория "${this.currentCategory.title}" успешно обновлена!`);
      } else {
        this.showNotification('error', 'Не удалось обновить категорию');
      }
    } else {
      // Для addCategory используем Omit<CatalogCategory, 'id' | 'createdAt'>
      const newCategory = await this.catalogService.addCategory(categoryData);
      
      if (newCategory) {
        this.showNotification('success', `Категория "${newCategory.title}" успешно добавлена!`);
      } else {
        this.showNotification('error', 'Не удалось добавить категорию');
      }
    }
    
    await this.categories();
    this.cancelEdit();
  } catch (error) {
    console.error('❌ Ошибка при сохранении категории:', error);
    this.showNotification('error', 'Произошла ошибка при сохранении категории');
  } finally {
    this.isLoading.set(false);
  }
}

  // Вспомогательный метод: Base64 → File
  private base64ToFile(base64: string, fileName: string): File {
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

  async deleteCategory(category: CatalogCategory): Promise<void> {
    if (confirm(`Удалить категорию "${category.title}"?\nЭта операция необратима.`)) {
      this.isLoading.set(true);
      
      try {
        // Используем await для асинхронного метода
        const deleted = await this.catalogService.deleteCategory(category.id);
        
        // deleted теперь boolean, а не Promise
        if (deleted) {
          this.showNotification('success', `Категория "${category.title}" удалена`);
        } else {
          this.showNotification('error', 'Не удалось удалить категорию');
        }
      } catch (error) {
        console.error('Ошибка при удалении категории:', error);
        this.showNotification('error', 'Ошибка при удалении категории');
      } finally {
        this.isLoading.set(false);
      }
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