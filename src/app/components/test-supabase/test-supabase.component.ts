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
    try {
      // ✅ ИСПРАВЛЕНО: правильная структура данных для нового типа
      const testProduct = {
        name: 'Тестовый товар ' + new Date().getTime(),
        description: 'Это тестовый товар из Supabase',
        price: 999.99,
        categoryId: 15, // ID категории "Корпусная мебель" (число, не строка!)
        imageUrls: ['/assets/default-product.jpg'],
        stock: 5,
        features: ['Тестовая характеристика 1', 'Тестовая характеристика 2']
      };

      console.log('📤 Отправляем тестовый товар:', testProduct);
      
      const result = await this.supabaseService.addProduct(testProduct);
      
      if (result) {
        this.message = '✅ Тестовый товар добавлен в Supabase! ID: ' + result.id;
        console.log('✅ Результат:', result);
      } else {
        this.message = '❌ Ошибка при добавлении товара';
      }
    } catch (error: any) {
      this.message = '❌ Ошибка: ' + error.message;
      console.error('❌ Ошибка:', error);
    }
  }

  async showProducts() {
    try {
      const products = await this.supabaseService.getProducts();
      console.log('📦 Товары в Supabase:', products);
      
      // Показываем категории для наглядности
      products.forEach(p => {
        console.log(`  - ${p.name}: категория ID=${p.categoryId}, название="${p.categoryName}"`);
      });
      
      this.message = `✅ Найдено товаров: ${products.length}`;
    } catch (error: any) {
      this.message = '❌ Ошибка: ' + error.message;
      console.error('❌ Ошибка:', error);
    }
  }

  switchToSupabase() {
    this.productService.syncToSupabase();
    this.message = '🔄 Переключились на Supabase (режим тестирования)';
  }
}