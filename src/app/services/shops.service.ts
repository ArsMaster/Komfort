import { Injectable } from '@angular/core';
import { Shop } from '../models/shop.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShopsService {
  private shopsKey = 'komfort_shops';
  private apiUrl = 'http://localhost:3000/api/shops'; // или ваш API URL

  constructor(private http: HttpClient) {}

  // Для localStorage (простой вариант)
  getShops(): Shop[] {
    const shops = localStorage.getItem(this.shopsKey);
    return shops ? JSON.parse(shops) : this.getDefaultShops();
  }

  saveShops(shops: Shop[]): void {
    localStorage.setItem(this.shopsKey, JSON.stringify(shops));
  }

  addShop(shop: Shop): void {
    const shops = this.getShops();
    shops.push(shop);
    this.saveShops(shops);
  }

  updateShop(updatedShop: Shop): void {
    const shops = this.getShops();
    const index = shops.findIndex(s => s.id === updatedShop.id);
    if (index !== -1) {
      shops[index] = updatedShop;
      this.saveShops(shops);
    }
  }

  deleteShop(id: string): void {
    const shops = this.getShops();
    const filteredShops = shops.filter(s => s.id !== id);
    this.saveShops(filteredShops);
  }

  private getDefaultShops(): Shop[] {
    return [
      {
        id: '1',
        title: 'Главный магазин',
        address: 'г. Москва, ул. Примерная, д. 10',
        description: 'Крупнейший магазин сети с широким ассортиментом',
        imageUrl: '/assets/shop1.jpg',
        phone: '+7 (495) 123-45-67',
        email: 'main@komfort.ru',
        workingHours: 'Пн-Вс: 9:00-21:00'
      },
      {
        id: '2',
        title: 'Филиал на Ленина',
        address: 'г. Москва, пр-т Ленина, д. 25',
        description: 'Магазин в центре города с демонстрационным залом',
        imageUrl: '/assets/shop2.jpg',
        phone: '+7 (495) 234-56-78',
        workingHours: 'Пн-Сб: 10:00-20:00, Вс: 11:00-19:00'
      }
    ];
  }

  // Для работы с API (опционально)
  getShopsFromApi(): Observable<Shop[]> {
    return this.http.get<Shop[]>(this.apiUrl);
  }
}