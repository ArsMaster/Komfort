import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>Панель администратора</h2>
        
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <input 
              type="text" 
              [(ngModel)]="username" 
              name="username"
              required
              placeholder="Логин"
            >
          </div>
          
          <div class="form-group password-field">
            <input 
              [type]="showPassword ? 'text' : 'password'" 
              [(ngModel)]="password" 
              name="password"
              required
              placeholder="Пароль"
            >
            <!-- Глазик для показа/скрытия пароля -->
            <button 
              type="button"
              class="toggle-password"
              (click)="togglePassword()"
              [attr.aria-label]="showPassword ? 'Скрыть пароль' : 'Показать пароль'">
              <span class="eye-icon">
                @if (showPassword) {
                  <!-- Глаз открыт -->
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                } @else {
                  <!-- Глаз закрыт -->
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                }
              </span>
            </button>
          </div>
          
          @if (errorMessage) {
            <div class="error">{{ errorMessage }}</div>
          }
          
          <button type="submit" [disabled]="!loginForm.form.valid">
            Войти
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .login-card {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }
    
    .login-card h2 {
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .form-group {
      margin-bottom: 15px;
      position: relative;
    }
    
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      box-sizing: border-box;
    }
    
    /* Стили для поля с паролем */
    .password-field {
      position: relative;
    }
    
    .password-field input {
      padding-right: 45px; /* Место для кнопки */
    }
    
    .toggle-password {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 5px;
      cursor: pointer;
      color: #888;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.3s;
    }
    
    .toggle-password:hover {
      color: #4dabf7;
    }
    
    .toggle-password:focus {
      outline: none;
    }
    
    .eye-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    button[type="submit"] {
      width: 100%;
      padding: 12px;
      background: #4dabf7;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 10px;
      transition: background 0.3s;
    }
    
    button[type="submit"]:hover:not(:disabled) {
      background: #339af0;
    }
    
    button[type="submit"]:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .error {
      color: #ff6b6b;
      margin: 10px 0;
      text-align: center;
    }
    
    .demo-info {
      margin-top: 20px;
      text-align: center;
      color: #666;
    }

    /* Адаптивность */
    @media (max-width: 480px) {
      .login-card {
        padding: 20px;
      }
      
      .toggle-password {
        right: 8px;
      }
      
      .toggle-password svg {
        width: 18px;
        height: 18px;
      }
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  showPassword = false; // Состояние видимости пароля

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Метод для переключения видимости пароля
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.authService.login(this.username, this.password)) {
      this.router.navigate(['/admin']);
    } else {
      this.errorMessage = 'Неверный логин или пароль';
      this.password = '';
    }
  }
}