import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { SessionUser, UserProjectMapping, PermissionCode, ALL_PERMISSIONS } from '../models';

const SESSION_KEY = 'kinetic_session';
const PERMISSIONS_KEY = 'kinetic_permissions';
const USER_PROJECTS_KEY = 'kinetic_user_projects';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<SessionUser | null>(null);
  
  // User's permission codes from their role
  userPermissions = signal<PermissionCode[]>([]);
  
  // User's assigned projects
  userProjects = signal<UserProjectMapping[]>([]);
  
  // Computed: Check if user has a specific permission
  hasPermission = computed(() => (code: PermissionCode) => {
    return this.userPermissions().includes(code);
  });
  
  // Computed: Get all accessible project IDs
  accessibleProjectIds = computed(() => {
    return this.userProjects()
      .filter(p => p.is_active)
      .map(p => p.project_id_fk);
  });
  
  // Computed: Can view all projects (admin/manager) or only assigned
  canViewAllProjects = computed(() => {
    return this.userPermissions().includes('VIEW_ALL_PROJECTS');
  });

  constructor(private api: ApiService, private router: Router) {
    this.restoreSession();
  }

  private restoreSession() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
    }
    const perms = sessionStorage.getItem(PERMISSIONS_KEY);
    if (perms) {
      this.userPermissions.set(JSON.parse(perms));
    }
    const projects = sessionStorage.getItem(USER_PROJECTS_KEY);
    if (projects) {
      this.userProjects.set(JSON.parse(projects));
    }
  }

  login(username: string, password: string): Observable<{ user: SessionUser; permissions: PermissionCode[]; projects: UserProjectMapping[] }> {
    return this.api.loginWithRBAC(username, password).pipe(
      tap(res => {
        this.currentUser.set(res.user);
        this.userPermissions.set(res.permissions);
        this.userProjects.set(res.projects);
        
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
        sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(res.permissions));
        sessionStorage.setItem(USER_PROJECTS_KEY, JSON.stringify(res.projects));
      })
    );
  }

  logout() {
    this.currentUser.set(null);
    this.userPermissions.set([]);
    this.userProjects.set([]);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PERMISSIONS_KEY);
    sessionStorage.removeItem(USER_PROJECTS_KEY);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  // Check if user can access a specific project
  canAccessProject(projectId: string): boolean {
    // If they can view all projects, they can access any
    if (this.canViewAllProjects()) return true;
    // Otherwise, check if assigned to this project
    return this.accessibleProjectIds().includes(projectId);
  }

  // Check if user can create projects globally
  canCreateProjects(): boolean {
    return this.hasPermission()('PROJECT_CREATE');
  }

  // Check if user can delete any project
  canDeleteProjects(): boolean {
    return this.hasPermission()('PROJECT_DELETE');
  }

  // Check if user can update any project
  canUpdateProjects(): boolean {
    return this.hasPermission()('PROJECT_UPDATE');
  }

  // Check if user can create tasks
  canCreateTasks(): boolean {
    return this.hasPermission()('TASK_CREATE');
  }

  // Check if user can delete tasks
  canDeleteTasks(): boolean {
    return this.hasPermission()('TASK_DELETE');
  }

  // Check if user can update tasks
  canUpdateTasks(): boolean {
    return this.hasPermission()('TASK_UPDATE');
  }

  // Check if user can manage users
  canManageUsers(): boolean {
    return this.hasPermission()('USER_MANAGE');
  }

  // Check if user can manage roles
  canManageRoles(): boolean {
    return this.hasPermission()('ROLE_MANAGE');
  }

  // Check if user can manage artifacts
  canManageArtifacts(): boolean {
    return this.hasPermission()('ARTIFACT_MANAGE');
  }

  // Get all user permissions (for UI display)
  getUserPermissions(): PermissionCode[] {
    return this.userPermissions();
  }

  // Check specific permission
  checkPermission(code: PermissionCode): boolean {
    return this.hasPermission()(code);
  }
}
