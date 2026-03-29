import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MastersService } from '../../services/masters.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Role, UserOption } from '../../models';

interface UserWithRole extends UserOption {
  role_id?: string;
  role_name?: string;
  is_active?: boolean;
  password_hash?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmDialogComponent],
  template: `
    <div class="p-6 md:p-8">
      <!-- Loading -->
      @if (loading()) { <div class="loading-pulse mb-4"></div> }

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Administration</p>
          <h2 class="text-3xl font-bold tracking-tight text-on-surface">User Management</h2>
          <p class="text-on-surface-variant text-sm mt-1">Create users and assign roles to control system access.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="material-symbols-outlined">add</span>
          Create User
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-surface-container-low rounded-xl p-4 mb-6">
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[200px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-sm">search</span>
            <input type="text" placeholder="Search users..."
                   class="w-full pl-9 pr-3 py-2 bg-surface-container-lowest rounded-lg text-sm outline-none"
                   [(ngModel)]="searchQuery" (input)="applyFilter()" [ngModelOptions]="{standalone: true}" />
          </div>
          <select class="px-3 py-2 bg-surface-container-lowest rounded-lg text-sm outline-none min-w-[150px]"
                  [(ngModel)]="roleFilter" (change)="applyFilter()" [ngModelOptions]="{standalone: true}">
            <option value="">All Roles</option>
            @for (role of roles(); track role.role_id) {
              <option [value]="role.role_id">{{ role.role_name }}</option>
            }
          </select>
          <select class="px-3 py-2 bg-surface-container-lowest rounded-lg text-sm outline-none min-w-[120px]"
                  [(ngModel)]="statusFilter" (change)="applyFilter()" [ngModelOptions]="{standalone: true}">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <!-- Users Table -->
      <div class="bg-surface-container-lowest rounded-xl ambient-lift overflow-hidden ghost-border">
        <table class="w-full text-left k-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @if (filteredUsers().length === 0 && !loading()) {
              <tr><td colspan="5" class="text-center py-12 text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl block mb-2 opacity-30">group</span>
                No users found.
              </td></tr>
            }
            @for (user of filteredUsers(); track user.user_id) {
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-sm font-bold">
                      {{ getInitials(user.display_name) }}
                    </div>
                    <div>
                      <p class="font-semibold text-on-surface">{{ user.display_name }}</p>
                      <p class="text-xs text-outline">{{ user.username }}</p>
                    </div>
                  </div>
                </td>
                <td class="text-sm text-on-surface-variant">{{ user.email }}</td>
                <td>
                  <span class="text-xs bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full">
                    {{ user.role_name || 'No Role' }}
                  </span>
                </td>
                <td>
                  <span class="text-xs px-2 py-1 rounded-full font-medium"
                        [class.bg-tertiary-container]="user.is_active"
                        [class.text-on-tertiary-container]="user.is_active"
                        [class.bg-surface-container-highest]="!user.is_active"
                        [class.text-on-surface-variant]="!user.is_active">
                    {{ user.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button (click)="openEdit(user)" title="Edit"
                            class="p-1.5 hover:bg-surface-container rounded-lg transition-colors">
                      <span class="material-symbols-outlined text-sm text-outline hover:text-primary">edit</span>
                    </button>
                    @if (user.user_id !== auth.currentUser()?.user_id) {
                      <button (click)="confirmDelete(user)" title="Delete"
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

    <!-- User Form Drawer -->
    @if (drawerOpen()) {
      <div class="drawer-overlay" (click)="closeDrawer()"></div>
      <aside class="drawer-panel">
        <div class="flex items-center justify-between p-6 border-b border-surface-container-low flex-shrink-0">
          <h3 class="font-semibold text-on-surface text-base">
            {{ editMode() ? 'Edit User' : 'Create User' }}
          </h3>
          <button (click)="closeDrawer()" class="p-1 hover:bg-surface-container rounded-lg transition-colors">
            <span class="material-symbols-outlined text-outline">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <form [formGroup]="form" class="space-y-4">
            <!-- Username -->
            <div>
              <label class="k-label">Username *</label>
              <input type="text" formControlName="username" class="k-input" placeholder="e.g., john.doe" />
              @if (form.get('username')?.invalid && form.get('username')?.touched) {
                <p class="text-error text-xs mt-1">Username is required</p>
              }
            </div>

            <!-- Display Name -->
            <div>
              <label class="k-label">Display Name *</label>
              <input type="text" formControlName="display_name" class="k-input" placeholder="e.g., John Doe" />
              @if (form.get('display_name')?.invalid && form.get('display_name')?.touched) {
                <p class="text-error text-xs mt-1">Display name is required</p>
              }
            </div>

            <!-- Email -->
            <div>
              <label class="k-label">Email *</label>
              <input type="email" formControlName="email" class="k-input" placeholder="e.g., john@company.com" />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <p class="text-error text-xs mt-1">Valid email is required</p>
              }
            </div>

            <!-- Password -->
            <div>
              <label class="k-label">{{ editMode() ? 'New Password (leave blank to keep current)' : 'Password *' }}</label>
              <input type="password" formControlName="password" class="k-input" placeholder="Enter password" />
              @if (!editMode() && form.get('password')?.invalid && form.get('password')?.touched) {
                <p class="text-error text-xs mt-1">Password is required (min 6 characters)</p>
              }
            </div>

            <!-- Role -->
            <div>
              <label class="k-label">Role *</label>
              <select formControlName="role_id" class="k-input">
                <option value="">Select role...</option>
                @for (role of activeRoles(); track role.role_id) {
                  <option [value]="role.role_id">{{ role.role_name }}</option>
                }
              </select>
              @if (form.get('role_id')?.invalid && form.get('role_id')?.touched) {
                <p class="text-error text-xs mt-1">Role is required</p>
              }
            </div>

            <!-- Active Status -->
            <div class="flex items-center gap-2">
              <input type="checkbox" id="is_active" formControlName="is_active" class="rounded" />
              <label for="is_active" class="text-sm text-on-surface cursor-pointer">Active User</label>
            </div>
          </form>

          @if (formError()) {
            <div class="mt-4 p-3 bg-error-container/50 rounded-lg text-on-error-container text-sm">{{ formError() }}</div>
          }
        </div>

        <div class="p-6 border-t border-surface-container-low flex items-center justify-end gap-3 flex-shrink-0">
          <button class="btn-secondary" (click)="closeDrawer()">Cancel</button>
          <button class="btn-primary" (click)="saveUser()" [disabled]="saving()">
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
      title="Delete User"
      message="Are you sure you want to delete this user? This action cannot be undone."
      confirmText="Delete"
      confirmButtonClass="btn-danger"
      (confirm)="doDelete()"
      (cancel)="deleteVisible.set(false)">
    </app-confirm-dialog>
  `
})
export class UsersComponent implements OnInit {
  users = signal<UserWithRole[]>([]);
  filteredUsers = signal<UserWithRole[]>([]);
  roles = signal<Role[]>([]);
  
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal('');
  
