import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShopsService } from '../../services/shops.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Shop } from '../../models/shop.model';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-shops',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-shops.component.html',
  styleUrls: ['./admin-shops.component.scss']
})
export class AdminShopsComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  shops: Shop[] = [];
  editingShop: Shop | null = null;
  isEditing = false;
  isUploading = false;
  
  // Для предпросмотра изображения
  imagePreview: string | null = null;
  selectedFileName: string = '';
  
  newShop: Omit<Shop, 'id'> & { imageFile?: File } = {
    title: '',
    address: '',
    description: '',
    imageUrl: '',
    phone: '',
    email: '',
    workingHours: ''
  };

  constructor(
    private shopsService: ShopsService,
    private fileUploadService: FileUploadService,
    private cdr: ChangeDetectorRef // ← ДОБАВЬТЕ ЭТО
  ) {}

  ngOnInit(): void {
    this.loadShops();
  }

  loadShops(): void {
    this.shops = this.shopsService.getShops();
    this.cdr.detectChanges(); // ← ОБНОВИТЕ ОТОБРАЖЕНИЕ
  }

  startAddShop(): void {
    this.isEditing = true;
    this.editingShop = null;
    this.imagePreview = null;
    this.selectedFileName = '';
    
    this.newShop = {
      title: '',
      address: '',
      description: '',
      imageUrl: '',
      phone: '',
      email: '',
      workingHours: ''
    };
    
    this.cdr.detectChanges(); // ← ОБНОВИТЕ ОТОБРАЖЕНИЕ
  }

  startEditShop(shop: Shop): void {
    this.isEditing = true;
    this.editingShop = { ...shop };
    this.imagePreview = shop.imageUrl || '/assets/default-shop.jpg';
    this.selectedFileName = '';
    this.cdr.detectChanges(); // ← ОБНОВИТЕ ОТОБРАЖЕНИЕ
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFileName = file.name;
      
      // Проверка размера файла (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 5MB');
        input.value = '';
        return;
      }
      
      // Проверка типа файла
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Пожалуйста, выберите файл изображения (JPEG, PNG, GIF, WebP)');
        input.value = '';
        return;
      }
      
      // Предпросмотр изображения локально
      this.fileUploadService.convertFileToBase64(file)
        .then(base64 => {
          this.imagePreview = base64;
          
          // Сохраняем файл для последующей загрузки
          if (this.editingShop) {
            this.newShop.imageFile = file;
          } else {
            this.newShop.imageFile = file;
          }
          this.cdr.detectChanges(); // ← ОБНОВИТЕ ОТОБРАЖЕНИЕ
        })
        .catch(error => {
          console.error('Ошибка при чтении файла:', error);
          alert('Не удалось прочитать файл');
        });
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  removeImage(): void {
    this.imagePreview = null;
    this.selectedFileName = '';
    
    if (this.editingShop) {
      this.editingShop.imageUrl = '';
    } else {
      this.newShop.imageUrl = '';
      this.newShop.imageFile = undefined;
    }
    
    // Сброс input file
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    
    this.cdr.detectChanges(); // ← ОБНОВИТЕ ОТОБРАЖЕНИЕ
  }

  async saveShop(): Promise<void> {
    console.log('🔄 Начало сохранения магазина');
    
    try {
      this.isUploading = true;
      this.cdr.detectChanges(); // ← НЕМЕДЛЕННО ОБНОВИТЕ ОТОБРАЖЕНИЕ
      
      let finalImageUrl = '';
      
      // Если есть загруженный файл, загружаем его на сервер
      if (this.newShop.imageFile) {
        console.log('📤 Загрузка файла изображения...');
        try {
          const result = await lastValueFrom(
            this.fileUploadService.uploadShopImage(this.newShop.imageFile)
          );
          finalImageUrl = result.url;
          console.log('✅ Файл загружен:', finalImageUrl);
        } catch (uploadError) {
          console.error('❌ Ошибка загрузки файла:', uploadError);
          throw new Error('Не удалось загрузить изображение');
        }
      } else if (this.editingShop?.imageUrl) {
        // Используем существующее изображение при редактировании
        finalImageUrl = this.editingShop.imageUrl;
        console.log('🖼️ Используем существующее изображение');
      } else if (this.newShop.imageUrl) {
        // Используем URL из поля ввода
        finalImageUrl = this.newShop.imageUrl;
        console.log('🔗 Используем URL из поля');
      } else {
        // Дефолтное изображение
        finalImageUrl = '/assets/default-shop.jpg';
        console.log('🏷️ Используем дефолтное изображение');
      }

      if (this.editingShop) {
        console.log('✏️ Редактирование магазина:', this.editingShop.title);
        console.log('📝 Данные для сохранения:', {
          title: this.editingShop.title,
          address: this.editingShop.address,
          imageUrl: finalImageUrl
        });
        
        await this.shopsService.updateShop(
          this.editingShop.id, 
          {
            title: this.editingShop.title,
            address: this.editingShop.address,
            description: this.editingShop.description,
            imageUrl: finalImageUrl,
            phone: this.editingShop.phone,
            email: this.editingShop.email,
            workingHours: this.editingShop.workingHours
          }
        );
        console.log('✅ Магазин обновлен в сервисе');
        alert(`Магазин "${this.editingShop.title}" обновлен!`);
      } else {
        console.log('➕ Добавление нового магазина');
        console.log('📝 Данные:', {
          title: this.newShop.title,
          address: this.newShop.address,
          imageUrl: finalImageUrl
        });
        
        const newShop = await this.shopsService.addShop({
          title: this.newShop.title,
          address: this.newShop.address,
          description: this.newShop.description,
          imageUrl: finalImageUrl,
          phone: this.newShop.phone,
          email: this.newShop.email,
          workingHours: this.newShop.workingHours
        });
        
        console.log('✅ Новый магазин добавлен:', newShop);
        alert(`Магазин "${newShop.title}" добавлен!`);
      }
      
      console.log('✅ Все операции завершены успешно');
      
      // ЯВНО сбросить перед закрытием формы
      this.isUploading = false;
      this.cdr.detectChanges(); // ← ОБНОВИТЕ ПЕРЕД ЗАКРЫТИЕМ
      
      // Дать время Angular обновить DOM
      setTimeout(() => {
        this.cancelEdit();
        this.loadShops();
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Ошибка при сохранении магазина:', error);
      
      // ОБЯЗАТЕЛЬНО сбросить при ошибке
      this.isUploading = false;
      this.cdr.detectChanges();
      
      // Проверяем тип ошибки
      if (error.status === 413) {
        alert('Файл слишком большой. Максимальный размер: 5MB');
      } else if (error.status === 415) {
        alert('Неподдерживаемый формат файла');
      } else if (error.message) {
        alert(`Ошибка: ${error.message}`);
      } else {
        alert('Произошла ошибка при сохранении магазина. Пожалуйста, попробуйте снова.');
      }
    } finally {
      // Дополнительная защита на случай если блок try-catch не сработал
      setTimeout(() => {
        this.isUploading = false;
        this.cdr.detectChanges();
        console.log('🔄 finally блок: isUploading сброшен');
      }, 1000);
    }
  }

  async deleteShop(id: string): Promise<void> {
    if (confirm('Вы уверены, что хотите удалить этот магазин?')) {
      try {
        const deleted = await this.shopsService.deleteShop(id);
        if (deleted) {
          alert('Магазин удален!');
          this.loadShops();
        }
      } catch (error) {
        console.error('Ошибка удаления магазина:', error);
        alert('Не удалось удалить магазин');
      }
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingShop = null;
    this.imagePreview = null;
    this.selectedFileName = '';
    this.isUploading = false;
    
    this.newShop = {
      title: '',
      address: '',
      description: '',
      imageUrl: '',
      phone: '',
      email: '',
      workingHours: ''
    };
    
    // Сброс input file
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    
    this.cdr.detectChanges(); // ← ОБНОВИТЕ ОТОБРАЖЕНИЕ
    console.log('🚪 Форма редактирования закрыта');
  }

  validateForm(): boolean {
    const form = this.editingShop || this.newShop;
    return !!form.title?.trim() && 
           !!form.address?.trim() && 
           !!form.description?.trim();
  }

  truncateText(text: string | undefined, limit: number = 100): string {
    if (!text) return '';
    if (text.length <= limit) return text;
    return text.substr(0, limit) + '...';
  }
}