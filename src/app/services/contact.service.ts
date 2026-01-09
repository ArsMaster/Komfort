import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ContactInfo } from '../models/contact.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private contactsSubject = new BehaviorSubject<ContactInfo>(this.getDefaultContacts());
  contacts$: Observable<ContactInfo> = this.contactsSubject.asObservable();
  
  private storageMode: 'local' | 'supabase' = 'local';
  private storageKey = 'komfort_contacts';
  private isInitialized = false;

  constructor(private supabaseService: SupabaseService) {
    console.log('=== ContactService инициализирован ===');
    
    // Экспортируем для тестирования в консоли
    (window as any).contactService = this;
    (window as any).contactServiceDebug = {
      getMode: () => this.storageMode,
      testConnection: () => this.testConnection(),
      testAll: () => this.testAllOperations(),
      forceLoadFromSupabase: () => this.forceLoadFromSupabase(),
      clearCache: () => this.clearCache(),
      addTestSocial: () => this.addTestSocial()
    };
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Проверяем сохраненный режим из localStorage
    this.storageMode = localStorage.getItem('komfort_storage_mode') as 'local' | 'supabase' || 'supabase';
    
    console.log('🔧 Режим работы ContactService:', this.storageMode);
    
    if (this.storageMode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
    
    this.isInitialized = true;
    console.log('✅ ContactService инициализирован');
  }

  // ===== ЗАГРУЗКА ИЗ LOCALSTORAGE =====
  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const contacts = JSON.parse(saved);
        this.contactsSubject.next(contacts);
        console.log('📦 Контакты загружены из localStorage');
      } catch (error) {
        console.error('❌ Ошибка загрузки контактов из localStorage:', error);
        this.contactsSubject.next(this.getDefaultContacts());
      }
    } else {
      console.log('📭 Нет сохраненных контактов, используются начальные');
      const defaultContacts = this.getDefaultContacts();
      this.contactsSubject.next(defaultContacts);
      this.saveToLocalStorage(defaultContacts);
    }
  }

  // ===== ЗАГРУЗКА ИЗ SUPABASE =====
  private async loadFromSupabase(): Promise<void> {
    console.log('🔄 Загрузка контактов из Supabase...');
    
    try {
      // Сначала проверяем подключение
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.warn('⚠️ Нет подключения к Supabase, переключаемся на localStorage');
        this.storageMode = 'local';
        this.loadFromLocalStorage();
        return;
      }
      
      const contactInfo = await this.supabaseService.getContactInfo();
      
      if (contactInfo) {
        // Преобразуем ContactInfo из SupabaseService в формат ContactService
        const transformedContacts: ContactInfo = {
          id: contactInfo.id,
          phone: contactInfo.phone || '',
          email: contactInfo.email || '',
          office: contactInfo.office || '',
          workingHours: contactInfo.workingHours || '',
          mapEmbed: contactInfo.mapEmbed || '',
          social: contactInfo.social || []
        };
        
        this.contactsSubject.next(transformedContacts);
        this.saveToLocalStorage(transformedContacts);
        console.log('✅ Контакты загружены из Supabase');
      } else {
        console.log('📭 Supabase: нет контактов, используем локальные');
        const defaultContacts = this.getDefaultContacts();
        this.contactsSubject.next(defaultContacts);
        this.saveToLocalStorage(defaultContacts);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки из Supabase:', error);
      console.log('🔄 Переключаемся на LocalStorage');
      this.storageMode = 'local';
      this.loadFromLocalStorage();
    }
  }

  // ===== СОХРАНЕНИЕ =====
  private saveToLocalStorage(contacts?: ContactInfo): void {
    const contactsToSave = contacts || this.getContacts();
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(contactsToSave));
      console.log('💾 Контакты сохранены в localStorage (кэш)');
    } catch (error) {
      console.error('❌ Ошибка сохранения в localStorage:', error);
    }
  }

  // ===== ПУБЛИЧНЫЕ МЕТОДЫ (сохраняем существующий интерфейс) =====
  
  getContacts(): ContactInfo {
    return this.contactsSubject.getValue();
  }

  async updateContacts(updates: Partial<ContactInfo>): Promise<void> {
    console.log('✏️ Обновление контактов в режиме:', this.storageMode);
    
    const currentContacts = this.getContacts();
    const updatedContacts = { ...currentContacts, ...updates };
    
    // Сначала обновляем локально для быстрого отклика
    this.contactsSubject.next(updatedContacts);
    
    if (this.storageMode === 'local') {
      this.saveToLocalStorage(updatedContacts);
      console.log('✅ Контакты обновлены в LocalStorage');
    } else {
      // Обновляем в Supabase
      try {
        // TODO: Добавить метод updateContactInfo в SupabaseService
        // Пока сохраняем только локально
        this.saveToLocalStorage(updatedContacts);
        const success = await this.supabaseService.updateContactInfo(updatedContacts);
        if (success) {
          this.saveToLocalStorage(updatedContacts);
          console.log('✅ Контакты синхронизированы с Supabase');
        } else {
          console.warn('⚠️ Не удалось синхронизировать с Supabase, сохранено локально');
          this.saveToLocalStorage(updatedContacts);
        }
      } catch (error) {
        console.error('❌ Ошибка обновления в Supabase:', error);
      }
    }
  }

  // ===== МЕТОДЫ ДЛЯ СОЦИАЛЬНЫХ СЕТЕЙ =====
  async addSocial(social: { name: string; url: string; icon: string }): Promise<void> {
    console.log('➕ Добавление социальной сети в режиме:', this.storageMode);
    
    const currentContacts = this.getContacts();
    const updatedContacts = {
      ...currentContacts,
      social: [...currentContacts.social, social]
    };
    
    await this.updateContacts({ social: updatedContacts.social });
    console.log('✅ Социальная сеть добавлена');
  }

  async removeSocial(index: number): Promise<void> {
    console.log('🗑️ Удаление социальной сети в режиме:', this.storageMode);
    
    const currentContacts = this.getContacts();
    const updatedSocial = currentContacts.social.filter((_, i) => i !== index);
    
    await this.updateContacts({ social: updatedSocial });
    console.log('✅ Социальная сеть удалена');
  }

  async updateSocial(index: number, updates: Partial<{ name: string; url: string; icon: string }>): Promise<void> {
    console.log('✏️ Обновление социальной сети в режиме:', this.storageMode);
    
    const currentContacts = this.getContacts();
    const updatedSocial = [...currentContacts.social];
    
    if (index >= 0 && index < updatedSocial.length) {
      updatedSocial[index] = { ...updatedSocial[index], ...updates };
      await this.updateContacts({ social: updatedSocial });
      console.log('✅ Социальная сеть обновлена');
    } else {
      console.error('❌ Индекс социальной сети вне диапазона');
    }
  }

  // ===== МЕТОДЫ ПО УМОЛЧАНИЮ =====
  private getDefaultContacts(): ContactInfo {
    return {
      id: 1,
      phone: '+7 (938) 505-00-07',
      email: 'komfort.smm@mail.ru',
      office: 'г. Шелковская, ул. Косая, 47, ТД "Комфорт"',
      social: [
        { name: 'Instagram', url: 'https://www.instagram.com/td_komfort_shelk/', icon: 'IN' },
        { name: 'Telegram', url: 'https://t.me/komfort_company', icon: 'TG' },
        { name: 'WhatsApp', url: 'https://wa.me/78005553535', icon: 'WA' }
      ],
      workingHours: 'Пн-Пт: 9:00-18:00, Сб: 10:00-16:00',
      mapEmbed: '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A..." width="100%" height="100%" frameborder="0"></iframe>'
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

  // ===== МЕТОДЫ ДЛЯ ТЕСТИРОВАНИЯ =====
  
  async testConnection(): Promise<boolean> {
    console.log('🔌 Тестирование подключения к Supabase (Contact)...');
    
    try {
      const contactInfo = await this.supabaseService.getContactInfo();
      console.log('✅ Подключение к Supabase успешно');
      return true;
    } catch (error: any) {
      console.error('❌ Ошибка подключения:', error.message || error);
      return false;
    }
  }

  async testAllOperations(): Promise<void> {
    console.log('🧪 Запуск тестовых операций ContactService...');
    
    const connected = await this.testConnection();
    if (!connected) {
      console.log('❌ Тест остановлен: нет подключения');
      return;
    }
    
    console.log('📦 Получаем данные...');
    const contacts = this.getContacts();
    console.log('- Телефон:', contacts.phone);
    console.log('- Email:', contacts.email);
    console.log('- Социальных сетей:', contacts.social.length);
    
    console.log('➕ Тест добавления социальной сети...');
    await this.addSocial({
      name: 'YouTube',
      url: 'https://youtube.com/komfort',
      icon: 'YT'
    });
    
    console.log('✏️ Тест обновления социальной сети...');
    if (contacts.social.length > 0) {
      await this.updateSocial(0, {
        url: 'https://vk.com/komfort_updated'
      });
    }
    
    console.log('✅ Все тесты завершены');
  }

  async forceLoadFromSupabase(): Promise<void> {
    console.log('🔄 Принудительная загрузка из Supabase...');
    await this.loadFromSupabase();
  }

  clearCache(): void {
    console.log('🧹 Очистка кэша localStorage...');
    localStorage.removeItem(this.storageKey);
    
    // Восстанавливаем значения по умолчанию
    const defaultContacts = this.getDefaultContacts();
    this.contactsSubject.next(defaultContacts);
    this.saveToLocalStorage(defaultContacts);
  }

  async addTestSocial(): Promise<void> {
    console.log('➕ Добавляем тестовую социальную сеть...');
    
    const testSocial = {
      name: `Test Social ${Date.now()}`,
      url: 'https://test.example.com',
      icon: 'TEST'
    };
    
    await this.addSocial(testSocial);
    console.log('✅ Тестовая социальная сеть добавлена');
  }

  // Синхронизация локальных данных с Supabase
  async syncToSupabase(): Promise<void> {
    console.log('🔄 Синхронизация контактов с Supabase...');
    
    if (this.storageMode === 'supabase') {
      console.log('Уже в режиме Supabase, синхронизация не требуется');
      return;
    }
    
    console.log('⚠️ Синхронизация пока не реализована. Добавьте метод updateContactInfo в SupabaseService');
  }
}