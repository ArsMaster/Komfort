// product-card.component.ts
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

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
  
  // Output события с другими именами, чтобы не было конфликта
  @Output() productEdit = new EventEmitter<Product>();
  @Output() productDelete = new EventEmitter<number>();
  @Output() productViewDetails = new EventEmitter<Product>();
  @Output() productAddToCart = new EventEmitter<Product>();
  
  currentImageIndex = 0;
  showImageGallery = false;

   private productService = inject(ProductService);

  // Метод для получения первых N особенностей
  getFirstFeatures(count: number): string[] {
    if (!this.product.features || this.product.features.length === 0) {
      return [];
    }
    return this.product.features.slice(0, count);
  }

  // Методы для событий - ИСПРАВЛЕННЫЕ ИМЕНА
  viewDetails(): void {
    console.log('Просмотр товара:', this.product.name);
    this.productViewDetails.emit(this.product);
  }

  addToCart(): void {
    if (this.product.stock > 0) {
      console.log('Добавлен в корзину:', this.product.name);
      this.productAddToCart.emit(this.product);
      alert(`${this.product.name} добавлен в корзину!`);
    }
  }

  editProduct(): void {
    this.productEdit.emit(this.product);
  }

  deleteProduct(): void {
    if (confirm(`Удалить товар "${this.product.name}"?`)) {
      this.productDelete.emit(this.product.id);
    }
  }

  // Существующие методы для изображений (оставляем без изменений)
  getCurrentImageUrl(): string {
    if (!this.product?.imageUrls || this.product.imageUrls.length === 0) {
      return this.getFallbackImage();
    }
    
    const originalUrl = this.product.imageUrls[this.currentImageIndex];
    return this.getOptimizedImageUrl(originalUrl);
  }

  getGalleryImages(): string[] {
    if (!this.product?.imageUrls || this.product.imageUrls.length === 0) {
      return [this.getFallbackImage()];
    }
    
    return this.product.imageUrls.map(url => this.getOptimizedImageUrl(url));
  }

  private getOptimizedImageUrl(originalUrl: string): string {
    if (!originalUrl || originalUrl.trim() === '') {
      return this.getFallbackImage();
    }
    
    // Если это Supabase URL, оптимизируем его
    if (originalUrl.includes('supabase.co')) {
      // Определяем ширину для текущего устройства
      const deviceWidth = window.innerWidth;
      let width = 800;
      let quality = 85;
      
      if (deviceWidth < 768) { // Мобильные
        width = 400;
        quality = 80;
      } else if (deviceWidth < 1200) { // Планшеты
        width = 600;
        quality = 85;
      }
      
      // Для карточек товаров используем меньшие размеры
      const cardWidth = Math.min(width, 600);
      
      // Проверяем, есть ли уже параметры
      if (originalUrl.includes('?')) {
        // Добавляем или обновляем параметры
        const urlWithoutParams = originalUrl.split('?')[0];
        return `${urlWithoutParams}?width=${cardWidth}&quality=${quality}&format=auto`;
      } else {
        return `${originalUrl}?width=${cardWidth}&quality=${quality}&format=auto`;
      }
    }
    
    // Для локальных файлов
    return this.getSafeImageUrl(originalUrl);
  }


  nextImage(event: Event): void {
    event.stopPropagation();
    if (this.product.imageUrls && this.product.imageUrls.length > 1) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.product.imageUrls.length;
    }
  }

  prevImage(event: Event): void {
    event.stopPropagation();
    if (this.product.imageUrls && this.product.imageUrls.length > 1) {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.product.imageUrls.length) % this.product.imageUrls.length;
    }
  }

  openGallery(): void {
    this.showImageGallery = true;
  }

  closeGallery(event?: Event): void {
    if (event) event.stopPropagation();
    this.showImageGallery = false;
  }

  setGalleryImage(index: number): void {
    this.currentImageIndex = index;
  }

  private getSafeImageUrl(url: string): string {
    if (!url || url.trim() === '') {
      return this.getFallbackImage();
    }
    
    // Проверяем на битые файлы вроде 20101581_1.jpg
    if (this.isBrokenLocalFile(url)) {
      console.warn(`⚠️ Заменяем битый файл на дефолтное изображение: ${url}`);
      return this.getFallbackImage();
    }
    
    if (url.startsWith('/assets/')) {
      return url;
    }
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('assets/')) {
      return '/' + url;
    }
    
    if (url.endsWith('.jpg') || url.endsWith('.jpeg') || 
        url.endsWith('.png') || url.endsWith('.gif')) {
      
      const filename = url.split('/').pop() || url;
      const filesInAssets = [
        'sofa1.jpg', 'bed1.jpg', 'IMG_2006.jpg', 'livingroom.jpg',
        'bedroom.jpg', 'kitchen.jpg', 'default-product.jpg',
        'slide1.jpeg', 'slide2.jpg', 'slide3.jpeg', 'slide4.jpg',
        'default-shop.jpg', 'shop1.jpg', 'shop2.jpg'
      ];
      
      if (filesInAssets.includes(filename)) {
        return `/assets/${filename}`;
      }
      
      return this.getFallbackImage();
    }
    
    return this.getFallbackImage();
  }

  // Проверяем, является ли файл битым локальным файлом
  private isBrokenLocalFile(url: string): boolean {
    if (!url) return false;
    
    const brokenFiles = [
      '20101581_1.jpg',
      'assets/20101581_1.jpg',
      '/assets/20101581_1.jpg',
      '//assets/20101581_1.jpg'
    ];
    
    return brokenFiles.some(broken => url.includes(broken));
  }

  private getFallbackImage(): string {
    return '/assets/default-product.jpg';
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const originalSrc = img.src;
    
    console.warn('Не удалось загрузить изображение:', originalSrc);
    
    // Если это оптимизированный Supabase URL, пробуем оригинал
    if (originalSrc.includes('supabase.co') && originalSrc.includes('?')) {
      const originalUrl = originalSrc.split('?')[0];
      img.src = originalUrl;
    } else {
      // В остальных случаях используем дефолтное изображение
      img.src = this.getFallbackImage();
    }
  }
}