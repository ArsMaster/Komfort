// services/contact.service.ts
import { Injectable, signal } from '@angular/core';
import { ContactInfo } from '../models/contact.model';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  // Начальные данные (можно заменить на пустые значения)
  private contacts = signal<ContactInfo>({
    id: 1,
    phone: '+7 (938) 505-00-07',
    email: 'komfort.smm@mail.ru',
    office: 'г. Шелковская, ул. Косая, 47, ТД "Комфорт"',
    social: [
      { name: 'VK', url: 'https://vk.com/komfort', icon: 'VK' },
      { name: 'Telegram', url: 'https://t.me/komfort_company', icon: 'TG' },
      { name: 'WhatsApp', url: 'https://wa.me/78005553535', icon: 'WA' }
    ],
    workingHours: 'Пн-Пт: 9:00-18:00, Сб: 10:00-16:00',
    mapEmbed: '<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A..." width="100%" height="100%" frameborder="0"></iframe>'
  });

  constructor() {
  this.loadFromLocalStorage();
}

  // Получить контакты (только для чтения)
  getContacts() {
    return this.contacts.asReadonly();
  }

  // Обновить контакты
  updateContacts(updates: Partial<ContactInfo>) {
    this.contacts.update(current => ({ ...current, ...updates }));
    // Сохраняем в localStorage для сохранения между сессиями
    this.saveToLocalStorage();
  }

  // Сохранить в localStorage
  private saveToLocalStorage(): void {
    localStorage.setItem('komfort_contacts', JSON.stringify(this.contacts()));
  }

  // Загрузить из localStorage (вызвать в конструкторе или при инициализации)
  loadFromLocalStorage(): void {
    const saved = localStorage.getItem('komfort_contacts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.contacts.set(parsed);
      } catch (error) {
        console.error('Ошибка загрузки контактов из localStorage:', error);
      }
    }
  }

  // Добавить социальную сеть
  addSocial(social: { name: string; url: string; icon: string }): void {
    this.contacts.update(current => ({
      ...current,
      social: [...current.social, social]
    }));
    this.saveToLocalStorage();
  }

  // Удалить социальную сеть
  removeSocial(index: number): void {
    this.contacts.update(current => ({
      ...current,
      social: current.social.filter((_, i) => i !== index)
    }));
    this.saveToLocalStorage();
  }

  // Обновить социальную сеть
  updateSocial(index: number, updates: Partial<{ name: string; url: string; icon: string }>): void {
    this.contacts.update(current => {
      const updatedSocial = [...current.social];
      updatedSocial[index] = { ...updatedSocial[index], ...updates };
      return { ...current, social: updatedSocial };
    });
    this.saveToLocalStorage();
  }
}