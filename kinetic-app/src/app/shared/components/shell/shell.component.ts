import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { MastersService } from '../../../services/masters.service';
import { LoaderService } from '../../../services/loader.service';
import { NotificationService } from '../../../services/notification.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <!-- ── Global loader: centered full-page overlay ── -->
    @if (loader.isLoading()) {
      <!-- Full-screen overlay with backdrop blur -->
      <div class="fixed inset-0 z-[490] bg-surface/80 backdrop-blur-sm flex items-center justify-center"
           style="pointer-events:all"
           (click)="$event.stopPropagation()"
           (mousedown)="$event.preventDefault()"
           (touchstart)="$event.preventDefault()">
        <!-- Colorful rings loader -->
        <svg class="pl" viewBox="0 0 240 240" width="240" height="240">
          <circle class="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" stroke-width="20" stroke-dasharray="0 660" stroke-dashoffset="-330" stroke-linecap="round"></circle>
          <circle class="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" stroke-width="20" stroke-dasharray="0 220" stroke-dashoffset="-110" stroke-linecap="round"></circle>
          <circle class="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" stroke-width="20" stroke-dasharray="0 440" stroke-linecap="round"></circle>
          <circle class="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" stroke-width="20" stroke-dasharray="0 440" stroke-linecap="round"></circle>
        </svg>
      </div>
    }

    <!-- ── Today's tasks toaster ── -->
    @if (notif.hasTodayTasks()) {
      <div class="fixed top-0 left-0 right-0 z-[400] bg-error text-on-error px-4 py-2.5 flex items-center gap-3 shadow-lg">
        <span class="material-symbols-outlined text-lg" style="font-variation-settings:'FILL' 1;">alarm</span>
        <div class="flex-1 text-sm font-semibold">
          {{ notif.todayTasks().length }} task{{ notif.todayTasks().length === 1 ? '' : 's' }} due today —
          <span class="font-normal opacity-90">{{ getTodayTaskTitles() }}</span>
        </div>
        <a routerLink="/tasks" class="text-xs underline font-bold opacity-90 hover:opacity-100 flex-shrink-0">View Tasks</a>
        <button (click)="notif.dismiss()" class="p-1 hover:bg-white/20 rounded-lg flex-shrink-0">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    }

    <div class="flex h-screen overflow-hidden bg-surface" [class.pt-10]="notif.hasTodayTasks()">

      <!-- Mobile overlay -->
      @if (sidebarOpen()) {
        <div class="fixed inset-0 bg-black/30 z-30 lg:hidden" (click)="sidebarOpen.set(false)"></div>
      }

      <!-- Sidebar -->
      <aside class="fixed left-0 top-0 h-full flex flex-col w-64 bg-slate-100 z-40 transition-transform duration-300"
             [class.-translate-x-full]="!sidebarOpen()"
             [class.translate-x-0]="sidebarOpen()"
             [class.lg:translate-x-0]="true">

        <!-- Brand -->
        <div class="p-6 flex items-center gap-3 flex-shrink-0">
          <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center ambient-lift">
            <span class="material-symbols-outlined text-white text-xl" style="font-variation-settings:'FILL' 1;">bolt</span>
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-slate-900">Kinetic</h1>
            <p class="text-[10px] uppercase tracking-widest text-slate-500">Productivity</p>
          </div>
        </div>

        <!-- Create New -->
        <div class="px-4 mb-4 flex-shrink-0">
          <button class="btn-primary w-full justify-center" routerLink="/tasks">
            <span class="material-symbols-outlined text-sm">add</span>
            Create New
          </button>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          <a routerLink="/dashboard" routerLinkActive="nav-active"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors nav-inactive"
             (click)="sidebarOpen.set(false)">
            <span class="material-symbols-outlined">dashboard</span>
            Dashboard
          </a>
          <a routerLink="/projects" routerLinkActive="nav-active"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors nav-inactive"
             (click)="sidebarOpen.set(false)">
            <span class="material-symbols-outlined">folder_open</span>
            Projects
          </a>
          <a routerLink="/tasks" routerLinkActive="nav-active"
             class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors nav-inactive"
             (click)="sidebarOpen.set(false)">
            <span class="material-symbols-outlined">check_circle</span>
            Tasks
          </a>

          <!-- Administration Menu (only visible to users with ROLE_MANAGE or USER_MANAGE) -->
          @if (showAdminMenu()) {
            <div class="mt-4 pt-4 border-t border-slate-200">
              <p class="px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Administration</p>
              
              @if (auth.canManageRoles()) {
                <a routerLink="/admin/roles" routerLinkActive="nav-active"
                   class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors nav-inactive"
                   (click)="sidebarOpen.set(false)">
                  <span class="material-symbols-outlined">shield</span>
                  Roles & Permissions
                </a>
              }
              
              @if (auth.canManageUsers()) {
                <a routerLink="/admin/users" routerLinkActive="nav-active"
                   class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors nav-inactive"
                   (click)="sidebarOpen.set(false)">
                  <span class="material-symbols-outlined">group</span>
                  Users
                </a>
              }
            </div>
          }
        </nav>

        <!-- User area -->
        <div class="p-4 border-t border-slate-200 flex-shrink-0">
          <div class="px-2 mb-2">
            <div class="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-sm font-bold inline-flex">
              {{ userInitials() }}
            </div>
            <div class="inline-block ml-2 overflow-hidden align-middle">
              <p class="text-sm font-semibold text-slate-900 truncate max-w-[140px]">{{ auth.currentUser()?.display_name }}</p>
              <p class="text-[10px] text-slate-500">{{ auth.currentUser()?.role_id }}</p>
            </div>
          </div>
          <button (click)="logout()"
                  class="flex items-center gap-3 px-4 py-2 text-slate-600 hover:text-on-surface w-full rounded-lg hover:bg-slate-200/50 transition-colors text-sm">
            <span class="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 flex flex-col min-h-screen lg:ml-64 overflow-hidden">

        <!-- Topbar -->
        <header class="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 h-16 glass-nav border-b border-slate-100 flex-shrink-0">
          <div class="flex items-center gap-4">
            <!-- Mobile menu toggle -->
            <button class="lg:hidden p-2 text-slate-600 hover:text-on-surface" (click)="sidebarOpen.set(!sidebarOpen())">
              <span class="material-symbols-outlined">menu</span>
            </button>
            <span class="text-lg font-semibold tracking-tight text-slate-900 hidden sm:block">The Kinetic Editorial</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-500 hidden md:block">{{ auth.currentUser()?.display_name }}</span>
            <button (click)="logout()" class="text-sm font-semibold text-primary hover:opacity-80 transition-opacity">
              Logout
            </button>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class ShellComponent implements OnInit {
  sidebarOpen = signal(true);
  
  // Show admin menu if user has any admin permissions
  showAdminMenu = computed(() => {
    return this.auth.canManageRoles() || this.auth.canManageUsers();
  });

  constructor(
    public auth: AuthService,
    public masters: MastersService,
    public loader: LoaderService,
    public notif: NotificationService,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.masters.load();
    // On mobile, default sidebar closed
    if (window.innerWidth < 1024) this.sidebarOpen.set(false);
    // Load today's tasks for the global notification bar
    const userId = this.auth.currentUser()?.user_id;
    if (userId) {
      this.api.getDashboard(userId).subscribe({
        next: (d) => this.notif.setTodayTasks(d.todaysTasks ?? []),
        error: () => {}
      });
    }
  }

  userInitials(): string {
    const name = this.auth.currentUser()?.display_name || '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  logout() { this.auth.logout(); }

  getTodayTaskTitles(): string {
    const tasks = this.notif.todayTasks();
    const titles = tasks.slice(0, 2).map(t => t.task_title);
    if (tasks.length > 2) titles.push(`+${tasks.length - 2} more`);
    return titles.join(', ');
  }
}
