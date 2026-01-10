import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() isAdmin: boolean = false;
  @Output() onEdit = new EventEmitter<Product>();
  @Output() onDelete = new EventEmitter<number | string>();
  
  currentImageIndex = 0;
  showImageGallery = false;

  // Получаем текущее изображение
  getCurrentImageUrl(): string {
    if (!this.product?.imageUrls || this.product.imageUrls.length === 0) {
      return this.getFallbackImage();
    }
    return this.getSafeImageUrl(this.product.imageUrls[this.currentImageIndex]);
  }

  // Получаем массив изображений для галереи
  getGalleryImages(): string[] {
    if (!this.product?.imageUrls || this.product.imageUrls.length === 0) {
      return [this.getFallbackImage()];
    }
    return this.product.imageUrls.map(url => this.getSafeImageUrl(url));
  }

  // Переключение на следующее изображение
  nextImage(event: Event): void {
    event.stopPropagation();
    if (this.product.imageUrls && this.product.imageUrls.length > 1) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.product.imageUrls.length;
    }
  }

  // Переключение на предыдущее изображение
  prevImage(event: Event): void {
    event.stopPropagation();
    if (this.product.imageUrls && this.product.imageUrls.length > 1) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.product.imageUrls.length) % this.product.imageUrls.length;
    }
  }

  // Открыть галерею
  openGallery(): void {
    this.showImageGallery = true;
  }

  // Закрыть галерею
  closeGallery(event?: Event): void {
    if (event) event.stopPropagation();
    this.showImageGallery = false;
  }

  // Переключение изображения в галерее
  setGalleryImage(index: number): void {
    this.currentImageIndex = index;
  }

  // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Безопасный URL для изображения
  private getSafeImageUrl(url: string): string {
    if (!url || url.trim() === '') {
      return this.getFallbackImage();
    }
    
    // Если URL уже правильный
    if (url.startsWith('/assets/')) {
      return url;
    }
    
    // Если начинается с http:// или https://
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Если начинается с assets/ без слеша
    if (url.startsWith('assets/')) {
      return '/' + url;
    }
    
    // Если это просто имя файла
    if (url.endsWith('.jpg') || url.endsWith('.jpeg') || 
        url.endsWith('.png') || url.endsWith('.gif')) {
      
      const filename = url.split('/').pop() || url;
      
      // Список файлов в /assets/
      const filesInAssets = [
        'sofa1.jpg', 'bed1.jpg', 'IMG_2006.jpg', 'livingroom.jpg',
        'bedroom.jpg', 'kitchen.jpg', 'default-product.jpg',
        'slide1.jpeg', 'slide2.jpg', 'slide3.jpeg', 'slide4.jpg',
        'default-shop.jpg', 'shop1.jpg', 'shop2.jpg'
      ];
      
      if (filesInAssets.includes(filename)) {
        return `/assets/${filename}`;
      }
      
      // Если не нашли, возвращаем fallback
      return this.getFallbackImage();
    }
    
    return this.getFallbackImage();
  }

  // ✅ ИСПРАВЛЕННЫЙ МЕТОД: Изображение по умолчанию
  private getFallbackImage(): string {
    return '/assets/default-product.jpg';
  }

  // Обработчик ошибок загрузки изображения
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    console.warn('Не удалось загрузить изображение:', img.src);
    
    // Пробуем альтернативные пути
    const originalSrc = img.src;
    
    if (originalSrc.includes('/products/')) {
      // Пробуем без /products/
      img.src = originalSrc.replace('/products/', '/');
    } else if (originalSrc.includes('/assets/')) {
      // Пробуем заменить на другое изображение
      img.src = this.getFallbackImage();
    }
  }
}