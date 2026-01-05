import { Injectable } from '@angular/core';
import { HomePageSettings, Slide, CompanyInfo } from '../models/homepage-settings.model';

@Injectable({
  providedIn: 'root'
})
export class HomePageService {
  private readonly SETTINGS_KEY = 'homepage_settings';
  private readonly SLIDES_KEY = 'homepage_slides';
  private readonly COMPANY_KEY = 'company_info';

  // Получение данных
  getSettings(): HomePageSettings {
    const saved = localStorage.getItem(this.SETTINGS_KEY);
    
    if (saved) {
      try {
        return JSON.parse(saved) as HomePageSettings;
      } catch (error) {
        console.error('Ошибка при парсинге настроек:', error);
        return this.getDefaultSettings();
      }
    }
    
    return this.getDefaultSettings();
  }

  getSlides(): Slide[] {
    const saved = localStorage.getItem(this.SLIDES_KEY);
    
    if (saved) {
      try {
        const slides = JSON.parse(saved) as Slide[];
        // Гарантируем, что возвращаем массив
        return Array.isArray(slides) ? slides : this.getDefaultSlides();
      } catch (error) {
        console.error('Ошибка при парсинге слайдов:', error);
        return this.getDefaultSlides();
      }
    }
    
    return this.getDefaultSlides();
  }

  getCompanyInfo(): CompanyInfo {
    const saved = localStorage.getItem(this.COMPANY_KEY);
    
    if (saved) {
      try {
        return JSON.parse(saved) as CompanyInfo;
      } catch (error) {
        console.error('Ошибка при парсинге информации о компании:', error);
        return this.getDefaultCompanyInfo();
      }
    }
    
    return this.getDefaultCompanyInfo();
  }

  // Обновление данных
  updateSettings(settings: HomePageSettings): void {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  updateSlides(slides: Slide[]): void {
    localStorage.setItem(this.SLIDES_KEY, JSON.stringify(slides));
  }

  updateCompanyInfo(companyInfo: CompanyInfo): void {
    localStorage.setItem(this.COMPANY_KEY, JSON.stringify(companyInfo));
  }

  // Методы для получения значений по умолчанию
  private getDefaultSettings(): HomePageSettings {
    return {
      title: 'Komfort - Мебель и товары для дома',
      description: 'Лучшие товары для вашего дома по доступным ценам',
      bannerImages: [],
      featuredCategories: []
    };
  }

  private getDefaultSlides(): Slide[] {
    return [
      {
        image: '/slide1.jpeg',
        title: 'Все для вашего дома',
        description: 'Широкий ассортимент мебели и товаров для дома'
      },
      {
        image: '/slide2.jpg',
        title: 'Качество и надежность',
        description: 'Только проверенные производители и материалы'
      },
      {
        image: '/slide3.jpeg',
        title: 'Доступные цены',
        description: 'Лучшее соотношение цены и качества на рынке'
      },
      {
        image: '/slide4.jpg',
        title: 'Быстрая доставка',
        description: 'Доставка по всей России в кратчайшие сроки'
      }
    ];
  }

  private getDefaultCompanyInfo(): CompanyInfo {
    return {
      address: 'Чеченская Республика, г. Шелковская, ул. Косая, 47',
      phone: '+7 (800) 123-45-67',
      email: 'info@komfort.ru',
      workHours: 'ПН - ВС с 8:00 до 20:00',
      aboutSections: [
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
      ]
    };
  }
}