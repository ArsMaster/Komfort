// components/header/header.component.ts
import { Component, signal, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core'; // ✅ ДОБАВЛЕНО
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { CatalogCategory } from '../../models/catalog.model';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private catalogService = inject(CatalogService);
  private authService = inject(AuthService);
  private cdRef = inject(ChangeDetectorRef); // ✅ ДОБАВЛЕНО
  private subscription?: Subscription;
  
  protected readonly isMenuOpen = signal(false);
  protected readonly isCatalogOpen = signal(false);
  protected readonly isMobileCatalogOpen = signal(false);
  
  categories: CatalogCategory[] = [];

  ngOnInit(): void {
    // ✅ Используем setTimeout для отложенной загрузки
    setTimeout(() => {
      this.loadCategories();
    }, 0);
  }

  private loadCategories(): void {
    // Подписываемся на изменения категорий
    this.subscription = this.catalogService.categories$.subscribe(categories => {
      // ✅ Очищаем Base64 изображения и используем обычные пути
      const cleanCategories = categories
        .filter(cat => cat.isActive)
        .sort((a, b) => a.order - b.order)
        .map(cat => ({
          ...cat,
          // ✅ Преобразуем Base64 обратно в пути к файлам
          image: this.cleanCategoryImage(cat.image)
        }));
      
      // ✅ Используем setTimeout для избежания ошибки
      setTimeout(() => {
        this.categories = cleanCategories;
        // ✅ Форсируем обнаружение изменений
        this.cdRef.detectChanges();
      }, 0);
    });
  }

  // ✅ ДОБАВЛЕН МЕТОД для очистки изображений категорий
  private cleanCategoryImage(image: string): string {
    if (!image) return 'assets/default-category.jpg';
    
    // Если это уже правильный путь
    if (image.startsWith('assets/') || image.startsWith('/assets/')) {
      return image.startsWith('/') ? image : '/' + image;
    }
    
    // Если это Base64 изображение
    if (image.startsWith('data:image')) {
      // Возвращаем обычный путь в зависимости от ID категории
      const categoryImages: { [key: number]: string } = {
        1: 'assets/livingroom.jpg',
        2: 'assets/bedroom.jpg', 
        3: 'assets/kitchen.jpg',
        4: 'assets/other.jpg'
      };
      
      // Можно добавить логику для определения ID категории
      return 'assets/default-category.jpg';
    }
    
    // Если это просто имя файла
    if (image.endsWith('.jpg') || image.endsWith('.jpeg') || image.endsWith('.png')) {
      return `/assets/${image.split('/').pop()}`;
    }
    
    return 'assets/default-category.jpg';
  }

  ngOnDestroy(): void {
    // Отписываемся при уничтожении компонента
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleMenu(): void {
    this.isMenuOpen.update(value => !value);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
    this.isMobileCatalogOpen.set(false);
  }

  showCatalogDropdown(): void {
    this.isCatalogOpen.set(true);
  }

  hideCatalogDropdown(): void {
    this.isCatalogOpen.set(false);
  }

  toggleMobileCatalog(): void {
    this.isMobileCatalogOpen.update(value => !value);
  }

  navigateToCategory(category: CatalogCategory): void {
    this.router.navigate(['/catalog', category.slug]);
    this.closeMenu();
    this.hideCatalogDropdown();
  }

  loginAdmin(): void {
    // Переход на страницу входа
    this.router.navigate(['/login']);
    this.closeMenu();
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
  }

  goToAdminPanel(): void {
    this.authService.navigateToAdmin();
    this.closeMenu();
  }

  // Исправьте: computed свойства вызываются как функции
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
  
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}