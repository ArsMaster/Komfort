// slider.component.ts
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { HomePageService } from '../../services/homepage.service';

interface Slide {
  image: string;
  title?: string;
  description?: string;
}

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class SliderComponent implements OnInit, OnDestroy {
  private homeService = inject(HomePageService);
  
  slides = signal<Slide[]>([]);
  currentSlide = signal(0);
  
  private autoPlayInterval: any;
  private readonly AUTO_PLAY_DELAY = 5000;

  ngOnInit(): void {
    this.loadSlides();
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  loadSlides(): void {
    const slidesFromService = this.homeService.getSlides();
    this.slides.set(slidesFromService.length > 0 ? slidesFromService : this.getDefaultSlides());
  }

  private getDefaultSlides(): Slide[] {
    return [
      {
        image: 'assets/slide1.jpeg',
        title: 'Все для вашего дома',
        description: 'Описание первого слайда'
      },
      {
        image: 'assets/slide2.jpg',
        title: 'Все для вашего дома',
        description: 'Описание второго слайда'
      }
    ];
  }

  nextSlide(): void {
    if (this.slides().length === 0) return;
    this.currentSlide.set((this.currentSlide() + 1) % this.slides().length);
    this.restartAutoPlay();
  }

  prevSlide(): void {
    if (this.slides().length === 0) return;
    this.currentSlide.set(
      this.currentSlide() === 0 
        ? this.slides().length - 1 
        : this.currentSlide() - 1
    );
    this.restartAutoPlay();
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.slides().length) {
      this.currentSlide.set(index);
      this.restartAutoPlay();
    }
  }

  private startAutoPlay(): void {
    if (this.slides().length <= 1) return;
    
    this.stopAutoPlay();
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, this.AUTO_PLAY_DELAY);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  private restartAutoPlay(): void {
    this.stopAutoPlay();
    this.startAutoPlay();
  }
}