import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
        <div class="bg-surface-container-lowest rounded-xl p-6 max-w-sm w-full ambient-lift">
          <div class="flex items-start gap-4 mb-6">
            <div class="w-10 h-10 rounded-full bg-error-container flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-error">delete</span>
            </div>
            <div>
              <h3 class="font-semibold text-on-surface text-base mb-1">{{ title }}</h3>
              <p class="text-sm text-on-surface-variant">{{ message }}</p>
            </div>
          </div>
          <div class="flex gap-3 justify-end">
            <button class="btn-secondary" (click)="cancel.emit()">Cancel</button>
            <button class="btn-danger" (click)="confirm.emit()">Delete</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirm Delete';
  @Input() message = 'This action cannot be undone.';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
