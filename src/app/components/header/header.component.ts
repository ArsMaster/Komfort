import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
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
  private subscription?: Subscription;
  
  protected readonly isMenuOpen = signal(false);
  protected readonly isCatalogOpen = signal(false);
  protected readonly isMobileCatalogOpen = signal(false);
  
  categories: CatalogCategory[] = [];

  ngOnInit(): void {
    // Подписываемся на изменения категорий
    this.subscription = this.catalogService.categories$.subscribe(categories => {
      this.categories = categories
        .filter(cat => cat.isActive)
        .sort((a, b) => a.order - b.order);
    });
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

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
  
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}