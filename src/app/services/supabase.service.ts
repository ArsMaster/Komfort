// supabase.service.ts - обновленная версия
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product } from '../models/product.model';
import { CatalogCategory } from '../models/catalog.model';
import { Shop } from '../models/shop.model';
import { HomePageSettings, Slide } from '../models/homepage-settings.model';
import { ContactInfo } from '../models/contact.model';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  private supabase: SupabaseClient;

  constructor() {
    // Временное решение - потом замените на environment
    const supabaseUrl = 'https://czsfywxvxmxotmalasla.supabase.co';
    const supabaseKey = 'sb_publishable_fruepZeSusdLrlJE_xMZuw_wqbej0Fk';
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Тестируем подключение при инициализации
    this.testConnection();
  }

  // Метод для проверки подключения
  async testConnection(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Ошибка подключения к Supabase:', error.message);
        console.log('Проверьте:');
        console.log('1. Ключи доступа');
        console.log('2. Созданы ли таблицы');
        console.log('3. Row Level Security политики');
      } else {
        console.log('✅ Успешное подключение к Supabase!');
      }
    } catch (error) {
      console.error('❌ Неожиданная ошибка:', error);
    }
  }

  // ===== МЕТОДЫ ДЛЯ ПРОДУКТОВ =====
  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Преобразуем данные из Supabase в формат вашего Product
      return data.map(item => ({
        id: item.id,
        name: item.name || '',
        description: item.description || '',
        price: item.price || 0,
        categoryId: item.category_id || item.categoryId || 0,
        categoryName: item.category_name || item.categoryName || 'Без категории',
        imageUrls: this.parseImageUrls(item),
        stock: item.stock || 0,
        features: this.parseFeatures(item),
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));
    } catch (error) {
      console.error('❌ Ошибка получения продуктов:', error);
      return [];
    }
  }

  async addProduct(product: Partial<Product>): Promise<Product | null> {
  try {
    // Преобразуем Product в формат колонок Supabase
    const supabaseProduct = {
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: product.categoryId,    // Используем category_id
      category_name: product.categoryName, // Используем category_name
      image_urls: product.imageUrls,
      stock: product.stock,
      features: product.features
    };

    console.log('📤 Отправляем в Supabase:', supabaseProduct);

    const { data, error } = await this.supabase
      .from('products')
      .insert([supabaseProduct])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error (addProduct):', error);
      console.log('Проверьте:');
      console.log('1. Существуют ли колонки в таблице products');
      console.log('2. Правильность имен колонок');
      console.log('3. RLS политики');
      return null;
    }

    console.log('✅ Товар добавлен в Supabase:', data);
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      categoryId: data.category_id || product.categoryId, // Маппинг обратно
      categoryName: data.category_name || product.categoryName,
      imageUrls: data.image_urls || [],
      stock: data.stock,
      features: data.features || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  } catch (error) {
    console.error('❌ Ошибка добавления продукта:', error);
    return null;
  }
}

  async updateProduct(id: string, product: Partial<Product>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      // Маппинг полей
      if (product.name !== undefined) updateData.name = product.name;
      if (product.description !== undefined) updateData.description = product.description;
      if (product.price !== undefined) updateData.price = product.price;
      if (product.categoryId !== undefined) updateData.category_id = product.categoryId;
      if (product.categoryName !== undefined) updateData.category_name = product.categoryName;
      if (product.imageUrls !== undefined) updateData.image_urls = product.imageUrls;
      if (product.stock !== undefined) updateData.stock = product.stock;
      if (product.features !== undefined) updateData.features = product.features;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Ошибка обновления продукта:', error);
      return false;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления продукта:', error);
      return false;
    }
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
  private parseImageUrls(item: any): string[] {
    if (Array.isArray(item.image_urls)) return item.image_urls;
    if (item.image_url) return [item.image_url];
    if (item.imageUrls) return item.imageUrls;
    return [];
  }

  private parseFeatures(item: any): string[] {
    if (Array.isArray(item.features)) return item.features;
    if (typeof item.features === 'string') return [item.features];
    return [];
  }

  // ===== МЕТОДЫ ДЛЯ КАТЕГОРИЙ =====
   async getCategories(): Promise<CatalogCategory[]> {
  try {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Supabase error (getCategories):', error);
      return [];
    }

    // Проверяем данные для отладки
    console.log('📋 Получены категории из Supabase:', data);

    return data.map(item => ({
      id: item.id,
      title: item.title || '',
      image: item.image || '',
      slug: item.slug || '',
      description: item.description || '',
      order: item.order || 0,
      isActive: item.is_active !== false,
      createdAt: new Date(item.created_at)
    }));
  } catch (error) {
    console.error('❌ Ошибка получения категорий:', error);
    return [];
  }
}

  async addCategory(category: Partial<CatalogCategory>): Promise<CatalogCategory | null> {
    const supabaseData = {
      title: category.title,
      image: category.image,
      slug: category.slug,
      description: category.description,
      order: category.order,
      is_active: category.isActive !== false
    };

    const { data, error } = await this.supabase
      .from('categories')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error (addCategory):', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      image: data.image,
      slug: data.slug,
      description: data.description || '',
      order: data.order,
      isActive: data.is_active !== false,
      createdAt: new Date(data.created_at)
    };
  }

  async updateCategory(id: number, updates: Partial<CatalogCategory>): Promise<boolean> {
  try {
    const supabaseData: any = {};
    
    // Маппинг полей из Angular модели в SQL колонки
    if (updates.title !== undefined) supabaseData.title = updates.title;
    if (updates.image !== undefined) supabaseData.image = updates.image;
    if (updates.slug !== undefined) supabaseData.slug = updates.slug;
    if (updates.description !== undefined) supabaseData.description = updates.description;
    if (updates.order !== undefined) supabaseData.order = updates.order;
    if (updates.isActive !== undefined) supabaseData.is_active = updates.isActive;

    console.log('📤 Обновляем категорию в Supabase:', { id, supabaseData });

    const { error } = await this.supabase
      .from('categories')
      .update(supabaseData)
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase error (updateCategory):', error);
      return false;
    }

    console.log('✅ Категория обновлена в Supabase');
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления категории:', error);
    return false;
  }
}

