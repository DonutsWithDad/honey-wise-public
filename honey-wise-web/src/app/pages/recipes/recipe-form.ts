import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { RecipeService } from '../../core/recipe.service';
import {
  IngredientPresets,
  Recipe,
  RecipeIngredient,
  RecipeInput,
  RecipeStep,
} from '../../core/recipe.models';

/** Weight units offered for the honey amount. */
const UNITS = ['lb', 'kg', 'g', 'oz'] as const;

/** Fallback categories if the presets endpoint is unavailable. */
const FALLBACK_CATEGORIES = [
  'Honey',
  'Water',
  'Yeast',
  'Spice',
  'Fruit',
  'Nutrient',
  'Stabilizer',
  'Other',
];

/** Reactive-form shape for a single additional-ingredient row. */
type IngredientGroup = FormGroup<{
  name: FormControl<string>;
  category: FormControl<string>;
  quantity: FormControl<string>;
}>;

/**
 * Add / edit form for a mead recipe. Honey, Water and Yeast are required core
 * fields; below them the user adds any number of extra ingredients and ordered
 * directions. On submit the core fields plus the extras are flattened into a
 * single ingredient list matching the API's `RecipeIngredient` shape.
 */
@Component({
  selector: 'app-recipe-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './recipe-form.html',
  styleUrl: './recipe-form.scss',
})
export class RecipeForm {
  private readonly fb = inject(FormBuilder);
  private readonly recipeService = inject(RecipeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly units = UNITS;
  protected readonly submitting = signal(false);
  protected readonly loading = signal(false);
  protected readonly editId = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.editId() !== null);

  private readonly presets = signal<IngredientPresets | null>(null);
  protected readonly honeyTypes = computed(() => this.presets()?.honeyTypes ?? []);
  protected readonly waterTypes = computed(() => this.presets()?.waterTypes ?? []);
  protected readonly yeastTypes = computed(() => this.presets()?.yeastTypes ?? []);
  protected readonly categories = computed(() =>
    Array.from(new Set([...(this.presets()?.categories ?? []), ...FALLBACK_CATEGORIES])),
  );

  protected readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', Validators.required),
    description: this.fb.nonNullable.control(''),
    honeyType: this.fb.nonNullable.control('', Validators.required),
    honeyWeight: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    honeyUnit: this.fb.nonNullable.control<string>('lb', Validators.required),
    waterType: this.fb.nonNullable.control('', Validators.required),
    yeastType: this.fb.nonNullable.control('', Validators.required),
    ingredients: this.fb.array<IngredientGroup>([]),
    steps: this.fb.array<FormControl<string>>([]),
  });

  constructor() {
    this.recipeService.getPresets().subscribe({
      next: (presets) => this.presets.set(presets),
      // Presets are a convenience; the form still works with free-text entry.
      error: () => this.presets.set(null),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.loadRecipe(id);
    } else {
      this.addStep();
    }
  }

  protected get ingredients() {
    return this.form.controls.ingredients;
  }

  protected get steps() {
    return this.form.controls.steps;
  }

  protected presetsForCategory(category: string): string[] {
    return this.presets()?.presetsByCategory?.[category] ?? [];
  }

  protected addIngredient(value?: RecipeIngredient): void {
    this.ingredients.push(this.createIngredientGroup(value));
  }

  protected removeIngredient(index: number): void {
    this.ingredients.removeAt(index);
  }

  protected addStep(text = ''): void {
    this.steps.push(this.fb.nonNullable.control(text, Validators.required));
  }

  protected removeStep(index: number): void {
    this.steps.removeAt(index);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const payload = this.buildPayload();
    const id = this.editId();
    const request: Observable<unknown> = id
      ? this.recipeService.update(id, payload)
      : this.recipeService.create(payload);

    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open(id ? 'Recipe updated.' : 'Recipe created.', 'Dismiss', {
          duration: 4000,
        });
        this.router.navigate(['/recipes']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 });
      },
    });
  }

  private createIngredientGroup(value?: RecipeIngredient): IngredientGroup {
    return this.fb.group({
      name: this.fb.nonNullable.control(value?.name ?? '', Validators.required),
      category: this.fb.nonNullable.control(value?.category ?? 'Other', Validators.required),
      quantity: this.fb.nonNullable.control(value?.quantity ?? ''),
    });
  }

  private loadRecipe(id: string): void {
    this.loading.set(true);
    this.recipeService.get(id).subscribe({
      next: (recipe) => {
        this.patchFromRecipe(recipe);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 });
        this.router.navigate(['/recipes']);
      },
    });
  }

  private patchFromRecipe(recipe: Recipe): void {
    const find = (category: string) =>
      recipe.ingredients.find((i) => i.category?.toLowerCase() === category);
    const honey = find('honey');
    const water = find('water');
    const yeast = find('yeast');

    const { weight, unit } = this.parseWeight(honey?.quantity ?? '');

    this.form.patchValue({
      name: recipe.name,
      description: recipe.description ?? '',
      honeyType: honey?.name ?? '',
      honeyWeight: weight,
      honeyUnit: unit,
      waterType: water?.name ?? '',
      yeastType: yeast?.name ?? '',
    });

    // Everything that isn't one of the three matched core entries is an extra.
    const core = new Set([honey, water, yeast]);
    this.ingredients.clear();
    recipe.ingredients
      .filter((i) => !core.has(i))
      .forEach((i) => this.addIngredient(i));

    this.steps.clear();
    [...recipe.steps]
      .sort((a, b) => a.order - b.order)
      .forEach((s) => this.addStep(s.text));
    if (this.steps.length === 0) {
      this.addStep();
    }
  }

  /** Splits a stored honey quantity like "3 lb" back into number + unit. */
  private parseWeight(quantity: string): { weight: number | null; unit: string } {
    const match = /^\s*([\d.]+)\s*(.*)$/.exec(quantity);
    if (!match) {
      return { weight: null, unit: 'lb' };
    }
    const weight = Number.parseFloat(match[1]);
    const unit = (match[2] || 'lb').trim();
    return {
      weight: Number.isNaN(weight) ? null : weight,
      unit: (UNITS as readonly string[]).includes(unit) ? unit : 'lb',
    };
  }

  private buildPayload(): RecipeInput {
    const raw = this.form.getRawValue();

    const honeyQuantity = `${raw.honeyWeight ?? ''} ${raw.honeyUnit}`.trim();
    const ingredients: RecipeIngredient[] = [
      { name: raw.honeyType.trim(), category: 'Honey', quantity: honeyQuantity },
      { name: raw.waterType.trim(), category: 'Water', quantity: '' },
      { name: raw.yeastType.trim(), category: 'Yeast', quantity: '' },
      ...raw.ingredients
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          name: i.name.trim(),
          category: i.category,
          quantity: i.quantity.trim(),
        })),
    ];

    const steps: RecipeStep[] = raw.steps
      .map((text, index) => ({ order: index + 1, text: text.trim() }))
      .filter((s) => s.text.length > 0);

    const description = raw.description.trim();

    return {
      name: raw.name.trim(),
      ingredients,
      steps,
      ...(description ? { description } : {}),
    };
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Cannot reach the server. Is the API running?';
    }
    return typeof err.error === 'string' && err.error.trim()
      ? err.error.trim()
      : 'Could not save the recipe. Please try again.';
  }
}
