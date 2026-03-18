// supabase.service.ts - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
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

  public supabaseClient: SupabaseClient;

  constructor() {
    // Временное решение - потом замените на environment
    const supabaseUrl = 'https://czsfywxvxmxotmalasla.supabase.co';
    const supabaseKey = 'sb_publishable_fruepZeSusdLrlJE_xMZuw_wqbej0Fk';
    
     this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Тестируем подключение при инициализации
    this.testConnection();
  }

  // Метод для проверки подключения
  async testConnection(): Promise<void> {
    try {
      const { data, error } = await this.supabaseClient
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
      // ✅ ИСПРАВЛЕНИЕ: Используем JOIN или получаем категории отдельно
      const { data: productsData, error } = await this.supabaseClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Получаем категории для маппинга
      const { data: categoriesData } = await this.supabaseClient
        .from('categories')
        .select('id, title');

      // Создаем карту категорий для быстрого доступа
      const categoryMap = new Map<number, string>();
      if (categoriesData) {
        categoriesData.forEach(cat => {
          categoryMap.set(cat.id, cat.title);
        });
      }

      return productsData.map(item => {
        // ✅ ФИКС: Преобразуем строку image_urls в массив
        let imageUrls: string[] = [];
        
        if (item.image_urls) {
          if (typeof item.image_urls === 'string') {
            try {
              const parsed = JSON.parse(item.image_urls);
              if (Array.isArray(parsed)) {
                imageUrls = parsed;
              } else {
                imageUrls = [item.image_urls];
              }
            } catch {
              imageUrls = [item.image_urls];
            }
          } else if (Array.isArray(item.image_urls)) {
            imageUrls = item.image_urls;
          }
        }
        
        if (imageUrls.length === 0) {
          imageUrls = [''];
        }

        const categoryId = Number(item.category_id) || 0;
        
        // ✅ ВАЖНОЕ ИСПРАВЛЕНИЕ: Берем category_name из базы, если NULL - берем из карты категорий
        const categoryName = item.category_name || 
                            categoryMap.get(categoryId) || 
                            'Без категории';

        console.log(`📦 Товар "${item.name}":`, {
          categoryId: categoryId,
          categoryNameFromDB: item.category_name,
          categoryNameFromMap: categoryMap.get(categoryId),
          finalCategoryName: categoryName
        });

        return {
          id: item.id,
          name: item.name || '',
          description: item.description || '',
          price: Number(item.price) || 0,
          categoryId: categoryId,
          categoryName: categoryName, // ✅ Теперь всегда правильное название
          imageUrls: imageUrls,
          stock: item.stock || 0,
          features: item.features || [],
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at || item.created_at)
        };
      });
    } catch (error) {
      console.error('❌ Ошибка получения продуктов:', error);
      return [];
    }
  }

  async addProduct(product: {
    name: string;
    description: string;
    price: number;
    categoryId: number; // Явно число
    imageUrls: string[];
    stock: number;
    features: string[];
  }): Promise<Product | null> {
    try {
      // Получаем название категории из базы (всегда берем из БД, а не из параметров)
      let categoryName = 'Без категории';
      
      if (product.categoryId) {
        const { data: categoryData } = await this.supabaseClient
          .from('categories')
          .select('title')
          .eq('id', product.categoryId)
          .single();
        
        categoryName = categoryData?.title || 'Без категории';
      }

      const supabaseProduct = {
        name: product.name,
        description: product.description,
        price: product.price,
        category_id: product.categoryId,
        // ✅ ВАЖНО: Всегда берем category_name из базы данных
        category_name: categoryName,
        image_urls: JSON.stringify(product.imageUrls || []),
        stock: product.stock || 0,
        features: product.features || []
      };

      console.log('📤 Отправляем в Supabase:', supabaseProduct);

      const { data, error } = await this.supabaseClient
        .from('products')
        .insert([supabaseProduct])
        .select()
        .single();

      if (error) throw error;

      // ✅ ФИКС: Парсим image_urls обратно в массив
      let imageUrls: string[] = [];
      if (data.image_urls) {
        try {
          const parsed = JSON.parse(data.image_urls);
          imageUrls = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          imageUrls = [data.image_urls];
        }
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        price: Number(data.price),
        categoryId: Number(data.category_id),
        categoryName: data.category_name,
        imageUrls: imageUrls,
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
      
      // ✅ ВАЖНОЕ ИСПРАВЛЕНИЕ: Если меняем categoryId, всегда обновляем category_name из базы
      if (product.categoryId !== undefined) {
        updateData.category_id = product.categoryId;
        
        // Всегда получаем актуальное название категории из базы
        const { data: categoryData } = await this.supabaseClient
          .from('categories')
          .select('title')
          .eq('id', product.categoryId)
          .single();
        
        updateData.category_name = categoryData?.title || 'Без категории';
      }
      
      // Игнорируем переданный categoryName, всегда используем из базы
      if (product.imageUrls !== undefined) updateData.image_urls = JSON.stringify(product.imageUrls);
      if (product.stock !== undefined) updateData.stock = product.stock;
      if (product.features !== undefined) updateData.features = product.features;
      
      updateData.updated_at = new Date().toISOString();

      console.log('📤 Обновляем товар в Supabase:', { id, updateData });

      const { error } = await this.supabaseClient
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      console.log('✅ Товар обновлен в Supabase');
      return true;
    } catch (error) {
      console.error('❌ Ошибка обновления продукта:', error);
      return false;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseClient
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

  // ===== МЕТОДЫ ДЛЯ КАТЕГОРИЙ =====
  async getCategories(): Promise<CatalogCategory[]> {
    try {
      const { data, error } = await this.supabaseClient
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

    const { data, error } = await this.supabaseClient
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

      const { error } = await this.supabaseClient
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

      const { error } = await this.supabaseClient
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
      const { data, error } = await this.supabaseClient
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
        imageUrl: item.image_url || '', 
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

      const { data, error } = await this.supabaseClient
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

      const { error } = await this.supabaseClient
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

      const { error } = await this.supabaseClient
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
  async getContactInfo(): Promise<any> {
    try {
      const { data, error } = await this.supabaseClient
        .from('contact_info')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      
      if (!data) return null;

      // ВАЖНО: about_sections уже должен быть массивом (jsonb автоматически парсится)
      console.log('🔍 Supabase raw data:', {
        id: data.id,
        hasAboutSections: !!data.about_sections,
        aboutSectionsType: typeof data.about_sections,
        aboutSectionsValue: data.about_sections
      });

      return {
        id: data.id,
        phone: data.phone || '',
        email: data.email || '',
        office: data.office || '',
        workingHours: data.working_hours || '',
        mapEmbed: data.map_embed || '',
        social: data.social || [],
        about_sections: data.about_sections || [] // jsonb автоматически парсится
      };
    } catch (error) {
      console.error('❌ Ошибка получения контактов:', error);
      return null;
    }
  }

  async updateSlides(slides: any[]): Promise<boolean> {
    try {
      console.log('🔄 Обновление слайдов в Supabase...');
      console.log('Количество слайдов для обновления:', slides.length);
      
      // 1. Удаляем все старые слайды
      console.log('🗑️ Удаление старых слайдов...');
      const { error: deleteError } = await this.supabaseClient
        .from('slides')
        .delete()
        .neq('id', 0); // Удаляем все записи
      
      if (deleteError) {
        console.error('❌ Ошибка удаления старых слайдов:', deleteError);
        return false;
      }
      
      console.log('✅ Старые слайды удалены');
      
      // 2. Если нет новых слайдов, просто возвращаем успех
      if (slides.length === 0) {
        console.log('ℹ️ Нет слайдов для добавления');
        return true;
      }
      
      // 3. Подготавливаем данные для вставки
      const slidesToInsert = slides.map((slide, index) => {
        // Определяем imageUrl - используем image или imageUrl
        const imageUrl = slide.image || slide.imageUrl || '';
        
        return {
          image: imageUrl,
          title: slide.title || '',
          description: slide.description || '',
          order: index + 1,
          is_active: slide.isActive !== undefined ? slide.isActive : true,
          link: slide.link || '',
        };
      });
      
      console.log('📤 Данные для вставки:', slidesToInsert);
      
      // 4. Добавляем новые слайды
      const { error: insertError } = await this.supabaseClient
        .from('slides')
        .insert(slidesToInsert);
      
      if (insertError) {
        console.error('❌ Ошибка добавления новых слайдов:', insertError);
        return false;
      }
      
      console.log(`✅ Добавлено ${slides.length} слайдов в Supabase`);
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка обновления слайдов:', error);
      return false;
    }
  }

  // ===== СЛАЙДЫ (slides) =====
  async getSlides(): Promise<Slide[]> {
    try {
      const { data, error } = await this.supabaseClient
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
      const { data, error } = await this.supabaseClient
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

      const { error } = await this.supabaseClient
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
  async updateContactInfo(contactInfo: any): Promise<boolean> {
    try {
      console.log('🔄 Обновление информации о компании в Supabase...');
      console.log('Данные для обновления:', contactInfo);

      // 1. ПЕРВОЕ: Получаем текущие данные из базы, чтобы сохранить существующие social
      let existingSocial: any[] = [];
      try {
        const { data: currentData, error: fetchError } = await this.supabaseClient
          .from('contact_info')
          .select('social')
          .eq('id', 1)
          .single();
        
        if (!fetchError && currentData && currentData.social) {
          existingSocial = currentData.social;
          console.log('📋 Найдены существующие social сети:', existingSocial.length);
        } else if (fetchError && !fetchError.message.includes('No rows found')) {
          console.warn('⚠️ Не удалось получить текущие social:', fetchError.message);
        }
      } catch (fetchError) {
        console.warn('⚠️ Ошибка при получении текущих данных:', fetchError);
      }

      // 2. Определяем какие social сохранять:
      // - Если явно переданы новые social - используем их
      // - Если не переданы - сохраняем существующие
      // - Если нет ни тех ни других - пустой массив
      let socialToSave: any[];
      
      if (contactInfo.social !== undefined) {
        // Явно переданы social - используем их (даже если пустой массив)
        socialToSave = Array.isArray(contactInfo.social) ? contactInfo.social : [];
        console.log('✅ Используем переданные social сети:', socialToSave.length);
      } else {
        // Social не переданы - сохраняем существующие
        socialToSave = existingSocial;
        console.log('💾 Сохраняем существующие social сети:', socialToSave.length);
      }

      // 3. Подготавливаем данные для обновления
      const updateData: any = {
        phone: contactInfo.phone || '',
        email: contactInfo.email || '',
        office: contactInfo.office || contactInfo.address || '',
        working_hours: contactInfo.workingHours || contactInfo.workHours || '',
        social: socialToSave // ← КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: всегда сохраняем social
      };
      
      // Дополнительные поля
      if (contactInfo.aboutSections !== undefined) {
        updateData.about_sections = contactInfo.aboutSections;
      }
      
      if (contactInfo.mapEmbed !== undefined) {
        updateData.map_embed = contactInfo.mapEmbed;
      }
      
      console.log('📝 Преобразованные данные:', updateData);
      console.log('📱 Social данные для сохранения:', {
        hasSocial: socialToSave.length > 0,
        socialLength: socialToSave.length,
        social: socialToSave,
        source: contactInfo.social !== undefined ? 'переданы из формы' : 'взяты из базы'
      });
      
      // 4. Пробуем обновить с social
      const { data, error } = await this.supabaseClient
        .from('contact_info')
        .upsert({
          id: 1,
          ...updateData
        })
        .select();
      
      if (error) {
        console.error('❌ Ошибка обновления информации о компании:', error);
        
        // Если ошибка связана с полем social (колонка не существует)
        if (error.message.includes('social') || error.message.includes('column')) {
          console.log('⚠️ Проблема с колонкой social, пробуем без нее...');
          delete updateData.social;
          
          const { error: secondTry } = await this.supabaseClient
            .from('contact_info')
            .upsert({
              id: 1,
              ...updateData
            });
          
          if (secondTry) {
            console.error('❌ Вторая попытка тоже не удалась:', secondTry);
            return false;
          }
          
          console.log('✅ Информация о компании обновлена (без social)');
          return true;
        }
        
        return false;
      }
      
      console.log('✅ Информация о компании обновлена в Supabase');
      console.log('📊 Ответ от Supabase:', data);
      
      if (data && data[0]?.social) {
        console.log('📱 Social успешно сохранены:', data[0].social);
      } else if (data && data[0]) {
        console.log('📭 Social не сохранены в ответе');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка обновления информации о компании:', error);
      return false;
    }
  }
  
  async initializeHomepageData(): Promise<boolean> {
    try {
      console.log('🔧 Инициализация данных главной страницы в Supabase...');
      
      let allSuccess = true;
      
      // ⚠️ ЗАКОММЕНТИРУЙТЕ весь этот блок создания дефолтных данных!
      // Вместо этого просто проверьте подключение:
      
      // 1. Проверяем подключение к таблицам
      console.log('🔍 Проверка доступности таблиц...');
      
      const tablesExist = await this.checkAllTables();
      console.log('📊 Статус таблиц:', tablesExist);
      
      // 2. Если таблицы существуют, НЕ создаем дефолтные данные
      // Пусть администратор создает данные через админку
      
      console.log('ℹ️ Таблицы проверены. Создание дефолтных данных отключено.');
      console.log('ℹ️ Для создания данных используйте админ-панель.');
      
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка проверки таблиц:', error);
      return false;
    }
  }

  async syncHomepageData(data: {
    settings: HomePageSettings,
    slides: any[],
    companyInfo: any
  }): Promise<{ success: boolean, details: any }> {
    try {
      console.log('🔄 Запуск полной синхронизации главной страницы...');
      
      const results = {
        settings: false,
        slides: false,
        companyInfo: false
      };
      
      // 1. Синхронизация настроек
      console.log('1. Синхронизация настроек...');
      results.settings = await this.updateHomepageSettings(data.settings);
      
      // 2. Синхронизация слайдов
      console.log('2. Синхронизация слайдов...');
      results.slides = await this.updateSlides(data.slides);
      
      // 3. Синхронизация информации о компании
      console.log('3. Синхронизация информации о компании...');
      results.companyInfo = await this.updateContactInfo(data.companyInfo);
      
      const success = results.settings && results.slides && results.companyInfo;
      
      console.log('📊 Результаты синхронизации:', results);
      console.log(success ? '🎉 Синхронизация завершена успешно' : '⚠️ Были ошибки при синхронизации');
      
      return {
        success,
        details: results
      };
      
    } catch (error: any) { // ✅ Исправляем тип unknown
      console.error('❌ Ошибка синхронизации:', error);
      return {
        success: false,
        details: { error: error.message || String(error) } // ✅ Безопасное получение сообщения
      };
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

      const { data, error } = await this.supabaseClient
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

      const { error } = await this.supabaseClient
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
      const { error } = await this.supabaseClient
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

      const { data, error } = await this.supabaseClient
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

      const { data, error } = await this.supabaseClient
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

      const { error } = await this.supabaseClient
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
    const { error } = await this.supabaseClient
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
        const { error } = await this.supabaseClient
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
      const { error } = await this.supabaseClient
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
  
  // ===== ПУБЛИЧНЫЙ ДОСТУП К КЛИЕНТУ =====
  
  /**
   * Получает клиент Supabase для использования в других сервисах
   */
  getClient(): SupabaseClient {
    return this.supabaseClient;
  }
}