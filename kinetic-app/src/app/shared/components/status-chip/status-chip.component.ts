import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
          [ngClass]="chipClass">
      {{ label || value }}
    </span>
  `
})
export class StatusChipComponent {
  @Input() value = '';
  @Input() label = '';
  @Input() type: 'status' | 'priority' = 'status';

  get chipClass(): string {
    const key = this.value?.toLowerCase().replace(/ /g, '_');
    if (this.type === 'priority') return `chip-${key}`;
    return `chip-${key}`;
  }
}
