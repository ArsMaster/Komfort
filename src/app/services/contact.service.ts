// contact.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, firstValueFrom, take } from 'rxjs';
import { ContactInfo } from '../models/contact.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  // Subject для хранения текущих контактов
  private contactsSubject = new BehaviorSubject<ContactInfo>(this.getEmptyContacts());
  contacts$: Observable<ContactInfo> = this.contactsSubject.asObservable();
  
  // Состояние загрузки
  private loadingSubject = new BehaviorSubject<boolean>(true); // Начинаем с загрузки
  loading$: Observable<boolean> = this.loadingSubject.asObservable();
  
  private isInitialized = false;
  private readonly CACHE_KEY = 'contacts_fallback_cache';
  private cacheLoaded = false;

  constructor(private supabaseService: SupabaseService) {
    console.log('=== ContactService инициализирован ===');
    
    // СИНХРОННО инициализируем и сразу загружаем данные
    this.initializeSync();
  }

  private initializeSync(): void {
    console.log('⚡ Синхронная инициализация ContactService');
    
    // 1. Сразу показываем loading состояние
    this.loadingSubject.next(true);
    
    // 2. Асинхронно загружаем данные
    this.loadFromSupabase().then(() => {
      this.isInitialized = true;
      console.log('✅ ContactService инициализирован');
    }).catch(error => {
      console.error('❌ Ошибка инициализации:', error);
      this.isInitialized = true;
    });
  }


  private async loadFromCacheAsFallback(): Promise<void> {
    console.log('🔄 Попытка загрузки из fallback кэша...');
    
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const contacts = JSON.parse(cached);
        console.log('💾 Загружено из fallback кэша');
        this.contactsSubject.next(contacts);
        this.cacheLoaded = true;
      } else {
        console.log('📭 Fallback кэш пуст');
        // Оставляем пустые данные
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки из кэша:', error);
    }
  }

  /**
   * Сохранение в кэш как fallback
   */
  private saveToCache(contacts: ContactInfo): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(contacts));
      console.log('💾 Данные сохранены в fallback кэш');
    } catch (error) {
      console.error('❌ Ошибка сохранения в кэш:', error);
    }
  }

