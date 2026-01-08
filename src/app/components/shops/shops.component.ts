import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShopsService } from '../../services/shops.service';
import { Shop } from '../../models/shop.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shops.component.html',
  styleUrls: ['./shops.component.scss']
})
export class ShopsComponent implements OnInit, OnDestroy {
  shops: Shop[] = [];
  private shopsSubscription!: Subscription;

  constructor(private shopsService: ShopsService) {}

  ngOnInit(): void {
    console.log('🏪 ShopsComponent инициализирован');
    
    // Подписываемся на изменения в реальном времени
    this.shopsSubscription = this.shopsService.shops$.subscribe({
      next: (shops) => {
        this.shops = shops;
        console.log('📦 Магазины обновлены:', shops.length);
      },
      error: (error) => {
        console.error('❌ Ошибка получения магазинов:', error);
      }
    });
    
    // Первоначальная загрузка
    this.loadShops();
  }

  ngOnDestroy(): void {
    // Отписываемся от подписки при уничтожении компонента
    if (this.shopsSubscription) {
      this.shopsSubscription.unsubscribe();
      console.log('🔌 Отписались от обновлений магазинов');
    }
  }

  loadShops(): void {
    // Получаем текущие магазины из сервиса
    this.shops = this.shopsService.getShops();
    console.log('🔄 Загружено магазинов:', this.shops.length);
  }

  // Изменено: Яндекс Карты вместо Google Maps
  getYandexMapsUrl(address: string): string {
    // Яндекс Карты использует параметр text для поиска
    return `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
  }

  // Альтернативный вариант для открытия в Яндекс Навигаторе (если нужно)
  getYandexNavigatorUrl(address: string): string {
    return `yandexnavi://build_route_on_map?lat_to=55.753215&lon_to=37.622504&text=${encodeURIComponent(address)}`;
  }

  // Оставляем старый метод для совместимости, если где-то еще используется
  getGoogleMapsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  getStorageMode(): string {
    return this.shopsService.getStorageMode() === 'local' ? 'локальный' : 'supabase';
  }

  refreshShops(): void {
    const mode = this.shopsService.getStorageMode();
    console.log(`🔄 Обновляем магазины (режим: ${mode})...`);
    
    if (mode === 'supabase') {
      this.shopsService.forceLoadFromSupabase();
    } else {
      this.loadShops();
    }
  }
}