  searchQuery = '';
  roleFilter = '';
  statusFilter = '';
  
  drawerOpen = signal(false);
  editMode = signal(false);
  selectedUser = signal<UserWithRole | null>(null);
  formError = signal('');
  
  deleteVisible = signal(false);
  deletingUser = signal<UserWithRole | null>(null);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    display_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.editMode() ? [] : [Validators.required, Validators.minLength(6)]],
    role_id: ['', Validators.required],
    is_active: [true]
  });

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private masters: MastersService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.loadData();
    
    // Update password validation when edit mode changes
    effect(() => {
      const isEdit = this.editMode();
      const passwordControl = this.form.get('password');
      if (isEdit) {
        passwordControl?.clearValidators();
      } else {
        passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      }
      passwordControl?.updateValueAndValidity();
    });
  }

  loadData() {
    this.loading.set(true);
    
    // Load roles first
    this.api.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles.filter(r => !r.is_deleted));
        
        // Load users from masters service (includes role info)
        this.masters.load();
        
        // For now, use the users from masters and enhance with role data
        // In production, you'd have a dedicated getUsers() endpoint
        const users = this.masters.users();
        const enhancedUsers: UserWithRole[] = users.map(u => ({
          ...u,
          role_id: '', // Would come from backend
          role_name: 'User', // Would come from backend
          is_active: true
        }));
        this.users.set(enhancedUsers);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (e) => {
        this.errorMsg.set(e.message);
        this.loading.set(false);
      }
    });
  }

  activeRoles() {
    return this.roles().filter(r => r.is_active);
  }

  applyFilter() {
    let filtered = this.users();
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.username.toLowerCase().includes(query) ||
        u.display_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }
    
    if (this.roleFilter) {
      filtered = filtered.filter(u => u.role_id === this.roleFilter);
    }
    
    if (this.statusFilter) {
      const isActive = this.statusFilter === 'active';
      filtered = filtered.filter(u => u.is_active === isActive);
    }
    
    this.filteredUsers.set(filtered);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  openCreate() {
    this.editMode.set(false);
    this.selectedUser.set(null);
    this.form.reset({ username: '', display_name: '', email: '', password: '', role_id: '', is_active: true });
    this.formError.set('');
    this.drawerOpen.set(true);
  }

  openEdit(user: UserWithRole) {
    this.editMode.set(true);
    this.selectedUser.set(user);
    this.form.patchValue({
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      password: '', // Don't show existing password
      role_id: user.role_id || '',
      is_active: user.is_active ?? true
    });
    this.formError.set('');
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
  }

  saveUser() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.formError.set('');

    const formValue = this.form.value;
    const userId = this.auth.currentUser()?.user_id || '';

    if (this.editMode()) {
      const user = this.selectedUser()!;
      const payload: any = {
        user_id: user.user_id,
        username: formValue.username!,
        display_name: formValue.display_name!,
        email: formValue.email!,
        role_id: formValue.role_id!,
        is_active: formValue.is_active ?? true,
        last_modified_by: userId
      };
      
      // Only include password if provided
      if (formValue.password) {
        payload.password = formValue.password;
      }
      
      this.api.updateUser(payload).subscribe({
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
    } else {
      const payload = {
        username: formValue.username!,
        display_name: formValue.display_name!,
        email: formValue.email!,
        password: formValue.password!,
        role_id: formValue.role_id!,
        is_active: formValue.is_active ?? true,
        created_by: userId
      };
      
      this.api.createUser(payload).subscribe({
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
    }
  }

  confirmDelete(user: UserWithRole) {
    this.deletingUser.set(user);
    this.deleteVisible.set(true);
  }

  doDelete() {
    const user = this.deletingUser();
    if (!user) return;
    
    this.api.deleteUser(user.user_id).subscribe({
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
}
