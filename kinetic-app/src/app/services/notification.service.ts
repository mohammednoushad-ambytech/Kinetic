import { Injectable, signal } from '@angular/core';
import { Task } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  todayTasks = signal<Task[]>([]);
  dismissed = signal(false);

  setTodayTasks(tasks: Task[]) {
    this.todayTasks.set(tasks);
    this.dismissed.set(false);
  }

  dismiss() { this.dismissed.set(true); }

  hasTodayTasks(): boolean {
    return this.todayTasks().length > 0 && !this.dismissed();
  }
}
