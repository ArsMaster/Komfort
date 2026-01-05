import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AboutComponent } from './components/about/about.component';
import { ContactsComponent } from './components/contacts/contacts.component';
import { ProductsCatalogComponent } from './components/product-catalog/products-catalog.component';
import { AdminComponent } from './components/admin/admin.component';
import { LoginComponent } from './components/auth/login.component';
import { AuthGuard } from './guards/auth.guard';
import { ShopsComponent } from './components/shops/shops.component';
import { AdminShopsComponent } from './components/admin/admin-shops.component';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent 
  },
  { 
    path: 'about', 
    component: AboutComponent 
  },
  { 
    path: 'contacts', 
    component: ContactsComponent 
  },
  { 
    path: 'catalog/:category', 
    component: ProductsCatalogComponent,
  },
  { 
    path: 'shops', 
    component: ShopsComponent 
  },
  { 
    path: 'catalog', 
    component: ProductsCatalogComponent,
  },
  // НОВЫЙ МАРШРУТ: страница входа
  { 
    path: 'login', 
    component: LoginComponent 
  },
  
  // Защищенные админ-маршруты
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'products', 
        loadComponent: () => import('./components/admin-products/admin-products.component')
          .then(m => m.AdminProductsComponent),
      },
      { 
        path: 'catalog', 
        loadComponent: () => import('./components/admin/admin-catalog.component')
          .then(m => m.AdminCatalogComponent),
      },
      { 
        path: 'shops', 
        component: AdminShopsComponent 
      },
      { 
        path: 'contacts', 
        loadComponent: () => import('./components/admin/admin-contacts.component')
          .then(m => m.AdminContactsComponent),
      },
      { 
        path: 'home', 
        loadComponent: () => import('./components/admin/admin-home.component')
          .then(m => m.AdminHomeComponent),
      },
      { 
        path: '', 
        redirectTo: 'products', 
        pathMatch: 'full' 
      },
      { 
        path: 'logout', 
        loadComponent: () => import('./components/admin/admin-logout.component')
          .then(m => m.AdminLogoutComponent)
},
    ]
  },
  
  // Резервный маршрут
  { 
    path: '**', 
    redirectTo: '' 
  }
];