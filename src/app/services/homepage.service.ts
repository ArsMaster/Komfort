import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HomePageSettings, Slide, CompanyInfo } from '../models/homepage-settings.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class HomePageService {
  private settingsSubject = new BehaviorSubject<HomePageSettings>(this.getDefaultSettings());
  private slidesSubject = new BehaviorSubject<Slide[]>(this.getDefaultSlides());
  private companyInfoSubject = new BehaviorSubject<CompanyInfo>(this.getDefaultCompanyInfo());
  
  settings$: Observable<HomePageSettings> = this.settingsSubject.asObservable();
  slides$: Observable<Slide[]> = this.slidesSubject.asObservable();
  companyInfo$: Observable<CompanyInfo> = this.companyInfoSubject.asObservable();
  
  private storageMode: 'local' | 'supabase' = 'local';
  private readonly SETTINGS_KEY = 'homepage_settings';
  private readonly SLIDES_KEY = 'homepage_slides';
  private readonly COMPANY_KEY = 'company_info';
  private isInitialized = false;

  constructor(private supabaseService: SupabaseService) {
    console.log('=== HomePageService инициализирован ===');
    
    // Экспортируем для тестирования в консоли
    (window as any).homePageService = this;
    (window as any).homePageServiceDebug = {
      getMode: () => this.storageMode,
      testConnection: () => this.testConnection(),
      testAll: () => this.testAllOperations(),
      forceLoadFromSupabase: () => this.forceLoadFromSupabase(),
      clearCache: () => this.clearCache()
    };
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Проверяем сохраненный режим из localStorage
    this.storageMode = localStorage.getItem('komfort_storage_mode') as 'local' | 'supabase' || 'supabase';
    
    console.log('🔧 Режим работы HomePageService:', this.storageMode);
    
    if (this.storageMode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
    
    this.isInitialized = true;
    console.log('✅ HomePageService инициализирован');
  }

  // ===== ЗАГРУЗКА ИЗ LOCALSTORAGE =====
  private loadFromLocalStorage(): void {
    console.log('📦 Загрузка данных из localStorage...');
    
    // Загрузка настроек
    const savedSettings = localStorage.getItem(this.SETTINGS_KEY);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        this.settingsSubject.next(settings);
        console.log('✅ Настройки загружены из localStorage');
      } catch (error) {
        console.error('❌ Ошибка загрузки настроек:', error);
        this.settingsSubject.next(this.getDefaultSettings());
      }
    } else {
      console.log('📭 Нет сохраненных настроек, используются начальные');
      this.settingsSubject.next(this.getDefaultSettings());
    }
    
    // Загрузка слайдов
    const savedSlides = localStorage.getItem(this.SLIDES_KEY);
    if (savedSlides) {
      try {
        const slides = JSON.parse(savedSlides);
        this.slidesSubject.next(slides);
        console.log('✅ Слайды загружены из localStorage:', slides.length);
      } catch (error) {
        console.error('❌ Ошибка загрузки слайдов:', error);
        this.slidesSubject.next(this.getDefaultSlides());
      }
    } else {
      console.log('📭 Нет сохраненных слайдов, используются начальные');
      this.slidesSubject.next(this.getDefaultSlides());
    }
    
    // Загрузка информации о компании
    const savedCompanyInfo = localStorage.getItem(this.COMPANY_KEY);
    if (savedCompanyInfo) {
      try {
        const companyInfo = JSON.parse(savedCompanyInfo);
        this.companyInfoSubject.next(companyInfo);
        console.log('✅ Информация о компании загружена из localStorage');
      } catch (error) {
        console.error('❌ Ошибка загрузки информации о компании:', error);
        this.companyInfoSubject.next(this.getDefaultCompanyInfo());
      }
    } else {
      console.log('📭 Нет сохраненной информации о компании, используются начальные');
      this.companyInfoSubject.next(this.getDefaultCompanyInfo());
    }
  }

  // ===== ЗАГРУЗКА ИЗ SUPABASE =====
  private async loadFromSupabase(): Promise<void> {
  console.log('🔄 Загрузка данных из Supabase...');
  
  try {
    // Сначала проверяем подключение
    const isConnected = await this.testConnection();
    if (!isConnected) {
      console.warn('⚠️ Нет подключения к Supabase, переключаемся на localStorage');
      this.storageMode = 'local';
      this.loadFromLocalStorage();
      return;
    }
    
    // Загрузка настроек главной страницы
    const settings = await this.supabaseService.getHomepageSettings();
    if (settings) {
      this.settingsSubject.next(settings);
      this.saveToLocalStorage(this.SETTINGS_KEY, settings);
      console.log('✅ Настройки загружены из Supabase');
    } else {
      console.log('📭 Supabase: нет настроек, используем локальные');
      const defaultSettings = this.getDefaultSettings();
      this.settingsSubject.next(defaultSettings);
      this.saveToLocalStorage(this.SETTINGS_KEY, defaultSettings);
    }
    
    // Загрузка слайдов
    const slides = await this.supabaseService.getSlides();
    if (slides && slides.length > 0) {
      const fixedSlides = this.cleanSlideImageUrls(slides);
      
      this.slidesSubject.next(fixedSlides);
      this.saveToLocalStorage(this.SLIDES_KEY, fixedSlides);
      console.log('✅ Слайды загружены из Supabase:', fixedSlides.length);
      
      console.log('📊 Слайды после исправления путей:');
      fixedSlides.forEach((slide, index) => {
        console.log(`  ${index + 1}. ${slide.title}: ${slide.imageUrl || slide.image}`);
      });
    } else {
      console.log('📭 Supabase: нет слайдов, используем локальные');
      const defaultSlides = this.getDefaultSlides();
      const cleanedDefaultSlides = this.cleanSlideImageUrls(defaultSlides);
      this.slidesSubject.next(cleanedDefaultSlides);
      this.saveToLocalStorage(this.SLIDES_KEY, cleanedDefaultSlides);
    }
    
    // Загрузка информации о компании
    const companyInfo = await this.supabaseService.getContactInfo();
    if (companyInfo) {
      console.log('📄 Получены контакты с about_sections:', {
        hasAboutSections: !!companyInfo.about_sections,
        aboutSectionsType: typeof companyInfo.about_sections,
        aboutSectionsCount: Array.isArray(companyInfo.about_sections) 
          ? companyInfo.about_sections.length 
          : 0,
        aboutSections: companyInfo.about_sections
      });
      
      // Функция для очистки дублированных строк
      const cleanDuplicatedString = (str: string): string => {
        if (!str || typeof str !== 'string') return str || '';
        
        const trimmed = str.trim();
        
        const halfLength = Math.floor(trimmed.length / 2);
        
        if (halfLength > 0) {
          const firstHalf = trimmed.substring(0, halfLength).trim();
          const secondHalf = trimmed.substring(halfLength).trim();
          
          if (firstHalf === secondHalf) {
            console.log(`🔄 Обнаружено и исправлено дублирование: "${trimmed}" → "${firstHalf}"`);
            return firstHalf;
          }
        }
        
        return trimmed;
      };
      
      // ПРЕОБРАЗОВАНИЕ about_sections
      let aboutSections: { title: string; content: string }[] = [];
      
      if (companyInfo.about_sections) {
        try {
          // Если это уже массив
          if (Array.isArray(companyInfo.about_sections)) {
            aboutSections = companyInfo.about_sections.map((section: any) => ({
              title: section.title || '',
              content: section.content || ''
            }));
          }
          // Если это строка JSON
          else if (typeof companyInfo.about_sections === 'string') {
            const parsed = JSON.parse(companyInfo.about_sections);
            if (Array.isArray(parsed)) {
              aboutSections = parsed.map((section: any) => ({
                title: section.title || '',
                content: section.content || ''
              }));
            }
          }
        } catch (error) {
          console.error('❌ Ошибка парсинга about_sections:', error);
        }
      }
      
      console.log('📋 Преобразованные aboutSections:', aboutSections);
      
      // Преобразуем ContactInfo в CompanyInfo
      const transformedCompanyInfo: CompanyInfo = {
        address: cleanDuplicatedString(companyInfo.office || ''),
        phone: cleanDuplicatedString(companyInfo.phone || ''),
        email: cleanDuplicatedString(companyInfo.email || ''),
        workHours: cleanDuplicatedString(companyInfo.workingHours || ''),
        aboutSections: aboutSections,
        social: companyInfo.social || [],
      };
      
      // Логируем для отладки
      console.log('🔍 Проверка данных:', {
        originalAddress: companyInfo.office,
        cleanedAddress: transformedCompanyInfo.address,
        originalPhone: companyInfo.phone,
        cleanedPhone: transformedCompanyInfo.phone,
        originalWorkHours: companyInfo.workingHours,
        cleanedWorkHours: transformedCompanyInfo.workHours,
        aboutSectionsCount: aboutSections.length
      });
      
      this.companyInfoSubject.next(transformedCompanyInfo);
      this.saveToLocalStorage(this.COMPANY_KEY, transformedCompanyInfo);
      console.log('✅ Информация о компании загружена из Supabase с aboutSections');
    } else {
      console.log('📭 Supabase: нет информации о компании, используем локальную');
      const defaultCompanyInfo = this.getDefaultCompanyInfo();
      this.companyInfoSubject.next(defaultCompanyInfo);
      this.saveToLocalStorage(this.COMPANY_KEY, defaultCompanyInfo);
    }
    
  } catch (error) {
    console.error('❌ Ошибка загрузки из Supabase:', error);
    console.log('🔄 Переключаемся на LocalStorage');
    this.storageMode = 'local';
    this.loadFromLocalStorage();
  }
}

  // ===== СОХРАНЕНИЕ =====
  private saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Данные сохранены в localStorage (${key}):`, data);
    } catch (error) {
      console.error(`❌ Ошибка сохранения в localStorage (${key}):`, error);
    }
  }

  // ===== ПУБЛИЧНЫЕ МЕТОДЫ (для обратной совместимости) =====
  
  getSettings(): HomePageSettings {
    return this.settingsSubject.getValue();
  }

  getSlides(): Slide[] {
    return this.slidesSubject.getValue();
  }

  getCompanyInfo(): CompanyInfo {
    return this.companyInfoSubject.getValue();
  }

  // Обновление данных с поддержкой обоих режимов
  async updateSettings(settings: HomePageSettings): Promise<void> {
  console.log('✏️ Обновление настроек в режиме:', this.storageMode);
  
  if (this.storageMode === 'local') {
    this.settingsSubject.next(settings);
    this.saveToLocalStorage(this.SETTINGS_KEY, settings);
    console.log('✅ Настройки обновлены в LocalStorage');
  } else {
    try {
      // Пробуем обновить в Supabase
      const success = await this.supabaseService.updateHomepageSettings(settings);
      if (success) {
        this.settingsSubject.next(settings);
        this.saveToLocalStorage(this.SETTINGS_KEY, settings);
        console.log('✅ Настройки обновлены в Supabase');
      } else {
        console.warn('⚠️ Не удалось обновить настройки в Supabase, сохраняем локально');
        this.settingsSubject.next(settings);
        this.saveToLocalStorage(this.SETTINGS_KEY, settings);
      }
    } catch (error) {
      console.error('❌ Ошибка обновления настроек в Supabase:', error);
      // Сохраняем локально как fallback
      this.settingsSubject.next(settings);
      this.saveToLocalStorage(this.SETTINGS_KEY, settings);
    }
  }
}


  async updateSlides(slides: Slide[]): Promise<void> {
  console.log('✏️ Обновление слайдов в режиме:', this.storageMode);
  
  if (this.storageMode === 'local') {
    this.slidesSubject.next(slides);
    this.saveToLocalStorage(this.SLIDES_KEY, slides);
    console.log('✅ Слайды обновлены в LocalStorage:', slides.length);
  } else {
    try {
      // Подготавливаем данные для Supabase
      const supabaseSlides = slides.map(slide => ({
        image: slide.image,
        title: slide.title,
        description: slide.description,
        link: slide.link || '',
        isActive: slide.isActive !== undefined ? slide.isActive : true
      }));
      
      const success = await this.supabaseService.updateSlides(supabaseSlides);
      if (success) {
        this.slidesSubject.next(slides);
        this.saveToLocalStorage(this.SLIDES_KEY, slides);
        console.log('✅ Слайды обновлены в Supabase:', slides.length);
      } else {
        console.warn('⚠️ Не удалось обновить слайды в Supabase, сохраняем локально');
        this.slidesSubject.next(slides);
        this.saveToLocalStorage(this.SLIDES_KEY, slides);
      }
    } catch (error) {
      console.error('❌ Ошибка обновления слайдов в Supabase:', error);
      // Сохраняем локально как fallback
      this.slidesSubject.next(slides);
      this.saveToLocalStorage(this.SLIDES_KEY, slides);
    }
  }
}
  async updateCompanyInfo(companyInfo: CompanyInfo): Promise<void> {
  console.log('✏️ Обновление информации о компании в режиме:', this.storageMode);
  
  if (this.storageMode === 'local') {
    this.companyInfoSubject.next(companyInfo);
    this.saveToLocalStorage(this.COMPANY_KEY, companyInfo);
    console.log('✅ Информация о компании обновлена в LocalStorage');
  } else {
    try {
      // Преобразуем CompanyInfo в формат для Supabase
      const contactInfo = {
        phone: companyInfo.phone,
        email: companyInfo.email,
        office: companyInfo.address,
        workingHours: companyInfo.workHours,
        // ПРЕОБРАЗОВЫВАЕМ aboutSections в JSON
        aboutSections: companyInfo.aboutSections || []
      };
      
      const success = await this.supabaseService.updateContactInfo(contactInfo);
      if (success) {
        this.companyInfoSubject.next(companyInfo);
        this.saveToLocalStorage(this.COMPANY_KEY, companyInfo);
        console.log('✅ Информация о компании обновлена в Supabase с aboutSections');
      } else {
        console.warn('⚠️ Не удалось обновить информацию в Supabase, сохраняем локально');
        this.companyInfoSubject.next(companyInfo);
        this.saveToLocalStorage(this.COMPANY_KEY, companyInfo);
      }
    } catch (error) {
      console.error('❌ Ошибка обновления информации в Supabase:', error);
      // Сохраняем локально как fallback
      this.companyInfoSubject.next(companyInfo);
      this.saveToLocalStorage(this.COMPANY_KEY, companyInfo);
    }
  }
}

  // ===== МЕТОДЫ ПО УМОЛЧАНИЮ (без изменений) =====
  private getDefaultSettings(): HomePageSettings {
    return {
      title: 'Komfort - Мебель и товары для дома',
      description: 'Лучшие товары для вашего дома по доступным ценам',
      bannerImages: [],
      featuredCategories: []
    };
  }

  private getDefaultSlides(): Slide[] {
  // Возвращаем ПУСТОЙ массив вместо статических слайдов
  return [];
}

  private getDefaultCompanyInfo(): CompanyInfo {
    return {
      address: 'Чеченская Республика, г. Шелковская, ул. Косая, 47',
      phone: '+7 (800) 123-45-67',
      email: 'info@komfort.ru',
      workHours: 'ПН - ВС с 8:00 до 20:00',
      aboutSections: [
        {
          title: 'Опыт',
          content: 'Продукция Komfort уже более 13 лет пользуется успехом у покупателей и реализуется во многих регионах России, а также экспортируется в страны СНГ и Европу. Широкий ассортимент и большая складская программа позволяют нашим клиентам быстро и выгодно делать с нами бизнес.'
        },
        {
          title: 'Современный модельный ряд',
          content: 'Komfort следит за тенденциями на рынке товаров для дома и свежими идеями в дизайне интерьеров. Наш коллектив является постоянным участником международных выставок и форумов, где набирается опыта и делится своим. Продукция представлена более чем в 50 салонах по всей стране.'
        },
        {
          title: 'Производство',
          content: 'Производственный комплекс занимает 15 000 кв. м и включает в себя 7 цехов полного цикла производства мебели и домашнего текстиля на оборудовании ведущих мировых производителей. Особое внимание мы уделяем подбору сотрудников, чтобы наш коллектив прирастал только профессиональными и ответственными людьми.'
        }
      ],
      social: [] 
    };
  }

  // ===== МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ РЕЖИМАМИ =====
  
  getStorageMode(): 'local' | 'supabase' {
    return this.storageMode;
  }

  async switchStorageMode(mode: 'local' | 'supabase'): Promise<void> {
    if (this.storageMode === mode) {
      console.log(`ℹ️ Уже в режиме ${mode}`);
      return;
    }
    
    console.log(`🔄 Переключение режима с ${this.storageMode} на ${mode}`);
    this.storageMode = mode;
    
    if (mode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
  }

  private fixSlideImageUrl(url: string): string {
  if (!url || url.trim() === '') {
    return '/assets/default-slide.jpg';
  }
  
  const cleanedUrl = url.trim();
  
  // ВАЖНО: Если это Supabase URL, оставляем как есть
  if (cleanedUrl.includes('supabase.co') || cleanedUrl.includes('storage/v1/object/public')) {
    return cleanedUrl; // ← НЕ добавляем /assets/!
  }
  
  // Если путь уже правильный (локальный с /assets/)
  if (cleanedUrl.startsWith('/assets/')) {
    return cleanedUrl;
  }
  
  // Если путь начинается с assets/ (без /)
  if (cleanedUrl.startsWith('assets/')) {
    return '/' + cleanedUrl;
  }
  
  // Если это просто имя файла
  if (cleanedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return '/assets/' + cleanedUrl;
  }
  
  // Если это полный URL (с http:// или https://)
  if (cleanedUrl.startsWith('http')) {
    // Проверяем, Supabase ли это
    if (cleanedUrl.includes('supabase.co')) {
      return cleanedUrl; // Supabase URL оставляем как есть
    }
    // Для других HTTP URL возвращаем как есть (если нужно обрабатывать по-другому)
    return cleanedUrl;
  }
  
  // Во всех остальных случаях используем дефолтное
  return '/assets/default-slide.jpg';
}

private cleanSlideImageUrls(slides: any[]): any[] {
  if (!slides || !Array.isArray(slides)) {
    return [];
  }
  
  return slides.map(slide => ({
    ...slide,
    imageUrl: this.fixSlideImageUrl(slide.image || slide.imageUrl)
  }));
}
  // ===== МЕТОДЫ ДЛЯ ТЕСТИРОВАНИЯ =====
  
  async testConnection(): Promise<boolean> {
    console.log('🔌 Тестирование подключения к Supabase (HomePage)...');
    
    try {
      const settings = await this.supabaseService.getHomepageSettings();
      console.log('✅ Подключение к Supabase успешно');
      return true;
    } catch (error: any) {
      console.error('❌ Ошибка подключения:', error.message || error);
      return false;
    }
  }

  async testAllOperations(): Promise<void> {
    console.log('🧪 Запуск тестовых операций HomePageService...');
    
    const connected = await this.testConnection();
    if (!connected) {
      console.log('❌ Тест остановлен: нет подключения');
      return;
    }
    
    console.log('📦 Получаем данные...');
    console.log('- Настройки:', this.getSettings().title);
    console.log('- Слайдов:', this.getSlides().length);
    console.log('- Компания:', this.getCompanyInfo().phone);
    
    console.log('✅ Все тесты завершены');
  }

  async forceLoadFromSupabase(): Promise<void> {
    console.log('🔄 Принудительная загрузка из Supabase...');
    await this.loadFromSupabase();
  }

  // Пример метода для HomePageService
async uploadSlideImage(file: File): Promise<string> {
  try {
    console.log('📤 [HomePageService] Загрузка изображения слайда...');
    
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `slides/${fileName}`;
    
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase.storage
      .from('slides')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('slides')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ Ошибка загрузки слайда:', error);
    throw error;
  }
}

  clearCache(): void {
    console.log('🧹 Очистка кэша localStorage...');
    localStorage.removeItem(this.SETTINGS_KEY);
    localStorage.removeItem(this.SLIDES_KEY);
    localStorage.removeItem(this.COMPANY_KEY);
    
    // Восстанавливаем значения по умолчанию
    this.settingsSubject.next(this.getDefaultSettings());
    this.slidesSubject.next(this.getDefaultSlides());
    this.companyInfoSubject.next(this.getDefaultCompanyInfo());
    
    this.saveToLocalStorage(this.SETTINGS_KEY, this.getDefaultSettings());
    this.saveToLocalStorage(this.SLIDES_KEY, this.getDefaultSlides());
    this.saveToLocalStorage(this.COMPANY_KEY, this.getDefaultCompanyInfo());
  }

  async initializeHomepageData(): Promise<void> {
  console.log('🔧 Инициализация данных главной страницы в Supabase...');
  
  try {
    // Проверяем, есть ли данные в Supabase
    const settings = await this.supabaseService.getHomepageSettings();
    const slides = await this.supabaseService.getSlides();
    const contactInfo = await this.supabaseService.getContactInfo();
    
    // Если данных нет, создаем их
    if (!settings) {
      console.log('➕ Создаем начальные настройки в Supabase...');
      const defaultSettings = this.getDefaultSettings();
      // TODO: Добавить метод createHomepageSettings в SupabaseService
      console.log('⚠️ Метод создания настроек пока не реализован');
    }
    
    if (!slides || slides.length === 0) {
      console.log('➕ Создаем начальные слайды в Supabase...');
      const defaultSlides = this.getDefaultSlides();
      // TODO: Добавить метод createSlides в SupabaseService
      console.log('⚠️ Метод создания слайдов пока не реализован');
    }
    
    if (!contactInfo) {
      console.log('➕ Создаем начальную информацию о компании в Supabase...');
      const defaultCompanyInfo = this.getDefaultCompanyInfo();
      // TODO: Добавить метод createContactInfo в SupabaseService
      console.log('⚠️ Метод создания информации о компании пока не реализован');
    }
    
    console.log('✅ Инициализация данных завершена');
  } catch (error) {
    console.error('❌ Ошибка инициализации данных:', error);
  }
}
    

  // Синхронизация локальных данных с Supabase
  async syncToSupabase(): Promise<void> {
  console.log('🔄 Синхронизация данных главной страницы с Supabase...');
  
  try {
    // Синхронизируем настройки
    const settings = this.getSettings();
    const settingsSuccess = await this.supabaseService.updateHomepageSettings(settings);
    console.log(settingsSuccess ? '✅ Настройки синхронизированы' : '❌ Ошибка синхронизации настроек');
    
    // Синхронизируем слайды
    const slides = this.getSlides();
    const supabaseSlides = slides.map(slide => ({
      image: slide.image,
      title: slide.title,
      description: slide.description,
      link: slide.link || '',
      isActive: slide.isActive !== undefined ? slide.isActive : true
    }));
    const slidesSuccess = await this.supabaseService.updateSlides(supabaseSlides);
    console.log(slidesSuccess ? `✅ ${slides.length} слайдов синхронизированы` : '❌ Ошибка синхронизации слайдов');
    
    // Синхронизируем информацию о компании
    const companyInfo = this.getCompanyInfo();
    const contactInfo = {
      phone: companyInfo.phone,
      email: companyInfo.email,
      office: companyInfo.address,
      workingHours: companyInfo.workHours,
      aboutSections: JSON.stringify(companyInfo.aboutSections || [])
    };
    const companySuccess = await this.supabaseService.updateContactInfo(contactInfo);
    console.log(companySuccess ? '✅ Информация о компании синхронизирована' : '❌ Ошибка синхронизации информации');
    
    console.log('🎉 Синхронизация завершена');
  } catch (error) {
    console.error('❌ Ошибка синхронизации с Supabase:', error);
  }
}



}