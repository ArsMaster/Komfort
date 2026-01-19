// app/components/admin-products/admin-products.component.ts
import { Component, OnInit, signal, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CatalogService } from '../../services/catalog.service';
import { StorageService } from '../../services/storage.service';
import { Product } from '../../models/product.model';
import { CatalogCategory } from '../../models/catalog.model';
import { ExcelService } from '../../services/excel.service';
import { TruncatePipe } from "../../pipes/truncate.pipe";

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, TruncatePipe],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss']
})
export class AdminProductsComponent implements OnInit {
  @ViewChild('multipleFileInput') multipleFileInput!: ElementRef<HTMLInputElement>;
  
  // Сигналы
  products = signal<Product[]>([]);
  categories = signal<CatalogCategory[]>([]);
  isLoading = signal(false);
  isUploadingImages = signal(false);
  
  // Состояние UI
  showForm = false;
  editingProduct = false;
  showDeleteModal = false;
  showImageManager = false;
  
  // Текущие данные
  currentProduct: Partial<Product> = this.getEmptyProduct();
  productToDelete: Product | null = null;
  productToManageImages: Product | null = null;
  
  // Управление изображениями
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  uploadedImageUrls: string[] = [];
  
  // Для текстового поля URL изображений
  imageUrlsText = '';
  
  constructor(
    private productService: ProductService,
    private catalogService: CatalogService,
    private storageService: StorageService,
    private excelService: ExcelService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      await Promise.all([
        this.loadProducts(),
        this.loadCategories()
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProducts(): Promise<void> {
    this.products.set(this.productService.getProductsArray());
  }

  async loadCategories(): Promise<void> {
    const categories = await this.catalogService.getCategories();
    this.categories.set(categories);
  }

  // ===== УПРАВЛЕНИЕ ИЗОБРАЖЕНИЯМИ =====

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      const maxFiles = 10;
      const remainingSlots = maxFiles - this.selectedFiles.length;
      const filesToAdd = filesArray.slice(0, remainingSlots);
      
      filesToAdd.forEach(file => {
        if (this.selectedFiles.length < maxFiles) {
          this.selectedFiles.push(file);
          this.createFilePreview(file);
        }
      });
      
      if (filesArray.length > remainingSlots) {
        alert(`Можно загрузить только до ${maxFiles} изображений. Добавлено ${filesToAdd.length} из ${filesArray.length}`);
      }
      
      // Очищаем input
      input.value = '';
    }
  }

  createFilePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        this.imagePreviews.push(e.target.result as string);
        this.cdr.detectChanges();
      }
    };
    reader.readAsDataURL(file);
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  getFilePreview(file: File): string {
    const index = this.selectedFiles.indexOf(file);
    return this.imagePreviews[index] || '';
  }

  getShortFileName(filename: string, maxLength: number = 20): string {
    if (filename.length <= maxLength) return filename;
    return filename.substring(0, maxLength - 3) + '...';
  }

  clearSelectedFiles(): void {
    this.selectedFiles = [];
    this.imagePreviews = [];
  }

  cleanCategoryImageUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '/assets/default-category.jpg';
  }
  
  // Если это Base64, заменяем на дефолтное
  if (url.startsWith('data:image')) {
    console.log('🔄 Обнаружен Base64 в категории, заменяем на дефолтное изображение');
    return '/assets/default-category.jpg';
  }
  
  return url;
}

 // Добавьте эти методы:
  getProductImageUrl(product: Product): string {
  if (!product.imageUrls || product.imageUrls.length === 0) {
    return '/assets/default-product.jpg';
  }
  
  const url = product.imageUrls[0];
  
  // Если это локальный файл 20101581_1.jpg, который не существует
  if (url.includes('20101581_1.jpg')) {
    return '/assets/default-product.jpg';
  }
  
  return url;
}

