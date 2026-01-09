import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common'; // Добавьте CurrencyPipe
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CatalogService } from '../../services/catalog.service';
import { Product } from '../../models/product.model';
import { CatalogCategory } from '../../models/catalog.model';
import { ExcelService } from '../../services/excel.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule], // Добавьте CurrencyPipe сюда
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss']
})
export class AdminProductsComponent implements OnInit {
  @ViewChild('multipleFileInput') multipleFileInput!: ElementRef<HTMLInputElement>;
  
  products = signal<Product[]>([]);
  categories = signal<CatalogCategory[]>([]);
  showForm = false;
  editingProduct = false;
  showDeleteModal = false;
  productToDelete: Product | null = null;
  
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  imageUrlsText: string = '';
  
  currentProduct: Partial<Product> = this.getEmptyProduct();
  isLoading = signal(false); // Измените на signal
  
  constructor(
    private productService: ProductService,
    private catalogService: CatalogService,
    private excelService: ExcelService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();

    console.log('=== ИНИЦИАЛИЗАЦИЯ АДМИНКИ ТОВАРОВ ===');
    console.log('Загружено товаров:', this.products().length);
    console.log('Загружено категорий:', this.categories().length);
    
    // Выводим все категории для отладки
    this.categories().forEach((cat, index) => {
      console.log(`Категория ${index + 1}: ID=${cat.id} (тип: ${typeof cat.id}), Название="${cat.title}"`);
    });
    
    // Выводим все товары для отладки
    this.products().forEach((product, index) => {
      console.log(`Товар ${index + 1}: "${product.name}", categoryId=${product.categoryId} (тип: ${typeof product.categoryId}), categoryName="${product.categoryName}"`);
    });
  }

  loadProducts(): void {
    this.products.set(this.productService.getProductsArray());
  }

  loadCategories(): void {
    this.categories.set(this.catalogService.getCategories());
  }

