// products-catalog.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { CatalogService } from '../../services/catalog.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { Product } from '../../models/product.model';
import { CatalogCategory } from '../../models/catalog.model';

@Component({
  selector: 'app-products-catalog',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './products-catalog.component.html',
  styleUrls: ['./products-catalog.component.scss']
})
export class ProductsCatalogComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogService = inject(CatalogService);
  
  allProducts = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  selectedCategory = signal<string | number>('all');
  
  categories = signal<CatalogCategory[]>([]);

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    console.log('=== ИНИЦИАЛИЗАЦИЯ КАТАЛОГА ТОВАРОВ ===');
    
    // Загружаем категории из сервиса
    const loadedCategories = this.catalogService.getCategories();
    console.log('Загружено категорий:', loadedCategories.length);
    loadedCategories.forEach(cat => {
      console.log(`Категория: ${cat.title} (ID: ${cat.id}, Slug: ${cat.slug})`);
    });
    
    this.categories.set(loadedCategories);
    
    // Загружаем товары
    const loadedProducts = this.productService.getProductsArray();
    console.log('Загружено товаров:', loadedProducts.length);
    loadedProducts.forEach(product => {
      console.log(`Товар: "${product.name}", categoryId: ${product.categoryId}, categoryName: "${product.categoryName}"`);
    });
    
    this.allProducts.set(loadedProducts);
    this.filteredProducts.set(loadedProducts);
    
    // Подписываемся на параметры URL
    this.route.paramMap.subscribe(params => {
      console.log('Параметры URL изменились:', params);
      const categorySlug = params.get('category');
      console.log('categorySlug из URL:', categorySlug);
      
      if (categorySlug) {
        // Находим категорию по slug
        const category = this.categories().find(cat => {
          console.log(`Ищем категорию по slug: ${cat.slug} === ${categorySlug}?`);
          return cat.slug === categorySlug;
        });
        
        console.log('Найдена категория по slug:', category);
        
        if (category) {
          console.log(`Фильтруем товары для категории: ${category.title} (ID: ${category.id})`);
          this.filterByCategory(category.id, category.title);
        } else {
          console.log('Категория не найдена по slug:', categorySlug);
          this.loadAllProducts();
        }
      } else {
        console.log('Нет параметра category в URL, показываем все товары');
        this.loadAllProducts();
      }
    });
  }

  loadAllProducts(): void {
    console.log('Показываем все товары');
    this.filteredProducts.set(this.allProducts());
    this.selectedCategory.set('all');
  }

  filterByCategory(categoryId: number, categoryTitle?: string): void {
    console.log('=== ФИЛЬТРАЦИЯ ПО КАТЕГОРИИ ===');
    console.log('categoryId:', categoryId);
    console.log('categoryTitle:', categoryTitle);
    
    this.selectedCategory.set(categoryId);
    
    const filtered = this.productService.getProductsByCategoryId(categoryId);
    console.log('Найдено товаров в категории:', filtered.length);
    filtered.forEach(p => {
      console.log(`- ${p.name} (categoryId: ${p.categoryId})`);
    });
    
    this.filteredProducts.set(filtered);
    
    // Обновляем URL если нужно
    if (categoryTitle) {
      const category = this.categories().find(cat => cat.id === categoryId);
      if (category) {
        console.log('Обновляем URL на:', ['/catalog', category.slug]);
        this.router.navigate(['/catalog', category.slug]);
      }
    }
  }

  filterByCategoryName(category: string): void {
    console.log('Фильтрация по названию категории:', category);
    
    if (category === 'all') {
      this.router.navigate(['/catalog']);
      this.loadAllProducts();
    } else {
      const foundCategory = this.categories().find(cat => 
        cat.title.toLowerCase() === category.toLowerCase()
      );
      if (foundCategory) {
        this.filterByCategory(foundCategory.id, foundCategory.title);
      } else {
        console.log('Категория не найдена по названию:', category);
      }
    }
  }
}