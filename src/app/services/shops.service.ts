import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Shop } from '../models/shop.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ShopsService {
  private shopsSubject = new BehaviorSubject<Shop[]>([]);
  shops$: Observable<Shop[]> = this.shopsSubject.asObservable();
  
  private storageMode: 'local' | 'supabase' = 'local';
  private storageKey = 'komfort_shops';
  private isInitialized = false;

  constructor(private supabaseService: SupabaseService) {
    console.log('=== ShopsService инициализирован ===');
    
    (window as any).shopsService = this;
    (window as any).shopsServiceDebug = {
      getMode: () => this.storageMode,
      testConnection: () => this.testConnection(),
      forceLoadFromSupabase: () => this.forceLoadFromSupabase(),
      clearCache: () => this.clearCache(),
      addTestShop: () => this.addTestShopToSupabase()
    };
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.storageMode = localStorage.getItem('komfort_storage_mode') as 'local' | 'supabase' || 'supabase';
    
    console.log('🔧 Режим работы ShopsService:', this.storageMode);
    
    if (this.storageMode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
    
    this.isInitialized = true;
    console.log('✅ ShopsService инициализирован. Магазинов:', this.getShops().length);
  }

  // ===== ЗАГРУЗКА ИЗ LOCALSTORAGE =====
  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const shops = JSON.parse(saved);
        if (shops && shops.length > 0) {
          this.shopsSubject.next(shops);
          console.log('📦 Магазины загружены из localStorage:', shops.length);
        } else {
          // ✅ Если сохранены пустые данные — просто пустой массив
          this.shopsSubject.next([]);
          console.log('📭 LocalStorage пуст ([]), магазинов нет');
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки магазинов из localStorage:', error);
        // ✅ При ошибке — пустой массив
        this.shopsSubject.next([]);
      }
    } else {
      console.log('📭 Нет сохраненных магазинов в localStorage');
      // ✅ Не создаём дефолтные данные!
      this.shopsSubject.next([]);
    }
  }

  // ===== ЗАГРУЗКА ИЗ SUPABASE =====
  private async loadFromSupabase(): Promise<void> {
    console.log('🔄 Загрузка магазинов из Supabase...');
    
    try {
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.warn('⚠️ Нет подключения к Supabase, переключаемся на localStorage');
        this.storageMode = 'local';
        localStorage.setItem('komfort_storage_mode', 'local');
        this.loadFromLocalStorage();
        return;
      }
      
      const shops = await this.supabaseService.getShops();
      
      if (shops && shops.length > 0) {
        console.log('✅ Магазины загружены из Supabase:', shops.length);
        this.shopsSubject.next(shops);
        this.saveToLocalStorage(shops);
        
        shops.slice(0, 2).forEach((shop, i) => {
          console.log(`  ${i+1}. ${shop.title} (${shop.address})`);
        });
      } else {
        console.log('📭 Supabase пуст, используем пустой массив');
        // ✅ Не создаём дефолтные данные!
        this.shopsSubject.next([]);
        this.saveToLocalStorage([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки из Supabase:', error);
      console.log('🔄 Переключаемся на LocalStorage');
      this.storageMode = 'local';
      localStorage.setItem('komfort_storage_mode', 'local');
      this.loadFromLocalStorage();
    }
  }

  // ===== СОХРАНЕНИЕ =====
  private saveToLocalStorage(shops?: Shop[]): void {
    const shopsToSave = shops || this.getShops();
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(shopsToSave));
      console.log('💾 Магазины сохранены в localStorage (кэш):', shopsToSave.length);
    } catch (error) {
      console.error('❌ Ошибка сохранения в localStorage:', error);
    }
  }

  // ===== ПУБЛИЧНЫЕ МЕТОДЫ =====
  
  getShops(): Shop[] {
    return this.shopsSubject.getValue();
  }

  async addShop(shopData: Omit<Shop, 'id'>): Promise<Shop> {
    console.log('➕ Добавление магазина в режиме:', this.storageMode);
    
    const tempShop: Shop = {
      ...shopData,
      id: this.generateId()
    };
    
    if (this.storageMode === 'local') {
      const shops = this.getShops();
      const updatedShops = [...shops, tempShop];
      this.shopsSubject.next(updatedShops);
      this.saveToLocalStorage(updatedShops);
      
      console.log('✅ Магазин добавлен в LocalStorage:', tempShop.title);
      return tempShop;
    } else {
      try {
        const result = await this.supabaseService.addShop(tempShop);
        if (result) {
          const shops = this.getShops();
          const updatedShops = [...shops, result];
          this.shopsSubject.next(updatedShops);
          this.saveToLocalStorage(updatedShops);
          
          console.log('✅ Магазин добавлен в Supabase:', result.title);
          return result;
        } else {
          throw new Error('Не удалось сохранить в Supabase');
        }
      } catch (error) {
        console.error('❌ Ошибка сохранения в Supabase:', error);
        console.log('🔄 Переключаемся в локальный режим');
        this.storageMode = 'local';
        localStorage.setItem('komfort_storage_mode', 'local');
        return this.addShop(shopData);
      }
    }
  }

  async updateShop(id: string, updates: Partial<Shop>): Promise<Shop | null> {
    console.log('✏️ Обновление магазина ID:', id, 'в режиме:', this.storageMode);
    
    const shops = this.getShops();
    const index = shops.findIndex(shop => shop.id === id);
    
    if (index === -1) {
      console.error(`❌ Магазин с id ${id} не найден`);
      return null;
    }
    
    const updatedShop = { ...shops[index], ...updates };
    const updatedShops = [...shops];
    updatedShops[index] = updatedShop;
    
    this.shopsSubject.next(updatedShops);
    
    if (this.storageMode === 'local') {
      this.saveToLocalStorage(updatedShops);
      console.log('✅ Магазин обновлен в LocalStorage');
    } else {
      try {
        const success = await this.supabaseService.updateShop(id, updates);
        if (success) {
          this.saveToLocalStorage(updatedShops);
          console.log('✅ Магазин синхронизирован с Supabase');
        } else {
          console.warn('⚠️ Не удалось синхронизировать с Supabase');
        }
      } catch (error) {
        console.error('❌ Ошибка синхронизации с Supabase:', error);
      }
    }
    
    return updatedShop;
  }

  async deleteShop(id: string): Promise<boolean> {
    console.log('🗑️ Удаление магазина ID:', id, 'в режиме:', this.storageMode);
    
    const shops = this.getShops();
    const exists = shops.some(shop => shop.id === id);
    
    if (!exists) {
      console.error(`❌ Магазин с id ${id} не найден`);
      return false;
    }
    
    const updatedShops = shops.filter(shop => shop.id !== id);
    this.shopsSubject.next(updatedShops);
    
    if (this.storageMode === 'local') {
      this.saveToLocalStorage(updatedShops);
      console.log('✅ Магазин удален из LocalStorage');
      return true;
    } else {
      try {
        const success = await this.supabaseService.deleteShop(id);
        if (success) {
          this.saveToLocalStorage(updatedShops);
          console.log('✅ Магазин удален из Supabase');
          return true;
        } else {
          console.warn('⚠️ Не удалось удалить из Supabase');
          return false;
        }
      } catch (error) {
        console.error('❌ Ошибка удаления из Supabase:', error);
        return false;
      }
    }
  }

  saveShops(shops: Shop[]): void {
    console.log('💾 Ручное сохранение магазинов:', shops.length);
    this.shopsSubject.next(shops);
    this.saveToLocalStorage(shops);
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
  private generateId(): string {
    const shops = this.getShops();
    if (shops.length === 0) return '1';
    
    const numericIds = shops
      .map(shop => {
        const num = parseInt(shop.id);
        return isNaN(num) ? 0 : num;
      })
      .filter(id => id > 0);
    
    return numericIds.length > 0 
      ? (Math.max(...numericIds) + 1).toString()
      : (shops.length + 1).toString();
  }

  getShopById(id: string): Shop | undefined {
    return this.getShops().find(shop => shop.id === id);
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
    localStorage.setItem('komfort_storage_mode', mode);
    
    if (mode === 'local') {
      this.loadFromLocalStorage();
    } else {
      await this.loadFromSupabase();
    }
  }

  async syncToSupabase(): Promise<void> {
    console.log('🔄 Синхронизация магазинов с Supabase...');
    const localShops = this.getShops();
    let successCount = 0;
    
    for (const shop of localShops) {
      try {
        const result = await this.supabaseService.addShop(shop);
        if (result) {
          successCount++;
          console.log(`  ✅ ${shop.title}`);
        }
      } catch (error: any) {
        console.error(`  ❌ ${shop.title}:`, error.message || error);
      }
    }
    
    console.log(`📊 Синхронизация завершена: ${successCount}/${localShops.length} магазинов`);
  }

  // ===== МЕТОДЫ ДЛЯ ТЕСТИРОВАНИЯ =====
  
  async testConnection(): Promise<boolean> {
    console.log('🔌 Тестирование подключения к Supabase...');
    
    try {
      const shops = await this.supabaseService.getShops();
      console.log('✅ Подключение к Supabase успешно');
      return true;
    } catch (error: any) {
      console.error('❌ Ошибка подключения:', error.message || error);
      return false;
    }
  }

  async testAllOperations(): Promise<void> {
    console.log('🧪 Запуск всех тестовых операций...');
    
    const connected = await this.testConnection();
    if (!connected) {
      console.log('❌ Тест остановлен: нет подключения');
      return;
    }
    
    console.log('📦 Получаем магазины...');
    const shops = this.getShops();
    console.log(`   Найдено: ${shops.length} магазинов`);
    
    console.log('➕ Добавляем тестовый магазин...');
    const testShop: Omit<Shop, 'id'> = {
      title: `Тестовый магазин ${Date.now()}`,
      address: 'Тестовый адрес',
      description: 'Магазин для тестирования',
      imageUrl: 'assets/default-shop.jpg',
      phone: '+7999' + Math.floor(Math.random() * 1000000),
      email: 'test@example.com',
      workingHours: 'Пн-Пт: 9:00-18:00',
      coordinates: { lat: 55.75, lng: 37.61 }
    };
    
    const added = await this.addShop(testShop);
    console.log(`   Добавлен: ${added?.title}`);
    
    if (shops.length > 0) {
      console.log('✏️ Обновляем первый магазин...');
      const updated = await this.updateShop(shops[0].id, {
        title: shops[0].title + ' [обновлено]'
      });
      console.log(`   Обновлен: ${updated?.title}`);
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
    // ✅ Не создаём дефолтные данные!
    this.shopsSubject.next([]);
    this.saveToLocalStorage([]);
  }

  async addTestShopToSupabase(): Promise<void> {
    console.log('➕ Добавляем тестовый магазин в Supabase напрямую...');
    
    const testShop: Omit<Shop, 'id'> = {
      title: `Тест из консоли ${Date.now()}`,
      address: 'г. Москва, тестовая улица, д. 1',
      description: 'Тестовый магазин добавленный через консоль',
      imageUrl: 'assets/default-shop.jpg',
      phone: '+7999' + Math.floor(Math.random() * 1000000),
      email: 'console@test.ru',
      workingHours: 'Пн-Вс: 10:00-20:00'
    };
    
    try {
      const result = await this.supabaseService.addShop(testShop);
      if (result) {
        console.log('✅ Тестовый магазин добавлен в Supabase:', result.title);
        
        const shops = this.getShops();
        const updatedShops = [...shops, result];
        this.shopsSubject.next(updatedShops);
        this.saveToLocalStorage(updatedShops);
      } else {
        console.log('❌ Не удалось добавить магазин в Supabase');
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);
    }
  }

  getShopsFromApi(): Observable<Shop[]> {
    return this.shops$;
  }

  // ===== ЗАГРУЗКА ИЗОБРАЖЕНИЙ =====
async uploadShopImages(files: File[]): Promise<string[]> {
  console.log(`📤 [ShopsService] Загрузка ${files.length} изображений магазина...`);
  
  if (this.storageMode !== 'supabase') {
    console.warn('⚠️ Режим не Supabase, возвращаем локальные URL');
    return files.map(file => URL.createObjectURL(file));
  }
  
  try {
    const uploadPromises = files.map(file => this.uploadShopImage(file));
    const urls = await Promise.all(uploadPromises);
    
    console.log(`✅ Изображения загружены:`, urls);
    return urls;
  } catch (error) {
    console.error('❌ Ошибка загрузки изображений:', error);
    throw error;
  }
}

private async uploadShopImage(file: File): Promise<string> {
  try {
    console.log('📤 [ShopsService] Загрузка изображения магазина...');
    
    // Генерируем уникальное имя
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `shops/${fileName}`;
    
    console.log('📁 Файл:', file.name);
    console.log('📂 Путь в Storage:', filePath);
    
    // Загружаем через SupabaseClient
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase.storage
      .from('shop-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (error) {
      console.error('❌ Ошибка загрузки:', error);
      throw error;
    }
    
    console.log('✅ Файл загружен в Supabase:', data);
    
    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('shop-images')
      .getPublicUrl(filePath);
    
    const publicUrl = urlData.publicUrl;
    console.log('🔗 Публичный URL:', publicUrl);
    
    return publicUrl;
    
  } catch (error: any) {
    console.error('❌ Ошибка в uploadShopImage:', error);
    throw error;
  }
}
}