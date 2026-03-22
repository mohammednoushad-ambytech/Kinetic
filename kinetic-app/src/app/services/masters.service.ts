import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Masters, StatusMaster, PriorityMaster, TaskTypeMaster, UserOption } from '../models';

@Injectable({ providedIn: 'root' })
export class MastersService {
  statuses = signal<StatusMaster[]>([]);
  priorities = signal<PriorityMaster[]>([]);
  taskTypes = signal<TaskTypeMaster[]>([]);
  users = signal<UserOption[]>([]);
  loaded = signal(false);

  constructor(private api: ApiService) {}

  load() {
    if (this.loaded()) return;
    this.api.getMasters().subscribe({
      next: (m: Masters) => {
        this.statuses.set(m.statuses || []);
        this.priorities.set(m.priorities || []);
        this.taskTypes.set(m.taskTypes || []);
        this.users.set(m.users || []);
        this.loaded.set(true);
      }
    });
  }

  getStatusLabel(name: string): string {
    return this.statuses().find(s => s.status_name === name)?.status_label ?? name;
  }

  getPriorityLabel(id: string): string {
    return this.priorities().find(p => p.priority_id === id)?.priority_label ?? id;
  }

  getTypeLabel(id: string): string {
    return this.taskTypes().find(t => t.type_id === id)?.type_label ?? id;
  }

  getUserName(id: string): string {
    return this.users().find(u => u.user_id === id)?.display_name ?? id;
  }

  getAssigneeNames(pipe: string): string {
    if (!pipe) return '—';
    return pipe.split('|').map(id => this.getUserName(id.trim())).join(', ');
  }

  // Project statuses only
  projectStatuses(): StatusMaster[] {
    return this.statuses().filter(s => s.applies_to === 'both');
  }

  // Task statuses
  taskStatuses(): StatusMaster[] {
    return this.statuses();
  }
}
