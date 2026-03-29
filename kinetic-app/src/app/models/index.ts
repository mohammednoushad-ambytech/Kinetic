// ─── Session / Auth ────────────────────────────────────────────────────────────
export interface SessionUser {
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  role_id: string;
  role_name?: string;
}

// ─── RBAC: Roles ────────────────────────────────────────────────────────────────
export interface Role {
  role_id: string;
  role_name: string;
  role_description: string;
  is_active: boolean;
  is_deleted: boolean;
  created_by: string;
  created_on: string;
}

// ─── RBAC: Permissions ────────────────────────────────────────────────────────────
export interface Permission {
  permission_id: string;
  permission_name: string;
  permission_code: PermissionCode;
  permission_description: string;
}

// Permission codes for type safety
export type PermissionCode =
  | 'PROJECT_CREATE'
  | 'PROJECT_DELETE'
  | 'PROJECT_UPDATE'
  | 'TASK_CREATE'
  | 'TASK_DELETE'
  | 'TASK_UPDATE'
  | 'USER_MANAGE'
  | 'ROLE_MANAGE'
  | 'VIEW_ALL_PROJECTS'
  | 'ARTIFACT_MANAGE';

// All available permissions
export const ALL_PERMISSIONS: PermissionCode[] = [
  'PROJECT_CREATE',
  'PROJECT_DELETE',
  'PROJECT_UPDATE',
  'TASK_CREATE',
  'TASK_DELETE',
  'TASK_UPDATE',
  'USER_MANAGE',
  'ROLE_MANAGE',
  'VIEW_ALL_PROJECTS',
  'ARTIFACT_MANAGE'
];

// ─── RBAC: Role-Permission Mapping ────────────────────────────────────────────────
export interface RolePermissionMapping {
  mapping_id: string;
  role_id_fk: string;
  permission_id_fk: string;
  permission_code?: PermissionCode;
}

// ─── User Project Assignment (Simplified) ───────────────────────────────────────
export interface UserProjectMapping {
  mapping_id: string;
  user_id_fk: string;
  project_id_fk: string;
  is_active: boolean;
}

// ─── Legacy Permissions (Deprecated - kept for reference) ───────────────────────
export interface UserProjectPermission {
  mapping_id: string;
  user_id_fk: string;
  project_id_fk: string;
  can_read: boolean | string;
  can_create: boolean | string;
  can_update: boolean | string;
  can_delete: boolean | string;
}

export interface ProjectPermission {
  project_id: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

// ─── Masters ───────────────────────────────────────────────────────────────────
export interface StatusMaster {
  status_id: string;
  status_name: string;
  status_label: string;
  applies_to: string;
  sort_order: number;
}

export interface PriorityMaster {
  priority_id: string;
  priority_name: string;
  priority_label: string;
  sort_order: number;
}

export interface TaskTypeMaster {
  type_id: string;
  type_name: string;
  type_label: string;
}

export interface UserOption {
  user_id: string;
  display_name: string;
  username: string;
  email: string;
}

export interface Masters {
  statuses: StatusMaster[];
  priorities: PriorityMaster[];
  taskTypes: TaskTypeMaster[];
  users: UserOption[];
}

// ─── Projects ──────────────────────────────────────────────────────────────────
export interface Project {
  project_id: string;
  project_name: string;
  project_description: string;
  project_status: string;
  project_start_date: string | null;
  project_end_date: string | null;
  created_by: string;
  created_on: string;
  last_modified_by: string;
  last_modified_on: string;
}

export interface ProjectFormData {
  project_id?: string;
  project_name: string;
  project_description: string;
  project_status: string;
  project_start_date: string;
  project_end_date: string;
}

// ─── Project Artifacts ────────────────────────────────────────────────────────
export interface ProjectArtifact {
  project_artifact_id: string;
  project_id_fk: string;
  artifact_title: string;
  artifact_value: string;
  artifact_type: 'url' | 'text' | 'credential' | 'document' | 'note';
  is_sensitive: boolean | string;
  created_by: string;
  created_on: string;
}

// ─── Task Artifacts ───────────────────────────────────────────────────────────
export interface TaskArtifact {
  task_artifact_id: string;
  task_id_fk: string;
  artifact_title: string;
  artifact_value: string;
  artifact_type: 'url' | 'text' | 'credential' | 'document' | 'note';
  is_sensitive: boolean | string;
  created_by: string;
  created_on: string;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────
export interface Task {
  task_id: string;
  project_id_fk: string;
  task_title: string;
  task_remarks: string;
  task_status: string;
  task_assignees: string; // pipe-separated user IDs: "U001|U002"
  task_start_date: string | null;
  task_end_date: string | null;
  task_start_time: string;
  task_end_time: string;
  task_order_id: string | number;
  type_id: string;
  priority_id: string;
  estimated_hours: number | string;
  spent_hours: number | string;
  created_by: string;
  created_on: string;
  last_modified_by: string;
  last_modified_on: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalProjects: number;
  openTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completedTasks: number;
}

export interface ProjectStat {
  project_id: string;
  project_name: string;
  total: number;
  completed: number;
  open: number;
  in_progress: number;
}

export interface StatusGroup {
  status: string;
  label: string;
  tasks: Task[];
}

export interface DashboardData {
  stats: DashboardStats;
  recentTasks: Task[];
  upcomingTasks: Task[];
  projectStats: ProjectStat[];
  todaysTasks: Task[];
  statusGroups: StatusGroup[];
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

// ─── Task Filter ──────────────────────────────────────────────────────────────
export interface TaskFilter {
  projectIds: string[];
  titleSearch: string;
  status: string;
  assignee: string;
  priority: string;
  typeId: string;
  dueDateFrom: string;
  dueDateTo: string;
  overdueOnly: boolean;
  todayOnly: boolean;
}

// ─── Project Filter ───────────────────────────────────────────────────────────
export interface ProjectFilter {
  nameSearch: string;
  status: string;
  startDateFrom: string;
  startDateTo: string;
}
