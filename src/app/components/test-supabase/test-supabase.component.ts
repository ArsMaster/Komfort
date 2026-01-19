import { Component } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-test-supabase',
  template: `
    <div style="padding: 20px; border: 1px solid #ccc; margin: 20px;">
      <h3>Тест Supabase</h3>
      <button (click)="testConnection()">Проверить соединение</button>
      <button (click)="addTestProduct()">Добавить тестовый товар</button>
      <button (click)="showProducts()">Показать товары</button>
      <button (click)="switchToSupabase()">Переключиться на Supabase</button>
      
      @if (message) {
        <div style="margin-top: 10px; color: green;">
            {{ message }}
        </div>
}
    </div>
  `
})
export class TestSupabaseComponent {
  message = '';

  constructor(
    private supabaseService: SupabaseService,
    private productService: ProductService
  ) {}

  async testConnection() {
    this.message = 'Проверяем соединение...';
    await this.productService.testSupabase();
    this.message = 'Проверка завершена (смотрите консоль)';
  }

  async addTestProduct() {
    const testProduct = {
      name: 'Тестовый товар ' + new Date().getTime(),
      price: 999.99,
      description: 'Это тестовый товар из Supabase',
      category: 'тест'
    };

    const result = await this.supabaseService.addProduct(testProduct);
    if (result) {
      this.message = 'Тестовый товар добавлен в Supabase! ID: ' + result.id;
    } else {
      this.message = 'Ошибка при добавлении товара';
    }
  }

  async showProducts() {
    const products = await this.supabaseService.getProducts();
    console.log('Товары в Supabase:', products);
    this.message = `Найдено товаров: ${products.length}`;
  }

  switchToSupabase() {
    this.productService.syncToSupabase();
    this.message = 'Переключились на Supabase (режим тестирования)';
  }
}