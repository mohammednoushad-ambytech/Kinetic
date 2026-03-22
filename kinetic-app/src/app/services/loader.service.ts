import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoaderService {
  private _count = signal(0);

  /** True whenever at least one HTTP request is in flight */
  isLoading = computed(() => this._count() > 0);

  start() { this._count.update(n => n + 1); }
  stop()  { this._count.update(n => Math.max(0, n - 1)); }
}
