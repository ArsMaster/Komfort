import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { ProductService } from './app/services/product.service';
import { SupabaseService } from './app/services/supabase.service';
import { CatalogService } from './app/services/catalog.service';
import { ShopsService } from './app/services/shops.service';
import { HomePageService } from './app/services/homepage.service';
import { ContactService } from './app/services/contact.service';

// Объявляем глобальный интерфейс
declare global {
  interface Window {
    productService?: ProductService;
    supabaseService?: SupabaseService;
    catalogService?: CatalogService;
    shopsService?: ShopsService;
    homePageService?: HomePageService;
    contactService?: ContactService;
  }
}

bootstrapApplication(AppComponent, appConfig).then(appRef => {
  // Получаем инстансы сервисов через инжектор
  const injector = appRef.injector;
  
  // Делаем сервисы доступными в консоли
  window.productService = injector.get(ProductService);
  window.supabaseService = injector.get(SupabaseService);
  window.catalogService = injector.get(CatalogService);
  window.shopsService = injector.get(ShopsService);
  window.homePageService = injector.get(HomePageService);
  window.contactService = injector.get(ContactService);
  
  console.log('🎉 Сервисы доступны в консоли!');
  console.log('Используйте:');
  console.log('- window.productService.testSupabase()');
  console.log('- window.supabaseService.getProducts()');
  console.log('- window.catalogService.loadCategories()');
  console.log('- window.shopsService.getShops()');
  console.log('- window.homePageService.loadHomePageData()');
  console.log('- window.contactService.sendTestMessage()');
});