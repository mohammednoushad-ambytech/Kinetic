import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MastersService } from '../../services/masters.service';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Project, ProjectArtifact } from '../../models';
import { formatDate, toDateInputValue } from '../../utils/date.utils';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StatusChipComponent, ConfirmDialogComponent],
  template: `
    <div class="p-6 md:p-8">

      <!-- Loading bar -->
      @if (loading()) { <div class="loading-pulse mb-4"></div> }

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div class="space-y-1">
          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Workspace</p>
          <h2 class="text-3xl font-bold tracking-tight text-on-surface">Projects Library</h2>
          <p class="text-on-surface-variant text-sm">Manage projects, timelines, and artifacts.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="material-symbols-outlined">add</span>
          Create Project
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-surface-container-low rounded-xl p-4 flex flex-col lg:flex-row items-center gap-4 mb-6">
        <div class="relative flex-1 w-full">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-lg">search</span>
          <input type="text" placeholder="Search projects..."
                 class="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                 [value]="filter.nameSearch"
                 (input)="filter.nameSearch = $any($event.target).value; applyFilter()" />
        </div>
        <div class="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          <select class="bg-surface-container-lowest rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-w-[130px]"
                  [(ngModel)]="filter.status" (change)="applyFilter()" [ngModelOptions]="{standalone: true}">
            <option value="">All Statuses</option>
            @for (s of masters.projectStatuses(); track s.status_id) {
              <option [value]="s.status_name">{{ s.status_label }}</option>
            }
          </select>
          <input type="date" placeholder="Start from"
                 class="bg-surface-container-lowest rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                 [(ngModel)]="filter.startDateFrom" (change)="applyFilter()" [ngModelOptions]="{standalone: true}" />
          <input type="date" placeholder="Start to"
                 class="bg-surface-container-lowest rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                 [(ngModel)]="filter.startDateTo" (change)="applyFilter()" [ngModelOptions]="{standalone: true}" />
          @if (hasFilter()) {
            <button class="text-xs text-primary font-medium hover:underline" (click)="clearFilter()">Clear</button>
          }
        </div>
      </div>

      <!-- Table -->
      <div class="bg-surface-container-lowest rounded-xl ambient-lift overflow-hidden">
        <table class="w-full text-left k-table">
          <thead>
            <tr>
              <th>Project ID</th>
              <th>Details</th>
              <th>Status</th>
              <th class="text-center">Timeline</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @if (filtered().length === 0 && !loading()) {
              <tr><td colspan="5" class="text-center py-12 text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl block mb-2 opacity-30">folder_open</span>
                No projects found.
              </td></tr>
            }
            @for (p of filtered(); track p.project_id) {
              <tr>
                <td class="align-top">
                  <span class="text-xs font-mono font-bold text-outline">{{ p.project_id }}</span>
                </td>
                <td>
                  <button (click)="goToTasks(p.project_id)"
                          class="font-semibold text-on-surface mb-1 text-left hover:text-primary hover:underline transition-colors block">
                    {{ p.project_name }}
                  </button>
                  <p class="text-xs text-on-surface-variant line-clamp-1 max-w-xs">{{ p.project_description }}</p>
                </td>
                <td>
                  <app-status-chip [value]="p.project_status" [label]="masters.getStatusLabel(p.project_status)" />
                </td>
                <td class="text-center">
                  <div class="text-xs font-medium text-on-surface">
                    {{ p.project_start_date ? (formatDate(p.project_start_date) + (p.project_end_date ? ' – ' + formatDate(p.project_end_date) : '')) : '—' }}
                  </div>
                </td>
                <td>
                  <div class="flex items-center justify-end gap-1">
                    <button title="View" (click)="viewProject(p)"
                            class="p-2 text-outline hover:text-primary rounded-lg hover:bg-primary-fixed/20 transition-colors">
                      <span class="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    <button title="View Tasks" (click)="goToTasks(p.project_id)"
                            class="p-2 text-outline hover:text-primary rounded-lg hover:bg-primary-fixed/20 transition-colors">
                      <span class="material-symbols-outlined text-lg">task_alt</span>
                    </button>
                    @if (auth.canUpdate(p.project_id)) {
                      <button title="Edit" (click)="openEdit(p)"
                              class="p-2 text-outline hover:text-primary rounded-lg hover:bg-primary-fixed/20 transition-colors">
                        <span class="material-symbols-outlined text-lg">edit</span>
                      </button>
                    }
                    <button title="Artifacts" (click)="openArtifacts(p)"
                            class="p-2 text-outline hover:text-primary rounded-lg hover:bg-primary-fixed/20 transition-colors">
                      <span class="material-symbols-outlined text-lg">attachment</span>
                    </button>
                    @if (auth.canDelete(p.project_id)) {
                      <button title="Delete" (click)="confirmDelete(p)"
                              class="p-2 text-outline hover:text-error rounded-lg hover:bg-error-container/30 transition-colors">
                        <span class="material-symbols-outlined text-lg">delete</span>
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Error -->
      @if (errorMsg()) {
        <div class="mt-4 p-4 bg-error-container rounded-lg text-on-error-container text-sm">{{ errorMsg() }}</div>
      }
    </div>

    <!-- ───── Project Form Drawer ───── -->
    @if (drawerOpen()) {
      <div class="drawer-overlay" (click)="closeDrawer()"></div>
      <aside class="drawer-panel">
        <div class="flex items-center justify-between p-6 border-b border-surface-container-low flex-shrink-0">
          <h3 class="font-semibold text-on-surface text-base">
            {{ editMode() ? 'Edit Project' : 'Create Project' }}
          </h3>
          <button (click)="closeDrawer()" class="p-2 hover:bg-surface-container-low rounded-lg transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <form [formGroup]="form" class="space-y-5">
            <!-- Project ID — shown in edit mode only, auto-generated on create -->
            @if (editMode()) {
              <div>
                <label class="k-label">Project ID</label>
                <div class="k-input opacity-60 bg-surface-container-low text-outline font-mono text-sm">
                  {{ fc('project_id').value }}
                </div>
              </div>
            }

            <!-- Name -->
            <div>
              <label class="k-label">Project Name *</label>
              <input formControlName="project_name" class="k-input" placeholder="Enter project name" />
              @if (fc('project_name').invalid && fc('project_name').touched) {
                <p class="text-error text-xs mt-1">Project name is required</p>
              }
            </div>

            <!-- Description -->
            <div>
              <label class="k-label">Description *</label>
              <textarea formControlName="project_description" class="k-input h-20 resize-none pt-3"
                        placeholder="Brief description of this project"></textarea>
              @if (fc('project_description').invalid && fc('project_description').touched) {
                <p class="text-error text-xs mt-1">Description is required</p>
              }
            </div>

            <!-- Status -->
            <div>
              <label class="k-label">Status *</label>
              <select formControlName="project_status" class="k-input">
                @for (s of masters.projectStatuses(); track s.status_id) {
                  <option [value]="s.status_name">{{ s.status_label }}</option>
                }
              </select>
            </div>

            <!-- Start Date -->
            <div>
              <label class="k-label">
                Start Date
                @if (form.get('project_status')?.value !== 'triage') { <span class="text-error">*</span> }
              </label>
              <input formControlName="project_start_date" type="date" class="k-input" />
              @if (fc('project_start_date').invalid && fc('project_start_date').touched) {
                <p class="text-error text-xs mt-1">Start date required when status is not Triage</p>
              }
            </div>

            <!-- End Date -->
            <div>
              <label class="k-label">End Date (optional)</label>
              <input formControlName="project_end_date" type="date" class="k-input" />
            </div>
          </form>
        </div>

        <div class="p-6 border-t border-surface-container-low flex gap-3 flex-shrink-0">
          <button class="btn-ghost flex-1 justify-center" (click)="closeDrawer()">Cancel</button>
          <button class="btn-primary flex-1 justify-center" (click)="saveProject()" [disabled]="saving()">
            @if (saving()) { <span class="material-symbols-outlined text-sm animate-spin">refresh</span> }
            {{ editMode() ? 'Update' : 'Create' }}
          </button>
        </div>
      </aside>
    }

    <!-- ───── View Project Drawer ───── -->
    @if (viewDrawerOpen()) {
      <div class="drawer-overlay" (click)="viewDrawerOpen.set(false)"></div>
      <aside class="drawer-panel">
        <div class="flex items-center justify-between p-6 border-b border-surface-container-low">
          <div>
            <span class="text-xs font-mono font-bold text-primary">{{ selectedProject()?.project_id }}</span>
            <h3 class="font-semibold text-on-surface mt-1">{{ selectedProject()?.project_name }}</h3>
          </div>
          <button (click)="viewDrawerOpen.set(false)" class="p-2 hover:bg-surface-container-low rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="k-label">Status</p>
              <app-status-chip [value]="selectedProject()?.project_status || ''"
                               [label]="masters.getStatusLabel(selectedProject()?.project_status || '')" />
            </div>
            <div>
              <p class="k-label">Start Date</p>
              <p class="text-sm">{{ formatDate(selectedProject()?.project_start_date) }}</p>
            </div>
            <div>
              <p class="k-label">End Date</p>
              <p class="text-sm">{{ formatDate(selectedProject()?.project_end_date) }}</p>
            </div>
            <div>
              <p class="k-label">Created On</p>
              <p class="text-sm">{{ formatDate(selectedProject()?.created_on) }}</p>
            </div>
          </div>
          <div>
            <p class="k-label">Description</p>
            <p class="text-sm text-on-surface-variant">{{ selectedProject()?.project_description }}</p>
          </div>

          <!-- Artifacts (read-only in view) -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="k-label mb-0">Artifacts</p>
              @if (auth.canUpdate(selectedProject()?.project_id || '')) {
                <button (click)="viewDrawerOpen.set(false); openArtifacts(selectedProject()!)"
                        class="text-xs text-primary font-semibold hover:underline">Manage</button>
              }
            </div>
            @if (artifactsLoading()) { <div class="loading-pulse"></div> }
            @if (artifacts().length === 0 && !artifactsLoading()) {
              <p class="text-sm text-on-surface-variant">No artifacts.</p>
            }
            <div class="space-y-2">
              @for (a of artifacts(); track a.project_artifact_id) {
                <div class="bg-surface-container-low rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-semibold text-on-surface">{{ a.artifact_title }}</span>
                    <span class="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container">{{ a.artifact_type }}</span>
                    @if (a.is_sensitive === true || a.is_sensitive === 'TRUE') {
                      <span class="text-[9px] font-bold text-error bg-error-container/50 px-1.5 py-0.5 rounded">SENSITIVE</span>
                    }
                  </div>
                  @if (a.artifact_type === 'url') {
                    <a [href]="a.artifact_value" target="_blank" class="text-xs text-primary hover:underline truncate block max-w-[260px]">{{ a.artifact_value }}</a>
                  } @else if (a.is_sensitive === true || a.is_sensitive === 'TRUE') {
                    <span class="text-xs text-on-surface-variant">••••••••••••</span>
                  } @else {
                    <span class="text-xs text-on-surface-variant">{{ a.artifact_value }}</span>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </aside>
    }

    <!-- ───── Artifacts Drawer ───── -->
    @if (artifactsDrawerOpen()) {
      <div class="drawer-overlay" (click)="artifactsDrawerOpen.set(false)"></div>
      <aside class="drawer-panel">
        <div class="flex items-center justify-between p-6 border-b border-surface-container-low flex-shrink-0">
          <div>
            <p class="text-xs text-outline">{{ selectedProject()?.project_id }}</p>
            <h3 class="font-semibold text-on-surface">Project Artifacts</h3>
          </div>
          <button (click)="artifactsDrawerOpen.set(false)" class="p-2 hover:bg-surface-container-low rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <!-- Add artifact form (collapsible) -->
          <div class="mb-6">
            @if (!artifactFormOpen() && !editingArtifact()) {
              <button (click)="artifactFormOpen.set(true)"
                      class="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-outline-variant/40 rounded-xl text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">
                <span class="material-symbols-outlined text-sm">add</span>
                Add Artifact
              </button>
            }
            @if (artifactFormOpen() || editingArtifact()) {
              <div class="bg-surface-container-low rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    {{ editingArtifact() ? 'Edit Artifact' : 'Add Artifact' }}
                  </h4>
                  <button (click)="artifactFormOpen.set(false); cancelArtifactEdit()"
                          class="p-1 rounded hover:bg-surface-container transition-colors">
                    <span class="material-symbols-outlined text-sm text-outline">close</span>
                  </button>
                </div>
                <form [formGroup]="artifactForm" class="space-y-3">
                  <div>
                    <label class="k-label">Title *</label>
                    <input formControlName="artifact_title" class="k-input" placeholder="e.g. Figma Design Link" />
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
                           [placeholder]="artifactForm.get('artifact_type')?.value === 'url' ? 'https://...' : 'Enter value'" />
                  </div>
                  <div class="flex gap-2">
                    <button type="button" class="btn-primary text-xs py-2" (click)="saveArtifact()" [disabled]="savingArtifact()">
                      {{ editingArtifact() ? 'Update' : 'Add' }}
                    </button>
                    <button type="button" class="btn-ghost text-xs py-2" (click)="artifactFormOpen.set(false); cancelArtifactEdit()">Cancel</button>
                  </div>
                </form>
              </div>
            }
          </div>

          <!-- Artifact list -->
          @if (artifactsLoading()) { <div class="loading-pulse mb-4"></div> }
          <div class="space-y-2">
            @if (artifacts().length === 0 && !artifactsLoading()) {
              <p class="text-sm text-on-surface-variant text-center py-6">No artifacts yet.</p>
            }
            @for (a of artifacts(); track a.project_artifact_id) {
              <div class="bg-surface-container-lowest rounded-lg p-4 flex items-start justify-between gap-3 ghost-border">
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
                       class="text-xs text-primary hover:underline truncate block max-w-[280px]">
                      {{ a.artifact_value }}
                    </a>
                  } @else if (a.is_sensitive === true || a.is_sensitive === 'TRUE') {
                    <span class="text-xs text-on-surface-variant">••••••••••••</span>
                  } @else {
                    <span class="text-xs text-on-surface-variant">{{ a.artifact_value }}</span>
                  }
                </div>
                <div class="flex gap-1 flex-shrink-0">
                  <button (click)="editArtifact(a)"
                          class="p-1.5 text-outline hover:text-primary rounded-lg hover:bg-primary-fixed/20 transition-colors">
                    <span class="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button (click)="deleteArtifactConfirm(a)"
                          class="p-1.5 text-outline hover:text-error rounded-lg hover:bg-error-container/30 transition-colors">
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </aside>
    }

    <!-- Confirm delete -->
    <app-confirm-dialog
      [visible]="confirmDeleteVisible()"
      [title]="'Delete ' + (deletingProject()?.project_name || 'Project')"
      message="All tasks for this project will remain but lose their project link. This cannot be undone."
      (confirm)="doDelete()"
      (cancel)="confirmDeleteVisible.set(false)" />

    <app-confirm-dialog
      [visible]="confirmArtifactDeleteVisible()"
      title="Delete Artifact"
      message="This artifact will be permanently removed."
      (confirm)="doDeleteArtifact()"
      (cancel)="confirmArtifactDeleteVisible.set(false)" />
  `
})
export class ProjectsComponent implements OnInit {
  projects = signal<Project[]>([]);
  filtered = signal<Project[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal('');

  drawerOpen = signal(false);
  editMode = signal(false);
  viewDrawerOpen = signal(false);
  selectedProject = signal<Project | null>(null);

  artifactsDrawerOpen = signal(false);
  artifacts = signal<ProjectArtifact[]>([]);
  artifactsLoading = signal(false);
  savingArtifact = signal(false);
  editingArtifact = signal<ProjectArtifact | null>(null);
  artifactFormOpen = signal(false);

  confirmDeleteVisible = signal(false);
  deletingProject = signal<Project | null>(null);
  confirmArtifactDeleteVisible = signal(false);
  deletingArtifact = signal<ProjectArtifact | null>(null);

  filter = { nameSearch: '', status: '', startDateFrom: '', startDateTo: '' };

  form = this.fb.group({
    project_id: [''],
    project_name: ['', Validators.required],
    project_description: ['', Validators.required],
    project_status: ['triage', Validators.required],
    project_start_date: [''],
    project_end_date: [''],
  });

  artifactForm = this.fb.group({
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
    private router: Router
  ) {}

  goToTasks(projectId: string) {
    this.router.navigate(['/tasks'], { queryParams: { project: projectId } });
  }

  ngOnInit() {
    this.loadProjects();
    // Dynamic validator for start date
    this.form.get('project_status')?.valueChanges.subscribe(status => {
      const ctrl = this.form.get('project_start_date')!;
      if (status !== 'triage') ctrl.setValidators(Validators.required);
      else ctrl.clearValidators();
      ctrl.updateValueAndValidity();
    });
  }

  loadProjects() {
    const userId = this.auth.currentUser()?.user_id;
    if (!userId) return;
    this.loading.set(true);
    this.api.getProjects(userId).subscribe({
      next: p => { this.projects.set(p); this.applyFilter(); this.loading.set(false); },
      error: (e: Error) => { this.errorMsg.set(e.message); this.loading.set(false); }
    });
  }

  applyFilter() {
    let list = [...this.projects()];
    const f = this.filter;
    if (f.nameSearch) {
      const q = f.nameSearch.toLowerCase();
      list = list.filter(p => p.project_name.toLowerCase().includes(q) || p.project_id.toLowerCase().includes(q));
    }
    if (f.status) list = list.filter(p => p.project_status === f.status);
    if (f.startDateFrom) list = list.filter(p => p.project_start_date && p.project_start_date >= f.startDateFrom);
    if (f.startDateTo) list = list.filter(p => p.project_start_date && p.project_start_date <= f.startDateTo);
    this.filtered.set(list);
  }

  hasFilter(): boolean {
    return !!(this.filter.nameSearch || this.filter.status || this.filter.startDateFrom || this.filter.startDateTo);
  }

  clearFilter() {
    this.filter = { nameSearch: '', status: '', startDateFrom: '', startDateTo: '' };
    this.applyFilter();
  }

  fc(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  openCreate() {
    this.editMode.set(false);
    this.form.reset({ project_status: 'triage' });
    this.drawerOpen.set(true);
  }

  openEdit(p: Project) {
    this.editMode.set(true);
    this.selectedProject.set(p);
    this.form.patchValue({
      project_id: p.project_id,
      project_name: p.project_name,
      project_description: p.project_description,
      project_status: p.project_status,
      project_start_date: toDateInputValue(p.project_start_date),
      project_end_date: toDateInputValue(p.project_end_date),
    });
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    this.form.reset({ project_status: 'triage' });
  }

  saveProject() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const userId = this.auth.currentUser()!.user_id;
    const v = this.form.value as any;
    this.saving.set(true);
    this.errorMsg.set('');

    if (this.editMode()) {
      this.api.updateProject({ ...v, last_modified_by: userId }).subscribe({
        next: () => { this.saving.set(false); this.closeDrawer(); this.loadProjects(); },
        error: (e: Error) => { this.saving.set(false); this.errorMsg.set(e.message); }
      });
    } else {
      this.api.createProject({ ...v, created_by: userId }).subscribe({
        next: () => { this.saving.set(false); this.closeDrawer(); this.loadProjects(); },
        error: (e: Error) => { this.saving.set(false); this.errorMsg.set(e.message); }
      });
    }
  }

  viewProject(p: Project) { this.selectedProject.set(p); this.viewDrawerOpen.set(true); this.loadArtifacts(p.project_id); }

  confirmDelete(p: Project) { this.deletingProject.set(p); this.confirmDeleteVisible.set(true); }

  doDelete() {
    const p = this.deletingProject();
    if (!p) return;
    this.api.deleteProject(p.project_id, this.auth.currentUser()!.user_id).subscribe({
      next: () => { this.confirmDeleteVisible.set(false); this.loadProjects(); },
      error: (e: Error) => { this.errorMsg.set(e.message); this.confirmDeleteVisible.set(false); }
    });
  }

  // Artifacts
  openArtifacts(p: Project) {
    this.selectedProject.set(p);
    this.artifactsDrawerOpen.set(true);
    this.loadArtifacts(p.project_id);
    this.artifactForm.reset({ artifact_type: 'url', is_sensitive: false });
    this.editingArtifact.set(null);
  }

  loadArtifacts(projectId: string) {
    this.artifactsLoading.set(true);
    this.api.getArtifacts(projectId).subscribe({
      next: a => { this.artifacts.set(a); this.artifactsLoading.set(false); },
      error: () => this.artifactsLoading.set(false)
    });
  }

  editArtifact(a: ProjectArtifact) {
    this.editingArtifact.set(a);
    this.artifactFormOpen.set(true);
    this.artifactForm.patchValue({
      artifact_title: a.artifact_title,
      artifact_value: a.artifact_value,
      artifact_type: a.artifact_type,
      is_sensitive: this.toBool(a.is_sensitive),
    });
  }

  cancelArtifactEdit() {
    this.editingArtifact.set(null);
    this.artifactFormOpen.set(false);
    this.artifactForm.reset({ artifact_type: 'url', is_sensitive: false });
  }

  saveArtifact() {
    this.artifactForm.markAllAsTouched();
    if (this.artifactForm.invalid) return;
    const v = this.artifactForm.value as any;
    const userId = this.auth.currentUser()!.user_id;
    this.savingArtifact.set(true);

    if (this.editingArtifact()) {
      this.api.updateArtifact({ ...v, project_artifact_id: this.editingArtifact()!.project_artifact_id }).subscribe({
        next: () => { this.savingArtifact.set(false); this.cancelArtifactEdit(); this.loadArtifacts(this.selectedProject()!.project_id); },
        error: () => this.savingArtifact.set(false)
      });
    } else {
      this.api.createArtifact({ ...v, project_id_fk: this.selectedProject()!.project_id, created_by: userId }).subscribe({
        next: () => { this.savingArtifact.set(false); this.artifactFormOpen.set(false); this.artifactForm.reset({ artifact_type: 'url', is_sensitive: false }); this.loadArtifacts(this.selectedProject()!.project_id); },
        error: () => this.savingArtifact.set(false)
      });
    }
  }

  deleteArtifactConfirm(a: ProjectArtifact) { this.deletingArtifact.set(a); this.confirmArtifactDeleteVisible.set(true); }

  doDeleteArtifact() {
    const a = this.deletingArtifact();
    if (!a) return;
    this.api.deleteArtifact(a.project_artifact_id).subscribe({
      next: () => { this.confirmArtifactDeleteVisible.set(false); this.loadArtifacts(this.selectedProject()!.project_id); },
      error: () => this.confirmArtifactDeleteVisible.set(false)
    });
  }

  toBool(val: boolean | string | undefined): boolean {
    return String(val).toUpperCase() === 'TRUE' || val === true;
  }

  formatDate = formatDate;
}
