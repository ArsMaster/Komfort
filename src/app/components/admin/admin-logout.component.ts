import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-logout',
  standalone: true,
  template: `<div class="logout-container">Выход из системы...</div>`,
  styles: [`
    .logout-container {
      padding: 40px;
      text-align: center;
    }
  `]
})
export class AdminLogoutComponent implements OnInit {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Автоматический выход при загрузке компонента
    this.authService.logout();
    
    // Через секунду перенаправляем на главную
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1000);
  }
}