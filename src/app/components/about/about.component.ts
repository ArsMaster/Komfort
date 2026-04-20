// about.component.ts
import { Component, AfterViewInit, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactsComponent } from '../contacts/contacts.component';
import { HomePageService } from '../../services/homepage.service';
import { ContactService } from '../../services/contact.service';
import { Subject, interval, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';

declare const ymaps: any;

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, FormsModule, ContactsComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private homeService = inject(HomePageService);
  private contactService = inject(ContactService);
  private destroy$ = new Subject<void>();
  
  // Данные для секции "О компании" - получаем из HomePageService
  aboutSections: { title: string; content: string }[] = [];
  
  // Данные для секции "Схема проезда"
  companyInfo: any = null;
  location = {
    address: '',
    workHours: '',
    mapUrl: '',
    coordinates: [43.513901, 46.356290]
  };

  isMapLoaded = false;
  isLoading = true;
  hasError = false;

  ngOnInit(): void {
    console.log('🔍 AboutComponent инициализирован');
    
    // Подписываемся на данные из HomePageService (где они успешно загружаются)
    this.homeService.companyInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (companyInfo) => {
          console.log('🏢 AboutComponent получил данные из HomePageService:', {
            hasData: !!companyInfo,
            hasAboutSections: !!companyInfo?.aboutSections,
            aboutSectionsCount: companyInfo?.aboutSections?.length || 0,
            hasAddress: !!companyInfo?.address
          });
          
          this.companyInfo = companyInfo;
          this.isLoading = false;
          this.hasError = false;
          
          // Обновляем aboutSections
          if (companyInfo?.aboutSections && companyInfo.aboutSections.length > 0) {
            console.log('✅ Загружаем aboutSections из HomePageService:', companyInfo.aboutSections.length);
            this.aboutSections = [...companyInfo.aboutSections];
          } else {
            console.log('⚠️ About sections не найдены, используем дефолтные');
            this.aboutSections = this.getDefaultSections();
          }
          
          // Обновляем location
          this.updateLocationFromCompanyInfo(companyInfo);
          
          // Принудительное обновление view
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Ошибка загрузки данных из HomePageService:', error);
          this.isLoading = false;
          this.hasError = true;
          this.aboutSections = this.getDefaultSections();
        }
      });
    
    // Также подписываемся на ContactService для адреса (если нужно)
    this.contactService.contacts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(contacts => {
        // Используем контакты только если нет данных из HomePageService
        if (!this.companyInfo?.address && contacts?.office) {
          console.log('📍 Используем адрес из ContactService');
          this.updateLocationFromContacts(contacts);
        }
      });
    
    // Загружаем начальные данные
    this.loadInitialData();
  }
  
  private loadInitialData(): void {
    // Пробуем получить данные сразу (они могут быть уже загружены)
    const companyInfo = this.homeService.getCompanyInfo();
    console.log('📦 Начальные данные из HomePageService:', {
      address: companyInfo.address,
      aboutSectionsCount: companyInfo.aboutSections?.length || 0
    });
    
    if (companyInfo && (companyInfo.address || companyInfo.aboutSections?.length > 0)) {
      this.companyInfo = companyInfo;
      this.isLoading = false;
      
      if (companyInfo.aboutSections && companyInfo.aboutSections.length > 0) {
        this.aboutSections = [...companyInfo.aboutSections];
      } else {
        this.aboutSections = this.getDefaultSections();
      }
      
      this.updateLocationFromCompanyInfo(companyInfo);
    } else {
      console.log('⏳ Данные еще не загружены, ждем...');
      this.aboutSections = this.getDefaultSections();
    }
    
    // Через 3 секунды проверяем, загрузились ли данные
    setTimeout(() => {
      if (this.isLoading) {
        console.log('⚠️ Таймаут загрузки данных');
        this.isLoading = false;
        this.hasError = true;
        this.aboutSections = this.getDefaultSections();
      }
    }, 3000);
  }
  
  private updateLocationFromCompanyInfo(companyInfo: any): void {
    if (!companyInfo) return;
    
    const address = companyInfo.address || '';
    const workHours = companyInfo.workHours || '';
    
    if (address !== this.location.address || workHours !== this.location.workHours) {
      console.log('📍 Обновляем location из CompanyInfo:', { address, workHours });
      
      this.location.address = address;
      this.location.workHours = workHours;
      
      if (address) {
        this.location.mapUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
      }
      
      // Если карта уже загружена, обновляем ее
      if (this.isMapLoaded && address) {
        console.log('🔄 Перезагружаем карту с новым адресом');
        this.initYandexMap();
      }
    }
  }
  
  private updateLocationFromContacts(contacts: any): void {
    if (!contacts) return;
    
    const address = contacts.office || '';
    const workHours = contacts.workingHours || '';
    
    if (address && address !== this.location.address) {
      console.log('📍 Обновляем location из ContactService:', { address, workHours });
      
      this.location.address = address;
      this.location.workHours = workHours;
      this.location.mapUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
      
      if (this.isMapLoaded) {
        this.initYandexMap();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getDefaultSections(): { title: string; content: string }[] {
    return [
      {
        title: 'Опыт',
        content: 'Продукция Komfort уже более 13 лет пользуется успехом у покупателей и реализуется во многих регионах России, а также экспортируется в страны СНГ и Европу. Широкий ассортимент и большая складская программа позволяют нашим клиентам быстро и выгодно делать с нами бизнес.'
      },
      {
        title: 'Современный модельный ряд',
        content: 'Komfort следит за тенденциями на рынке товаров для дома и свежими идеями в дизайне интерьеров. Наш коллектив является постоянным участником международных выставок и форумов, где набирается опыта и делится своим. Продукция представлена более чем в 50 салонах по всей страны.'
      },
      {
        title: 'Производство',
        content: 'Производственный комплекс занимает 15 000 кв. м и включает в себя 7 цехов полного цикла производства мебели и домашнего текстиля на оборудовании ведущих мировых производителей. Особое внимание мы уделяем подбору сотрудников, чтобы наш коллектив прирастал только профессиональными и ответственными людьми.'
      }
    ];
  }

  ngAfterViewInit(): void {
    // Загружаем карту только если есть адрес
    if (this.location.address) {
      this.loadYandexMaps();
    } else {
      // Ждем немного, возможно адрес еще загружается
      setTimeout(() => {
        if (this.location.address) {
          this.loadYandexMaps();
        } else {
          console.log('📍 Адрес для карты не загружен');
        }
      }, 1000);
    }
  }

  loadYandexMaps(): void {
    if (!this.location.address) {
      console.log('📍 Нет адреса для загрузки карты');
      return;
    }
    
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
    if (!this.location.address) {
      console.log('📍 Нет адреса для инициализации карты');
      this.showStaticMapFallback();
      return;
    }
    
    ymaps.ready(() => {
      try {
        const mapElement = document.getElementById('yandex-map');
        
        if (!mapElement) {
          console.error('Элемент карты не найден');
          return;
        }

        mapElement.innerHTML = '';
        
        ymaps.geocode(this.location.address, {
          results: 1
        }).then((res: any) => {
          const firstGeoObject = res.geoObjects.get(0);
          let coordinates: number[];
          
          if (firstGeoObject) {
            coordinates = firstGeoObject.geometry.getCoordinates();
            this.location.coordinates = coordinates;
          } else {
            coordinates = this.location.coordinates;
          }
          
          this.createMap(coordinates);
        }).catch(() => {
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
    console.log('🗺️ Карта Яндекс успешно создана');
  }

  showStaticMapFallback(): void {
    const mapElement = document.getElementById('yandex-map');
    if (mapElement) {
      mapElement.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <p>Карта временно недоступна</p>
          <p><strong>Адрес:</strong> ${this.location.address || 'Не указан'}</p>
          <p><strong>График работы:</strong> ${this.location.workHours || 'Не указан'}</p>
          ${this.location.mapUrl ? `
            <a href="${this.location.mapUrl}" target="_blank" style="color: #007bff;">
              Открыть в Яндекс.Картах
            </a>
          ` : ''}
        </div>
      `;
    }
  }

  printMap(): void {
    window.print();
  }

  openMap(): void {
  // Самый простой способ - поиск по ПОЛНОМУ адресу
  const fullAddress = 'Чеченская Республика, г. Шелковская, ул. Косая, 47';
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://yandex.ru/maps/?text=${encodedAddress}&z=17`;
  
  console.log('🗺️ Открываем карту по адресу:', fullAddress);
  window.open(mapsUrl, '_blank');
}
  
  retryLoad(): void {
    console.log('🔄 Повторная попытка загрузки данных');
    this.isLoading = true;
    this.hasError = false;
    
    // Запускаем обновление данных
    this.homeService.forceLoadFromSupabase();
    
    // Сбрасываем таймаут
    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.hasError = true;
      }
    }, 3000);
  }
}