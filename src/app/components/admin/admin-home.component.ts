import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomePageService } from '../../services/homepage.service';
import { CatalogService } from '../../services/catalog.service';
import { HomePageSettings, Slide, CompanyInfo } from '../../models/homepage-settings.model';
import { CatalogCategory } from '../../models/catalog.model';
import { StorageService } from '../../services/storage.service';

type ActiveTab = 'slides' | 'company' | 'settings';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.scss']
})
export class AdminHomeComponent implements OnInit {
  settings!: HomePageSettings;
  companyInfo!: CompanyInfo;
  slides: Slide[] = [];
  allCategories: CatalogCategory[] = [];
  
  editingSlideIndex: number | null = null;
  editingSlide: Slide | null = null;
  isEditModalOpen = false;

  private homeService = inject(HomePageService);
  private catalogService = inject(CatalogService); // Добавьте
  private storageService = inject(StorageService); // Добавьте
  private cdr = inject(ChangeDetectorRef);

  // Для формы добавления нового слайда
  newSlide: Slide = { image: '', title: '', description: '' };
  
  // Для редактирования раздела "О компании"
  aboutSections = [
    { title: '', content: '' },
    { title: '', content: '' },
    { title: '', content: '' }
  ];

  // Активная вкладка с явным типом
  activeTab: ActiveTab = 'slides';

  // Ссылка на input для загрузки файла нового слайда
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Для хранения временных данных о выбранных файлах
  private fileInputsMap: Map<number, HTMLInputElement> = new Map();

  constructor() {}

  ngOnInit(): void {
    this.loadData();
  }
  

  // Переключение вкладок
  switchTab(tab: ActiveTab): void {
    this.activeTab = tab;
  }

  openEditSlideModal(index: number): void {
    this.editingSlideIndex = index;
    this.editingSlide = { ...this.slides[index] }; // Создаем копию для редактирования
    this.isEditModalOpen = true;
  }

