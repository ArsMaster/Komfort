import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShopsService } from '../../services/shops.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Shop } from '../../models/shop.model';
import { lastValueFrom } from 'rxjs';
import { StorageService } from '../../services/storage.service';
import { SupabaseService } from '../../services/supabase.service';

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
    private cdr: ChangeDetectorRef,
    private supabaseService: SupabaseService
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
    this.imagePreview = shop.imageUrl || 'assets/default-shop.jpg';
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
    this.cdr.detectChanges();
    
    let finalImageUrl = '';
    
    // Если есть загруженный файл, загружаем его в Supabase Storage
    if (this.newShop.imageFile) {
      console.log('📤 Загрузка файла изображения в Supabase Storage...');
      try {
        // Используем shopsService для загрузки
        finalImageUrl = await this.shopsService.uploadShopImages([this.newShop.imageFile])
          .then(urls => urls[0]);
        console.log('✅ Файл загружен в Supabase Storage:', finalImageUrl);
      } catch (uploadError: any) {
        console.error('❌ Ошибка загрузки файла в Supabase:', uploadError);
        
        if (uploadError.message.includes('bucket') || uploadError.message.includes('policy')) {
          this.showNotification('error', 
            'Ошибка конфигурации Storage. Проверьте:\n' +
            '1. Создан ли bucket "shop-images" в Supabase Dashboard\n' +
            '2. Включен ли режим "Public"\n' +
            '3. Отключены ли RLS политики (или настроены правильно)'
          );
        } else {
          this.showNotification('error', `Не удалось загрузить изображение: ${uploadError.message}`);
        }
        throw uploadError;
      }
    } 
    // Если редактируем и есть Base64 изображение
    else if (this.editingShop?.imageUrl && this.editingShop.imageUrl.startsWith('data:image')) {
      console.log('🔄 Конвертация Base64 изображения магазина...');
      
      try {
        // Конвертируем Base64 в File
        const fileName = `${this.editingShop.title || 'shop'}-${Date.now()}.jpg`;
        const file = this.base64ToFile(this.editingShop.imageUrl, fileName);
        
        // Загружаем в Supabase Storage
        finalImageUrl = await this.uploadFileToSupabase(
          file,  // ← ИСПРАВЛЕНО: передаем file, а не this.newShop.imageFile
          'shop-images',
          'shops'
        );
        console.log('✅ Base64 изображение загружено в Supabase:', finalImageUrl);
      } catch (conversionError: any) {
        console.error('❌ Ошибка конвертации Base64:', conversionError);
        // Используем дефолтное изображение
        finalImageUrl = '/assets/default-shop.jpg';
        console.log('🏷️ Используем дефолтное изображение');
      }
    }
    // Если редактируем и есть существующее изображение (не Base64)
    else if (this.editingShop?.imageUrl) {
      finalImageUrl = this.editingShop.imageUrl;
      console.log('🖼️ Используем существующее изображение:', finalImageUrl);
    }
    // Если есть URL из поля ввода
    else if (this.newShop.imageUrl) {
      finalImageUrl = this.newShop.imageUrl;
      console.log('🔗 Используем URL из поля:', finalImageUrl);
    }
    // Дефолтное изображение
    else {
      finalImageUrl = '/assets/default-shop.jpg';
      console.log('🏷️ Используем дефолтное изображение');
    }

    const shopData = {
      title: this.editingShop ? this.editingShop.title : this.newShop.title,
      address: this.editingShop ? this.editingShop.address : this.newShop.address,
      description: this.editingShop ? this.editingShop.description : this.newShop.description,
      imageUrl: finalImageUrl,
      phone: this.editingShop ? this.editingShop.phone : this.newShop.phone,
      email: this.editingShop ? this.editingShop.email : this.newShop.email,
      workingHours: this.editingShop ? this.editingShop.workingHours : this.newShop.workingHours
    };

    if (this.editingShop) {
      console.log('✏️ Редактирование магазина:', this.editingShop.title);
      console.log('📝 Данные для сохранения:', shopData);
      
      await this.shopsService.updateShop(
        this.editingShop.id, 
        shopData
      );
      
      console.log('✅ Магазин обновлен в сервисе');
      this.showNotification('success', `Магазин "${this.editingShop.title}" обновлен!`);
    } else {
      console.log('➕ Добавление нового магазина');
      console.log('📝 Данные:', shopData);
      
      const newShop = await this.shopsService.addShop(shopData);
      
      console.log('✅ Новый магазин добавлен:', newShop);
      this.showNotification('success', `Магазин "${newShop.title}" добавлен!`);
    }
    
    console.log('✅ Все операции завершены успешно');
    
    // Сбрасываем флаг загрузки
    this.isUploading = false;
    this.cdr.detectChanges();
    
    // Даем время Angular обновить DOM
    setTimeout(() => {
      this.cancelEdit();
      this.loadShops();
    }, 100);
    
  } catch (error: any) {
    console.error('❌ Ошибка при сохранении магазина:', error);
    
    // Обязательно сбрасываем флаг при ошибке
    this.isUploading = false;
    this.cdr.detectChanges();
    
    // Проверяем тип ошибки
    if (error.status === 413) {
      this.showNotification('error', 'Файл слишком большой. Максимальный размер: 10MB');
    } else if (error.status === 415) {
      this.showNotification('error', 'Неподдерживаемый формат файла');
    } else if (error.message) {
      this.showNotification('error', `Ошибка: ${error.message}`);
    } else {
      this.showNotification('error', 'Произошла ошибка при сохранении магазина. Пожалуйста, попробуйте снова.');
    }
  }
}

  private async uploadFileToSupabase(file: File, bucket: string, folder?: string): Promise<string> {
  try {
    console.log('📤 Загрузка файла напрямую через SupabaseClient');
    
    // Генерируем уникальное имя
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    
    console.log('📁 Файл:', fileName);
    console.log('🪣 Bucket:', bucket);
    console.log('📂 Путь:', filePath);
    
    // Загружаем через SupabaseClient
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });
    
    if (error) {
      console.error('❌ Ошибка загрузки в Supabase:', error);
      throw error;
    }
    
    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    console.log('✅ Файл загружен:', urlData.publicUrl);
    return urlData.publicUrl;
    
  } catch (error: any) {
    console.error('❌ Ошибка в uploadFileToSupabase:', error);
    throw error;
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

  // Метод для показа уведомлений
  private showNotification(type: 'success' | 'error', message: string): void {
    if (type === 'success') {
      alert(`✅ ${message}`);
    } else {
      alert(`❌ ${message}`);
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