async deleteCategory(id: number): Promise<boolean> {
  try {
    console.log('🗑️ Удаляем категорию из Supabase, ID:', id);

    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase error (deleteCategory):', error);
      return false;
    }

    console.log('✅ Категория удалена из Supabase');
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления категории:', error);
    return false;
  }
}

  // ===== МЕТОДЫ ДЛЯ МАГАЗИНОВ =====
  async getShops(): Promise<Shop[]> {
  try {
    const { data, error } = await this.supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения магазинов:', error);
      return [];
    }

    // Преобразуем данные из Supabase в формат вашего Shop
    return data.map(item => ({
      id: item.id.toString(), // Преобразуем в string
      title: item.title || '',
      address: item.address || '',
      description: item.description || '',
      imageUrl: item.image_url || '/assets/default-shop.jpg', // Значение по умолчанию
      phone: item.phone || '',
      email: item.email || '',
      workingHours: item.working_hours || '',
      coordinates: item.coordinates || undefined
    }));
  } catch (error) {
    console.error('❌ Ошибка получения магазинов:', error);
    return [];
  }
}

  // ===== МЕТОДЫ ДЛЯ МАГАЗИНОВ (ДОБАВЬТЕ ПОСЛЕ getShops) =====
async addShop(shop: Partial<Shop>): Promise<Shop | null> {
  try {
    const supabaseData = {
      title: shop.title,
      address: shop.address,
      description: shop.description,
      image_url: shop.imageUrl,
      phone: shop.phone,
      email: shop.email,
      working_hours: shop.workingHours,
      coordinates: shop.coordinates
    };

    console.log('📤 Добавляем магазин в Supabase:', supabaseData);

    const { data, error } = await this.supabase
      .from('shops')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error (addShop):', error);
      return null;
    }

    console.log('✅ Магазин добавлен в Supabase:', data);
    return {
      id: data.id.toString(),
      title: data.title,
      address: data.address,
      description: data.description || '',
      imageUrl: data.image_url || '',
      phone: data.phone || '',
      email: data.email || '',
      workingHours: data.working_hours || '',
      coordinates: data.coordinates
    };
  } catch (error) {
    console.error('❌ Ошибка добавления магазина:', error);
    return null;
  }
}

async updateShop(id: string, updates: Partial<Shop>): Promise<boolean> {
  try {
    const supabaseData: any = {};
    
    if (updates.title !== undefined) supabaseData.title = updates.title;
    if (updates.address !== undefined) supabaseData.address = updates.address;
    if (updates.description !== undefined) supabaseData.description = updates.description;
    if (updates.imageUrl !== undefined) supabaseData.image_url = updates.imageUrl;
    if (updates.phone !== undefined) supabaseData.phone = updates.phone;
    if (updates.email !== undefined) supabaseData.email = updates.email;
    if (updates.workingHours !== undefined) supabaseData.working_hours = updates.workingHours;
    if (updates.coordinates !== undefined) supabaseData.coordinates = updates.coordinates;

    console.log('📤 Обновляем магазин в Supabase:', { id, supabaseData });

    const { error } = await this.supabase
      .from('shops')
      .update(supabaseData)
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase error (updateShop):', error);
      return false;
    }

    console.log('✅ Магазин обновлен в Supabase');
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления магазина:', error);
    return false;
  }
}

