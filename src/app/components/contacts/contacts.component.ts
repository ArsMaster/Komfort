import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ContactService } from '../../services/contact.service';
import { ContactInfo } from '../../models/contact.model';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss']
})
export class ContactsComponent implements OnInit {
  contacts: ContactInfo = {
    id: 0,
    phone: '',
    email: '',
    office: '',
    social: []
  };

  contactForm = {
    name: '',
    phone: '',
    agree: false
  };

  isSubmitted = false;
  errorMessage = '';
  isLoading = false;
  lastSubmitTime = 0;
  MIN_SUBMIT_INTERVAL = 30000;

  // Добавьте HttpClient в конструктор
  constructor(
    private contactService: ContactService,
    private http: HttpClient // <-- Добавьте
  ) {}

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    const contactsData = this.contactService.getContacts()();
    if (contactsData) {
      this.contacts = { ...contactsData };
    }
  }

  // Добавьте метод валидации телефона
  isValidPhone(phone: string): boolean {
    if (!phone.trim()) return false;
    
    // Удаляем все нецифровые символы
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Проверяем длину (для России обычно 10-11 цифр)
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  // Добавьте метод валидации имени
  isValidName(name: string): boolean {
    return name.trim().length >= 2 && name.trim().length <= 50;
  }

  // Обновите метод onSubmit
  onSubmit(): void {
    // Сброс сообщения об ошибке
    this.errorMessage = '';
    
    // Валидация имени
    if (!this.contactForm.name.trim()) {
      this.errorMessage = 'Введите ваше имя';
      return;
    }
    
    if (!this.isValidName(this.contactForm.name)) {
      this.errorMessage = 'Имя должно содержать от 2 до 50 символов';
      return;
    }
    
    // Валидация телефона
    if (!this.contactForm.phone.trim()) {
      this.errorMessage = 'Введите номер телефона';
      return;
    }
    
    if (!this.isValidPhone(this.contactForm.phone)) {
      this.errorMessage = 'Введите корректный номер телефона';
      return;
    }
    
    // Проверка согласия
    if (!this.contactForm.agree) {
      this.errorMessage = 'Пожалуйста, согласитесь с политикой конфиденциальности';
      return;
    }
    
    // Защита от спама
    const now = Date.now();
    if (now - this.lastSubmitTime < this.MIN_SUBMIT_INTERVAL) {
      const secondsLeft = Math.ceil((this.MIN_SUBMIT_INTERVAL - (now - this.lastSubmitTime)) / 1000);
      this.errorMessage = `Пожалуйста, подождите ${secondsLeft} секунд перед следующей отправкой`;
      return;
    }
    
    // Начинаем отправку
    this.isLoading = true;
    this.lastSubmitTime = now;
    
    // 1. Логирование в консоль (для отладки)
    console.log('Форма отправлена:', this.contactForm);
    
    // 2. Сохраняем локально (ваш текущий код)
    this.saveApplicationToLocalStorage();
    
    // 3. Отправляем на сервер (если есть бэкенд)
    this.submitToServer();
    
    // 4. Показываем сообщение об успехе
    this.isSubmitted = true;
    this.isLoading = false;
    
    // 5. Сбрасываем форму через 5 секунд
    setTimeout(() => {
      this.resetForm();
    }, 5000);
  }

  // Метод для отправки на сервер
  private submitToServer(): void {
    // Если у вас есть бэкенд API
    const apiUrl = 'https://ваш-домен.ru/api/contact-form'; // Замените на ваш URL
    
    this.http.post(apiUrl, {
      name: this.contactForm.name,
      phone: this.contactForm.phone,
      agree: this.contactForm.agree,
      timestamp: new Date().toISOString()
    }).subscribe({
      next: (response) => {
        console.log('Заявка отправлена на сервер:', response);
      },
      error: (error) => {
        console.error('Ошибка отправки на сервер:', error);
        // Можно сохранить в отдельное хранилище для повторной отправки
        this.saveFailedSubmission();
      }
    });
  }

  // Сохраняем неудачные отправки для повторной попытки
  private saveFailedSubmission(): void {
    const failedSubmissions = JSON.parse(localStorage.getItem('failedContactSubmissions') || '[]');
    failedSubmissions.push({
      ...this.contactForm,
      date: new Date().toISOString()
    });
    localStorage.setItem('failedContactSubmissions', JSON.stringify(failedSubmissions));
  }

  private saveApplicationToLocalStorage(): void {
    const applications = JSON.parse(localStorage.getItem('contactApplications') || '[]');
    applications.push({
      ...this.contactForm,
      date: new Date().toISOString()
    });
    localStorage.setItem('contactApplications', JSON.stringify(applications));
  }

  // Методы для клика по контактам остаются без изменений
  callPhone(): void {
    if (this.contacts.phone) {
      const cleanPhone = this.contacts.phone.replace(/\D/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  }

  sendEmail(): void {
    if (this.contacts.email) {
      window.location.href = `mailto:${this.contacts.email}`;
    }
  }

  resetForm(): void {
    this.contactForm = {
      name: '',
      phone: '',
      agree: false
    };
    this.isSubmitted = false;
    this.errorMessage = '';
  }

  get activeSocials() {
    return this.contacts.social.filter(social => 
      social.url && social.url !== '#' && social.url.trim() !== ''
    );
  }
}