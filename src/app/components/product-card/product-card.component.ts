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
  
  // Текущий индекс изображения для отображения
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
    event.stopPropagation(); // Останавливаем всплытие
    if (this.product.imageUrls && this.product.imageUrls.length > 1) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.product.imageUrls.length;
    }
  }

  // Переключение на предыдущее изображение
  prevImage(event: Event): void {
    event.stopPropagation(); // Останавливаем всплытие
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

  // Безопасный URL для одного изображения
  private getSafeImageUrl(url: string): string {
    if (!url) return this.getFallbackImage();
    
    if (url.startsWith('/products/')) return url;
    if (url.startsWith('products/')) return `/${url}`;
    if (url.includes('assets/')) return url.replace('assets/', '/');
    if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg')) {
      return `/products/${url}`;
    }
    return this.getFallbackImage();
  }

  // Обработчик ошибок загрузки изображения
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    console.warn('Не удалось загрузить изображение:', img.src);
    img.src = this.getFallbackImage();
  }

  private getFallbackImage(): string {
    return '/products/default.jpg';
  }
}