// app/components/image-upload/image-upload.component.ts
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-upload-container">
      <!-- Превью изображений -->
      <div class="preview-container" *ngIf="previewUrls.length > 0">
        <div class="preview-item" *ngFor="let url of previewUrls; let i = index">
          <img [src]="url" alt="Preview" class="preview-image">
          <button type="button" class="remove-btn" (click)="removeImage(i)" title="Удалить">
            ×
          </button>
        </div>
      </div>

      <!-- Кнопка загрузки -->
      <div class="upload-area" [class.drag-over]="isDragOver"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (drop)="onDrop($event)">
        
        <input type="file" #fileInput 
               [accept]="acceptTypes"
               [multiple]="multiple"
               (change)="onFileSelected($event)"
               style="display: none;">
        
        <div class="upload-content" (click)="fileInput.click()">
          <div class="upload-icon">📁</div>
          <p class="upload-text">
            {{ label || 'Нажмите для загрузки изображений' }}
          </p>
          <p class="upload-hint">
            или перетащите файлы сюда
          </p>
          <p class="file-info" *ngIf="maxSizeMB">
            Макс. размер: {{ maxSizeMB }}MB
          </p>
        </div>
      </div>

      <!-- Прогресс загрузки -->
      <div class="progress-container" *ngIf="isUploading">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="uploadProgress"></div>
        </div>
        <p class="progress-text">Загрузка: {{ uploadProgress }}%</p>
      </div>

      <!-- Ошибки -->
      <div class="error-message" *ngIf="errorMessage">
        ❌ {{ errorMessage }}
      </div>

      <!-- Информация о загруженных файлах -->
      <div class="uploaded-info" *ngIf="uploadedUrls.length > 0">
        <p>✅ Загружено изображений: {{ uploadedUrls.length }}</p>
      </div>
    </div>
  `,
  styles: [`
    .image-upload-container {
      margin: 20px 0;
      font-family: Arial, sans-serif;
    }

    .preview-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
    }

    .preview-item {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-btn {
      position: absolute;
      top: 5px;
      right: 5px;
      background: #ff4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .remove-btn:hover {
      background: #cc0000;
    }

    .upload-area {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: #f9f9f9;
    }

    .upload-area.drag-over {
      border-color: #007bff;
      background: #e7f3ff;
    }

    .upload-area:hover {
      border-color: #999;
      background: #f0f0f0;
    }

    .upload-content {
      pointer-events: none;
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }

    .upload-text {
      font-size: 16px;
      color: #333;
      margin: 0 0 5px 0;
    }

    .upload-hint {
      font-size: 14px;
      color: #666;
      margin: 0 0 10px 0;
    }

    .file-info {
      font-size: 12px;
      color: #888;
      margin: 0;
    }

    .progress-container {
      margin-top: 20px;
    }

    .progress-bar {
      height: 20px;
      background: #eee;
      border-radius: 10px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #4CAF50;
      transition: width 0.3s;
    }

    .progress-text {
      text-align: center;
      margin: 5px 0;
      font-size: 14px;
    }

    .error-message {
      color: #ff4444;
      background: #ffe6e6;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
    }

    .uploaded-info {
      margin-top: 10px;
      color: #28a745;
      font-size: 14px;
    }
  `]
})
export class ImageUploadComponent {
  @Input() label?: string;
  @Input() multiple = true;
  @Input() maxSizeMB = 5;
  @Input() acceptTypes = 'image/*';
  @Input() folder?: string;
  
  @Output() uploadComplete = new EventEmitter<string[]>();
  @Output() uploadError = new EventEmitter<string>();
  @Output() filesSelected = new EventEmitter<File[]>();

  previewUrls: string[] = [];
  uploadedUrls: string[] = [];
  isUploading = false;
  uploadProgress = 0;
  isDragOver = false;
  errorMessage = '';
  selectedFiles: File[] = [];

  constructor(private storageService: StorageService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private handleFiles(files: File[]): void {
    // Валидация файлов
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      if (!this.storageService.isImageFile(file)) {
        errors.push(`${file.name}: не является изображением`);
      } else if (!this.storageService.validateFileSize(file, this.maxSizeMB)) {
        errors.push(`${file.name}: превышает ${this.maxSizeMB}MB`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      this.errorMessage = errors.join(', ');
      this.uploadError.emit(this.errorMessage);
    }

    if (validFiles.length > 0) {
      this.selectedFiles = [...this.selectedFiles, ...validFiles];
      this.filesSelected.emit(this.selectedFiles);
      this.createPreviews(validFiles);
      this.errorMessage = '';
    }
  }

  private createPreviews(files: File[]): void {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result as string;
        this.previewUrls.push(result);
      };
      reader.readAsDataURL(file);
    });
  }

  async upload(): Promise<string[]> {
    if (this.selectedFiles.length === 0) {
      throw new Error('Нет файлов для загрузки');
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';

    try {
      // Симуляция прогресса (в реальном приложении используйте события)
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
        }
      }, 100);

      // Загружаем файлы в Supabase Storage
      const urls = await this.storageService.uploadMultipleFiles(
        this.selectedFiles,
        this.folder
      );

      clearInterval(progressInterval);
      this.uploadProgress = 100;
      
      this.uploadedUrls = urls;
      this.uploadComplete.emit(urls);
      
      return urls;

    } catch (error: any) {
      this.errorMessage = `Ошибка загрузки: ${error.message}`;
      this.uploadError.emit(this.errorMessage);
      throw error;
    } finally {
      setTimeout(() => {
        this.isUploading = false;
        this.uploadProgress = 0;
      }, 1000);
    }
  }

  removeImage(index: number): void {
    this.previewUrls.splice(index, 1);
    this.selectedFiles.splice(index, 1);
    this.filesSelected.emit(this.selectedFiles);
  }

  clear(): void {
    this.previewUrls = [];
    this.selectedFiles = [];
    this.uploadedUrls = [];
    this.errorMessage = '';
    this.filesSelected.emit([]);
  }

  getUploadedUrls(): string[] {
    return this.uploadedUrls;
  }
}