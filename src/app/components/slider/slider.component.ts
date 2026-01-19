import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { HomePageService } from '../../services/homepage.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class SliderComponent implements OnInit, OnDestroy {
  private homeService = inject(HomePageService);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  
  slides = signal<any[]>([]);
  currentSlide = signal(0);
  
  private autoPlayInterval: any;
  private readonly AUTO_PLAY_DELAY = 5000;

  ngOnInit(): void {
    console.log('🔄 SliderComponent инициализирован');
    
    // ПЕРВОЕ: Загружаем текущие слайды сразу
    this.loadCurrentSlides();
    
    // ВТОРОЕ: Подписываемся на будущие обновления
    this.subscribeToSlidesUpdates();
    
    // ТРЕТЬЕ: Запускаем автоплей
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Метод для загрузки текущих слайдов
  private loadCurrentSlides(): void {
  try {
    const slides = this.homeService.getSlides();
    console.log('📥 Загрузка слайдов из сервиса:', {
      count: slides?.length || 0,
      source: slides?.length === 0 ? 'empty' : 
              slides?.length === 4 ? 'DEFAULT (static)' : 'SUPABASE',
      slides: slides
    });
    
    if (slides && slides.length > 0) {
      // Если это дефолтные 4 слайда - возможно, еще не загрузились из Supabase
      if (slides.length === 4 && 
          slides[0]?.image?.includes('slide1') && 
          slides[3]?.image?.includes('slide4')) {
        console.log('⏳ Показываем дефолтные слайды до загрузки из Supabase');
        
        // Можно показать только первый или все, но с пометкой
        const fixedSlides = this.fixSlidePaths(slides.slice(0, 1)); // Показываем только первый
        this.slides.set(fixedSlides);
      } else {
        // Это данные из Supabase
        const fixedSlides = this.fixSlidePaths(slides);
        this.slides.set(fixedSlides);
      }
      
      // Всегда сбрасываем на первый слайд
      this.currentSlide.set(0);
      
      console.log('✅ Слайды загружены и установлены:', this.slides().length);
    } else {
      console.log('⚠️ Нет доступных слайдов');
      this.slides.set([]);
    }
    
    this.cdRef.detectChanges();
  } catch (error) {
    console.error('❌ Ошибка загрузки слайдов:', error);
    this.slides.set([]);
  }
}

  // Подписка на обновления слайдов
  private subscribeToSlidesUpdates(): void {
    this.homeService.slides$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (slides) => {
          console.log('🔄 Получены обновленные слайды:', {
            count: slides?.length || 0,
            timestamp: Date.now()
          });
          
          if (slides && slides.length > 0) {
            // Фиксим пути изображений
            const fixedSlides = this.fixSlidePaths(slides);
            this.slides.set(fixedSlides);
            
            // Сбрасываем текущий слайд если нужно
            if (this.currentSlide() >= fixedSlides.length) {
              this.currentSlide.set(0);
            }
            
            console.log('✅ Слайды обновлены:', fixedSlides.length);
          } else {
            console.log('🔄 Слайды очищены');
            this.slides.set([]);
            this.currentSlide.set(0);
          }
          
          this.cdRef.detectChanges();
        },
        error: (error) => {
          console.error('❌ Ошибка в потоке слайдов:', error);
        }
      });
  }

  // Метод для исправления путей изображений
  private fixSlidePaths(slides: any[]): any[] {
    if (!slides || !Array.isArray(slides)) {
      return [];
    }
    
    return slides.map(slide => {
      if (!slide) return slide;
      
      // Копируем слайд чтобы не мутировать оригинал
      const fixedSlide = { ...slide };
      
      // Определяем URL изображения
      let imageUrl = slide.image || slide.imageUrl || '';
      
      // Исправляем путь если нужно
      if (imageUrl) {
        // Если это Supabase URL - оставляем как есть
        if (imageUrl.includes('supabase.co') || imageUrl.includes('storage/v1/object/public')) {
          fixedSlide.imageUrl = imageUrl;
          fixedSlide.image = imageUrl;
        }
        // Если путь начинается с /assets/ - оставляем как есть
        else if (imageUrl.startsWith('/assets/')) {
          fixedSlide.imageUrl = imageUrl;
          fixedSlide.image = imageUrl;
        }
        // Если путь начинается с assets/ (без /) - добавляем /
        else if (imageUrl.startsWith('assets/')) {
          const fixedUrl = '/' + imageUrl;
          fixedSlide.imageUrl = fixedUrl;
          fixedSlide.image = fixedUrl;
        }
        // Если это просто имя файла - добавляем путь
        else if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && !imageUrl.includes('/')) {
          const fixedUrl = '/assets/' + imageUrl;
          fixedSlide.imageUrl = fixedUrl;
          fixedSlide.image = fixedUrl;
        }
        // Во всех остальных случаях оставляем как есть
        else {
          fixedSlide.imageUrl = imageUrl;
          fixedSlide.image = imageUrl;
        }
      }
      
      return fixedSlide;
    });
  }

  nextSlide(): void {
    if (this.slides().length <= 1) return;
    
    const nextIndex = (this.currentSlide() + 1) % this.slides().length;
    this.currentSlide.set(nextIndex);
    this.restartAutoPlay();
    this.cdRef.detectChanges();
  }

  prevSlide(): void {
    if (this.slides().length <= 1) return;
    
    const prevIndex = this.currentSlide() === 0 
      ? this.slides().length - 1 
      : this.currentSlide() - 1;
    
    this.currentSlide.set(prevIndex);
    this.restartAutoPlay();
    this.cdRef.detectChanges();
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.slides().length) {
      this.currentSlide.set(index);
      this.restartAutoPlay();
      this.cdRef.detectChanges();
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
    if (this.slides().length > 1) {
      this.startAutoPlay();
    }
  }

  // Метод для шаблона
  getImageUrl(slide: any): string {
    if (!slide) return '/assets/default-slide.jpg';
    
    return slide.imageUrl || slide.image || '/assets/default-slide.jpg';
  }

  // В SliderComponent добавьте:
onImageError(event: Event): void {
  const img = event.target as HTMLImageElement;
  console.warn('⚠️ Ошибка загрузки изображения:', img.src);
  
  // Заменяем на дефолтное изображение
  img.src = '/assets/default-slide.jpg';
  img.onerror = null; // Предотвращаем бесконечный цикл
}
}