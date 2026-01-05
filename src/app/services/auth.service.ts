import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

interface User {
  username: string;
  role: 'admin' | 'user';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Данные администратора
  private readonly ADMIN_CREDENTIALS = {
    username: 'ibanbrat',
    password: 'komfort2025',
    role: 'admin' as const
  };

  private currentUser = signal<User | null>(this.loadUserFromStorage());
  
  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor(private router: Router) {}

  login(username: string, password: string): boolean {
    if (username === this.ADMIN_CREDENTIALS.username && 
        password === this.ADMIN_CREDENTIALS.password) {
      
      const user: User = {
        username: username,
        role: 'admin'
      };
      
      this.currentUser.set(user);
      this.saveUserToStorage(user);
      return true;
    }
    
    return false;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('komfort_auth_user');
    this.router.navigate(['/']);
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  navigateToAdmin(): void {
    this.router.navigate(['/admin/home']);
  }

  private loadUserFromStorage(): User | null {
    try {
      const saved = localStorage.getItem('komfort_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    }
    return null;
  }

  private saveUserToStorage(user: User): void {
    try {
      localStorage.setItem('komfort_auth_user', JSON.stringify(user));
    } catch (error) {
      console.error('Ошибка сохранения данных пользователя:', error);
    }
  }
}