import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { GridView, GridViewInput } from './grid-view.models';

/**
 * Single point of contact with the HoneyWise API's saved grid view endpoints.
 * Mirrors `RecipeService`; the JWT is attached by `authTokenInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class GridViewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** The current user's saved views for one grid, ordered by name. */
  list<TState>(gridKey: string): Observable<GridView<TState>[]> {
    return this.http.get<GridView<TState>[]>(`${this.baseUrl}/GridViews`, {
      params: { gridKey },
    });
  }

  /** Save a new view. Returns the new view's id (201). */
  create<TState>(view: GridViewInput<TState>): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.baseUrl}/GridViews`, view);
  }

  /** Overwrite an existing view (204). */
  update<TState>(id: string, view: GridViewInput<TState>): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/GridViews/${id}`, view);
  }

  /** Delete a view (204). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/GridViews/${id}`);
  }
}
