// components/admin/admin.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  constructor(
    private authService: AuthService, // Добавьте
    private router: Router // Добавьте
  ) {}

  // Метод для выхода
  logout(): void {
    if (confirm('Вы уверены, что хотите выйти из панели администратора?')) {
      this.authService.logout();
      this.router.navigate(['/']);
    }
  }
}