  // Закрыть модальное окно
  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingSlideIndex = null;
    this.editingSlide = null;
  }

  // Сохранить изменения в слайде
  saveEditedSlide(): void {
    if (this.editingSlideIndex !== null && this.editingSlide) {
      this.slides[this.editingSlideIndex] = { ...this.editingSlide };
      this.closeEditModal();
      alert('Слайд успешно обновлен!');
    }
  }

  // Выбрать файл для редактируемого слайда
  changeImageForEditingSlide(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0] && this.editingSlide) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          if (this.editingSlide) {
            this.editingSlide.image = event.target?.result as string;
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  loadData(): void {
    // Загружаем настройки
    this.settings = { ...this.homeService.getSettings() };
    
    // Загружаем слайды
    this.slides = this.homeService.getSlides();
    
    // Загружаем информацию о компании
    this.companyInfo = this.homeService.getCompanyInfo();
    
    // Загружаем категории
    this.allCategories = this.catalogService.getCategories();
    
    // Инициализируем разделы "О компании"
    if (this.companyInfo.aboutSections) {
      this.aboutSections = [...this.companyInfo.aboutSections];
    }
  }

  // Обработчик ошибок изображений
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/default-slide.jpg';
  }

  // Методы для управления слайдами
  addSlide(): void {
    if (this.newSlide.image.trim()) {
      this.slides.push({ ...this.newSlide });
      this.newSlide = { image: '', title: '', description: '' };
    }
  }

  // Метод для открытия выбора файла для нового слайда
  openFilePickerForNewSlide(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  // Обработчик выбора файла для нового слайда
  onFileSelectedForNewSlide(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Создаем локальный URL для превью
      const reader = new FileReader();
      reader.onload = (e) => {
        this.newSlide.image = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      
      // Очищаем input для возможности выбора того же файла снова
      input.value = '';
    }
  }

  // Метод для выбора файла для существующего слайда
  changeSlideImage(index: number): void {
    // Создаем динамический input если его еще нет
    if (!this.fileInputsMap.has(index)) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = (e) => this.onSlideFileSelected(index, e);
      document.body.appendChild(input);
      this.fileInputsMap.set(index, input);
    }
    
    const input = this.fileInputsMap.get(index);
    if (input) {
      input.click();
    }
  }

  // Обработчик выбора файла для существующего слайда
  onSlideFileSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.slides[index].image = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      input.value = '';
    }
  }

  // Метод для замены изображения слайда (старый метод, оставлен для обратной совместимости)
  changeSlide(index: number, event?: Event): void {
    if (event) {
      // Если вызвано через событие change
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          this.slides[index].image = e.target?.result as string;
        };
        reader.readAsDataURL(file);
        input.value = '';
      }
    } else {
      // Если вызвано кнопкой "Изменить"
      this.changeSlideImage(index);
    }
  }

  // Вспомогательный метод для проверки, является ли строка URL изображения
  isImageUrl(url: string): boolean {
    if (!url) return false;
    return url.startsWith('http') || 
           url.startsWith('data:image') || 
           url.startsWith('/') || 
           url.startsWith('./') ||
           url.startsWith('../');
  }

  // Метод для очистки изображения нового слайда
  clearNewSlideImage(): void {
    this.newSlide.image = '';
  }

  removeSlide(index: number): void {
    if (confirm('Вы уверены, что хотите удалить этот слайд?')) {
      this.slides.splice(index, 1);
      
      // Удаляем связанный input из DOM и карты
      if (this.fileInputsMap.has(index)) {
        const input = this.fileInputsMap.get(index);
        if (input && input.parentNode) {
          input.parentNode.removeChild(input);
        }
        this.fileInputsMap.delete(index);
        
        // Обновляем индексы в карте для оставшихся элементов
        const newMap = new Map<number, HTMLInputElement>();
        this.fileInputsMap.forEach((input, oldIndex) => {
          if (oldIndex > index) {
            newMap.set(oldIndex - 1, input);
          } else {
            newMap.set(oldIndex, input);
          }
        });
        this.fileInputsMap = newMap;
      }
    }
  }

  moveSlideUp(index: number): void {
    if (index > 0) {
      // Обмен слайдов
      [this.slides[index], this.slides[index - 1]] = [this.slides[index - 1], this.slides[index]];
      
      // Обновляем файловые инпутсы в карте
      const temp = this.fileInputsMap.get(index);
      if (temp) {
        this.fileInputsMap.set(index, this.fileInputsMap.get(index - 1) || temp);
        this.fileInputsMap.set(index - 1, temp);
      }
    }
  }

  moveSlideDown(index: number): void {
    if (index < this.slides.length - 1) {
      // Обмен слайдов
      [this.slides[index], this.slides[index + 1]] = [this.slides[index + 1], this.slides[index]];
      
      // Обновляем файловые инпутсы в карте
      const temp = this.fileInputsMap.get(index);
      if (temp) {
        this.fileInputsMap.set(index, this.fileInputsMap.get(index + 1) || temp);
        this.fileInputsMap.set(index + 1, temp);
      }
    }
  }

  // Методы для данных компании
  updateAboutSections(): void {
    this.companyInfo.aboutSections = [...this.aboutSections];
  }

  addAboutSection(): void {
    this.aboutSections.push({ title: '', content: '' });
  }

  removeAboutSection(index: number): void {
    if (this.aboutSections.length > 1) {
      this.aboutSections.splice(index, 1);
    }
  }

  // Сохранение всех данных
  async saveAllSettings(): Promise<void> {
    try {
      // Обновляем слайды с загрузкой изображений в Supabase Storage
      await this.updateSlidesWithStorage();
      
      // Сохраняем информацию о компании
      this.updateAboutSections();
      await this.homeService.updateCompanyInfo(this.companyInfo);
      
      // Сохраняем общие настройки
      await this.homeService.updateSettings(this.settings);
      
      this.showNotification('success', 'Все настройки сохранены успешно!');
    } catch (error: any) {
      console.error('❌ Ошибка при сохранении настроек:', error);
      this.showNotification('error', `Ошибка при сохранении: ${error.message}`);
    }
  }
  
  private async updateSlidesWithStorage(): Promise<void> {
    console.log('🔄 Обновление слайдов с загрузкой изображений в Supabase Storage...');
    
    const updatedSlides = [];
    
    for (let i = 0; i < this.slides.length; i++) {
      const slide = this.slides[i];
      let finalImage = slide.image;
      
      // Если слайд имеет Base64 изображение
      if (slide.image && slide.image.startsWith('data:image')) {
        console.log(`📤 Загрузка изображения слайда ${i + 1} в Supabase Storage...`);
        
        try {
          // Конвертируем Base64 в File
          const fileName = `slide-${i + 1}-${Date.now()}.jpg`;
          const file = this.base64ToFile(slide.image, fileName);
          
          // Загружаем в bucket 'slides' в папку 'slides'
          finalImage = await this.storageService.uploadFile(
            file,
            'slides',       // bucket для слайдов
            'slides'        // папка внутри bucket
          );
          
          console.log(`✅ Изображение слайда ${i + 1} загружено:`, finalImage);
        } catch (error: any) {
          console.error(`❌ Ошибка загрузки изображения слайда ${i + 1}:`, error);
          // Используем дефолтное изображение
          finalImage = `/assets/default-slide.jpg`;
        }
      }
      // Если это локальный путь (не из Supabase)
      else if (slide.image && 
               !slide.image.includes('supabase.co') && 
               slide.image.startsWith('/assets/')) {
        // Оставляем локальные пути как есть
        console.log(`📁 Используем локальное изображение для слайда ${i + 1}`);
      }
      // Если нет изображения
      else if (!slide.image) {
        finalImage = `/assets/default-slide.jpg`;
      }
      
      updatedSlides.push({
        ...slide,
        image: finalImage,
        order: i + 1
      });
    }
    
    // Обновляем слайды в базе данных
    await this.homeService.updateSlides(updatedSlides);
    console.log(`✅ Все слайды обновлены (${updatedSlides.length} шт.)`);
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
  
  private showNotification(type: 'success' | 'error', message: string): void {
    if (type === 'success') {
      alert(`✅ ${message}`);
    } else {
      alert(`❌ ${message}`);
    }
  }

  // Очистка ресурсов при уничтожении компонента
  ngOnDestroy(): void {
    // Удаляем все динамически созданные input элементы
    this.fileInputsMap.forEach((input) => {
      if (input && input.parentNode) {
        input.parentNode.removeChild(input);
      }
    });
    this.fileInputsMap.clear();
  }
}