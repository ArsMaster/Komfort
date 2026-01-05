// Создайте новый файл
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-contacts-applications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-applications">
      <h2>Заявки с контактной формы</h2>
      
      <div *ngIf="applications.length === 0" class="empty-state">
        <p>Нет заявок</p>
      </div>
      
      <div *ngFor="let app of applications; let i = index" class="application-card">
        <div class="application-header">
          <h3>Заявка #{{ applications.length - i }}</h3>
          <span class="application-date">{{ app.date | date:'dd.MM.yyyy HH:mm' }}</span>
        </div>
        
        <div class="application-content">
          <p><strong>Имя:</strong> {{ app.name }}</p>
          <p><strong>Телефон:</strong> {{ app.phone }}</p>
          <p><strong>Согласие:</strong> {{ app.agree ? 'Да' : 'Нет' }}</p>
        </div>
        
        <button (click)="deleteApplication(i)" class="btn-delete">
          Удалить
        </button>
      </div>
    </div>
  `,
  styles: [`
    .admin-applications {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .application-card {
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
    }
    
    .application-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    
    .application-date {
      color: #666;
      font-size: 14px;
    }
    
    .application-content p {
      margin: 8px 0;
    }
    
    .btn-delete {
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 10px;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  `]
})
export class AdminContactsApplicationsComponent implements OnInit {
  applications: any[] = [];

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    const stored = localStorage.getItem('contactApplications');
    this.applications = stored ? JSON.parse(stored) : [];
    // Сортируем по дате (новые сверху)
    this.applications.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  deleteApplication(index: number): void {
    if (confirm('Удалить эту заявку?')) {
      this.applications.splice(index, 1);
      localStorage.setItem('contactApplications', JSON.stringify(this.applications));
    }
  }

  exportToCSV(): void {
  }
}