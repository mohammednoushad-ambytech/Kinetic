import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse, SessionUser, UserProjectPermission, Masters,
  Project, ProjectArtifact, TaskArtifact, Task, DashboardData, ProjectFormData
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.gasApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * All requests use GET to avoid CORS preflight.
   * Write operations pass body as JSON in the 'data' query param.
   */
  private call<T>(action: string, params: Record<string, string> = {}, body?: unknown): Observable<T> {
    let httpParams = new HttpParams().set('action', action);

    // Add simple query params
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        httpParams = httpParams.set(k, params[k]);
      }
    });

    // Pass body as JSON string — HttpParams encodes it automatically
    if (body) {
      httpParams = httpParams.set('data', JSON.stringify(body));
    }

    return this.http.get<ApiResponse<T>>(this.base, { params: httpParams }).pipe(
      map(res => {
        if (!res.success) throw new Error(res.error || 'API error');
        return res.data as T;
      }),
      catchError(err => {
        const msg = err?.error?.error || err?.message || 'Network error';
        return throwError(() => new Error(msg));
      })
    );
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  login(username: string, password: string) {
    // Pass as direct URL params — most reliable for GAS, avoids JSON parsing issues
    return this.call<{ user: SessionUser }>('login', { username, password });
  }

  getUserPermissions(userId: string) {
    return this.call<UserProjectPermission[]>('getUserPermissions', { user_id: userId });
  }

  // ─── Masters ─────────────────────────────────────────────────────────────────

  getMasters() {
    return this.call<Masters>('getMasters');
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  getDashboard(userId: string) {
    return this.call<DashboardData>('getDashboard', { user_id: userId });
  }

  // ─── Projects ────────────────────────────────────────────────────────────────

  getProjects(userId: string) {
    return this.call<Project[]>('getProjects', { user_id: userId });
  }

  createProject(data: ProjectFormData & { created_by: string }) {
    return this.call<Project>('createProject', {}, data);
  }

  updateProject(data: Partial<Project> & { last_modified_by: string }) {
    return this.call<{ message: string }>('updateProject', {}, data);
  }

  deleteProject(projectId: string, userId: string) {
    return this.call<{ message: string }>('deleteProject', { project_id: projectId, user_id: userId });
  }

  // ─── Artifacts ───────────────────────────────────────────────────────────────

  getArtifacts(projectId: string) {
    return this.call<ProjectArtifact[]>('getArtifacts', { project_id: projectId });
  }

  createArtifact(data: Partial<ProjectArtifact> & { created_by: string }) {
    return this.call<ProjectArtifact>('createArtifact', {}, data);
  }

  updateArtifact(data: Partial<ProjectArtifact>) {
    return this.call<{ message: string }>('updateArtifact', {}, data);
  }

  deleteArtifact(artifactId: string) {
    return this.call<{ message: string }>('deleteArtifact', { artifact_id: artifactId });
  }

  // ─── Task Artifacts ──────────────────────────────────────────────────────────

  getTaskArtifacts(taskId: string) {
    return this.call<TaskArtifact[]>('getTaskArtifacts', { task_id: taskId });
  }

  createTaskArtifact(data: Partial<TaskArtifact> & { created_by: string }) {
    return this.call<TaskArtifact>('createTaskArtifact', {}, data);
  }

  updateTaskArtifact(data: Partial<TaskArtifact>) {
    return this.call<{ message: string }>('updateTaskArtifact', {}, data);
  }

  deleteTaskArtifact(artifactId: string) {
    return this.call<{ message: string }>('deleteTaskArtifact', { task_artifact_id: artifactId });
  }

  // ─── Tasks ───────────────────────────────────────────────────────────────────

  getTasks(userId: string, projectIds?: string[]) {
    const params: Record<string, string> = { user_id: userId };
    if (projectIds?.length) params['project_ids'] = projectIds.join(',');
    return this.call<Task[]>('getTasks', params);
  }

  createTask(data: Partial<Task> & { created_by: string }) {
    return this.call<Task>('createTask', {}, data);
  }

  updateTask(data: Partial<Task> & { last_modified_by: string }) {
    return this.call<{ message: string }>('updateTask', {}, data);
  }

  deleteTask(taskId: string) {
    return this.call<{ message: string }>('deleteTask', { task_id: taskId });
  }
}
