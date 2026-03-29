import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MastersService } from '../../services/masters.service';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Task, Project, TaskFilter, TaskArtifact } from '../../models';
import { isOverdue, formatDate, toDateInputValue, todayStr } from '../../utils/date.utils';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StatusChipComponent, ConfirmDialogComponent],
  template: `
    <div class="p-6 md:p-8">
      @if (loading()) { <div class="loading-pulse mb-4"></div> }

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Work</p>
          <h2 class="text-3xl font-bold tracking-tight text-on-surface">Task Management</h2>
        </div>
        <!-- Only show create if user has TASK_CREATE permission -->
        @if (auth.canCreateTasks()) {
          <button class="btn-primary" (click)="openCreate()">
            <span class="material-symbols-outlined">add</span>
            Create Task
          </button>
        }
      </div>

      <!-- Filter bar -->
      <div class="bg-surface-container-low rounded-xl p-4 mb-6">
        <div class="flex flex-wrap items-center gap-3">

          <!-- Multi-select projects -->
          <div class="relative">
            <button class="px-3 py-2 bg-surface-container-lowest ghost-border rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-white transition-colors"
                    (click)="projectDropOpen.set(!projectDropOpen())">
              <span class="material-symbols-outlined text-sm">filter_alt</span>
              {{ filterProjectLabel() }}
              <span class="material-symbols-outlined text-xs">expand_more</span>
            </button>
            @if (projectDropOpen()) {
              <div class="absolute top-full left-0 mt-1 bg-surface-container-lowest rounded-lg shadow-ambient border border-outline-variant/20 p-2 z-20 min-w-[180px]">
                @for (p of accessibleProjects(); track p.project_id) {
                  <label class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container-low cursor-pointer text-xs">
                    <input type="checkbox" [checked]="filter.projectIds.includes(p.project_id)"
                           (change)="toggleProject(p.project_id)" class="rounded" />
                    {{ p.project_name }}
                  </label>
                }
              </div>
            }
          </div>

          <!-- Status -->
          <select class="px-3 py-2 bg-surface-container-lowest ghost-border rounded-lg text-xs font-medium outline-none"
                  [(ngModel)]="filter.status" (change)="applyFilter()">
            <option value="">All Statuses</option>
            @for (s of masters.taskStatuses(); track s.status_id) {
              <option [value]="s.status_name">{{ s.status_label }}</option>
            }
          </select>

          <!-- Priority -->
          <select class="px-3 py-2 bg-surface-container-lowest ghost-border rounded-lg text-xs font-medium outline-none"
                  [(ngModel)]="filter.priority" (change)="applyFilter()">
            <option value="">All Priorities</option>
            @for (p of masters.priorities(); track p.priority_id) {
              <option [value]="p.priority_id">{{ p.priority_label }}</option>
            }
          </select>

          <!-- Assignee -->
          <select class="px-3 py-2 bg-surface-container-lowest ghost-border rounded-lg text-xs font-medium outline-none"
                  [(ngModel)]="filter.assignee" (change)="applyFilter()">
            <option value="">All Assignees</option>
            @for (u of masters.users(); track u.user_id) {
              <option [value]="u.user_id">{{ u.display_name }}</option>
            }
          </select>

          <!-- Search -->
          <div class="relative flex-1 min-w-[160px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">search</span>
            <input type="text" placeholder="Search tasks..."
                   class="w-full pl-9 pr-3 py-2 bg-surface-container-lowest ghost-border rounded-lg text-xs outline-none"
                   [(ngModel)]="filter.titleSearch" (input)="applyFilter()" />
          </div>

          <!-- Due date range -->
          <div class="flex items-center gap-1">
            <input type="date"
                   class="px-2.5 py-2 bg-surface-container-lowest ghost-border rounded-lg text-xs outline-none"
                   [(ngModel)]="filter.dueDateFrom" (change)="applyFilter()" title="Due date from" />
            <span class="text-xs text-outline">–</span>
            <input type="date"
                   class="px-2.5 py-2 bg-surface-container-lowest ghost-border rounded-lg text-xs outline-none"
                   [(ngModel)]="filter.dueDateTo" (change)="applyFilter()" title="Due date to" />
          </div>

          <!-- Today quick filter -->
          <button class="px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  [class.bg-primary]="isTodayFilter()" [class.text-on-primary]="isTodayFilter()"
                  [class.bg-surface-container-lowest]="!isTodayFilter()"
                  [class.ghost-border]="!isTodayFilter()"
                  (click)="toggleTodayFilter()">
            <span class="material-symbols-outlined text-sm">today</span>
            Today
          </button>

          <!-- Overdue toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <div class="relative w-8 h-4 rounded-full transition-colors"
                 [class.bg-primary]="filter.overdueOnly" [class.bg-slate-200]="!filter.overdueOnly"
                 (click)="filter.overdueOnly = !filter.overdueOnly; applyFilter()">
              <div class="absolute top-0.5 h-3 w-3 bg-white rounded-full shadow transition-transform"
                   [class.left-0.5]="!filter.overdueOnly" [class.left-4]="filter.overdueOnly"></div>
            </div>
            <span class="text-xs font-medium text-on-surface-variant">Overdue</span>
          </label>

          @if (hasFilter()) {
            <button class="text-xs text-primary font-medium hover:underline" (click)="clearFilter()">Clear</button>
          }

          <!-- View mode toggle -->
          <div class="ml-auto flex items-center gap-1 bg-surface-container-highest rounded-lg p-1">
            <button (click)="viewMode.set('table')"
                    class="p-1.5 rounded-md transition-colors text-xs"
                    [class.bg-white]="viewMode() === 'table'"
                    [class.shadow-sm]="viewMode() === 'table'"
                    [class.text-primary]="viewMode() === 'table'"
                    [class.text-outline]="viewMode() !== 'table'"
                    title="Table view">
              <span class="material-symbols-outlined text-sm">table_rows</span>
            </button>
            <button (click)="viewMode.set('kanban')"
                    class="p-1.5 rounded-md transition-colors text-xs"
                    [class.bg-white]="viewMode() === 'kanban'"
                    [class.shadow-sm]="viewMode() === 'kanban'"
                    [class.text-primary]="viewMode() === 'kanban'"
                    [class.text-outline]="viewMode() !== 'kanban'"
                    title="Kanban view">
              <span class="material-symbols-outlined text-sm">view_kanban</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Table view -->
      @if (viewMode() === 'table') {
      <div class="bg-surface-container-lowest rounded-xl ambient-lift overflow-hidden ghost-border">
        <table class="w-full text-left k-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Title</th>
              <th>Project</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assignees</th>
              <th>Start</th>
              <th>End</th>
              <th class="text-right">Hours</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @if (filtered().length === 0 && !loading()) {
              <tr><td colspan="10" class="text-center py-12 text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl block mb-2 opacity-30">check_circle</span>
                No tasks found.
              </td></tr>
            }
            @for (t of filtered(); track t.task_id) {
              <tr class="group" [class.row-overdue]="isOverdue(t.task_end_date, t.task_status)">
                <td class="text-xs font-medium text-outline">{{ t.task_id }}</td>
                <td class="max-w-xs cursor-pointer" (click)="expandedTaskId.set(expandedTaskId() === t.task_id ? null : t.task_id)">
                  <div class="flex flex-col transition-all"
                       [class.bg-primary-fixed]="expandedTaskId() === t.task_id"
                       [class.rounded-lg]="expandedTaskId() === t.task_id"
                       [class.p-2]="expandedTaskId() === t.task_id"
                       [class.-m-2]="expandedTaskId() === t.task_id">
                    <div class="flex items-start gap-1">
                      <span class="font-semibold text-on-surface"
                            [class.line-clamp-2]="expandedTaskId() !== t.task_id"
                            [class.text-primary]="expandedTaskId() === t.task_id">{{ t.task_title }}</span>
                      <span class="material-symbols-outlined text-[12px] text-outline flex-shrink-0 mt-0.5 transition-transform"
                            [class.rotate-180]="expandedTaskId() === t.task_id">expand_more</span>
                    </div>
                    @if (t.task_remarks) {
                      <span class="text-[10px] text-on-surface-variant mt-0.5 opacity-70"
                            [class.line-clamp-1]="expandedTaskId() !== t.task_id">{{ t.task_remarks }}</span>
                    }
                    @if (isOverdue(t.task_end_date, t.task_status)) {
                      <span class="text-[10px] text-error font-bold flex items-center gap-1 mt-0.5">
                        <span class="material-symbols-outlined text-xs">event_busy</span>
                        Overdue
                      </span>
                    }
                  </div>
                </td>
                <td class="text-xs text-on-surface-variant">{{ getProjectName(t.project_id_fk) }}</td>
                <td>
                  <app-status-chip [value]="t.task_status" [label]="masters.getStatusLabel(t.task_status)" />
                </td>
                <td>
                  @if (t.priority_id) {
                    <app-status-chip [value]="getPriorityName(t.priority_id)"
                                     [label]="masters.getPriorityLabel(t.priority_id)" type="priority" />
                  }
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    @for (uid of getAssigneeIds(t.task_assignees); track uid) {
                      <span class="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded-full">
                        {{ masters.getUserName(uid) }}
                      </span>
                    }
                  </div>
                </td>
                <td class="text-xs text-on-surface-variant whitespace-nowrap">
                  {{ t.task_start_date ? formatDate(t.task_start_date) : '—' }}
                </td>
                <td class="text-xs whitespace-nowrap"
                    [class.text-error]="isOverdue(t.task_end_date, t.task_status)"
                    [class.font-semibold]="isOverdue(t.task_end_date, t.task_status)"
                    [class.text-on-surface-variant]="!isOverdue(t.task_end_date, t.task_status)">
                  {{ t.task_end_date ? formatDate(t.task_end_date) : '—' }}
                </td>
                <td class="text-right">
                  <div class="text-[10px] font-bold text-on-surface">{{ t.spent_hours || 0 }} / {{ t.estimated_hours || 0 }}h</div>
                  <div class="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                    <div class="h-full rounded-full transition-all"
                         [class.bg-error]="isOverdue(t.task_end_date, t.task_status)"
                         [class.bg-primary]="!isOverdue(t.task_end_date, t.task_status)"
                         [style.width.%]="hoursPercent(t)"></div>
                  </div>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="viewTask(t)" title="View"
                            class="p-1.5 hover:bg-surface-container rounded-lg transition-colors">
                      <span class="material-symbols-outlined text-sm text-outline hover:text-primary">visibility</span>
                    </button>
                    @if (auth.canUpdateTasks()) {
                      <button (click)="openEdit(t)" title="Edit"
                              class="p-1.5 hover:bg-surface-container rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-sm text-outline hover:text-primary">edit</span>
                      </button>
                    }
                    @if (auth.canDeleteTasks()) {
                      <button (click)="confirmDelete(t)" title="Delete"
                              class="p-1.5 hover:bg-error-container/30 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-sm text-outline hover:text-error">delete</span>
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <!-- Footer -->
        <div class="p-4 border-t border-surface-container bg-surface-container-low/30">
          <span class="text-xs text-outline">Showing {{ filtered().length }} of {{ tasks().length }} tasks</span>
        </div>
      </div>
      } <!-- end table view -->

      @if (errorMsg()) {
        <div class="mt-4 p-4 bg-error-container rounded-lg text-on-error-container text-sm">{{ errorMsg() }}</div>
      }

      <!-- ── Kanban View ── -->
      @if (viewMode() === 'kanban') {
        <div class="overflow-x-auto pb-4">
          <div class="flex gap-4" style="min-width: max-content;">
            @for (col of kanbanColumns; track col.status) {
              <div class="w-72 flex-shrink-0">
                <!-- Column header -->
                <div class="flex items-center justify-between mb-3 px-1">
                  <div class="flex items-center gap-2">
                    <app-status-chip [value]="col.status" [label]="col.label" />
                    <span class="text-xs font-bold text-outline bg-surface-container rounded-full px-2 py-0.5">{{ col.tasks.length }}</span>
                  </div>
                </div>
                <!-- Cards -->
                <div class="space-y-3">
                  @for (t of col.tasks; track t.task_id) {
                    <div class="bg-surface-container-lowest rounded-xl p-4 ambient-lift ghost-border cursor-pointer group"
                         [class.border-l-4]="isOverdue(t.task_end_date, t.task_status)"
                         [class.border-l-error]="isOverdue(t.task_end_date, t.task_status)"
                         (click)="viewTask(t)">
                      <!-- Project tag -->
                      <span class="text-[10px] bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-semibold">
                        {{ getProjectName(t.project_id_fk) }}
                      </span>
                      <!-- Title -->
                      <h4 class="text-sm font-semibold text-on-surface mt-2 leading-snug">{{ t.task_title }}</h4>
                      @if (t.task_remarks) {
                        <p class="text-[10px] text-on-surface-variant mt-1 line-clamp-2 opacity-70">{{ t.task_remarks }}</p>
                      }
                      <!-- Meta row -->
                      <div class="flex items-center justify-between mt-3">
                        <div class="flex items-center gap-2">
                          @if (t.priority_id) {
                            <app-status-chip [value]="masters.getPriorityLabel(t.priority_id)"
                                             [label]="masters.getPriorityLabel(t.priority_id)" type="priority" />
                          }
                        </div>
                        @if (t.task_end_date) {
                          <span class="text-[10px] font-semibold flex items-center gap-1"
                                [class.text-error]="isOverdue(t.task_end_date, t.task_status)"
                                [class.text-outline]="!isOverdue(t.task_end_date, t.task_status)">
                            <span class="material-symbols-outlined text-xs">calendar_today</span>
                            {{ formatDate(t.task_end_date) }}
                          </span>
                        }
                      </div>
                      <!-- Assignees -->
                      @if (t.task_assignees) {
                        <p class="text-[10px] text-outline mt-2 flex items-center gap-1">
                          <span class="material-symbols-outlined text-xs">person</span>
                          {{ masters.getAssigneeNames(t.task_assignees) }}
                        </p>
                      }
                      <!-- Action buttons (visible on hover) -->
                      <div class="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        @if (auth.canUpdateTasks()) {
                          <button (click)="$event.stopPropagation(); openEdit(t)"
                                  class="flex-1 text-xs py-1.5 rounded-lg bg-surface-container text-outline hover:text-primary hover:bg-primary/5 transition-colors text-center">
                            Edit
                          </button>
                        }
                        @if (auth.canDeleteTasks()) {
                          <button (click)="$event.stopPropagation(); confirmDelete(t)"
                                  class="p-1.5 rounded-lg bg-surface-container text-outline hover:text-error hover:bg-error-container/30 transition-colors">
                            <span class="material-symbols-outlined text-sm">delete</span>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
            @if (kanbanColumns.length === 0 && !loading()) {
              <div class="flex-1 text-center py-12 text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl block mb-2 opacity-30">view_kanban</span>
                No tasks found.
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- ───── Task Form Drawer ───── -->
    @if (drawerOpen()) {
      <div class="drawer-overlay" (click)="closeDrawer()"></div>
      <aside class="drawer-panel">
        <div class="flex items-center justify-between p-6 border-b border-surface-container-low flex-shrink-0">
          <h3 class="font-semibold text-on-surface">{{ editMode() ? 'Edit Task' : 'Create Task' }}</h3>
          <button (click)="closeDrawer()" class="p-2 hover:bg-surface-container-low rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <form [formGroup]="form" class="space-y-4">

            <!-- Project -->
            <div>
              <label class="k-label">Project *</label>
              <select formControlName="project_id_fk" class="k-input">
                <option value="">Select project...</option>
                @for (p of accessibleProjects(); track p.project_id) {
                  <option [value]="p.project_id">{{ p.project_name }}</option>
                }
              </select>
              @if (fc('project_id_fk').invalid && fc('project_id_fk').touched) {
                <p class="text-error text-xs mt-1">Project is required</p>
              }
            </div>

            <!-- Title -->
            <div>
              <label class="k-label">Task Title *</label>
              <input formControlName="task_title" class="k-input" placeholder="Enter task title" />
              @if (fc('task_title').invalid && fc('task_title').touched) {
                <p class="text-error text-xs mt-1">Title is required</p>
              }
            </div>

            <!-- Status -->
            <div>
              <label class="k-label">Status *</label>
              <select formControlName="task_status" class="k-input">
                @for (s of masters.taskStatuses(); track s.status_id) {
                  <option [value]="s.status_name">{{ s.status_label }}</option>
                }
              </select>
            </div>

            <!-- Remarks -->
            <div>
              <label class="k-label">
                Remarks
                @if (form.get('task_status')?.value !== 'triage') { <span class="text-error">*</span> }
              </label>
              <textarea formControlName="task_remarks" class="k-input h-20 resize-none pt-3"
                        placeholder="Task details and notes..."></textarea>
              @if (fc('task_remarks').invalid && fc('task_remarks').touched) {
                <p class="text-error text-xs mt-1">Remarks required when status is not Triage</p>
              }
            </div>

            <!-- Assignees multi-select -->
            <div>
              <label class="k-label">
                Assignees
                @if (form.get('task_status')?.value !== 'triage') { <span class="text-error">*</span> }
              </label>
              <div class="bg-surface-container-highest rounded-lg p-2 max-h-32 overflow-y-auto">
                @for (u of masters.users(); track u.user_id) {
                  <label class="flex items-center gap-2 px-2 py-1 rounded hover:bg-surface-container cursor-pointer text-xs">
                    <input type="checkbox"
                           [checked]="selectedAssignees().includes(u.user_id)"
                           (change)="toggleAssignee(u.user_id)"
                           class="rounded" />
                    {{ u.display_name }}
                  </label>
                }
              </div>
              @if (fc('task_assignees').invalid && fc('task_assignees').touched) {
                <p class="text-error text-xs mt-1">At least one assignee required when status is not Triage</p>
              }
            </div>

            <!-- Type & Priority -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="k-label">Type</label>
                <select formControlName="type_id" class="k-input">
                  <option value="">Select type</option>
                  @for (t of masters.taskTypes(); track t.type_id) {
                    <option [value]="t.type_id">{{ t.type_label }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="k-label">Priority</label>
                <select formControlName="priority_id" class="k-input">
                  <option value="">Select priority</option>
                  @for (p of masters.priorities(); track p.priority_id) {
                    <option [value]="p.priority_id">{{ p.priority_label }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Dates -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="k-label">Start Date</label>
                <input formControlName="task_start_date" type="date" class="k-input" />
              </div>
              <div>
                <label class="k-label">End Date</label>
                <input formControlName="task_end_date" type="date" class="k-input" />
              </div>
            </div>

            <!-- Times -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="k-label">Start Time</label>
                <input formControlName="task_start_time" type="time" class="k-input" />
              </div>
              <div>
                <label class="k-label">End Time</label>
                <input formControlName="task_end_time" type="time" class="k-input" />
              </div>
            </div>

            <!-- Hours & Order -->
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="k-label">Est. Hours</label>
                <input formControlName="estimated_hours" type="number" min="0" class="k-input" placeholder="0" />
              </div>
              <div>
                <label class="k-label">Spent Hours</label>
                <input formControlName="spent_hours" type="number" min="0" class="k-input" placeholder="0" />
              </div>
              @if (editMode()) {
                <div>
                  <label class="k-label">Order</label>
                  <input formControlName="task_order_id" type="number" min="1" class="k-input" placeholder="1" />
                  <p class="text-[10px] text-on-surface-variant mt-1">Changing order shifts other tasks to maintain sequence.</p>
                </div>
              }
            </div>
          </form>
        </div>

        <div class="p-6 border-t border-surface-container-low flex gap-3 flex-shrink-0">
          <button class="btn-ghost flex-1 justify-center" (click)="closeDrawer()">Cancel</button>
          <button class="btn-primary flex-1 justify-center" (click)="saveTask()" [disabled]="saving()">
            @if (saving()) { <span class="material-symbols-outlined text-sm animate-spin">refresh</span> }
            {{ editMode() ? 'Update' : 'Create' }}
          </button>
        </div>
      </aside>
    }

    <!-- Confirm delete task -->
    <app-confirm-dialog
      [visible]="confirmDeleteVisible()"
      [title]="'Delete Task'"
      message="This task will be permanently removed."
      (confirm)="doDelete()"
      (cancel)="confirmDeleteVisible.set(false)" />

    <!-- Confirm delete artifact -->
    <app-confirm-dialog
      [visible]="confirmArtifactDeleteVisible()"
      title="Delete Artifact"
      message="This artifact will be permanently removed."
      (confirm)="doDeleteTaskArtifact()"
      (cancel)="confirmArtifactDeleteVisible.set(false)" />

    <!-- ───── Task View Drawer ───── -->
    @if (viewDrawerOpen()) {
      <div class="drawer-overlay" (click)="viewDrawerOpen.set(false)"></div>
      <aside class="drawer-panel">
        <div class="flex items-center justify-between p-6 border-b border-surface-container-low flex-shrink-0">
          <div>
            <span class="text-xs font-mono font-bold text-primary">{{ selectedTask()?.task_id }}</span>
            <h3 class="font-semibold text-on-surface mt-0.5">{{ selectedTask()?.task_title }}</h3>
          </div>
          <div class="flex items-center gap-2">
            @if (auth.canUpdateTasks()) {
              <button (click)="openEdit(selectedTask()!); viewDrawerOpen.set(false)" title="Edit"
                      class="p-2 hover:bg-surface-container-low rounded-lg transition-colors">
                <span class="material-symbols-outlined text-sm text-outline">edit</span>
              </button>
            }
            <button (click)="viewDrawerOpen.set(false)" class="p-2 hover:bg-surface-container-low rounded-lg">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6">

          <!-- Task details -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="k-label">Status</p>
              <app-status-chip [value]="selectedTask()?.task_status || ''"
                               [label]="masters.getStatusLabel(selectedTask()?.task_status || '')" />
            </div>
            <div>
              <p class="k-label">Priority</p>
              @if (selectedTask()?.priority_id) {
                <app-status-chip [value]="masters.getPriorityLabel(selectedTask()!.priority_id)"
                                 [label]="masters.getPriorityLabel(selectedTask()!.priority_id)" type="priority" />
              } @else { <p class="text-sm text-outline">—</p> }
            </div>
            <div>
              <p class="k-label">Project</p>
              <p class="text-sm">{{ getProjectName(selectedTask()?.project_id_fk || '') }}</p>
            </div>
            <div>
              <p class="k-label">Type</p>
              <p class="text-sm">{{ masters.getTypeLabel(selectedTask()?.type_id || '') || '—' }}</p>
            </div>
            <div>
              <p class="k-label">Start Date</p>
              <p class="text-sm">{{ formatDate(selectedTask()?.task_start_date) }}</p>
            </div>
            <div>
              <p class="k-label">End Date</p>
              <p class="text-sm" [class.text-error]="isOverdue(selectedTask()?.task_end_date, selectedTask()?.task_status || '')">
                {{ formatDate(selectedTask()?.task_end_date) }}
                @if (isOverdue(selectedTask()?.task_end_date, selectedTask()?.task_status || '')) {
                  <span class="ml-1 text-[10px] font-bold">OVERDUE</span>
                }
              </p>
            </div>
            <div>
              <p class="k-label">Est. Hours</p>
              <p class="text-sm">{{ selectedTask()?.estimated_hours || '—' }}</p>
            </div>
            <div>
              <p class="k-label">Spent Hours</p>
              <p class="text-sm">{{ selectedTask()?.spent_hours || '—' }}</p>
            </div>
          </div>

          <div>
            <p class="k-label">Assignees</p>
            <div class="flex flex-wrap gap-1 mt-1">
              @for (uid of getAssigneeIds(selectedTask()?.task_assignees || ''); track uid) {
                <span class="text-xs bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full">
                  {{ masters.getUserName(uid) }}
                </span>
              }
              @if (!selectedTask()?.task_assignees) { <p class="text-sm text-outline">—</p> }
            </div>
          </div>

          @if (selectedTask()?.task_remarks) {
            <div>
              <p class="k-label">Remarks</p>
              <p class="text-sm text-on-surface-variant whitespace-pre-wrap">{{ selectedTask()?.task_remarks }}</p>
            </div>
          }

          <!-- ── Artifacts ── -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Artifacts</h4>
            </div>

            <!-- Add / Edit artifact form (collapsible) -->
            @if (auth.canManageArtifacts()) {
              <div class="mb-4">
                @if (!taskArtifactFormOpen() && !editingTaskArtifact()) {
                  <button (click)="taskArtifactFormOpen.set(true)"
                          class="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-outline-variant/40 rounded-xl text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">
                    <span class="material-symbols-outlined text-sm">add</span>
                    Add Artifact
                  </button>
                }
                @if (taskArtifactFormOpen() || editingTaskArtifact()) {
                  <div class="bg-surface-container-low rounded-xl p-4">
                    <div class="flex items-center justify-between mb-3">
                      <p class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {{ editingTaskArtifact() ? 'Edit Artifact' : 'Add Artifact' }}
                      </p>
                      <button (click)="taskArtifactFormOpen.set(false); cancelTaskArtifactEdit()"
                              class="p-1 rounded hover:bg-surface-container transition-colors">
                        <span class="material-symbols-outlined text-sm text-outline">close</span>
                      </button>
                    </div>
                    <form [formGroup]="taskArtifactForm" class="space-y-3">
                      <div>
                        <label class="k-label">Title *</label>
                        <input formControlName="artifact_title" class="k-input" placeholder="e.g. Design reference" />
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="k-label">Type *</label>
                          <select formControlName="artifact_type" class="k-input">
                            <option value="url">URL</option>
                            <option value="text">Text</option>
                            <option value="credential">Credential</option>
                            <option value="document">Document</option>
                            <option value="note">Note</option>
                          </select>
                        </div>
                        <div class="flex items-end pb-2">
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" formControlName="is_sensitive" class="rounded" />
                            <span class="text-xs text-on-surface-variant">Sensitive</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label class="k-label">Value *</label>
                        <input formControlName="artifact_value" class="k-input"
                               [placeholder]="taskArtifactForm.get('artifact_type')?.value === 'url' ? 'https://...' : 'Enter value'" />
                      </div>
                      <div class="flex gap-2">
                        <button type="button" class="btn-primary text-xs py-2" (click)="saveTaskArtifact()" [disabled]="savingTaskArtifact()">
                          {{ editingTaskArtifact() ? 'Update' : 'Add' }}
                        </button>
                        <button type="button" class="btn-ghost text-xs py-2" (click)="taskArtifactFormOpen.set(false); cancelTaskArtifactEdit()">Cancel</button>
                      </div>
                    </form>
                  </div>
                }
              </div>
            }

            <!-- Artifact list -->
            @if (taskArtifactsLoading()) { <div class="loading-pulse mb-3"></div> }
            <div class="space-y-2">
              @if (taskArtifacts().length === 0 && !taskArtifactsLoading()) {
                <p class="text-sm text-on-surface-variant text-center py-4">No artifacts yet.</p>
              }
              @for (a of taskArtifacts(); track a.task_artifact_id) {
                <div class="bg-surface-container-lowest rounded-lg p-3 flex items-start justify-between gap-3 ghost-border">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-semibold text-on-surface">{{ a.artifact_title }}</span>
                      <span class="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container">
                        {{ a.artifact_type }}
                      </span>
                      @if (a.is_sensitive === true || a.is_sensitive === 'TRUE') {
                        <span class="text-[9px] font-bold text-error bg-error-container/50 px-1.5 py-0.5 rounded">SENSITIVE</span>
                      }
                    </div>
                    @if (a.artifact_type === 'url') {
                      <a [href]="a.artifact_value" target="_blank"
                         class="text-xs text-primary hover:underline truncate block max-w-[260px]">{{ a.artifact_value }}</a>
                    } @else if (a.is_sensitive === true || a.is_sensitive === 'TRUE') {
                      <span class="text-xs text-on-surface-variant">••••••••••••</span>
                    } @else {
                      <span class="text-xs text-on-surface-variant">{{ a.artifact_value }}</span>
                    }
                  </div>
                  @if (auth.canManageArtifacts()) {
                    <div class="flex gap-1 flex-shrink-0">
                      <button (click)="editTaskArtifact(a)"
                              class="p-1.5 text-outline hover:text-primary rounded-lg hover:bg-primary-fixed/20 transition-colors">
                        <span class="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button (click)="deleteTaskArtifactConfirm(a)"
                              class="p-1.5 text-outline hover:text-error rounded-lg hover:bg-error-container/30 transition-colors">
                        <span class="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </aside>
    }
  `
})
export class TasksComponent implements OnInit {
  tasks = signal<Task[]>([]);
  filtered = signal<Task[]>([]);
  accessibleProjects = signal<Project[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal('');

  drawerOpen = signal(false);
  editMode = signal(false);
  selectedTask = signal<Task | null>(null);
  selectedAssignees = signal<string[]>([]);

  projectDropOpen = signal(false);

  confirmDeleteVisible = signal(false);
  deletingTask = signal<Task | null>(null);

  viewDrawerOpen = signal(false);
  taskArtifacts = signal<TaskArtifact[]>([]);
  taskArtifactsLoading = signal(false);
  savingTaskArtifact = signal(false);
  editingTaskArtifact = signal<TaskArtifact | null>(null);
  taskArtifactFormOpen = signal(false);
  confirmArtifactDeleteVisible = signal(false);
  deletingTaskArtifact = signal<TaskArtifact | null>(null);

  viewMode = signal<'table' | 'kanban'>('table');
  expandedTaskId = signal<string | null>(null);

  filter: TaskFilter = {
    projectIds: [], titleSearch: '', status: '',
    assignee: '', priority: '', typeId: '',
    dueDateFrom: '', dueDateTo: '', overdueOnly: false,
    todayOnly: false
  };

  form = this.fb.group({
    project_id_fk: ['', Validators.required],
    task_title: ['', Validators.required],
    task_status: ['triage', Validators.required],
    task_remarks: [''],
    task_assignees: [''],
    type_id: [''],
    priority_id: [''],
    task_start_date: [''],
    task_end_date: [''],
    task_start_time: [''],
    task_end_time: [''],
    estimated_hours: [null as number | null],
    spent_hours: [null as number | null],
    task_order_id: [null as number | null],
  });

  taskArtifactForm = this.fb.group({
    artifact_title: ['', Validators.required],
    artifact_value: ['', Validators.required],
    artifact_type: ['url', Validators.required],
    is_sensitive: [false],
  });

  constructor(
    private api: ApiService,
    public auth: AuthService,
    public masters: MastersService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['project']) {
        this.filter.projectIds = [params['project']];
      }
      if (params['today'] === '1') {
        this.filter.todayOnly = true;
      }
    });
    this.loadData();
    this.form.get('task_status')?.valueChanges.subscribe(status => {
      const remarks = this.form.get('task_remarks')!;
      const assignees = this.form.get('task_assignees')!;
      if (status !== 'triage') {
        remarks.setValidators(Validators.required);
        assignees.setValidators(Validators.required);
      } else {
        remarks.clearValidators();
        assignees.clearValidators();
      }
      remarks.updateValueAndValidity();
      assignees.updateValueAndValidity();
    });
  }

  loadData() {
    const userId = this.auth.currentUser()?.user_id;
    if (!userId) return;
    this.loading.set(true);

    // Load accessible projects based on RBAC
    // If user has VIEW_ALL_PROJECTS, load all; otherwise load only assigned
    this.api.getProjects(userId).subscribe({
      next: projects => {
        // Filter projects based on RBAC
        const accessible = projects.filter(p => this.auth.canAccessProject(p.project_id));
        this.accessibleProjects.set(accessible);
        this.api.getTasks(userId).subscribe({
          next: tasks => { 
            // Filter tasks to only show those from accessible projects
            const accessibleTaskIds = new Set(accessible.map(p => p.project_id));
            const filteredTasks = tasks.filter(t => accessibleTaskIds.has(t.project_id_fk));
            this.tasks.set(filteredTasks); 
            this.applyFilter(); 
            this.loading.set(false); 
          },
          error: (e: Error) => { this.errorMsg.set(e.message); this.loading.set(false); }
        });
      },
      error: (e: Error) => { this.errorMsg.set(e.message); this.loading.set(false); }
    });
  }

  applyFilter() {
    let list = [...this.tasks()];
    const f = this.filter;
    if (f.projectIds.length) list = list.filter(t => f.projectIds.includes(t.project_id_fk));
    if (f.titleSearch) list = list.filter(t => t.task_title.toLowerCase().includes(f.titleSearch.toLowerCase()));
    if (f.status) list = list.filter(t => t.task_status === f.status);
    if (f.priority) list = list.filter(t => t.priority_id === f.priority);
    if (f.assignee) list = list.filter(t => (t.task_assignees || '').includes(f.assignee));
    if (f.typeId) list = list.filter(t => t.type_id === f.typeId);
    if (f.dueDateFrom) list = list.filter(t => t.task_end_date && t.task_end_date >= f.dueDateFrom);
    if (f.dueDateTo) list = list.filter(t => t.task_end_date && t.task_end_date <= f.dueDateTo);
    if (f.overdueOnly) list = list.filter(t => isOverdue(t.task_end_date, t.task_status));
    if (f.todayOnly) {
      const today = new Date().toISOString().slice(0, 10);
      list = list.filter(t => t.task_end_date === today);
    }
    this.filtered.set(list);
    this.projectDropOpen.set(false);
  }

  hasFilter(): boolean {
    return !!(this.filter.projectIds.length || this.filter.titleSearch || this.filter.status ||
      this.filter.priority || this.filter.assignee || this.filter.overdueOnly ||
      this.filter.dueDateFrom || this.filter.dueDateTo ||
      this.filter.todayOnly);
  }

  isTodayFilter(): boolean {
    const t = todayStr();
    return this.filter.dueDateFrom === t && this.filter.dueDateTo === t;
  }

  toggleTodayFilter() {
    if (this.isTodayFilter()) {
      this.filter.dueDateFrom = '';
      this.filter.dueDateTo = '';
    } else {
      this.filter.dueDateFrom = todayStr();
      this.filter.dueDateTo = todayStr();
    }
    this.applyFilter();
  }

  clearFilter() {
    this.filter = { projectIds: [], titleSearch: '', status: '', assignee: '', priority: '',
                    typeId: '', dueDateFrom: '', dueDateTo: '', overdueOnly: false, todayOnly: false };
    this.applyFilter();
  }

  filterProjectLabel(): string {
    const ids = this.filter.projectIds;
    if (!ids.length) return 'All Projects';
    if (ids.length === 1) return this.getProjectName(ids[0]);
    return `${ids.length} Projects`;
  }

  toggleProject(id: string) {
    const ids = [...this.filter.projectIds];
    const idx = ids.indexOf(id);
    if (idx === -1) ids.push(id); else ids.splice(idx, 1);
    this.filter.projectIds = ids;
    this.applyFilter();
  }

  // RBAC: Now using auth.canCreateTasks() directly in template

  fc(name: string): AbstractControl { return this.form.get(name)!; }

  openCreate() {
    this.editMode.set(false);
    this.form.reset({ task_status: 'triage' });
    this.selectedAssignees.set([]);
    this.drawerOpen.set(true);
  }

  openEdit(t: Task) {
    this.editMode.set(true);
    this.selectedTask.set(t);
    const assignees = t.task_assignees ? t.task_assignees.split('|').map(s => s.trim()).filter(Boolean) : [];
    this.selectedAssignees.set(assignees);
    this.form.patchValue({
      project_id_fk: t.project_id_fk,
      task_title: t.task_title,
      task_status: t.task_status,
      task_remarks: t.task_remarks,
      task_assignees: t.task_assignees,
      type_id: t.type_id,
      priority_id: t.priority_id,
      task_start_date: toDateInputValue(t.task_start_date),
      task_end_date: toDateInputValue(t.task_end_date),
      task_start_time: t.task_start_time || '',
      task_end_time: t.task_end_time || '',
      estimated_hours: t.estimated_hours as number | null,
      spent_hours: t.spent_hours as number | null,
      task_order_id: t.task_order_id as number | null,
    });
    this.drawerOpen.set(true);
  }

  toggleAssignee(uid: string) {
    const list = [...this.selectedAssignees()];
    const idx = list.indexOf(uid);
    if (idx === -1) list.push(uid); else list.splice(idx, 1);
    this.selectedAssignees.set(list);
    this.form.get('task_assignees')!.setValue(list.join('|'));
  }

  closeDrawer() { this.drawerOpen.set(false); }

  saveTask() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const userId = this.auth.currentUser()!.user_id;
    const v = this.form.value as any;
    const payload = { ...v, task_assignees: this.selectedAssignees().join('|') };

    this.saving.set(true);
    this.errorMsg.set('');

    if (this.editMode()) {
      this.api.updateTask({ ...payload, task_id: this.selectedTask()!.task_id, last_modified_by: userId }).subscribe({
        next: () => { this.saving.set(false); this.closeDrawer(); this.loadData(); },
        error: (e: Error) => { this.saving.set(false); this.errorMsg.set(e.message); }
      });
    } else {
      // Strip task_order_id — server auto-assigns the next sequential number
      const { task_order_id: _unused, ...createPayload } = payload;
      this.api.createTask({ ...createPayload, created_by: userId }).subscribe({
        next: () => { this.saving.set(false); this.closeDrawer(); this.loadData(); },
        error: (e: Error) => { this.saving.set(false); this.errorMsg.set(e.message); }
      });
    }
  }

  confirmDelete(t: Task) { this.deletingTask.set(t); this.confirmDeleteVisible.set(true); }

  doDelete() {
    const t = this.deletingTask();
    if (!t) return;
    this.api.deleteTask(t.task_id).subscribe({
      next: () => { this.confirmDeleteVisible.set(false); this.loadData(); },
      error: (e: Error) => { this.errorMsg.set(e.message); this.confirmDeleteVisible.set(false); }
    });
  }

  // ─── View drawer ─────────────────────────────────────────────────────────────

  viewTask(t: Task) {
    this.selectedTask.set(t);
    this.viewDrawerOpen.set(true);
    this.loadTaskArtifacts(t.task_id);
    this.taskArtifactForm.reset({ artifact_type: 'url', is_sensitive: false });
    this.editingTaskArtifact.set(null);
  }

  loadTaskArtifacts(taskId: string) {
    this.taskArtifactsLoading.set(true);
    this.api.getTaskArtifacts(taskId).subscribe({
      next: a => { this.taskArtifacts.set(a); this.taskArtifactsLoading.set(false); },
      error: () => this.taskArtifactsLoading.set(false)
    });
  }

  editTaskArtifact(a: TaskArtifact) {
    this.editingTaskArtifact.set(a);
    this.taskArtifactFormOpen.set(true);
    this.taskArtifactForm.patchValue({
      artifact_title: a.artifact_title,
      artifact_value: a.artifact_value,
      artifact_type: a.artifact_type,
      is_sensitive: String(a.is_sensitive).toUpperCase() === 'TRUE' || a.is_sensitive === true,
    });
  }

  cancelTaskArtifactEdit() {
    this.editingTaskArtifact.set(null);
    this.taskArtifactFormOpen.set(false);
    this.taskArtifactForm.reset({ artifact_type: 'url', is_sensitive: false });
  }

  saveTaskArtifact() {
    this.taskArtifactForm.markAllAsTouched();
    if (this.taskArtifactForm.invalid) return;
    const v = this.taskArtifactForm.value as any;
    const userId = this.auth.currentUser()!.user_id;
    this.savingTaskArtifact.set(true);

    if (this.editingTaskArtifact()) {
      this.api.updateTaskArtifact({ ...v, task_artifact_id: this.editingTaskArtifact()!.task_artifact_id }).subscribe({
        next: () => { this.savingTaskArtifact.set(false); this.cancelTaskArtifactEdit(); this.loadTaskArtifacts(this.selectedTask()!.task_id); },
        error: () => this.savingTaskArtifact.set(false)
      });
    } else {
      this.api.createTaskArtifact({ ...v, task_id_fk: this.selectedTask()!.task_id, created_by: userId }).subscribe({
        next: () => { this.savingTaskArtifact.set(false); this.taskArtifactFormOpen.set(false); this.taskArtifactForm.reset({ artifact_type: 'url', is_sensitive: false }); this.loadTaskArtifacts(this.selectedTask()!.task_id); },
        error: () => this.savingTaskArtifact.set(false)
      });
    }
  }

  deleteTaskArtifactConfirm(a: TaskArtifact) { this.deletingTaskArtifact.set(a); this.confirmArtifactDeleteVisible.set(true); }

  doDeleteTaskArtifact() {
    const a = this.deletingTaskArtifact();
    if (!a) return;
    this.api.deleteTaskArtifact(a.task_artifact_id).subscribe({
      next: () => { this.confirmArtifactDeleteVisible.set(false); this.loadTaskArtifacts(this.selectedTask()!.task_id); },
      error: () => this.confirmArtifactDeleteVisible.set(false)
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  getProjectName(id: string): string {
    return this.accessibleProjects().find(p => p.project_id === id)?.project_name ?? id;
  }

  getPriorityName(id: string): string {
    return this.masters.priorities().find(p => p.priority_id === id)?.priority_name ?? id;
  }

  getAssigneeIds(pipe: string): string[] {
    if (!pipe) return [];
    return pipe.split('|').map(s => s.trim()).filter(Boolean);
  }

  hoursPercent(t: Task): number {
    const est = Number(t.estimated_hours) || 0;
    const spent = Number(t.spent_hours) || 0;
    if (!est) return 0;
    return Math.min(100, Math.round(spent / est * 100));
  }

  isOverdue = isOverdue;
  formatDate = formatDate;

  get kanbanColumns(): { status: string; label: string; tasks: Task[] }[] {
    const statuses = this.masters.taskStatuses();
    const filtered = this.filtered();
    return statuses.map(s => ({
      status: s.status_name,
      label: s.status_label,
      tasks: filtered.filter(t => t.task_status === s.status_name)
    })).filter(col => col.tasks.length > 0);
  }
}
