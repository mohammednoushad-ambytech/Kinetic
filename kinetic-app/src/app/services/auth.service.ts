import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { SessionUser, UserProjectPermission, ProjectPermission } from '../models';

const SESSION_KEY = 'kinetic_session';
const PERMS_KEY = 'kinetic_perms';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<SessionUser | null>(null);
  permissions = signal<ProjectPermission[]>([]);

  constructor(private api: ApiService, private router: Router) {
    this.restoreSession();
  }

  private restoreSession() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
    }
    const perms = sessionStorage.getItem(PERMS_KEY);
    if (perms) {
      this.permissions.set(JSON.parse(perms));
    }
  }

  login(username: string, password: string): Observable<{ user: SessionUser }> {
    return this.api.login(username, password).pipe(
      tap(res => {
        this.currentUser.set(res.user);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
        this.loadPermissions(res.user.user_id);
      })
    );
  }

  loadPermissions(userId: string) {
    this.api.getUserPermissions(userId).subscribe({
      next: (raw) => {
        const perms: ProjectPermission[] = raw.map(p => ({
          project_id: String(p.project_id_fk),
          can_read: this.toBool(p.can_read),
          can_create: this.toBool(p.can_create),
          can_update: this.toBool(p.can_update),
          can_delete: this.toBool(p.can_delete),
        }));
        this.permissions.set(perms);
        sessionStorage.setItem(PERMS_KEY, JSON.stringify(perms));
      }
    });
  }

  private toBool(val: boolean | string): boolean {
    return String(val).toUpperCase() === 'TRUE' || val === true;
  }

  logout() {
    this.currentUser.set(null);
    this.permissions.set([]);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PERMS_KEY);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  getPermission(projectId: string): ProjectPermission | null {
    return this.permissions().find(p => p.project_id === projectId) ?? null;
  }

  canRead(projectId: string): boolean {
    return this.getPermission(projectId)?.can_read ?? false;
  }

  canCreate(projectId: string): boolean {
    return this.getPermission(projectId)?.can_create ?? false;
  }

  canUpdate(projectId: string): boolean {
    return this.getPermission(projectId)?.can_update ?? false;
  }

  canDelete(projectId: string): boolean {
    return this.getPermission(projectId)?.can_delete ?? false;
  }

  getAccessibleProjectIds(): string[] {
    return this.permissions()
      .filter(p => p.can_read)
      .map(p => p.project_id);
  }
}
