import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Role, Permission, PermissionCode, ALL_PERMISSIONS } from '../../models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  template: `
    <div class="p-6 md:p-8">
      <!-- Loading -->
      @if (loading()) { <div class="loading-pulse mb-4"></div> }

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Administration</p>
          <h2 class="text-3xl font-bold tracking-tight text-on-surface">Roles & Permissions</h2>
          <p class="text-on-surface-variant text-sm mt-1">Manage roles and assign permissions to control user access.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="material-symbols-outlined">add</span>
          Create Role
        </button>
      </div>

      <!-- Roles Table -->
      <div class="bg-surface-container-lowest rounded-xl ambient-lift overflow-hidden ghost-border">
        <table class="w-full text-left k-table">
          <thead>
            <tr>
              <th>Role Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Permissions</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @if (roles().length === 0 && !loading()) {
              <tr><td colspan="5" class="text-center py-12 text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl block mb-2 opacity-30">shield</span>
                No roles found.
              </td></tr>
            }
            @for (role of roles(); track role.role_id) {
              <tr>
                <td class="font-semibold text-on-surface">{{ role.role_name }}</td>
                <td class="text-sm text-on-surface-variant max-w-xs">{{ role.role_description }}</td>
                <td>
                  <span class="text-xs px-2 py-1 rounded-full font-medium"
                        [class.bg-tertiary-container]="role.is_active"
                        [class.text-on-tertiary-container]="role.is_active"
                        [class.bg-surface-container-highest]="!role.is_active"
                        [class.text-on-surface-variant]="!role.is_active">
                    {{ role.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    @for (perm of getRolePermissions(role.role_id); track perm) {
                      <span class="text-[10px] bg-primary-container text-on-primary-container px-1.5 py-0.5 rounded">
                        {{ formatPermission(perm) }}
                      </span>
                    }
                    @if (getRolePermissions(role.role_id).length === 0) {
                      <span class="text-[10px] text-outline italic">No permissions</span>
                    }
                  </div>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button (click)="openEdit(role)" title="Edit"
                            class="p-1.5 hover:bg-surface-container rounded-lg transition-colors">
                      <span class="material-symbols-outlined text-sm text-outline hover:text-primary">edit</span>
                    </button>
                    @if (!isSystemRole(role)) {
                      <button (click)="confirmDelete(role)" title="Delete"
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
      </div>

      @if (errorMsg()) {
        <div class="mt-4 p-4 bg-error-container rounded-lg text-on-error-container text-sm">{{ errorMsg() }}</div>
      }
    </div>

    <!-- Role Form Drawer -->
    @if (drawerOpen()) {
      <div class="drawer-overlay" (click)="closeDrawer()"></div>
      <aside class="drawer-panel">
        <div class="flex items-center justify-between p-6 border-b border-surface-container-low flex-shrink-0">
          <h3 class="font-semibold text-on-surface text-base">
            {{ editMode() ? 'Edit Role' : 'Create Role' }}
          </h3>
          <button (click)="closeDrawer()" class="p-1 hover:bg-surface-container rounded-lg transition-colors">
            <span class="material-symbols-outlined text-outline">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <form [formGroup]="form" class="space-y-4">
            <!-- Role Name -->
            <div>
              <label class="k-label">Role Name *</label>
              <input type="text" formControlName="role_name" class="k-input" placeholder="e.g., Project Manager" />
              @if (form.get('role_name')?.invalid && form.get('role_name')?.touched) {
                <p class="text-error text-xs mt-1">Role name is required</p>
              }
            </div>

            <!-- Description -->
            <div>
              <label class="k-label">Description</label>
              <textarea formControlName="role_description" class="k-input" rows="3"
                        placeholder="Describe what this role can do..."></textarea>
            </div>

            <!-- Active Status -->
            <div class="flex items-center gap-2">
              <input type="checkbox" id="is_active" formControlName="is_active" class="rounded" />
              <label for="is_active" class="text-sm text-on-surface cursor-pointer">Active</label>
            </div>

            <!-- Permissions Section -->
            <div class="pt-4 border-t border-surface-container-low">
              <label class="k-label mb-3">Permissions</label>
              <div class="space-y-2">
                @for (perm of ALL_PERMISSIONS; track perm) {
                  <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                    <input type="checkbox" 
                           [checked]="selectedPermissions().includes(perm)"
                           (change)="togglePermission(perm)"
                           class="rounded" />
                    <div>
                      <p class="text-sm font-medium text-on-surface">{{ formatPermission(perm) }}</p>
                      <p class="text-[10px] text-outline">{{ getPermissionDescription(perm) }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          </form>

          @if (formError()) {
            <div class="mt-4 p-3 bg-error-container/50 rounded-lg text-on-error-container text-sm">{{ formError() }}</div>
          }
        </div>

        <div class="p-6 border-t border-surface-container-low flex items-center justify-end gap-3 flex-shrink-0">
          <button class="btn-secondary" (click)="closeDrawer()">Cancel</button>
          <button class="btn-primary" (click)="saveRole()" [disabled]="saving()">
            @if (saving()) {
              <span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            }
            {{ editMode() ? 'Update' : 'Create' }}
          </button>
        </div>
      </aside>
    }

    <!-- Delete Confirmation -->
    <app-confirm-dialog
      [visible]="deleteVisible()"
      title="Delete Role"
      message="Are you sure you want to delete this role? This action cannot be undone."
      confirmText="Delete"
      confirmButtonClass="btn-danger"
      (confirm)="doDelete()"
      (cancel)="deleteVisible.set(false)">
    </app-confirm-dialog>
  `
})
export class RolesComponent implements OnInit {
  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  rolePermissionMap = signal<Map<string, PermissionCode[]>>(new Map());
  
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal('');
  
  drawerOpen = signal(false);
  editMode = signal(false);
  selectedRole = signal<Role | null>(null);
  selectedPermissions = signal<PermissionCode[]>([]);
  formError = signal('');
  
  deleteVisible = signal(false);
  deletingRole = signal<Role | null>(null);

  form = this.fb.group({
    role_name: ['', Validators.required],
    role_description: [''],
    is_active: [true]
  });

  ALL_PERMISSIONS = ALL_PERMISSIONS;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    
    // Load roles
    this.api.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles.filter(r => !r.is_deleted));
        
        // Load permissions for each role
        const map = new Map<string, PermissionCode[]>();
        let loadedCount = 0;
        
        roles.forEach(role => {
          this.api.getRolePermissions(role.role_id).subscribe({
            next: (perms) => {
              map.set(role.role_id, perms.map(p => p.permission_code as PermissionCode).filter(Boolean));
              loadedCount++;
              if (loadedCount === roles.length) {
                this.rolePermissionMap.set(map);
                this.loading.set(false);
              }
            },
            error: () => {
              loadedCount++;
              if (loadedCount === roles.length) {
                this.rolePermissionMap.set(map);
                this.loading.set(false);
              }
            }
          });
        });
        
        if (roles.length === 0) {
          this.loading.set(false);
        }
      },
      error: (e) => {
        this.errorMsg.set(e.message);
        this.loading.set(false);
      }
    });

    // Load all available permissions
    this.api.getPermissions().subscribe({
      next: (perms) => this.permissions.set(perms),
      error: () => {}
    });
  }

  getRolePermissions(roleId: string): PermissionCode[] {
    return this.rolePermissionMap().get(roleId) || [];
  }

  openCreate() {
    this.editMode.set(false);
    this.selectedRole.set(null);
    this.selectedPermissions.set([]);
    this.form.reset({ role_name: '', role_description: '', is_active: true });
    this.formError.set('');
    this.drawerOpen.set(true);
  }

  openEdit(role: Role) {
    this.editMode.set(true);
    this.selectedRole.set(role);
    this.selectedPermissions.set([...(this.rolePermissionMap().get(role.role_id) || [])]);
    this.form.patchValue({
      role_name: role.role_name,
      role_description: role.role_description,
      is_active: role.is_active
    });
    this.formError.set('');
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
  }

  togglePermission(code: PermissionCode) {
    const current = this.selectedPermissions();
    if (current.includes(code)) {
      this.selectedPermissions.set(current.filter(p => p !== code));
    } else {
      this.selectedPermissions.set([...current, code]);
    }
  }

  saveRole() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.formError.set('');

    const formValue = this.form.value;
    const userId = this.auth.currentUser()?.user_id || '';

    if (this.editMode()) {
      const role = this.selectedRole()!;
      this.api.updateRole(role.role_id, {
        role_name: formValue.role_name!,
        role_description: formValue.role_description || '',
        is_active: formValue.is_active ?? true
      }).subscribe({
        next: () => {
          // Update permissions
          this.api.updateRolePermissions(role.role_id, this.selectedPermissions()).subscribe({
            next: () => {
              this.saving.set(false);
              this.closeDrawer();
              this.loadData();
            },
            error: (e) => {
              this.saving.set(false);
              this.formError.set(e.message);
            }
          });
        },
        error: (e) => {
          this.saving.set(false);
          this.formError.set(e.message);
        }
      });
    } else {
      this.api.createRole({
        role_name: formValue.role_name!,
        role_description: formValue.role_description || '',
        is_active: formValue.is_active ?? true,
        is_deleted: false,
        created_by: userId,
        created_on: new Date().toISOString()
      }).subscribe({
        next: (newRole) => {
          // Set permissions for new role
          this.api.updateRolePermissions(newRole.role_id, this.selectedPermissions()).subscribe({
            next: () => {
              this.saving.set(false);
              this.closeDrawer();
              this.loadData();
            },
            error: (e) => {
              this.saving.set(false);
              this.formError.set(e.message);
            }
          });
        },
        error: (e) => {
          this.saving.set(false);
          this.formError.set(e.message);
        }
      });
    }
  }

  confirmDelete(role: Role) {
    this.deletingRole.set(role);
    this.deleteVisible.set(true);
  }

  doDelete() {
    const role = this.deletingRole();
    if (!role) return;
    
    this.api.deleteRole(role.role_id).subscribe({
      next: () => {
        this.deleteVisible.set(false);
        this.loadData();
      },
      error: (e) => {
        this.errorMsg.set(e.message);
        this.deleteVisible.set(false);
      }
    });
  }

  isSystemRole(role: Role): boolean {
    // Protect system roles like Admin
    return ['R001', 'ADMIN', 'admin'].includes(role.role_id) || 
           role.role_name.toLowerCase() === 'admin';
  }

  formatPermission(code: PermissionCode): string {
    return code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getPermissionDescription(code: PermissionCode): string {
    const descriptions: Record<PermissionCode, string> = {
      PROJECT_CREATE: 'Can create new projects',
      PROJECT_DELETE: 'Can delete any project',
      PROJECT_UPDATE: 'Can edit any project',
      TASK_CREATE: 'Can create tasks in any project',
      TASK_DELETE: 'Can delete any task',
      TASK_UPDATE: 'Can update any task',
      USER_MANAGE: 'Can create and manage users',
      ROLE_MANAGE: 'Can manage roles and permissions',
      VIEW_ALL_PROJECTS: 'Can view all projects without assignment',
      ARTIFACT_MANAGE: 'Can manage project and task artifacts'
    };
    return descriptions[code] || '';
  }
}
