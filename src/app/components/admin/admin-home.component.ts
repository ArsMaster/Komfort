import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomePageService } from '../../services/homepage.service';
import { CatalogService } from '../../services/catalog.service';
import { HomePageSettings, Slide, CompanyInfo } from '../../models/homepage-settings.model';
import { CatalogCategory } from '../../models/catalog.model';

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

  constructor(
    private homeService: HomePageService,
    private catalogService: CatalogService
  ) {}

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
    imgElement.src = '/assets/default-slide.jpg';
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
  saveAllSettings(): void {
    // Сохраняем слайды
    this.homeService.updateSlides(this.slides);
    
    // Сохраняем информацию о компании
    this.updateAboutSections();
    this.homeService.updateCompanyInfo(this.companyInfo);
    
    // Сохраняем общие настройки
    this.homeService.updateSettings(this.settings);
    
    alert('Все настройки сохранены успешно!');
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