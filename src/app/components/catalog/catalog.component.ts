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
    
    const cleanedImage = this.cleanCategoryImage(category.image, category.id);
    const lowQualityUrl = this.getLowQualityPlaceholder(cleanedImage, category.id);
    
    return {
      ...category,
      image: cleanedImage,
      lowQualityImage: lowQualityUrl // Добавляем поле для placeholder
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
  
  let lowQualityUrl = '/assets/placeholder-blur.jpg';
  
  // Для всех типов URL, включая локальные, используем общую логику
  if (imageUrl.includes('supabase.co')) {
    // Для Supabase - оптимизированный placeholder с сильным размытием
    lowQualityUrl = `${imageUrl}?width=50&quality=20&blur=20&format=webp`;
  } else if (imageUrl.startsWith('/assets/') || imageUrl.startsWith('http')) {
    // Для локальных и других URL - использовать сервис для создания placeholder
    // Или просто общий placeholder
    lowQualityUrl = '/assets/placeholder-blur.jpg';
  } else if (imageUrl.startsWith('data:image')) {
    // Для Base64 - создаем миниатюру
    lowQualityUrl = this.createLowQualityBase64(imageUrl);
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

  private cleanCategoryImage(image: string, categoryId: number): string {
    console.log(`🔄 Очистка изображения категории ${categoryId}:`, 
      image ? `"${image}" (${image.length} chars)` : 'null');
    
    // Если изображение испорчено (короткая строка)
    if (!image || image.length < 10) {
      console.log(`   ⚠️ Испорченное/короткое изображение (${image?.length || 0} chars)`);
      
      // Маппинг для испорченных изображений
      const fallbackImages: { [key: number]: string } = {
        1: '/assets/livingroom.jpg',
        2: '/assets/bedroom.jpg',
        3: '/assets/kitchen.jpg', 
        4: '/assets/other.jpg',
        5: '/assets/bedroom2.JPG',
        6: '/assets/default-category.jpg',
        7: '/assets/default-category.jpg'
      };
      
      const result = fallbackImages[categoryId] || '/assets/default-category.jpg';
      console.log(`   ↪️ Используем: ${result}`);
      return result;
    }
    
    // Если это URL из Supabase
    if (image.includes('supabase.co') || image.includes('storage/v1/object/public')) {
      console.log(`   ✅ Supabase URL`);
      return image;
    }
    
    // Если это Base64 (полный)
    if (image.startsWith('data:image') && image.length > 100) {
      console.log(`   ⚠️ Base64 изображение`);
      
      // Конвертируем Base64 в локальный файл для этих ID
      const localImages: { [key: number]: string } = {
        1: '/assets/livingroom.jpg',
        2: '/assets/bedroom.jpg',
        3: '/assets/kitchen.jpg',
        4: '/assets/other.jpg',
        5: '/assets/bedroom2.JPG'
      };
      
      return localImages[categoryId] || '/assets/default-category.jpg';
    }
    
    // Если это локальный путь
    if (image.startsWith('/assets/')) {
      return image;
    }
    
    if (image.startsWith('assets/')) {
      return '/' + image;
    }

    // Дефолтное
    return '/assets/default-category.jpg';
  }

  /**
   * Предзагрузка low-quality placeholder изображений
   */
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
  if (!originalUrl.includes('supabase.co')) {
    return originalUrl;
  }
  
  // Определяем ширину по device и pixel ratio
  const deviceWidth = window.innerWidth;
  const pixelRatio = window.devicePixelRatio || 1;
  
  let width = 800;
  let quality = 85;
  
  if (deviceWidth < 768) { // Мобильные
    width = Math.min(400, deviceWidth * pixelRatio);
    quality = 80;
  } else if (deviceWidth < 1200) { // Планшеты
    width = Math.min(600, deviceWidth * pixelRatio);
    quality = 85;
  } else { // Десктоп
    width = Math.min(1200, deviceWidth * pixelRatio);
    quality = 90;
  }
  
  // Для категорий используем меньшие размеры
  const categoryWidths: { [key: number]: number } = {
    1: Math.min(width, 800),  // Гостиная
    2: Math.min(width, 800),  // Спальня
    3: Math.min(width, 800),  // Кухня
    4: Math.min(width, 600),  // Матрасы
    6: Math.min(width, 600),  // Техника
  };
  
  const optimizedWidth = categoryWidths[categoryId] || Math.min(width, 600);
  
  // Supabase Storage поддерживает ресайз через параметры
  return `${originalUrl}?width=${optimizedWidth}&quality=${quality}&format=auto`;
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