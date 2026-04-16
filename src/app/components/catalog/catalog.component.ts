// catalog.component.ts с низкокачественными placeholder
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { CatalogCategory } from '../../models/catalog.model';
import { Observable, map, tap, take, from, of, Subject } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss']
})
export class CatalogComponent implements OnInit, OnDestroy {
  categories$: Observable<CatalogCategory[]>;
  private destroy$ = new Subject<void>();
  
  // Кэш для низкокачественных placeholder
  private lowQualityCache = new Map<string, string>();
  // Кэш для полноразмерных изображений
  private fullImageCache = new Map<string, HTMLImageElement>();
  
  constructor(
    private catalogService: CatalogService,
    private router: Router
  ) {
    this.categories$ = this.catalogService.categories$.pipe(
      tap(categories => {
        console.log('🎯 Получены категории из сервиса:', categories.length, 'шт.');
      }),
      map(categories => 
        categories
          .filter(cat => cat.isActive)
          .sort((a, b) => a.order - b.order)
          .map(cat => this.processCategoryImage(cat))
      ),
      tap(cleanedCategories => {
        console.log('✨ Очищенные категории для отображения:', cleanedCategories.length, 'шт.');
        // Предзагрузка low-quality placeholder
        this.preloadLowQualityImages(cleanedCategories);
      })
    );
  }

  ngOnInit(): void {
    // Подписываемся на категории для предзагрузки
   this.categories$.pipe(take(1)).subscribe(categories => {
      this.preloadLowQualityImages(categories);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Очищаем кэш
    this.lowQualityCache.clear();
    this.fullImageCache.clear();
  }

  /**
   * Обработка изображения категории с low-quality placeholder
   */
  private processCategoryImage(category: CatalogCategory): CatalogCategory {
  console.log(`📸 Категория "${category.title}" (ID: ${category.id}):`, {
    originalImage: category.image?.substring(0, 50) + '...',
    length: category.image?.length || 0
  });
  
  // Просто используем оригинальное изображение
  const lowQualityUrl = this.getLowQualityPlaceholder(category.image, category.id);
  
  return {
    ...category,
    image: category.image, // напрямую, без очистки
    lowQualityImage: lowQualityUrl
  };
}

  private imageLoadedMap = new Map<number, boolean>();

isImageLoaded(categoryId: number): boolean {
  return this.imageLoadedMap.get(categoryId) || false;
}

  /**
   * Создает низкокачественный placeholder URL
   */
  private getLowQualityPlaceholder(imageUrl: string, categoryId: number): string {
  const cacheKey = `${categoryId}_${imageUrl}`;
  
  if (this.lowQualityCache.has(cacheKey)) {
    return this.lowQualityCache.get(cacheKey)!;
  }
  
  // Убираем все параметры из URL
  const cleanUrl = imageUrl?.split('?')[0] || '';
  let lowQualityUrl = '/assets/placeholder-blur.jpg';
  
  if (cleanUrl.includes('supabase.co')) {
    // Используем только правильные параметры Supabase
    lowQualityUrl = `${cleanUrl}?width=50`; // Только width, без quality и format
  } else if (cleanUrl.startsWith('/assets/') || cleanUrl.startsWith('http')) {
    lowQualityUrl = '/assets/placeholder-blur.jpg';
  }
  
  this.lowQualityCache.set(cacheKey, lowQualityUrl);
  return lowQualityUrl;
}
  /**
   * Создает low-quality версию из Base64
   */
  private createLowQualityBase64(base64: string): string {
    try {
      // Если Base64 слишком большой, используем placeholder
      if (base64.length > 10000) {
        return '/assets/placeholder-blur.jpg';
      }
      
      // Для маленьких Base64 можно вернуть как есть
      return base64;
    } catch (error) {
      console.error('❌ Ошибка создания low-quality из Base64:', error);
      return '/assets/placeholder-blur.jpg';
    }
  }

  private lowQualityPreloaded = new Set<string>();

private preloadLowQualityImages(categories: any[]): void {
  console.log('🔄 Предзагрузка low-quality изображений...');
  
  categories.forEach(category => {
    const cacheKey = `${category.id}_${category.lowQualityImage}`;
    
    if (category.lowQualityImage && !this.lowQualityPreloaded.has(cacheKey)) {
      this.lowQualityPreloaded.add(cacheKey);
      
      const img = new Image();
      img.src = category.lowQualityImage;
      img.onload = () => {
        console.log(`✅ Low-quality загружен: ${category.title}`);
      };
      img.onerror = () => {
        console.warn(`⚠️ Low-quality не загрузился: ${category.title}`);
      };
    }
  });
}

  /**
   * Предзагрузка полноразмерных изображений в фоне
   */
  private preloadFullImages(categories: any[]): void {
    console.log('🔄 Предзагрузка полноразмерных изображений в фоне...');
    
    categories.forEach(category => {
      if (category.image && !this.fullImageCache.has(category.image)) {
        const img = new Image();
        img.src = category.image;
        
        img.onload = () => {
          console.log(`✅ Полноразмерное изображение загружено: ${category.title}`);
          this.fullImageCache.set(category.image, img);
        };
        
        img.onerror = () => {
          console.error(`❌ Ошибка загрузки полноразмерного: ${category.title}`);
        };
        
        // Устанавливаем низкий приоритет для фоновой загрузки
        img.fetchPriority = 'low';
      }
    });
  }

  /**
   * Оптимизированный URL для текущего устройства
   */
  getOptimizedImageUrl(originalUrl: string, categoryId: number): string {
  // Возвращаем URL без каких-либо параметров
  return originalUrl.split('?')[0];
}

  onImageError(event: any, category: any): void {
    console.error(`❌ Ошибка загрузки изображения категории "${category.title}":`, 
      event.target.src);
    
    // Пробуем загрузить дефолтное
    event.target.src = '/assets/default-category.jpg';
    
    // Сохраняем в localStorage для отладки
    const errors = JSON.parse(localStorage.getItem('image_errors') || '[]');
    errors.push({
      categoryId: category.id,
      categoryTitle: category.title,
      originalUrl: event.target.src,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    localStorage.setItem('image_errors', JSON.stringify(errors));
  }

  private cacheImage(url: string): void {
  if ('caches' in window) {
    try {
      caches.open('category-images-v1').then(cache => {
        const request = new Request(url, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
            console.log('💾 Изображение закэшировано:', url);
          }
        });
      });
    } catch (error) {
      // Игнорируем ошибки кэширования
    }
  }
}

  /**
   * Обработчик загрузки изображения (для прогрессивной загрузки)
   */
  onImageLoad(event: any, category: any): void {
  console.log(`✅ Изображение загружено: ${category.title}`);
  
  // Плавное появление полноразмерного изображения
  event.target.classList.add('loaded');
  event.target.style.opacity = '1';
  
  // Скрываем low-quality placeholder
  const container = event.target.parentElement;
  const lowQualityImg = container.querySelector('.category-image-low');
  if (lowQualityImg) {
    lowQualityImg.style.opacity = '0';
    lowQualityImg.style.transition = 'opacity 0.5s ease';
  }
  
  // Обновляем статус загрузки
  this.imageLoadedMap.set(category.id, true);
  
  // Сохраняем в кэш
  this.cacheImage(event.target.src);
}


  navigateToCategory(category: CatalogCategory): void {
    console.log('🔵 CatalogComponent: Клик по категории', {
      title: category.title,
      slug: category.slug,
      id: category.id,
      image: category.image
    });
    this.router.navigate(['/catalog', category.slug]);
  }
}