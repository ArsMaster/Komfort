// admin-contacts.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { ContactInfo } from '../../models/contact.model';

@Component({
  selector: 'app-admin-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-contacts.component.html',
  styleUrls: ['./admin-contacts.component.scss']
})
export class AdminContactsComponent implements OnInit {
  contacts!: ContactInfo;

  constructor(private contactService: ContactService) {}

  ngOnInit(): void {
    this.contacts = { ...this.contactService.getContacts() };
  }

  addSocial(): void {
    this.contacts.social.push({ name: '', url: '', icon: '' });
  }

  removeSocial(index: number): void {
    this.contacts.social.splice(index, 1);
  }

  saveContacts(): void {
    this.contactService.updateContacts(this.contacts);
    alert('Контакты сохранены!');
  }
}