import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { IngredientPresets, Recipe, RecipeInput, RecipeSummary } from './recipe.models';

/**
 * Single point of contact with the HoneyWise API's recipe endpoints. Mirrors
 * `AuthService`: a root-provided singleton over `HttpClient` reading the base URL
 * from the environment. The JWT is attached automatically by `authTokenInterceptor`,
 * so nothing here deals with auth.
 */
@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** All of the current user's recipes, as lightweight summaries. */
  list(): Observable<RecipeSummary[]> {
    return this.http.get<RecipeSummary[]>(`${this.baseUrl}/Recipes`);
  }

  /** A single full recipe by id. */
  get(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.baseUrl}/Recipes/${id}`);
  }

  /** Create a new recipe. Returns the new recipe's id (201). */
  create(recipe: RecipeInput): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.baseUrl}/Recipes`, recipe);
  }

  /** Update an existing recipe (204). */
  update(id: string, recipe: RecipeInput): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/Recipes/${id}`, recipe);
  }

  /** Delete a recipe (204). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Recipes/${id}`);
  }

  /** Download the recipe's XML document as a Blob. */
  export(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/Recipes/${id}/export`, { responseType: 'blob' });
  }

  /** Curated ingredient presets for the recipe form. */
  getPresets(): Observable<IngredientPresets> {
    return this.http.get<IngredientPresets>(`${this.baseUrl}/Ingredients`);
  }
}
