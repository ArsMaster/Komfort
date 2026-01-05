import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShopsService } from '../../services/shops.service';
import { Shop } from '../../models/shop.model';

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shops.component.html',
  styleUrls: ['./shops.component.scss']
})
export class ShopsComponent implements OnInit {
  shops: Shop[] = [];

  constructor(private shopsService: ShopsService) {}

  ngOnInit(): void {
    this.loadShops();
  }

  loadShops(): void {
    this.shops = this.shopsService.getShops();
  }

  getGoogleMapsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
}