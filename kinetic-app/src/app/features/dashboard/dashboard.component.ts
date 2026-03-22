import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MastersService } from '../../services/masters.service';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { DashboardData, Task, ProjectStat, StatusGroup } from '../../models';
import { NotificationService } from '../../services/notification.service';
import { isOverdue, formatDate, daysUntil } from '../../utils/date.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusChipComponent, DecimalPipe],
  template: `
    <div class="p-6 md:p-8 space-y-8">

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-pulse mb-2"></div>
      }

      <!-- Welcome row -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Overview</p>
          <h1 class="text-3xl font-bold tracking-tight text-on-surface">
            Good {{ greeting() }}, {{ firstName() }}
          </h1>
          <p class="text-xs text-outline mt-1">{{ todayLabel() }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="refresh()" [disabled]="loading()"
                  class="btn-secondary text-xs" title="Refresh dashboard">
            <span class="material-symbols-outlined text-sm" [class.animate-spin]="loading()">refresh</span>
            Refresh
          </button>
          <a routerLink="/projects" class="btn-secondary text-xs">
            <span class="material-symbols-outlined text-sm">folder_open</span>
            Projects
          </a>
          <a routerLink="/tasks" class="btn-primary text-xs">
            <span class="material-symbols-outlined text-sm">add_task</span>
            New Task
          </a>
        </div>
      </div>

      <!-- Stats cards -->
      @if (data()) {
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <a routerLink="/tasks" class="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant/10 ambient-lift hover:border-primary/20 transition-colors">
            <p class="text-[10px] font-bold text-secondary tracking-wider uppercase mb-2">Total Projects</p>
            <div class="flex items-end justify-between">
              <span class="text-3xl font-bold">{{ data()!.stats.totalProjects }}</span>
              <span class="material-symbols-outlined text-primary">folder_open</span>
            </div>
          </a>
          <a routerLink="/tasks" class="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant/10 ambient-lift hover:border-primary/20 transition-colors">
            <p class="text-[10px] font-bold text-secondary tracking-wider uppercase mb-2">Open Tasks</p>
            <div class="flex items-end justify-between">
              <span class="text-3xl font-bold text-on-surface">{{ data()!.stats.openTasks }}</span>
              <span class="material-symbols-outlined text-primary">pending_actions</span>
            </div>
          </a>
          <a routerLink="/tasks" class="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant/10 ambient-lift hover:border-primary/20 transition-colors">
            <p class="text-[10px] font-bold text-secondary tracking-wider uppercase mb-2">In Progress</p>
            <div class="flex items-end justify-between">
              <span class="text-3xl font-bold text-on-surface">{{ data()!.stats.inProgressTasks }}</span>
              <span class="material-symbols-outlined text-primary">running_with_errors</span>
            </div>
          </a>
          <a routerLink="/tasks" class="bg-error-container/30 p-5 rounded-lg border border-error/10 ambient-lift hover:border-error/30 transition-colors"
             [class.bg-error-container]="data()!.stats.overdueTasks > 0">
            <p class="text-[10px] font-bold tracking-wider uppercase mb-2"
               [class.text-error]="data()!.stats.overdueTasks > 0"
               [class.text-secondary]="data()!.stats.overdueTasks === 0">Overdue</p>
            <div class="flex items-end justify-between">
              <span class="text-3xl font-bold" [class.text-error]="data()!.stats.overdueTasks > 0">{{ data()!.stats.overdueTasks }}</span>
              <span class="material-symbols-outlined" [class.text-error]="data()!.stats.overdueTasks > 0"
                    style="font-variation-settings:'FILL' 1;">warning</span>
            </div>
          </a>
          <a routerLink="/tasks" class="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant/10 ambient-lift hover:border-primary/20 transition-colors">
            <p class="text-[10px] font-bold text-secondary tracking-wider uppercase mb-2">Completed</p>
            <div class="flex items-end justify-between">
              <span class="text-3xl font-bold text-tertiary-container">{{ data()!.stats.completedTasks }}</span>
              <span class="material-symbols-outlined text-tertiary-container" style="font-variation-settings:'FILL' 1;">verified</span>
            </div>
          </a>
        </div>

        <!-- Today's Tasks panel -->
        @if ((data()!.todaysTasks ?? []).length > 0) {
          <div class="bg-error-container/20 border border-error/20 rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-error/10 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-error" style="font-variation-settings:'FILL' 1;">alarm</span>
                <div>
                  <h3 class="text-sm font-semibold text-on-surface">Today's Tasks</h3>
                  <p class="text-[10px] text-outline mt-0.5">{{ (data()!.todaysTasks ?? []).length }} task(s) due today — act now</p>
                </div>
              </div>
              <a routerLink="/tasks" class="text-xs font-semibold text-error">View All</a>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-error/10">
              @for (task of (data()!.todaysTasks ?? []).slice(0, 6); track task.task_id) {
                <div class="p-4 hover:bg-error-container/10 transition-colors">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-on-surface truncate">{{ task.task_title }}</p>
                      <p class="text-[10px] text-outline mt-0.5">{{ getProjectName(task.project_id_fk) }}</p>
                    </div>
                    <app-status-chip [value]="task.task_status" [label]="masters.getStatusLabel(task.task_status)" />
                  </div>
                  @if (task.task_assignees) {
                    <p class="text-[10px] text-outline mt-2 flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs">person</span>
                      {{ masters.getAssigneeNames(task.task_assignees) }}
                    </p>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Tasks by Status panels — All Projects, All Time -->
        @if ((data()!.statusGroups ?? []).length > 0) {
          <div>
            <h3 class="text-sm font-semibold text-on-surface mb-3">Tasks by Status — All Projects</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              @for (sg of (data()!.statusGroups ?? []); track sg.status) {
                <a routerLink="/tasks"
                   [class]="sg.tasks.length > 0
                     ? 'rounded-xl p-4 border transition-colors cursor-pointer block bg-surface-container-lowest ambient-lift border-outline-variant/10 hover:border-primary/20'
                     : 'rounded-xl p-4 border transition-colors cursor-pointer block bg-surface-container-low border-outline-variant/5 opacity-50'">
                  <div class="flex items-center justify-between mb-2">
                    <app-status-chip [value]="sg.status" [label]="sg.label" />
                  </div>
                  <p class="text-2xl font-bold" [class]="sg.tasks.length > 0 ? 'text-on-surface' : 'text-outline'">{{ sg.tasks.length }}</p>
                  <p class="text-[10px] text-outline mt-1 truncate">{{ sg.tasks.length > 0 ? getStatusTaskSummary(sg) : 'No tasks' }}</p>
                </a>
              }
            </div>
          </div>
        }

        <!-- Bento grid -->
        <div class="grid grid-cols-12 gap-6">

          <!-- Left: Project performance -->
          <div class="col-span-12 lg:col-span-4 space-y-6">

            <!-- Project performance -->
            <div class="bg-surface-container-lowest p-6 rounded-xl ambient-lift">
              <h3 class="text-sm font-semibold text-on-surface mb-4">Project Performance</h3>
              @if (data()!.projectStats.length === 0) {
                <p class="text-sm text-on-surface-variant">No projects yet.</p>
              }
              <div class="space-y-5">
                @for (ps of data()!.projectStats; track ps.project_id) {
                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-sm font-medium text-on-surface truncate max-w-[150px]" [title]="ps.project_name">{{ ps.project_name }}</span>
                      <span class="text-xs font-semibold text-secondary ml-2 flex-shrink-0">{{ ps.completed }}/{{ ps.total }}</span>
                    </div>
                    <div class="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                      <div class="bg-primary h-full rounded-full transition-all duration-500"
                           [style.width.%]="ps.total ? (ps.completed / ps.total * 100) : 0"></div>
                    </div>
                    <div class="flex items-center gap-3 mt-1.5 text-[10px] text-outline">
                      <span>{{ ps.open }} open</span>
                      <span>{{ ps.in_progress }} in progress</span>
                      @if (ps.total) {
                        <span class="ml-auto font-semibold text-primary">{{ (ps.completed / ps.total * 100) | number:'1.0-0' }}%</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Summary totals -->
            <div class="bg-surface-container-lowest p-6 rounded-xl ambient-lift">
              <h3 class="text-sm font-semibold text-on-surface mb-4">Task Summary</h3>
              <div class="space-y-3">
                @let total = data()!.stats.openTasks + data()!.stats.inProgressTasks + data()!.stats.completedTasks + data()!.stats.overdueTasks;
                @if (total === 0) {
                  <p class="text-sm text-on-surface-variant">No tasks yet.</p>
                }
                @if (total > 0) {
                  <div class="flex items-center gap-3">
                    <div class="w-full bg-surface-container-low h-3 rounded-full overflow-hidden flex">
                      <div class="bg-tertiary-container h-full transition-all" [style.width.%]="total ? (data()!.stats.completedTasks / total * 100) : 0" title="Completed"></div>
                      <div class="bg-primary h-full transition-all" [style.width.%]="total ? (data()!.stats.inProgressTasks / total * 100) : 0" title="In Progress"></div>
                      <div class="bg-secondary-container h-full transition-all" [style.width.%]="total ? (data()!.stats.openTasks / total * 100) : 0" title="Open"></div>
                      <div class="bg-error-container h-full transition-all" [style.width.%]="total ? (data()!.stats.overdueTasks / total * 100) : 0" title="Overdue"></div>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-tertiary-container flex-shrink-0"></div>
                      <span class="text-on-surface-variant">Completed</span>
                      <span class="ml-auto font-bold">{{ data()!.stats.completedTasks }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"></div>
                      <span class="text-on-surface-variant">In Progress</span>
                      <span class="ml-auto font-bold">{{ data()!.stats.inProgressTasks }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-secondary-container flex-shrink-0"></div>
                      <span class="text-on-surface-variant">Open</span>
                      <span class="ml-auto font-bold">{{ data()!.stats.openTasks }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-error flex-shrink-0"></div>
                      <span class="text-on-surface-variant">Overdue</span>
                      <span class="ml-auto font-bold text-error">{{ data()!.stats.overdueTasks }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right: Upcoming + Recent -->
          <div class="col-span-12 lg:col-span-8 space-y-6">

            <!-- Upcoming tasks -->
            <div class="bg-surface-container-lowest rounded-xl ambient-lift overflow-hidden">
              <div class="p-6 border-b border-surface-container-low flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-on-surface">Upcoming Due Tasks</h3>
                  <p class="text-[10px] text-outline mt-0.5">Next 7 days</p>
                </div>
                <a routerLink="/tasks" class="text-xs font-semibold text-primary">See All</a>
              </div>
              @if (data()!.upcomingTasks.length === 0) {
                <div class="p-8 text-center">
                  <span class="material-symbols-outlined text-3xl text-outline/30 block mb-2">event_available</span>
                  <p class="text-sm text-on-surface-variant">No tasks due in the next 7 days.</p>
                </div>
              }
              <div>
                @for (task of data()!.upcomingTasks; track task.task_id) {
                  <div class="p-4 hover:bg-surface-container-low/40 transition-colors flex items-center gap-4 border-b border-surface-container last:border-0">
                    <div class="w-10 h-10 rounded-lg flex-shrink-0 flex flex-col items-center justify-center text-center"
                         [class]="isOverdue(task.task_end_date, task.task_status) ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-secondary'">
                      <span class="text-[9px] font-bold uppercase leading-none">{{ task.task_end_date | date:'MMM' }}</span>
                      <span class="text-base font-bold leading-none">{{ task.task_end_date | date:'d' }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h4 class="text-sm font-semibold text-on-surface truncate">{{ task.task_title }}</h4>
                      <div class="flex items-center gap-2 mt-1 flex-wrap">
                        <span class="text-[10px] font-bold bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full">
                          {{ getProjectName(task.project_id_fk) }}
                        </span>
                        @if (task.priority_id) {
                          <app-status-chip [value]="masters.getPriorityLabel(task.priority_id)"
                                           [label]="masters.getPriorityLabel(task.priority_id)" type="priority" />
                        }
                        <span class="text-xs text-secondary flex items-center gap-1">
                          <span class="material-symbols-outlined text-sm">schedule</span>
                          {{ daysUntil(task.task_end_date!) }}
                        </span>
                      </div>
                      @if (task.task_assignees) {
                        <p class="text-[10px] text-outline mt-0.5">{{ masters.getAssigneeNames(task.task_assignees) }}</p>
                      }
                    </div>
                    <app-status-chip [value]="task.task_status" [label]="masters.getStatusLabel(task.task_status)" />
                  </div>
                }
              </div>
            </div>

            <!-- Recent tasks table -->
            <div class="bg-surface-container-lowest rounded-xl ambient-lift overflow-hidden">
              <div class="p-6 border-b border-surface-container-low flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-on-surface">Recent Task Activity</h3>
                  <p class="text-[10px] text-outline mt-0.5">Last 5 modified tasks</p>
                </div>
                @if (lastRefreshed()) {
                  <span class="text-[10px] text-outline">Updated {{ lastRefreshed() }}</span>
                }
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left k-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th class="text-right">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (data()!.recentTasks.length === 0) {
                      <tr><td colspan="5" class="text-center py-8 text-on-surface-variant">No tasks yet.</td></tr>
                    }
                    @for (task of data()!.recentTasks; track task.task_id) {
                      <tr [class.row-overdue]="isOverdue(task.task_end_date, task.task_status)">
                        <td>
                          <div class="font-semibold text-on-surface">{{ task.task_title }}</div>
                          @if (task.task_assignees) {
                            <div class="text-[10px] text-outline mt-0.5">{{ masters.getAssigneeNames(task.task_assignees) }}</div>
                          }
                          @if (isOverdue(task.task_end_date, task.task_status)) {
                            <span class="text-[10px] text-error font-bold">OVERDUE · Due {{ formatDate(task.task_end_date) }}</span>
                          }
                        </td>
                        <td>
                          <span class="text-[10px] bg-secondary-fixed/50 text-on-secondary-fixed-variant px-2 py-0.5 rounded-full">
                            {{ getProjectName(task.project_id_fk) }}
                          </span>
                        </td>
                        <td>
                          @if (task.priority_id) {
                            <app-status-chip [value]="masters.getPriorityLabel(task.priority_id)"
                                             [label]="masters.getPriorityLabel(task.priority_id)" type="priority" />
                          } @else {
                            <span class="text-outline text-xs">—</span>
                          }
                        </td>
                        <td>
                          <app-status-chip [value]="task.task_status" [label]="masters.getStatusLabel(task.task_status)" />
                        </td>
                        <td class="text-right text-secondary">{{ formatDate(task.last_modified_on) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Error -->
      @if (errorMsg()) {
        <div class="p-4 bg-error-container rounded-lg text-on-error-container text-sm">{{ errorMsg() }}</div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  data = signal<DashboardData | null>(null);
  loading = signal(true);
  errorMsg = signal('');
  lastRefreshed = signal('');
  private projects: {id: string; name: string}[] = [];

  constructor(
    private api: ApiService,
    public auth: AuthService,
    public masters: MastersService,
    private notif: NotificationService
  ) {}

  ngOnInit() { this.load(); }

  load() {
    const userId = this.auth.currentUser()?.user_id;
    if (!userId) return;
    this.loading.set(true);
    this.errorMsg.set('');

    this.api.getDashboard(userId).subscribe({
      next: (d) => {
        this.data.set(d);
        this.projects = d.projectStats.map(p => ({ id: p.project_id, name: p.project_name }));
        this.loading.set(false);
        const now = new Date();
        this.lastRefreshed.set(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        this.notif.setTodayTasks(d.todaysTasks ?? []);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.loading.set(false);
      }
    });
  }

  refresh() { this.load(); }

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }

  firstName(): string {
    return this.auth.currentUser()?.display_name?.split(' ')[0] ?? '';
  }

  todayLabel(): string {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  getProjectName(id: string): string {
    return this.projects.find(p => p.id === id)?.name ?? id;
  }

  isOverdue = isOverdue;
  formatDate = formatDate;
  daysUntil = daysUntil;

  getStatusTaskSummary(sg: { tasks: Task[] }): string {
    if (!sg.tasks.length) return 'No tasks';
    const projects = new Set(sg.tasks.map(t => t.project_id_fk));
    return `${sg.tasks.length} task${sg.tasks.length > 1 ? 's' : ''} · ${projects.size} project${projects.size > 1 ? 's' : ''}`;
  }
}