// contact.service.ts - в методе loadFromSupabase:
// contact.service.ts - в методе loadFromSupabase:
private async loadFromSupabase(): Promise<void> {
  console.log('🔄 loadFromSupabase called');
  
  try {
    this.loadingSubject.next(true);
    
    const contactInfo = await this.supabaseService.getContactInfo();
    
    if (contactInfo) {
      console.log('📦 Данные из Supabase:', contactInfo);
      
      // Очищаем дублированные строки
      const transformedContacts: ContactInfo = {
        id: contactInfo.id,
        phone: contactInfo.phone || '',
        email:contactInfo.email || '',
        office: contactInfo.office || '',
        workingHours: contactInfo.workingHours || '',
        mapEmbed: contactInfo.mapEmbed || '',
        social: contactInfo.social || [],
        aboutSections: contactInfo.about_sections || [] 
      };
      
      console.log('📊 Transformed contacts with aboutSections:', transformedContacts);
      
      // НЕМЕДЛЕННО обновляем Subject
      this.contactsSubject.next(transformedContacts);
      
      // Сохраняем в кэш
      this.saveToCache(transformedContacts);
      
      console.log('✅ Contacts loaded and emitted with aboutSections');
    } else {
      console.log('📭 No contacts in Supabase');
    }
  } catch (error: any) {
    console.error('❌ Error loading from Supabase:', error);
  } finally {
    this.loadingSubject.next(false);
  }
}
  



  async getContactsAsync(): Promise<ContactInfo> {
    // Если уже загружены, возвращаем
    const current = this.getContacts();
    if (current.id !== 0) {
      return current;
    }
    
    // Если загружается, ждем
    if (this.isLoading()) {
      return firstValueFrom(this.contacts$);
    }
    
    // Если не загружены и не загружаются - загружаем
    await this.loadFromSupabase();
    return this.getContacts();
  }

  /**
   * Основной метод обновления контактов
   */
  async updateContacts(updates: Partial<ContactInfo>): Promise<boolean> {
  console.log('✏️ Обновление контактов в Supabase...');
  
  const currentContacts = this.getContacts();
  const updatedContacts = { 
    ...currentContacts, 
    ...updates 
  };
  
  try {
    // 1. Обновляем в Supabase
    const success = await this.supabaseService.updateContactInfo(updatedContacts);
    
    if (success) {
      // 2. Обновляем локальное состояние СРАЗУ
      this.contactsSubject.next(updatedContacts);
      
      // 3. Сохраняем в кэш
      this.saveToCache(updatedContacts);
      
      console.log('✅ Контакты успешно обновлены в Supabase и локально');
      return true;
    } else {
      console.warn('⚠️ Не удалось обновить контакты в Supabase');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Ошибка обновления в Supabase:', error);
    return false;
  }
}

emitCurrentContacts(): void {
  const current = this.getContacts();
  console.log('📤 Принудительная эмиссия текущих контактов:', current.id);
  this.contactsSubject.next(current);
}

  
  async refreshContacts(): Promise<void> {
    console.log('🔄 Принудительная перезагрузка свежих данных...');
    
    // Очищаем кэш перед загрузкой
    localStorage.removeItem(this.CACHE_KEY);
    
    this.loadingSubject.next(true);
    await this.loadFromSupabase();
  }

  /**
   * Проверить состояние загрузки
   */
  isLoading(): boolean {
    return this.loadingSubject.getValue();
  }

  private getEmptyContacts(): ContactInfo {
    return {
      id: 0,
      phone: '',
      email: '',
      office: '',
      workingHours: '',
      mapEmbed: '',
      social: []
    };
  }

  // ===== МЕТОДЫ ДЛЯ СОЦИАЛЬНЫХ СЕТЕЙ =====
  
  async addSocial(social: { name: string; url: string; icon: string }): Promise<boolean> {
    console.log('➕ Добавление социальной сети...');
    
    const currentContacts = this.getContacts();
    const updatedSocial = [...currentContacts.social, social];
    
    return await this.updateContacts({ social: updatedSocial });
  }

  async removeSocial(index: number): Promise<boolean> {
    console.log(`🗑️ Удаление социальной сети (индекс: ${index})...`);
    
    const currentContacts = this.getContacts();
    if (index < 0 || index >= currentContacts.social.length) {
      console.error('❌ Некорректный индекс социальной сети');
      return false;
    }
    
    const updatedSocial = currentContacts.social.filter((_, i) => i !== index);
    return await this.updateContacts({ social: updatedSocial });
  }

  async updateSocial(
    index: number, 
    updates: Partial<{ name: string; url: string; icon: string }>
  ): Promise<boolean> {
    console.log(`✏️ Обновление социальной сети (индекс: ${index})...`);
    
    const currentContacts = this.getContacts();
    if (index < 0 || index >= currentContacts.social.length) {
      console.error('❌ Некорректный индекс социальной сети');
      return false;
    }
    
    const updatedSocial = [...currentContacts.social];
    updatedSocial[index] = { ...updatedSocial[index], ...updates };
    
    return await this.updateContacts({ social: updatedSocial });
  }

  getStorageMode(): string {
    return 'supabase';
  }

  /**
   * Переключение режима не поддерживается
   */
  switchStorageMode(mode: 'local' | 'supabase'): void {
    console.warn('⚠️ Переключение режима не поддерживается. Контакты работают ТОЛЬКО с Supabase');
  }

  /**
   * Очистка "кэша" - просто перезагружает данные
   */
  clearCache(): void {
    console.log('🔄 "Очистка кэша" - перезагрузка из Supabase...');
    this.refreshContacts();
  }

  /**
   * Получить информацию о состоянии
   */
  getStatus(): { 
    isInitialized: boolean; 
    isLoading: boolean; 
    hasData: boolean;
    cacheLoaded: boolean;
  } {
    const contacts = this.getContacts();
    return {
      isInitialized: this.isInitialized,
      isLoading: this.loadingSubject.getValue(),
      hasData: !!(contacts.phone || contacts.email || contacts.office),
      cacheLoaded: this.cacheLoaded
    };
  }

  // ===== ТЕСТИРОВАНИЕ =====
  
  async testConnection(): Promise<boolean> {
    console.log('🔌 Тестирование подключения к Supabase...');
    
    try {
      const contactInfo = await this.supabaseService.getContactInfo();
      console.log('✅ Подключение к Supabase успешно');
      return true;
    } catch (error: any) {
      console.error('❌ Ошибка подключения:', error.message || error);
      return false;
    }
  }

  // ===== МЕТОДЫ ДЛЯ АДМИН-ПАНЕЛИ =====
  
  /**
   * Метод для сохранения контактов из админ-панели
   */
  async saveContacts(contacts: ContactInfo): Promise<boolean> {
    console.log('💾 Сохранение контактов из админ-панели...');
    return await this.updateContacts(contacts);
  }

  /**
   * Проверка обновлений в Supabase
   */
  async checkForUpdates(): Promise<{ 
    hasChanges: boolean; 
    local: ContactInfo; 
    remote: ContactInfo | null 
  }> {
    console.log('🔍 Проверка обновлений в Supabase...');
    
    try {
      const remoteData = await this.supabaseService.getContactInfo();
      
      if (!remoteData) {
        return { 
          hasChanges: false, 
          local: this.getContacts(), 
          remote: null 
        };
      }
      
      const transformedRemote: ContactInfo = {
        id: remoteData.id,
        phone: remoteData.phone || '',
        email: remoteData.email || '',
        office: remoteData.office || '',
        workingHours: remoteData.workingHours || '',
        mapEmbed: remoteData.mapEmbed || '',
        social: remoteData.social || []
      };
      
      const localData = this.getContacts();
      const hasChanges = JSON.stringify(localData) !== JSON.stringify(transformedRemote);
      
      console.log(`📊 Результат проверки: ${hasChanges ? 'Есть изменения' : 'Нет изменений'}`);
      
      return {
        hasChanges,
        local: localData,
        remote: transformedRemote
      };
    } catch (error) {
      console.error('❌ Ошибка проверки обновлений:', error);
      return { 
        hasChanges: false, 
        local: this.getContacts(), 
        remote: null 
      };
    }
  }

  /**
   * Синхронизация с Supabase (принудительная)
   */
  async syncWithSupabase(): Promise<void> {
    console.log('🔗 Синхронизация с Supabase...');
    await this.refreshContacts();
  }

  async ensureContactsLoaded(): Promise<ContactInfo> {
  const current = this.getContacts();
  
  // Если уже загружены
  if (current.id !== 0) {
    return current;
  }
  
  // Если загружаются, ждем
  if (this.isLoading()) {
    return new Promise((resolve) => {
      const subscription = this.contacts$.subscribe(contacts => {
        if (contacts.id !== 0) {
          subscription.unsubscribe();
          resolve(contacts);
        }
      });
    });
  }
  
  // Загружаем
  await this.loadFromSupabase();
  return this.getContacts();
}

// В ContactService добавьте:
private initializationPromise: Promise<void> | null = null;

async initialize(): Promise<void> {
  if (this.initializationPromise) {
    return this.initializationPromise;
  }
  
  this.initializationPromise = (async () => {
    if (!this.isInitialized) {
      console.log('🔄 ContactService: запуск инициализации...');
      await this.loadFromSupabase();
      this.isInitialized = true;
    }
  })();
  
  return this.initializationPromise;
}

// Измените getContacts():
getContacts(): ContactInfo {
  const current = this.contactsSubject.getValue();
  return current;
}

// Добавьте метод гарантированной загрузки:
async ensureLoaded(): Promise<ContactInfo> {
  await this.initialize();
  return this.getContacts();
}

  /**
   * Восстановление начальных данных
   */
  async restoreDefaults(): Promise<void> {
    console.log('🔄 Восстановление начальных контактов...');
    const initialContacts: ContactInfo = {
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
      mapEmbed: ''
    };
    
    const success = await this.updateContacts(initialContacts);
    
    if (success) {
      console.log('✅ Начальные контакты восстановлены в Supabase');
    } else {
      console.warn('⚠️ Не удалось восстановить начальные контакты в Supabase');
    }
  }

  debugInfo(): any {
  return {
    status: this.getStatus(),
    contacts: this.getContacts(),
    isLoading: this.isLoading(),
    isInitialized: this.isInitialized
  };
}
}