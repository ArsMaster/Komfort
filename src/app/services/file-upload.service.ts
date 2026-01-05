import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  
  constructor(private http: HttpClient) {}

  // Метод для загрузки файла на сервер
  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    
    // Замените URL на ваш бэкенд
    return this.http.post('/api/upload', formData);
  }
  
  // Метод для удаления файла
  deleteFile(filename: string): Observable<any> {
    return this.http.delete(`/api/upload/${filename}`);
  }

  // Метод для загрузки изображения магазина (работает через localStorage)
  uploadShopImage(file: File): Observable<{ url: string }> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64Image = reader.result as string;
        
        // Генерируем уникальный ID
        const imageId = 'shop_image_' + Date.now();
        
        // Сохраняем в localStorage
        localStorage.setItem(imageId, base64Image);
        
        // Возвращаем base64 URL
        observer.next({ url: base64Image });
        observer.complete();
      };
      
      reader.onerror = (error) => {
        observer.error(error);
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Локальное преобразование в base64 для предпросмотра
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
}