import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
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
    private fileUploadService: FileUploadService
  ) {}

  ngOnInit(): void {
    this.loadShops();
  }

  loadShops(): void {
    this.shops = this.shopsService.getShops();
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
  }

  startEditShop(shop: Shop): void {
    this.isEditing = true;
    this.editingShop = { ...shop };
    this.imagePreview = shop.imageUrl || '/assets/default-shop.jpg';
    this.selectedFileName = '';
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
  }

  async saveShop(): Promise<void> {
    try {
      this.isUploading = true;
      
      let finalImageUrl = '';
      
      // Если есть загруженный файл, загружаем его на сервер
      if (this.newShop.imageFile) {
        const result = await lastValueFrom(
          this.fileUploadService.uploadShopImage(this.newShop.imageFile)
        );
        finalImageUrl = result.url;
      } else if (this.editingShop?.imageUrl) {
        // Используем существующее изображение при редактировании
        finalImageUrl = this.editingShop.imageUrl;
      } else if (this.newShop.imageUrl) {
        // Используем URL из поля ввода
        finalImageUrl = this.newShop.imageUrl;
      } else {
        // Дефолтное изображение
        finalImageUrl = '/assets/default-shop.jpg';
      }

      if (this.editingShop) {
        // Обновление существующего магазина
        const updatedShop: Shop = {
          ...this.editingShop,
          imageUrl: finalImageUrl,
          title: this.editingShop.title,
          address: this.editingShop.address,
          description: this.editingShop.description,
          phone: this.editingShop.phone,
          email: this.editingShop.email,
          workingHours: this.editingShop.workingHours
        };
        this.shopsService.updateShop(updatedShop);
      } else {
        // Добавление нового магазина
        const shop: Shop = {
          title: this.newShop.title,
          address: this.newShop.address,
          description: this.newShop.description,
          imageUrl: finalImageUrl,
          phone: this.newShop.phone,
          email: this.newShop.email,
          workingHours: this.newShop.workingHours,
          id: this.generateId()
        };
        this.shopsService.addShop(shop);
      }
      
      this.cancelEdit();
      this.loadShops();
    } catch (error: any) {
      console.error('Ошибка при сохранении магазина:', error);
      
      // Проверяем тип ошибки
      if (error.status === 413) {
        alert('Файл слишком большой. Максимальный размер: 5MB');
      } else if (error.status === 415) {
        alert('Неподдерживаемый формат файла');
      } else {
        alert('Произошла ошибка при сохранении магазина. Пожалуйста, попробуйте снова.');
      }
    } finally {
      this.isUploading = false;
    }
  }

  deleteShop(id: string): void {
    if (confirm('Вы уверены, что хотите удалить этот магазин?')) {
      this.shopsService.deleteShop(id);
      this.loadShops();
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}