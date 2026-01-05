// about.component.ts
import { Component, AfterViewInit, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactsComponent } from '../contacts/contacts.component';
import { HomePageService } from '../../services/homepage.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare const ymaps: any;

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, FormsModule, ContactsComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, AfterViewInit, OnDestroy {
  private homeService = inject(HomePageService);
  private destroy$ = new Subject<void>();
  
  // Данные для секции "О компании" - получаем из сервиса
  aboutSections: { title: string; content: string }[] = [];

  // Данные для секции "Схема проезда"
  location = {
    address: '',
    workHours: '',
    mapUrl: '',
    coordinates: [43.513901, 46.356290] // координаты по умолчанию
  };

  isMapLoaded = false;

  ngOnInit(): void {
    this.loadCompanyInfo();
    
    // Автоматическое обновление данных каждые 30 секунд
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCompanyInfo();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCompanyInfo(): void {
    const companyInfo = this.homeService.getCompanyInfo();
    
    // Загружаем секции "О компании" из сервиса
    if (companyInfo.aboutSections && companyInfo.aboutSections.length > 0) {
      this.aboutSections = [...companyInfo.aboutSections];
    } else {
      // Значения по умолчанию, если в сервисе нет данных
      this.aboutSections = this.getDefaultSections();
    }
    
    // Загружаем контактную информацию
    this.updateLocationInfo(companyInfo);
  }

  private getDefaultSections(): { title: string; content: string }[] {
    return [
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
    ];
  }

  private updateLocationInfo(companyInfo: any): void {
    // Используем адрес из сервиса или значение по умолчанию
    const address = companyInfo.address || 'Чеченская Республика, г. Шелковская, ул. Косая, 47';
    const workHours = companyInfo.workHours || 'ПН - ВС с 8:00 до 20:00';
    
    // Обновляем location только если данные изменились
    if (this.location.address !== address || this.location.workHours !== workHours) {
      this.location.address = address;
      this.location.workHours = workHours;
      
      // Генерируем URL для Яндекс.Карт на основе адреса
      this.location.mapUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
      
      // Перезагружаем карту если она уже была загружена
      if (this.isMapLoaded) {
        this.initYandexMap();
      }
    }
  }

  ngAfterViewInit(): void {
    this.loadYandexMaps();
  }

  loadYandexMaps(): void {
    if (typeof ymaps !== 'undefined') {
      this.initYandexMap();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=699ae714-9987-4640-90db-d20caf965609&lang=ru_RU';
    script.async = true;
    
    script.onload = () => {
      this.initYandexMap();
    };
    
    script.onerror = () => {
      console.error('Не удалось загрузить Яндекс.Карты');
      this.showStaticMapFallback();
    };
    
    document.head.appendChild(script);
  }

  initYandexMap(): void {
    ymaps.ready(() => {
      try {
        const mapElement = document.getElementById('yandex-map');
        
        if (!mapElement) {
          console.error('Элемент карты не найден');
          return;
        }

        // Очищаем карту перед созданием новой
        mapElement.innerHTML = '';
        
        // Используем геокодирование для получения координат по адресу
        ymaps.geocode(this.location.address, {
          results: 1
        }).then((res: any) => {
          const firstGeoObject = res.geoObjects.get(0);
          let coordinates: number[];
          
          if (firstGeoObject) {
            coordinates = firstGeoObject.geometry.getCoordinates();
            this.location.coordinates = coordinates;
          } else {
            // Если адрес не найден, используем координаты по умолчанию
            coordinates = this.location.coordinates;
          }
          
          this.createMap(coordinates);
        }).catch(() => {
          // В случае ошибки используем координаты по умолчанию
          this.createMap(this.location.coordinates);
        });
        
      } catch (error) {
        console.error('Ошибка при создании карты:', error);
        this.showStaticMapFallback();
      }
    });
  }

  private createMap(coordinates: number[]): void {
    const mapElement = document.getElementById('yandex-map');
    if (!mapElement) return;

    const map = new ymaps.Map('yandex-map', {
      center: coordinates,
      zoom: 15,
      controls: ['zoomControl', 'fullscreenControl']
    });

    const placemark = new ymaps.Placemark(coordinates, {
      balloonContent: `
        <strong>Компания Komfort</strong><br/>
        ${this.location.address}<br/>
        ${this.location.workHours}
      `,
      hintContent: 'Компания Komfort'
    }, {
      preset: 'islands#redIcon',
      iconColor: '#ff6b6b'
    });

    map.geoObjects.add(placemark);
    this.isMapLoaded = true;
  }

  showStaticMapFallback(): void {
    const mapElement = document.getElementById('yandex-map');
    if (mapElement) {
      mapElement.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <p>Карта временно недоступна</p>
          <p><strong>Адрес:</strong> ${this.location.address}</p>
          <p><strong>График работы:</strong> ${this.location.workHours}</p>
          <a href="${this.location.mapUrl}" target="_blank" style="color: #007bff;">
            Открыть в Яндекс.Картах
          </a>
        </div>
      `;
    }
  }

  printMap(): void {
    window.print();
  }

  openMap(): void {
    window.open(this.location.mapUrl, '_blank');
  }
}