async deleteShop(id: string): Promise<boolean> {
  try {
    console.log('🗑️ Удаляем магазин из Supabase, ID:', id);

    const { error } = await this.supabase
      .from('shops')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase error (deleteShop):', error);
      return false;
    }

    console.log('✅ Магазин удален из Supabase');
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления магазина:', error);
    return false;
  }
}

  // ===== КОНТАКТЫ (contact_info) =====
  async getContactInfo(): Promise<ContactInfo | null> {
  try {
    const { data, error } = await this.supabase
      .from('contact_info')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase error (getContactInfo):', error);
      return null;
    }

    // Если таблица пуста, возвращаем null
    if (!data || data.length === 0) {
      console.log('📭 Таблица contact_info пуста');
      return null;
    }

    return {
      id: data[0].id,
      phone: data[0].phone || '',
      email: data[0].email || '',
      office: data[0].office || '',
      workingHours: data[0].working_hours || '',
      mapEmbed: data[0].map_embed || '',
      social: data[0].social || []
    };
  } catch (error) {
    console.error('❌ Ошибка получения информации о компании:', error);
    return null;
  }
}

  // ===== СЛАЙДЫ (slides) =====
  async getSlides(): Promise<Slide[]> {
  try {
    const { data, error } = await this.supabase
      .from('slides')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Supabase error (getSlides):', error);
      return [];
    }

    // Если таблица пуста, возвращаем пустой массив
    if (!data || data.length === 0) {
      console.log('📭 Таблица slides пуста');
      return [];
    }

    return data.map(item => ({
      id: item.id,
      image: item.image || '',
      title: item.title || '',
      description: item.description || '',
      order: item.order || 0,
      isActive: item.is_active !== false,
      createdAt: new Date(item.created_at)
    }));
  } catch (error) {
    console.error('❌ Ошибка получения слайдов:', error);
    return [];
  }
}

  // ===== НАСТРОЙКИ ГЛАВНОЙ (homepage_settings) =====
  async getHomepageSettings(): Promise<HomePageSettings | null> {
  try {
    const { data, error } = await this.supabase
      .from('homepage_settings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase error (getHomepageSettings):', error);
      return null;
    }

    // Если таблица пуста, возвращаем null
    if (!data || data.length === 0) {
      console.log('📭 Таблица homepage_settings пуста');
      return null;
    }

    return {
      title: data[0].title || '',
      description: data[0].description || '',
      bannerImages: data[0].banner_images || [],
      featuredCategories: data[0].featured_categories || []
    };
  } catch (error) {
    console.error('❌ Ошибка получения настроек главной страницы:', error);
    return null;
  }
}

  async updateHomepageSettings(settings: HomePageSettings): Promise<boolean> {
  try {
    const updateData = {
      title: settings.title,
      description: settings.description,
      banner_images: settings.bannerImages || [],
      featured_categories: settings.featuredCategories || [],
      updated_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('homepage_settings')
      .update(updateData)
      .eq('id', 1); // Предполагаем, что есть только одна запись

    if (error) {
      console.error('❌ Ошибка обновления настроек главной страницы:', error);
      return false;
    }

    console.log('✅ Настройки главной страницы обновлены в Supabase');
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления настроек главной страницы:', error);
    return false;
  }
}

// Обновление информации о компании
async updateContactInfo(contactInfo: Partial<ContactInfo>): Promise<boolean> {
  try {
    console.log('📤 Обновляем контакты в Supabase:', contactInfo);
    
    const updateData: any = {};
    
    // Маппинг полей из Angular модели в SQL колонки
    if (contactInfo.phone !== undefined) updateData.phone = contactInfo.phone;
    if (contactInfo.email !== undefined) updateData.email = contactInfo.email;
    if (contactInfo.office !== undefined) updateData.office = contactInfo.office;
    if (contactInfo.workingHours !== undefined) updateData.working_hours = contactInfo.workingHours;
    if (contactInfo.mapEmbed !== undefined) updateData.map_embed = contactInfo.mapEmbed;
    if (contactInfo.social !== undefined) updateData.social = contactInfo.social;
    
    updateData.updated_at = new Date().toISOString();

    console.log('📝 Данные для обновления:', updateData);

    const { error } = await this.supabase
      .from('contact_info')
      .update(updateData)
      .eq('id', contactInfo.id || 1); // ID 1 по умолчанию

    if (error) {
      console.error('❌ Ошибка обновления контактов:', error);
      console.log('Проверьте:');
      console.log('1. Существует ли таблица contact_info');
      console.log('2. Правильность имен колонок');
      console.log('3. RLS политики');
      return false;
    }

    console.log('✅ Контакты обновлены в Supabase');
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления контактов:', error);
    return false;
  }
}

// Методы для работы со слайдами
async addSlide(slide: Slide): Promise<Slide | null> {
  try {
    const supabaseData = {
      image: slide.image,
      title: slide.title || '',
      description: slide.description || '',
      order: 0, // Нужно будет добавить логику порядка
      is_active: true
    };

    const { data, error } = await this.supabase
      .from('slides')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка добавления слайда:', error);
      return null;
    }

    console.log('✅ Слайд добавлен в Supabase:', data.title);
    return {
      image: data.image,
      title: data.title || '',
      description: data.description || ''
    };
  } catch (error) {
    console.error('❌ Ошибка добавления слайда:', error);
    return null;
  }
}