  getEmptyProduct(): Partial<Product> {
    return {
      name: '',
      description: '',
      price: 0,
      categoryId: undefined,
      imageUrls: ['assets/products/default.jpg'], // Исправьте путь
      stock: 0,
      features: []
    };
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category ? category.title : 'Неизвестная категория';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      
      const remainingSlots = 5 - this.selectedFiles.length;
      const filesToAdd = filesArray.slice(0, remainingSlots);
      
      filesToAdd.forEach(file => {
        if (this.selectedFiles.length < 5) {
          this.selectedFiles.push(file);
          
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              this.imagePreviews.push(e.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      });
      
      if (filesArray.length > remainingSlots) {
        alert(`Можно загрузить только до 5 изображений. Добавлено ${filesToAdd.length} из ${filesArray.length}`);
      }
      
      this.updateImageUrlsFromFiles();
    }
  }

  getFilePreview(file: File): string {
    const preview = this.imagePreviews[this.selectedFiles.indexOf(file)];
    return preview || '';
  }

  getShortFileName(filename: string, maxLength: number): string {
    if (filename.length <= maxLength) return filename;
    return filename.substring(0, maxLength - 3) + '...';
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
    this.updateImageUrlsFromFiles();
  }

  updateImageUrlsFromFiles(): void {
    const urls = this.selectedFiles.map(file => `/assets/products/${file.name}`); // Исправьте путь
    this.imageUrlsText = urls.join('\n');
    this.currentProduct.imageUrls = urls;
  }

  clearFiles(): void {
    this.selectedFiles = [];
    this.imagePreviews = [];
    this.imageUrlsText = '';
    this.currentProduct.imageUrls = ['assets/products/default.jpg']; // Исправьте путь
    if (this.multipleFileInput) {
      this.multipleFileInput.nativeElement.value = '';
    }
  }

  showAddForm(): void {
    this.currentProduct = this.getEmptyProduct();
    this.editingProduct = false;
    this.showForm = true;
    this.clearFiles();
  }

  editProduct(product: Product): void {
    this.currentProduct = { ...product };
    this.editingProduct = true;
    this.showForm = true;
    this.clearFiles();
    
    if (product.imageUrls && product.imageUrls.length > 0) {
      this.imageUrlsText = product.imageUrls.join('\n');
    }
  }

  async saveProduct(): Promise<void> {
    console.log('=== НАЧАЛО СОХРАНЕНИЯ ТОВАРА ===');
    
    // Валидация
    if (!this.currentProduct.name?.trim()) {
      console.log('ОШИБКА: Не указано название товара');
      alert('Пожалуйста, укажите название товара');
      return;
    }
    
    console.log('Сохраняем товар:', this.currentProduct.name);
    console.log('Текущий categoryId:', this.currentProduct.categoryId);
    console.log('Тип categoryId:', typeof this.currentProduct.categoryId);
    
    // Проверяем категории
    console.log('Всего категорий:', this.categories().length);
    if (this.categories().length === 0) {
      console.log('ОШИБКА: Нет доступных категорий');
      alert('Нет доступных категорий. Сначала добавьте категории в разделе "Каталоги"');
      return;
    }
    
    // Выводим все категории для отладки
    this.categories().forEach(cat => {
      console.log(`Доступная категория: ID=${cat.id}, Название="${cat.title}"`);
    });
    
    if (!this.currentProduct.categoryId) {
      console.log('ОШИБКА: Не выбрана категория');
      alert('Пожалуйста, выберите категорию');
      return;
    }
    
    // ПРЕОБРАЗУЕМ В ЧИСЛО (важно! селект возвращает строку)
    const categoryId = Number(this.currentProduct.categoryId);
    console.log('categoryId как число:', categoryId);
    console.log('Ищем категорию с ID:', categoryId);
    
    // Находим категорию для получения названия
    const selectedCategory = this.categories().find(c => {
      console.log(`Сравниваем: категория ID=${c.id} (${c.title}) с искомым ID=${categoryId}`);
      return c.id === categoryId;
    });
    
    console.log('Результат поиска категории:', selectedCategory);
    
    if (!selectedCategory) {
      console.log('ОШИБКА: Категория не найдена');
      console.log(`Искали ID: ${categoryId}`);
      console.log('Доступные ID категорий:', this.categories().map(c => c.id));
      alert(`Категория с ID ${categoryId} не найдена. Выберите другую категорию.`);
      return;
    }
    
    console.log('Категория найдена:', selectedCategory.title);
    
    // Преобразуем текст из textarea в массив URL
    if (this.imageUrlsText.trim()) {
      const urls = this.imageUrlsText
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      if (urls.length > 0) {
        this.currentProduct.imageUrls = urls;
      }
    }
    
    // Если не указаны URL, используем имена выбранных файлов
    if ((!this.currentProduct.imageUrls || this.currentProduct.imageUrls.length === 0) && 
        this.selectedFiles.length > 0) {
      this.updateImageUrlsFromFiles();
    }
    
    // Убедимся что features это массив строк
    let features: string[] = [];
    if (typeof this.currentProduct.features === 'string') {
      features = (this.currentProduct.features as string)
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);
    } else if (Array.isArray(this.currentProduct.features)) {
      features = this.currentProduct.features;
    }
    
    // Подготовка данных для сохранения
    const productData: Omit<Product, 'id'> = {
      name: this.currentProduct.name!,
      description: this.currentProduct.description || '',
      price: this.currentProduct.price || 0,
      categoryId: categoryId, // Используем преобразованный ID
      categoryName: selectedCategory.title,
      imageUrls: this.currentProduct.imageUrls || ['assets/products/default.jpg'], // Исправьте путь
      stock: this.currentProduct.stock || 0,
      features: features,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Данные для сохранения:', productData);
    
    try {
      if (this.editingProduct && this.currentProduct.id) {
        console.log('Обновляем существующий товар');
        this.productService.updateProduct(this.currentProduct.id, productData);
        alert(`Товар "${productData.name}" успешно обновлен!`);
      } else {
        console.log('Добавляем новый товар');
        const newProduct = await this.productService.addProduct(productData);
        console.log('Новый товар создан:', newProduct);
        alert(`Товар "${newProduct.name}" успешно добавлен!`);
      }
      
      this.loadProducts();
      this.cancelEdit();
    } catch (error) {
      console.error('Ошибка при сохранении товара:', error);
      alert('Произошла ошибка при сохранении товара');
    }
    
    console.log('=== КОНЕЦ СОХРАНЕНИЯ ТОВАРА ===');
  }

  cancelEdit(): void {
    this.showForm = false;
    this.editingProduct = false;
    this.currentProduct = this.getEmptyProduct();
    this.clearFiles();
  }

  resetProducts(): void {
    if (confirm('Сбросить все товары к начальным? Все текущие товары будут удалены.')) {
      this.productService.resetToInitial();
      this.loadProducts();
      alert('Товары сброшены к начальным значениям');
    }
  }

  deleteProduct(product: Product): void {
    this.productToDelete = product;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.productToDelete && this.productToDelete.id) {
      this.productService.deleteProduct(this.productToDelete.id);
      this.loadProducts();
    }
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  // Метод для отладки выбора категории
  debugCategorySelect(event: any): void {
    console.log('=== ИЗМЕНЕНИЕ ВЫБОРА КАТЕГОРИИ ===');
    console.log('Значение из селекта:', event.target.value);
    console.log('Тип значения:', typeof event.target.value);
    console.log('Текущий categoryId в модели:', this.currentProduct.categoryId);
    console.log('Тип categoryId в модели:', typeof this.currentProduct.categoryId);
  }

  exportProducts(): void {
    console.log('Экспорт товаров');
    
    // Получаем все товары
    const products = this.productService.getProductsArray();
    
    // Создаем объект для экспорта
    const exportData = {
      type: 'products',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: products.length,
      data: products
    };
    
    // Конвертируем в JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Создаем файл для скачивания
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    // Автоматически нажимаем на ссылку
    link.click();
    
    // Очищаем URL
    window.URL.revokeObjectURL(url);
    
    console.log(`Экспортировано ${products.length} товаров`);
    alert(`Экспортировано ${products.length} товаров в файл ${link.download}`);
  }

  importProducts(): void {
    console.log('Импорт товаров из Excel');
    
    // Создаем input элемент для выбора файла
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    
    // Обработчик выбора файла
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        // Показываем загрузку
        this.isLoading.set(true);
        
        // Читаем Excel файл
        const excelData = await this.excelService.readExcelFile(file);
        console.log('Данные из Excel:', excelData);
        
        // Конвертируем в формат Product
        const products = this.excelService.convertExcelToProducts(excelData);
        console.log('Конвертированные товары:', products);
        
        if (products.length === 0) {
          alert('В файле не найдено товаров для импорта');
          this.isLoading.set(false);
          return;
        }
        
        // Подтверждение
        const shouldReplace = confirm(
          `Найдено ${products.length} товаров. \n\n` +
          `Добавить к существующим? \n` +
          `"ОК" - добавить к существующим \n` +
          `"Отмена" - заменить все товары`
        );
        
        if (shouldReplace) {
          // Добавляем к существующим
          let addedCount = 0;
          products.forEach(productData => {
            try {
              const newProduct = this.productService.addProduct(productData as Omit<Product, 'id'>);
              console.log('Добавлен товар:', newProduct);
              addedCount++;
            } catch (error) {
              console.error('Ошибка при добавлении товара:', error);
            }
          });
          alert(`Добавлено ${addedCount} товаров к существующим`);
        } else {
          // Заменяем все товары
          // Очищаем текущие товары
          this.productService.clearProducts();
          
          // Добавляем новые
          let addedCount = 0;
          products.forEach(productData => {
            try {
              this.productService.addProduct(productData as Omit<Product, 'id'>);
              addedCount++;
            } catch (error) {
              console.error('Ошибка при добавлении товара:', error);
            }
          });
          alert(`Все товары заменены на ${addedCount} новых`);
        }
        
        // Обновляем список
        this.loadProducts();
        
      } catch (error) {
        console.error('Ошибка импорта:', error);
        alert(`Ошибка импорта: ${error}`);
      } finally {
        this.isLoading.set(false);
      }
    };
    
    // Открываем диалог выбора файла
    input.click();
  }

  // Добавьте метод для скачивания шаблона
  downloadTemplate(): void {
    this.excelService.downloadTemplate();
    alert('Шаблон Excel файла скачан. Заполните его и импортируйте.');
  }
}