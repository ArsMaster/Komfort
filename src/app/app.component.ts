import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { ContactService } from './services/contact.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private contactService: ContactService) {}
  
  ngOnInit(): void {
    console.log('🚀 AppComponent инициализирован');
    
    // Предварительная загрузка контактов при запуске приложения
    setTimeout(() => {
      console.log('🔧 Предварительная загрузка контактов...');
      this.contactService.refreshContacts();
    }, 100);
  }
}