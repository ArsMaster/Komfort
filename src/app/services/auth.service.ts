import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<any | null>(null);
  
  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.role === 'authenticated');

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    // ✅ Проверяем сессию при загрузке
    this.checkSession();
  }

  // ✅ Вход через Supabase
  async login(email: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseService.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('Ошибка входа:', error.message);
        return false;
      }

      if (data?.user) {
        this.currentUser.set(data.user);
        this.saveUserToStorage(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Ошибка:', error);
      return false;
    }
  }

  // ✅ Проверка сессии
  async checkSession(): Promise<void> {
    try {
      const { data: { session } } = await this.supabaseService.supabaseClient.auth.getSession();
      
      if (session?.user) {
        this.currentUser.set(session.user);
        this.saveUserToStorage(session.user);
      } else {
        // Пробуем загрузить из localStorage
        const saved = this.loadUserFromStorage();
        if (saved) {
          this.currentUser.set(saved);
        }
      }
    } catch (error) {
      console.error('Ошибка проверки сессии:', error);
    }
  }

  // ✅ Выход
  async logout(): Promise<void> {
    await this.supabaseService.supabaseClient.auth.signOut();
    this.currentUser.set(null);
    localStorage.removeItem('komfort_auth_user');
    this.router.navigate(['/login']);
  }

  // ✅ Получить текущего пользователя
  getCurrentUser(): any | null {
    return this.currentUser();
  }

  // ✅ Получить токен для запросов
  async getAccessToken(): Promise<string | null> {
    const { data: { session } } = await this.supabaseService.supabaseClient.auth.getSession();
    return session?.access_token || null;
  }

  private loadUserFromStorage(): any | null {
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

  private saveUserToStorage(user: any): void {
    try {
      localStorage.setItem('komfort_auth_user', JSON.stringify(user));
    } catch (error) {
      console.error('Ошибка сохранения данных пользователя:', error);
    }
  }
}