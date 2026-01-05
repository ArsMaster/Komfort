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
          
          <div class="form-group">
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              required
              placeholder="Пароль"
            >
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
    }
    
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    
    button {
      width: 100%;
      padding: 12px;
      background: #4dabf7;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 10px;
    }
    
    button:disabled {
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
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (this.authService.login(this.username, this.password)) {
      this.router.navigate(['/admin']);
    } else {
      this.errorMessage = 'Неверный логин или пароль';
      this.password = '';
    }
  }
}