handleImageError(event: any, product: Product): void {
  console.warn(`⚠️ Ошибка загрузки изображения для товара "${product.name}":`, event.target.src);
  event.target.src = '/assets/default-product.jpg';
}

  // Преобразование текстового поля URL в массив
  updateImageUrlsFromText(): void {
    if (this.imageUrlsText) {
      const urls = this.imageUrlsText
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      this.uploadedImageUrls = urls;
    }
  }

  // Преобразование массива URL в текст
  updateTextFromImageUrls(): void {
    if (this.uploadedImageUrls.length > 0) {
      this.imageUrlsText = this.uploadedImageUrls.join('\n');
    }
  }

  // ===== ОСНОВНЫЕ ОПЕРАЦИИ С ТОВАРАМИ =====

  showAddForm(): void {
    this.currentProduct = this.getEmptyProduct();
    this.editingProduct = false;
    this.showForm = true;
    this.clearSelectedFiles();
    this.uploadedImageUrls = [];
    this.imageUrlsText = '';
  }

  editProduct(product: Product): void {
    this.currentProduct = { ...product };
    this.editingProduct = true;
    this.showForm = true;
    this.clearSelectedFiles();
    
    // Загружаем существующие изображения товара
    this.uploadedImageUrls = [...(product.imageUrls || [])];
    this.updateTextFromImageUrls();
  }

  async saveProduct(): Promise<void> {
    console.log('=== СОХРАНЕНИЕ ТОВАРА ===');
    
    // Валидация
    if (!this.currentProduct.name?.trim()) {
      alert('Пожалуйста, укажите название товара');
      return;
    }
    
    if (!this.currentProduct.categoryId) {
      alert('Пожалуйста, выберите категорию');
      return;
    }
    
    // Обновляем URL из текстового поля
    this.updateImageUrlsFromText();
    
    try {
      let finalImageUrls: string[] = [];
      
      // 1. Если есть выбранные файлы, загружаем их в Supabase Storage
      if (this.selectedFiles.length > 0) {
        this.isUploadingImages.set(true);
        try {
          console.log(`📤 Загрузка ${this.selectedFiles.length} изображений...`);
          const uploadedUrls = await this.productService.uploadProductImages(this.selectedFiles);
          finalImageUrls = [...this.uploadedImageUrls, ...uploadedUrls];
          console.log('✅ Изображения загружены:', uploadedUrls);
        } finally {
          this.isUploadingImages.set(false);
        }
      } else {
        // Используем существующие URL
        finalImageUrls = this.uploadedImageUrls;
      }
      
      // Если нет изображений, используем дефолтное
      if (finalImageUrls.length === 0) {
        finalImageUrls = ['/assets/default-product.jpg'];
      }
      
      // 2. Получаем информацию о категории
      const selectedCategory = this.categories().find(c => c.id === this.currentProduct.categoryId);
      const categoryName = selectedCategory?.title || 'Без категории';
      
      // 3. Подготавливаем features
      let features: string[] = [];
      if (typeof this.currentProduct.features === 'string') {
        features = (this.currentProduct.features as string)
          .split('\n')
          .map(f => f.trim())
          .filter(f => f.length > 0);
      } else if (Array.isArray(this.currentProduct.features)) {
        features = this.currentProduct.features;
      }
      
      // 4. Создаем объект товара
      const productData: Omit<Product, 'id'> = {
        name: this.currentProduct.name!,
        description: this.currentProduct.description || '',
        price: this.currentProduct.price || 0,
        categoryId: this.currentProduct.categoryId,
        categoryName: categoryName,
        imageUrls: finalImageUrls,
        stock: this.currentProduct.stock || 0,
        features: features,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('📦 Данные для сохранения:', productData);
      
      if (this.editingProduct && this.currentProduct.id) {
        // Обновление существующего товара
        await this.productService.updateProduct(
          this.currentProduct.id,
          productData,
          this.selectedFiles.length > 0 ? this.selectedFiles : undefined
        );
        alert(`Товар "${productData.name}" успешно обновлен!`);
      } else {
        // Создание нового товара
        const newProduct = await this.productService.addProduct(
          productData,
          this.selectedFiles.length > 0 ? this.selectedFiles : undefined
        );
        console.log('✅ Новый товар создан:', newProduct);
        alert(`Товар "${newProduct.name}" успешно добавлен!`);
      }
      
      // Обновляем UI
      await this.loadProducts();
      this.cancelEdit();
      
    } catch (error: any) {
      console.error('❌ Ошибка при сохранении товара:', error);
      alert('Произошла ошибка при сохранении товара: ' + error.message);
    }
  }

  cancelEdit(): void {
    this.showForm = false;
    this.editingProduct = false;
    this.currentProduct = this.getEmptyProduct();
    this.clearSelectedFiles();
    this.uploadedImageUrls = [];
    this.imageUrlsText = '';
  }

  deleteProduct(product: Product): void {
    this.productToDelete = product;
    this.showDeleteModal = true;
  }

  async confirmDelete(): Promise<void> {
    if (this.productToDelete && this.productToDelete.id) {
      try {
        await this.productService.deleteProduct(this.productToDelete.id);
        await this.loadProducts();
        alert(`Товар "${this.productToDelete.name}" удален`);
      } catch (error) {
        console.error('Ошибка удаления товара:', error);
        alert('Ошибка удаления товара');
      }
    }
    
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  // ===== УПРАВЛЕНИЕ ИЗОБРАЖЕНИЯМИ ТОВАРА =====

  openImageManager(product: Product): void {
    this.productToManageImages = { ...product };
    this.uploadedImageUrls = [...(product.imageUrls || [])];
    this.updateTextFromImageUrls();
    this.showImageManager = true;
  }

  closeImageManager(): void {
    this.showImageManager = false;
    this.productToManageImages = null;
    this.clearSelectedFiles();
    this.uploadedImageUrls = [];
    this.imageUrlsText = '';
  }

  async updateProductImages(): Promise<void> {
    if (!this.productToManageImages) return;

    try {
      // Обновляем URL из текстового поля
      this.updateImageUrlsFromText();
      
      // Если есть новые файлы, загружаем их
      if (this.selectedFiles.length > 0) {
        this.isUploadingImages.set(true);
        try {
          const uploadedUrls = await this.productService.uploadProductImages(this.selectedFiles);
          this.uploadedImageUrls = [...this.uploadedImageUrls, ...uploadedUrls];
          this.updateTextFromImageUrls();
        } finally {
          this.isUploadingImages.set(false);
        }
      }
      
      // Обновляем товар
      await this.productService.updateProduct(
        this.productToManageImages.id!,
        { imageUrls: this.uploadedImageUrls }
      );
      
      await this.loadProducts();
      this.closeImageManager();
      alert('Изображения успешно обновлены!');
      
    } catch (error: any) {
      console.error('Ошибка обновления изображений:', error);
      alert('Ошибка обновления изображений: ' + error.message);
    }
  }

  async removeImage(imageUrl: string): Promise<void> {
    if (!this.productToManageImages || !confirm('Удалить это изображение?')) return;

    try {
      // Удаляем URL из списка
      this.uploadedImageUrls = this.uploadedImageUrls.filter(url => url !== imageUrl);
      this.updateTextFromImageUrls();
      
      // Если список пуст, добавляем дефолтное изображение
      if (this.uploadedImageUrls.length === 0) {
        this.uploadedImageUrls = ['/assets/default-product.jpg'];
        this.updateTextFromImageUrls();
      }
      
      // Удаляем изображение из Supabase Storage если это URL из Storage
      if (this.storageService.isSupabaseStorageUrl(imageUrl)) {
        await this.productService.deleteProductImages([imageUrl]);
      }
      
      alert('Изображение удалено');
      
    } catch (error: any) {
      console.error('Ошибка удаления изображения:', error);
      alert('Ошибка удаления изображения: ' + error.message);
    }
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  getEmptyProduct(): Partial<Product> {
    return {
      name: '',
      description: '',
      price: 0,
      categoryId: undefined,
      imageUrls: [],
      stock: 0,
      features: []
    };
  }

  getCategoryName(categoryId: number | string | undefined): string {
    if (!categoryId) return 'Без категории';
    
    const id = typeof categoryId === 'string' ? Number(categoryId) : categoryId;
    const category = this.categories().find(c => c.id === id);
    return category?.title || 'Без категории';
  }

  debugCategorySelect(event: any): void {
    console.log('Выбрана категория ID:', event.target.value);
    console.log('Тип:', typeof event.target.value);
  }

  // ===== ЭКСПОРТ/ИМПОРТ =====

  exportProducts(): void {
    const products = this.productService.getProductsArray();
    
    const exportData = {
      type: 'products',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: products.length,
      data: products
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    window.URL.revokeObjectURL(url);
    
    alert(`Экспортировано ${products.length} товаров`);
  }

  async fixBrokenImages(): Promise<void> {
  if (confirm('Исправить все битые изображения в товарах?')) {
    this.isLoading.set(true);
    try {
      await this.productService.fixBrokenProductImages();
      await this.loadProducts();
      alert('Битые изображения исправлены!');
    } catch (error) {
      console.error('Ошибка исправления изображений:', error);
      alert('Ошибка исправления изображений');
    } finally {
      this.isLoading.set(false);
    }
  }
}

  async importProducts(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,.json';
    
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;
      
      this.isLoading.set(true);
      
      try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        if (fileExtension === 'json') {
          await this.importFromJson(file);
        } else {
          await this.importFromExcel(file);
        }
        
        await this.loadProducts();
        
      } catch (error: any) {
        console.error('Ошибка импорта:', error);
        alert(`Ошибка импорта: ${error.message}`);
      } finally {
        this.isLoading.set(false);
      }
    };
    
    input.click();
  }

  private async importFromJson(file: File): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Некорректный формат JSON файла');
    }
    
    const shouldReplace = confirm(
      `Найдено ${data.data.length} товаров. \n\n` +
      `"ОК" - добавить к существующим \n` +
      `"Отмена" - заменить все товары`
    );
    
    if (!shouldReplace) {
      this.productService.clearProducts();
    }
    
    let successCount = 0;
    
    for (const productData of data.data) {
      try {
        await this.productService.addProduct(productData as Omit<Product, 'id'>);
        successCount++;
      } catch (error) {
        console.error('Ошибка импорта товара:', error);
      }
    }
    
    alert(`Импортировано ${successCount} товаров`);
  }

  private async importFromExcel(file: File): Promise<void> {
    const excelData = await this.excelService.readExcelFile(file);
    const products = this.excelService.convertExcelToProducts(excelData);
    
    if (products.length === 0) {
      throw new Error('В файле не найдено товаров для импорта');
    }
    
    const shouldReplace = confirm(
      `Найдено ${products.length} товаров. \n\n` +
      `"ОК" - добавить к существующим \n` +
      `"Отмена" - заменить все товары`
    );
    
    if (!shouldReplace) {
      this.productService.clearProducts();
    }
    
    let successCount = 0;
    
    for (const productData of products) {
      try {
        await this.productService.addProduct(productData as Omit<Product, 'id'>);
        successCount++;
      } catch (error) {
        console.error('Ошибка импорта товара:', error);
      }
    }
    
    alert(`Импортировано ${successCount} товаров`);
  }

  downloadTemplate(): void {
    this.excelService.downloadTemplate();
    alert('Шаблон Excel файла скачан. Заполните его и импортируйте.');
  }

  resetProducts(): void {
    if (confirm('Сбросить все товары к начальным? Все текущие товары будут удалены.')) {
      this.productService.resetToInitial();
      this.loadProducts();
      alert('Товары сброшены к начальным значениям');
    }
  }
}