async updateSlide(id: number, updates: Partial<Slide>): Promise<boolean> {
  try {
    const updateData: any = {};
    
    if (updates.image !== undefined) updateData.image = updates.image;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    
    updateData.updated_at = new Date().toISOString();

    const { error } = await this.supabase
      .from('slides')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('❌ Ошибка обновления слайда:', error);
      return false;
    }

    console.log('✅ Слайд обновлен в Supabase');
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления слайда:', error);
    return false;
  }
}

async deleteSlide(id: number): Promise<boolean> {
  try {
    const { error } = await this.supabase
      .from('slides')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Ошибка удаления слайда:', error);
      return false;
    }

    console.log('✅ Слайд удален из Supabase');
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления слайда:', error);
    return false;
  }
}

// Создание начальных настроек главной страницы
async createHomepageSettings(settings: HomePageSettings): Promise<HomePageSettings | null> {
  try {
    const supabaseData = {
      title: settings.title,
      description: settings.description,
      banner_images: settings.bannerImages || [],
      featured_categories: settings.featuredCategories || []
    };

    const { data, error } = await this.supabase
      .from('homepage_settings')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка создания настроек главной страницы:', error);
      return null;
    }

    console.log('✅ Настройки главной страницы созданы в Supabase');
    return {
      title: data.title || '',
      description: data.description || '',
      bannerImages: data.banner_images || [],
      featuredCategories: data.featured_categories || []
    };
  } catch (error) {
    console.error('❌ Ошибка создания настроек главной страницы:', error);
    return null;
  }
}

// Создание начальной информации о компании
async createContactInfo(contactInfo: any): Promise<ContactInfo | null> {
  try {
    const supabaseData = {
      phone: contactInfo.phone,
      email: contactInfo.email,
      office: contactInfo.address,
      working_hours: contactInfo.workHours,
      social: []
    };

    const { data, error } = await this.supabase
      .from('contact_info')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка создания информации о компании:', error);
      return null;
    }

    console.log('✅ Информация о компании создана в Supabase');
    return {
      id: data.id,
      phone: data.phone || '',
      email: data.email || '',
      office: data.office || '',
      workingHours: data.working_hours || '',
      mapEmbed: data.map_embed || '',
      social: data.social || []
    };
  } catch (error) {
    console.error('❌ Ошибка создания информации о компании:', error);
    return null;
  }
}

// Создание слайдов
async createSlides(slides: Slide[]): Promise<boolean> {
  try {
    const supabaseData = slides.map((slide, index) => ({
      image: slide.image,
      title: slide.title || '',
      description: slide.description || '',
      order: index + 1,
      is_active: true
    }));

    const { error } = await this.supabase
      .from('slides')
      .insert(supabaseData);

    if (error) {
      console.error('❌ Ошибка создания слайдов:', error);
      return false;
    }

    console.log(`✅ Создано ${slides.length} слайдов в Supabase`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка создания слайдов:', error);
    return false;
  }
}

  // ===== ЗАЯВКИ (contact_submissions) =====
  async submitContactForm(submission: any): Promise<boolean> {
    const { error } = await this.supabase
      .from('contact_submissions')
      .insert([{
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        message: submission.message,
        status: 'new'
      }]);

    return !error;
  }

    // ===== ОБЩИЙ МЕТОД ПРОВЕРКИ =====
  async checkAllTables(): Promise<{ [key: string]: boolean }> {
    const tables = ['categories', 'products', 'shops', 'contact_info', 'slides', 'homepage_settings', 'contact_submissions'];
    const results: { [key: string]: boolean } = {};

    for (const table of tables) {
      try {
        const { error } = await this.supabase
          .from(table)
          .select('count')
          .limit(1);
        
        results[table] = !error;
      } catch (error) {
        results[table] = false;
      }
    }

    return results;
  }

  // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====
  
  // Проверить, существует ли таблица
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  // Создать таблицу если не существует (для разработки)
  async createTablesIfNotExist(): Promise<void> {
    console.log('Проверка таблиц в Supabase...');
    
    const tables = ['products', 'categories', 'shops'];
    
    for (const table of tables) {
      const exists = await this.tableExists(table);
      console.log(`${table}: ${exists ? '✅ существует' : '❌ не найдена'}`);
    }
  }
}