import { Component } from '@angular/core';
import { CatalogComponent } from "../catalog/catalog.component";
import { SliderComponent } from "../slider/slider.component";
import { AboutComponent } from "../about/about.component";

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <!-- Главная страница со всеми секциями -->
    <app-slider></app-slider>
    <app-catalog></app-catalog>
    <app-about></app-about>
  `,
  styleUrls: ['./home.component.scss'],
  imports: [CatalogComponent, SliderComponent, AboutComponent]
})
export class HomeComponent {}