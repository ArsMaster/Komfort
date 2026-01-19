import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CatalogComponent } from "../catalog/catalog.component";
import { SliderComponent } from "../slider/slider.component";
import { AboutComponent } from "../about/about.component";
import { CommonModule } from '@angular/common';
import { ContactService } from '../../services/contact.service';
import { HomePageService } from '../../services/homepage.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <!-- Главная страница со всеми секциями -->
    <app-slider></app-slider>
    <app-catalog></app-catalog>
    
    <!-- О компании - показываем только после загрузки контактов -->
    @if (!isLoading && hasContacts) {
      <app-about></app-about>
    } @else if (isLoading) {
      <div class="loading-placeholder">
        <div class="spinner"></div>
        <p>Загрузка информации о компании...</p>
      </div>
    } @else {
      <div class="error-placeholder">
        <p>Не удалось загрузить информацию о компании</p>
        <button (click)="retryLoadContacts()" class="retry-btn">
          Попробовать снова
        </button>
      </div>
    }
  `,
  styleUrls: ['./home.component.scss'],
  imports: [CatalogComponent, SliderComponent, AboutComponent, CommonModule]
})
export class HomeComponent implements OnInit, OnDestroy {
  private contactService = inject(ContactService);
  private homePageService = inject(HomePageService);
  private destroy$ = new Subject<void>();
  
  isLoading = true;
  hasContacts = false;
  loadError = false;
  
  ngOnInit(): void {
    console.log('🏠 HomeComponent инициализирован - timestamp:', Date.now());
    
    // Подписываемся на загрузку контактов
    this.contactService.contacts$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contacts) => {
          console.log('🏠 HomeComponent получил контакты:', {
            timestamp: Date.now(),
            hasData: contacts?.id > 0,
            id: contacts?.id,
            office: contacts?.office
          });
          
          this.hasContacts = contacts?.id > 0;
          this.isLoading = this.contactService.isLoading();
          this.loadError = false;
          
          if (this.hasContacts) {
            console.log('✅ Контакты загружены успешно');
          } else if (!this.isLoading) {
            console.log('⚠️ Контакты не загружены, но загрузка завершена');
            this.loadError = true;
          }
        },
        error: (error) => {
          console.error('🏠 Ошибка в потоке контактов:', error);
          this.loadError = true;
          this.isLoading = false;
        }
      });
    
    // Подписываемся на состояние загрузки
    this.contactService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
        console.log('🏠 Состояние загрузки:', loading ? 'загружается' : 'завершено');
      });
    
    // Проверяем текущее состояние контактов
    this.checkCurrentContacts();
    
    // Запускаем таймаут для проверки
    this.startLoadTimeout();
  }
  
  private checkCurrentContacts(): void {
    const contacts = this.contactService.getContacts();
    const status = this.contactService.getStatus();
    
    console.log('🏠 Проверка начального состояния:', {
      contactsId: contacts.id,
      status: status,
      isLoading: this.contactService.isLoading()
    });
    
    if (contacts.id === 0 && !this.contactService.isLoading()) {
      console.log('🔄 HomeComponent: запуск загрузки контактов');
      this.contactService.refreshContacts();
    } else if (contacts.id > 0) {
      console.log('✅ Контакты уже загружены');
      this.hasContacts = true;
      this.isLoading = false;
    }
  }
  
  private startLoadTimeout(): void {
    // Через 2 секунды проверяем, загрузились ли контакты
    setTimeout(() => {
      if (this.isLoading) {
        console.log('⏰ Таймаут загрузки: все еще загружается');
        
        const contacts = this.contactService.getContacts();
        if (contacts.id === 0) {
          console.log('🔄 Запускаем повторную попытку загрузки');
          this.contactService.refreshContacts();
        }
      }
    }, 2000);
    
    // Через 5 секунд показываем ошибку, если все еще загружается
    setTimeout(() => {
      if (this.isLoading || !this.hasContacts) {
        console.log('⚠️ Долгая загрузка контактов, показываем ошибку');
        this.loadError = true;
        this.isLoading = false;
      }
    }, 5000);
  }
  
  retryLoadContacts(): void {
    console.log('🔄 Повторная попытка загрузки контактов');
    this.loadError = false;
    this.isLoading = true;
    this.hasContacts = false;
    
    this.contactService.refreshContacts();
    
    // Сбрасываем таймаут
    setTimeout(() => {
      if (this.isLoading) {
        this.loadError = true;
        this.isLoading = false;
      }
    }, 3000);
  }
  
  ngOnDestroy(): void {
    console.log('🏠 HomeComponent уничтожен');
    this.destroy$.next();
    this.destroy$.complete();
  }
}