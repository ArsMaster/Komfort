// services/excel.service.ts
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  
  // Чтение Excel файла
  readExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          // Читаем бинарные данные
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Берем первую страницу
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Конвертируем в JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject('Ошибка чтения Excel файла');
        }
      };
      
      reader.onerror = () => reject('Ошибка загрузки файла');
      reader.readAsArrayBuffer(file);
    });
  }

  // Конвертация Excel данных в формат Product
  convertExcelToProducts(excelData: any[]): Partial<Product>[] {
    const products: Partial<Product>[] = [];
    
    excelData.forEach((row, index) => {
      // Пропускаем пустые строки
      if (!row['Название'] && !row['Название товара']) return;
      
      const product: Partial<Product> = {
        name: row['Название'] || row['Название товара'] || row['name'] || `Товар ${index + 1}`,
        description: row['Описание'] || row['description'] || '',
        price: this.parsePrice(row['Цена'] || row['price'] || 0),
        categoryId: this.parseCategoryId(row['Категория ID'] || row['categoryId']),
        categoryName: row['Категория'] || row['categoryName'] || '',
        stock: parseInt(row['Количество'] || row['stock'] || row['Остаток'] || '0'),
        features: this.parseFeatures(row['Характеристики'] || row['features']),
        imageUrls: this.parseImages(row['Изображения'] || row['imageUrls'])
      };
      
      products.push(product);
    });
    
    return products;
  }

  // Парсинг цены (убираем пробелы, символы валюты)
  private parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    
    const priceStr = String(price)
      .replace(/\s/g, '') // Убираем пробелы
      .replace('₽', '')
      .replace('руб.', '')
      .replace('р.', '')
      .replace(',', '.');
    
    const parsed = parseFloat(priceStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Парсинг ID категории
  private parseCategoryId(categoryId: any): number | undefined {
    if (typeof categoryId === 'number') return categoryId;
    
    const parsed = parseInt(categoryId);
    return isNaN(parsed) ? undefined : parsed;
  }

  // Парсинг характеристик (может быть строка или массив)
  private parseFeatures(features: any): string[] {
    if (!features) return [];
    
    if (Array.isArray(features)) {
      return features;
    }
    
    if (typeof features === 'string') {
      // Разделяем по запятым, точкам с запятой или переносам строк
      return features
        .split(/[,;\n]/)
        .map(f => f.trim())
        .filter(f => f.length > 0);
    }
    
    return [];
  }

  readCSVFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const csvData = e.target.result;
        const workbook = XLSX.read(csvData, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject('Ошибка чтения CSV файла');
      }
    };
    
    reader.onerror = () => reject('Ошибка загрузки файла');
    reader.readAsText(file, 'UTF-8');
  });
}


  // Парсинг изображений
  private parseImages(images: any): string[] {
    if (!images) return ['assets/products/default.jpg'];
    
    if (Array.isArray(images)) {
      return images;
    }
    
    if (typeof images === 'string') {
      // Разделяем по запятым или переносам строк
      return images
        .split(/[,\n]/)
        .map(img => img.trim())
        .filter(img => img.length > 0);
    }
    
    return ['assets/products/default.jpg'];
  }

  // Создание Excel файла для скачивания (шаблон)
  downloadTemplate(): void {
    const templateData = [
      {
        'Название': 'Диван "Комфорт"',
        'Описание': 'Удобный диван для гостиной',
        'Цена': 29999,
        'Категория ID': 1,
        'Категория': 'Гостиная',
        'Количество': 5,
        'Характеристики': 'Раскладной;Ткань - велюр',
        'Изображения': 'assets/products/sofa1.jpg'
      },
      {
        'Название': 'Кровать "Орто"',
        'Описание': 'Ортопедическая кровать',
        'Цена': 45999,
        'Категория ID': 2,
        'Категория': 'Спальня',
        'Количество': 3,
        'Характеристики': 'Ортопедическое основание;Ящики для белья',
        'Изображения': 'assets/products/bed1.jpg'
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
    
    // Ширина колонок
    const wscols = [
      { wch: 25 }, // Название
      { wch: 40 }, // Описание
      { wch: 15 }, // Цена
      { wch: 15 }, // Категория ID
      { wch: 15 }, // Категория
      { wch: 15 }, // Количество
      { wch: 40 }, // Характеристики
      { wch: 30 }  // Изображения
    ];
    worksheet['!cols'] = wscols;
    
    // Скачивание файла
    XLSX.writeFile(workbook, 'шаблон-товаров.xlsx');
  }
}