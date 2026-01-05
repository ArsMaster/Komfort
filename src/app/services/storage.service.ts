import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly PREFIX = 'komfort_';
  
  // Используем sessionStorage для более стабильного хранения
  save(key: string, data: any): void {
    try {
      const fullKey = this.PREFIX + key;
      sessionStorage.setItem(fullKey, JSON.stringify(data));
      // Дублируем в localStorage для надежности
      localStorage.setItem(fullKey, JSON.stringify(data));
      console.log(`Данные сохранены: ${fullKey}`, data);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    }
  }
  
  load<T>(key: string): T | null {
    try {
      const fullKey = this.PREFIX + key;
      // Сначала пробуем sessionStorage
      let saved = sessionStorage.getItem(fullKey);
      
      // Если нет в sessionStorage, пробуем localStorage
      if (!saved) {
        saved = localStorage.getItem(fullKey);
      }
      
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      return null;
    }
  }
  
  clear(): void {
    // Очищаем оба хранилища
    const keysToRemove: string[] = [];
    
    // Находим все ключи с префиксом
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }
}