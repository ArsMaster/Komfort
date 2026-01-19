// admin-contacts.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { SupabaseService } from '../../services/supabase.service';
import { ContactInfo } from '../../models/contact.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-contacts.component.html',
  styleUrls: ['./admin-contacts.component.scss']
})
export class AdminContactsComponent implements OnInit, OnDestroy {
  private contactService = inject(ContactService);
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  
  contacts: ContactInfo = {
    id: 0,
    phone: '',
    email: '',
    office: '',
    social: []
  };
  
  originalContacts: ContactInfo = { ...this.contacts };
  hasUnsavedChanges = false;
  isSaving = false;
  saveStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  saveMessage = '';
  
  ngOnInit(): void {
    console.log('🔄 AdminContactsComponent инициализирован');
    
    // Подписываемся на изменения контактов
    this.contactService.contacts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(contacts => {
        console.log('📬 Админ получил обновленные контакты:', {
          id: contacts?.id,
          hasSocial: !!contacts?.social,
          socialCount: contacts?.social?.length || 0
        });
        
        if (contacts && contacts.id > 0) {
          this.contacts = { ...contacts };
          this.originalContacts = { ...contacts };
          this.hasUnsavedChanges = false;
          
          // Принудительное обновление view
          this.cdr.detectChanges();
        }
      });
    
    // Загружаем начальные данные
    this.loadContacts();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadContacts(): void {
    const contactsData = this.contactService.getContacts();
    console.log('📞 Загружены контакты для админки:', {
      id: contactsData.id,
      hasSocial: !!contactsData.social,
      socialCount: contactsData.social?.length || 0,
      social: contactsData.social
    });
    
    // КОПИРУЕМ ВСЕ ДАННЫЕ, включая social
    this.contacts = { ...contactsData };
    this.originalContacts = { ...contactsData };
    this.hasUnsavedChanges = false;
    
    // Если social пустой, устанавливаем дефолтные
    if (!this.contacts.social || this.contacts.social.length === 0) {
      console.log('⚠️ Social пустые, устанавливаем дефолтные');
      this.contacts.social = this.getDefaultSocials();
    }
  }
  
  private getDefaultSocials(): any[] {
    return [
      {
        name: 'Instagram',
        url: 'https://www.instagram.com/td_komfort_shelk/',
        icon: 'IN'
      },
      {
        name: 'Telegram',
        url: 'https://t.me/KOMFORTTD',
        icon: 'TG'
      },
      {
        name: 'WhatsApp',
        url: 'https://wa.me/79280001193',
        icon: 'WA'
      }
    ];
  }
  
  validateContacts(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Проверка обязательных полей
    if (!this.contacts.phone?.trim()) {
      errors.push('Телефон обязателен для заполнения');
    }
    
    if (!this.contacts.email?.trim()) {
      errors.push('Email обязателен для заполнения');
    }
    
    if (!this.contacts.office?.trim()) {
      errors.push('Адрес офиса обязателен для заполнения');
    }
    
    // Проверка формата email
    if (this.contacts.email && !this.contacts.email.includes('@')) {
      errors.push('Некорректный формат email');
    }
    
    // Проверка социальных сетей
    if (this.contacts.social && this.contacts.social.length > 0) {
      this.contacts.social.forEach((social, index) => {
        if (social && social.name && social.url) {
          if (!social.url.startsWith('http')) {
            errors.push(`Ссылка социальной сети "${social.name}" должна начинаться с http:// или https://`);
          }
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  async saveContacts(): Promise<void> {
    if (this.isSaving) return;
    
    // ВАЛИДАЦИЯ ПЕРЕД СОХРАНЕНИЕМ
    const validation = this.validateContacts();
    if (!validation.isValid) {
      this.saveStatus = 'error';
      this.saveMessage = validation.errors.join('. ');
      console.error('❌ Ошибки валидации:', validation.errors);
      return;
    }
    
    console.log('💾 Сохранение контактов в Supabase...');
    
    // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ПЕРЕД СОХРАНЕНИЕМ
    console.log('📝 Данные для сохранения:', {
      phone: this.contacts.phone,
      email: this.contacts.email,
      office: this.contacts.office,
      workingHours: this.contacts.workingHours,
      mapEmbed: this.contacts.mapEmbed,
      social: this.contacts.social,
      socialCount: this.contacts.social?.length || 0,
      aboutSections: this.contacts.aboutSections,
      aboutSectionsCount: this.contacts.aboutSections?.length || 0
    });
    
    this.isSaving = true;
    this.saveStatus = 'loading';
    this.saveMessage = 'Сохранение контактов...';
    
    try {
      // 1. ПОДГОТОВКА ДАННЫХ ДЛЯ СОХРАНЕНИЯ
      const contactsToSave = {
        ...this.contacts,
        // ГАРАНТИРУЕМ, ЧТО SOCIAL ВСЕГДА МАССИВ
        social: Array.isArray(this.contacts.social) 
          ? this.contacts.social.filter(s => s && typeof s === 'object')
          : []
      };
      
      // 2. ПРОВЕРЯЕМ SOCIAL ПЕРЕД СОХРАНЕНИЕМ
      if (!contactsToSave.social || contactsToSave.social.length === 0) {
        console.warn('⚠️ ВНИМАНИЕ: Social сети пустые или отсутствуют!');
        
        // Запрашиваем подтверждение если social пустые
        const shouldProceed = confirm(
          'Социальные сети пустые. Это удалит все существующие социальные сети из базы данных.\n\n' +
          'Продолжить сохранение?'
        );
        
        if (!shouldProceed) {
          console.log('❌ Сохранение отменено пользователем');
          this.saveStatus = 'idle';
          this.saveMessage = '';
          this.isSaving = false;
          return;
        }
      }
      
      console.log('📤 Отправляемые данные в Supabase:', {
        ...contactsToSave,
        socialCount: contactsToSave.social?.length || 0
      });
      
      // 3. СОХРАНЕНИЕ ЧЕРЕЗ CONTACT SERVICE
      const success = await this.contactService.saveContacts(contactsToSave);
      
      if (success) {
        this.saveStatus = 'success';
        this.saveMessage = 'Контакты успешно сохранены в Supabase!';
        
        // 4. ПРОВЕРЯЕМ, ЧТО SOCIAL СОХРАНИЛИСЬ
        setTimeout(async () => {
          try {
            const updatedContacts = this.contactService.getContacts();
            console.log('🔍 Проверка сохраненных данных:', {
              savedSocialCount: updatedContacts.social?.length || 0,
              savedSocial: updatedContacts.social
            });
            
            if (updatedContacts.social && updatedContacts.social.length === 0) {
              console.warn('⚠️ ВНИМАНИЕ: Social сети не сохранились!');
              this.saveMessage = 'Контакты сохранены, но социальные сети могут быть потеряны';
              this.cdr.detectChanges();
            }
          } catch (error) {
            console.error('❌ Ошибка проверки сохраненных данных:', error);
          }
        }, 1000);
        
        // 5. ОБНОВЛЯЕМ ОРИГИНАЛЬНЫЕ ДАННЫЕ
        this.originalContacts = { ...this.contacts };
        this.hasUnsavedChanges = false;
        
        console.log('✅ Контакты сохранены в Supabase');
        console.log('📞 Телефон:', this.contacts.phone);
        console.log('📧 Email:', this.contacts.email);
        console.log('🏢 Офис:', this.contacts.office);
        console.log('📱 Социальные сети:', this.contacts.social?.length || 0, 'шт.');
        
        // 6. СКРЫВАЕМ СООБЩЕНИЕ ЧЕРЕЗ 3 СЕКУНДЫ
        setTimeout(() => {
          if (this.saveStatus === 'success') {
            this.saveStatus = 'idle';
            this.saveMessage = '';
          }
        }, 3000);
        
      } else {
        this.saveStatus = 'error';
        this.saveMessage = 'Ошибка: не удалось сохранить контакты в Supabase';
        console.error('❌ Ошибка сохранения в Supabase');
        
        // 7. ВОССТАНАВЛИВАЕМ ДАННЫЕ ИЗ ОРИГИНАЛА
        this.contacts = { ...this.originalContacts };
        
        // 8. СООБЩАЕМ ОБ ОШИБКЕ БОЛЬШЕ ИНФОРМАЦИИ
        setTimeout(async () => {
          try {
            // Проверяем текущие данные в Supabase
            const supabaseData = await this.supabaseService.getContactInfo();
            console.error('🔍 Текущие данные в Supabase:', {
              hasSocial: !!supabaseData?.social,
              socialCount: supabaseData?.social?.length || 0
            });
          } catch (error) {
            console.error('❌ Ошибка проверки данных Supabase:', error);
          }
        }, 500);
      }
      
    } catch (error: any) {
      console.error('❌ Неожиданная ошибка при сохранении:', error);
      this.saveStatus = 'error';
      this.saveMessage = `Ошибка: ${error.message || 'Неизвестная ошибка'}`;
      
      // Восстанавливаем данные при ошибке
      this.contacts = { ...this.originalContacts };
      
    } finally {
      this.isSaving = false;
      
      // 9. ГАРАНТИРОВАННЫЙ СБРОС СТАТУСА ЧЕРЕЗ 5 СЕКУНД
      setTimeout(() => {
        if (this.saveStatus !== 'idle') {
          console.log('🔄 Автоматический сброс статуса сохранения');
          this.saveStatus = 'idle';
          this.saveMessage = '';
          this.cdr.detectChanges();
        }
      }, 5000);
    }
  }
  
  async restoreSocialNetworks(): Promise<void> {
    // 1. Подтверждение действия
    if (!confirm('Восстановить социальные сети по умолчанию?\n\nБудут добавлены:\n• Instagram\n• Telegram\n• WhatsApp')) {
      console.log('❌ Восстановление отменено пользователем');
      return;
    }
    
    console.log('🔄 Начало восстановления социальных сетей...');
    
    // 2. Устанавливаем статус загрузки
    this.saveStatus = 'loading';
    this.saveMessage = 'Восстановление социальных сетей...';
    
    try {
      // 3. Создаем дефолтные социальные сети
      const defaultSocials = [
              {
            name: 'Instagram',
            url: 'https://www.instagram.com/td_komfort_shelk/',
            icon: 'IN'
          },
          {
            name: 'Telegram',
            url: 'https://t.me/KOMFORTTD',
            icon: 'TG'
          },
          {
            name: 'WhatsApp',
            url: 'https://wa.me/79280001193',
            icon: 'WA'
          } 
      ];
      
      console.log('📱 Дефолтные социальные сети:', defaultSocials);
      
      // 4. Обновляем локальные данные
      this.contacts.social = [...defaultSocials];
      this.hasUnsavedChanges = true;
      
      // 5. НЕМЕДЛЕННО сохраняем в Supabase
      console.log('💾 Сохранение восстановленных социальных сетей в Supabase...');
      
      // Используем saveContacts или updateContacts
      const success = await this.contactService.saveContacts({
        ...this.contacts,
        social: defaultSocials
      });
      
      if (success) {
        console.log('✅ Социальные сети восстановлены и сохранены в Supabase');
        
        // 6. Обновляем статус
        this.saveStatus = 'success';
        this.saveMessage = 'Социальные сети восстановлены и сохранены!';
        
        // 7. Обновляем оригинальные данные
        this.originalContacts = { ...this.contacts };
        this.hasUnsavedChanges = false;
        
        // 8. Проверяем, что данные сохранились
        setTimeout(async () => {
          try {
            const updatedContacts = this.contactService.getContacts();
            console.log('🔍 Проверка сохраненных social:', {
              hasSocial: !!updatedContacts.social,
              socialCount: updatedContacts.social?.length || 0,
              social: updatedContacts.social
            });
            
            if (updatedContacts.social?.length === 0) {
              console.warn('⚠️ Social сети не сохранились в ContactService!');
            }
          } catch (error) {
            console.error('❌ Ошибка проверки сохраненных данных:', error);
          }
        }, 1000);
        
      } else {
        console.error('❌ Ошибка сохранения восстановленных социальных сетей');
        this.saveStatus = 'error';
        this.saveMessage = 'Ошибка: не удалось сохранить социальные сети в Supabase';
        
        // Восстанавливаем предыдущие данные
        this.contacts = { ...this.originalContacts };
      }
      
      // 9. Автоматически скрываем сообщение через 3 секунды
      setTimeout(() => {
        if (this.saveStatus === 'success' || this.saveStatus === 'error') {
          this.saveStatus = 'idle';
          this.saveMessage = '';
          this.cdr.detectChanges();
        }
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Неожиданная ошибка при восстановлении:', error);
      this.saveStatus = 'error';
      this.saveMessage = `Ошибка: ${error.message || 'Неизвестная ошибка'}`;
      
      // Восстанавливаем предыдущие данные
      this.contacts = { ...this.originalContacts };
      
      // Автоматически скрываем ошибку через 5 секунд
      setTimeout(() => {
        this.saveStatus = 'idle';
        this.saveMessage = '';
        this.cdr.detectChanges();
      }, 5000);
    }
  }
  
  // Метод для добавления социальных сетей без немедленного сохранения
  addDefaultSocialNetworks(): void {
    const defaultSocials = [
          {
          name: 'Instagram',
          url: 'https://www.instagram.com/td_komfort_shelk/',
          icon: 'IN'
        },
        {
          name: 'Telegram',
          url: 'https://t.me/KOMFORTTD',
          icon: 'TG'
        },
        {
          name: 'WhatsApp',
          url: 'https://wa.me/79280001193',
          icon: 'WA'
        }
    ];
    
    // Если social уже есть, добавляем только отсутствующие
    if (!this.contacts.social) {
      this.contacts.social = [];
    }
    
    const existingUrls = new Set(this.contacts.social.map(s => s.url?.toLowerCase()));
    const newSocials = defaultSocials.filter(social => 
      !existingUrls.has(social.url.toLowerCase())
    );
    
    if (newSocials.length > 0) {
      this.contacts.social.push(...newSocials);
      this.hasUnsavedChanges = true;
      
      console.log(`➕ Добавлено ${newSocials.length} социальных сетей:`, newSocials);
      this.saveMessage = `Добавлено ${newSocials.length} социальных сетей. Не забудьте сохранить изменения.`;
      this.cdr.detectChanges();
    } else {
      console.log('ℹ️ Все социальные сети уже добавлены');
      this.saveMessage = 'Все социальные сети уже присутствуют в списке';
      this.cdr.detectChanges();
    }
    
    setTimeout(() => {
      this.saveMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }
  
  // Метод для полной перезаписи социальных сетей
  async overwriteSocialNetworks(): Promise<void> {
    if (!confirm('ВНИМАНИЕ: Это полностью заменит все существующие социальные сети на значения по умолчанию. Продолжить?')) {
      return;
    }
    
    console.log('🔄 Полная перезапись социальных сетей...');
    
    this.saveStatus = 'loading';
    this.saveMessage = 'Перезапись социальных сетей...';
    
    try {
      // Получаем текущие контакты
      const currentContacts = this.contactService.getContacts();
      
      // Создаем полностью обновленные контакты с дефолтными social
      const updatedContacts = {
        ...currentContacts,
        social: [
                {
            name: 'Instagram',
            url: 'https://www.instagram.com/td_komfort_shelk/',
            icon: 'IN'
          },
          {
            name: 'Telegram',
            url: 'https://t.me/KOMFORTTD',
            icon: 'TG'
          },
          {
            name: 'WhatsApp',
            url: 'https://wa.me/79280001193',
            icon: 'WA'
          }
        ]
      };
      
      // Сохраняем в Supabase
      const success = await this.contactService.saveContacts(updatedContacts);
      
      if (success) {
        // Обновляем локальные данные
        this.contacts = { ...updatedContacts };
        this.originalContacts = { ...updatedContacts };
        this.hasUnsavedChanges = false;
        
        this.saveStatus = 'success';
        this.saveMessage = 'Социальные сети полностью перезаписаны!';
        
        console.log('✅ Социальные сети перезаписаны:', updatedContacts.social);
      } else {
        this.saveStatus = 'error';
        this.saveMessage = 'Ошибка перезаписи социальных сетей';
      }
      
      setTimeout(() => {
        this.saveStatus = 'idle';
        this.saveMessage = '';
        this.cdr.detectChanges();
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Ошибка перезаписи:', error);
      this.saveStatus = 'error';
      this.saveMessage = `Ошибка: ${error.message}`;
      
      setTimeout(() => {
        this.saveStatus = 'idle';
        this.saveMessage = '';
        this.cdr.detectChanges();
      }, 5000);
    }
  }
  
  // Метод для добавления новой социальной сети
  addSocial(): void {
    if (!this.contacts.social) {
      this.contacts.social = [];
    }
    
    this.contacts.social.push({
      name: '',
      url: '',
      icon: ''
    });
    
    this.hasUnsavedChanges = true;
  }
  
  // Метод для удаления социальной сети
  removeSocial(index: number): void {
    if (this.contacts.social && index >= 0 && index < this.contacts.social.length) {
      this.contacts.social.splice(index, 1);
      this.hasUnsavedChanges = true;
    }
  }

  socialTrackBy(index: number, social: any): string {
  // Используем комбинацию индекса и URL для уникального ключа
  return `${index}-${social.url || 'new'}-${social.name || 'unnamed'}`;
}

// Добавьте этот метод для отмены изменений
cancelChanges(): void {
  if (this.hasUnsavedChanges) {
    const confirmCancel = confirm(
      'У вас есть несохраненные изменения. Вы уверены, что хотите отменить?\n\n' +
      'Все изменения будут потеряны.'
    );
    
    if (!confirmCancel) {
      return;
    }
  }
  
  // Восстанавливаем данные из оригинала
  this.contacts = { ...this.originalContacts };
  this.hasUnsavedChanges = false;
  this.saveStatus = 'idle';
  this.saveMessage = '';
  
  console.log('🔄 Изменения отменены, данные восстановлены');
}

// Добавьте этот метод для полного сброса
resetForm(): void {
  if (!confirm('Сбросить форму к значениям из базы данных?')) {
    return;
  }
  
  // Загружаем свежие данные из сервиса
  const freshContacts = this.contactService.getContacts();
  this.contacts = { ...freshContacts };
  this.originalContacts = { ...freshContacts };
  this.hasUnsavedChanges = false;
  this.saveStatus = 'idle';
  this.saveMessage = '';
  
  console.log('🔄 Форма сброшена к данным из базы');
}

// Добавьте этот метод для отслеживания изменений
onFieldChange(): void {
  // Сравниваем текущие данные с оригинальными
  const hasChanges = 
    this.contacts.phone !== this.originalContacts.phone ||
    this.contacts.email !== this.originalContacts.email ||
    this.contacts.office !== this.originalContacts.office ||
    this.contacts.workingHours !== this.originalContacts.workingHours ||
    this.contacts.mapEmbed !== this.originalContacts.mapEmbed ||
    JSON.stringify(this.contacts.social) !== JSON.stringify(this.originalContacts.social) ||
    JSON.stringify(this.contacts.aboutSections) !== JSON.stringify(this.originalContacts.aboutSections);
  
  this.hasUnsavedChanges = hasChanges;
  
  if (hasChanges) {
    console.log('📝 Обнаружены несохраненные изменения');
  }
}

}