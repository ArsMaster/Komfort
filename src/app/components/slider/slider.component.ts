// slider.component.ts
import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { HomePageService } from '../../services/homepage.service';

interface Slide {
  image: string;
  title?: string;
  description?: string;
}

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class SliderComponent implements OnInit, OnDestroy {
  private homeService = inject(HomePageService);
  private cdRef = inject(ChangeDetectorRef); // ✅ ДОБАВЛЕНО
  
  slides = signal<Slide[]>([]);
  currentSlide = signal(0);
  
  private autoPlayInterval: any;
  private readonly AUTO_PLAY_DELAY = 5000;

  ngOnInit(): void {
    this.loadSlides();
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  loadSlides(): void {
    const slidesFromService = this.homeService.getSlides();
    const slidesToSet = slidesFromService.length > 0 ? slidesFromService : this.getDefaultSlides();
    
    // ✅ Используем setTimeout для асинхронного обновления
    setTimeout(() => {
      this.slides.set(slidesToSet);
      // ✅ Форсируем обнаружение изменений
      this.cdRef.detectChanges();
    }, 0);
  }

  private getDefaultSlides(): Slide[] {
    return [
      {
        image: 'assets/slide1.jpeg',
        title: 'Все для вашего дома',
        description: 'Описание первого слайда'
      },
      {
        image: 'assets/slide2.jpg',
        title: 'Все для вашего дома',
        description: 'Описание второго слайда'
      },
      {
        image: 'assets/slide3.jpeg',
        title: 'Все для вашего дома',
        description: 'Описание третьего слайда'
      },
      {
        image: 'assets/slide4.jpg',
        title: 'Все для вашего дома',
        description: 'Описание четвертого слайда'
      }
    ];
  }

  nextSlide(): void {
    if (this.slides().length === 0) return;
    
    const nextIndex = (this.currentSlide() + 1) % this.slides().length;
    
    // ✅ Используем setTimeout для избежания ошибки ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.currentSlide.set(nextIndex);
      // ✅ Форсируем обнаружение изменений
      this.cdRef.detectChanges();
    }, 0);
    
    this.restartAutoPlay();
  }

  prevSlide(): void {
    if (this.slides().length === 0) return;
    
    const prevIndex = this.currentSlide() === 0 
      ? this.slides().length - 1 
      : this.currentSlide() - 1;
    
    // ✅ Используем setTimeout
    setTimeout(() => {
      this.currentSlide.set(prevIndex);
      // ✅ Форсируем обнаружение изменений
      this.cdRef.detectChanges();
    }, 0);
    
    this.restartAutoPlay();
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.slides().length) {
      // ✅ Используем setTimeout
      setTimeout(() => {
        this.currentSlide.set(index);
        // ✅ Форсируем обнаружение изменений
        this.cdRef.detectChanges();
      }, 0);
      
      this.restartAutoPlay();
    }
  }

  private startAutoPlay(): void {
    if (this.slides().length <= 1) return;
    
    this.stopAutoPlay();
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, this.AUTO_PLAY_DELAY);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  private restartAutoPlay(): void {
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  // ✅ ДОБАВЛЕН МЕТОД для безопасного получения изображения
  getSafeImageUrl(url: string): string {
    if (!url) return 'assets/default-slide.jpg';
    
    // Если URL уже правильный
    if (url.startsWith('assets/') || url.startsWith('/assets/')) {
      return url.startsWith('/') ? url : '/' + url;
    }
    
    // Если это Base64 изображение
    if (url.startsWith('data:image')) {
      return url;
    }
    
    // Если это просто имя файла
    if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png')) {
      return `/assets/${url.split('/').pop()}`;
    }
    
    return 'assets/default-slide.jpg';
  }
}