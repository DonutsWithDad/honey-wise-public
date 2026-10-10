import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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
import { NutrientAddition, suggestNutrientSchedule } from '../../core/nutrient-schedule';

/** Weight units offered for the honey amount. */
const UNITS = ['lb', 'kg', 'g', 'oz'] as const;

/** Volume units offered for the batch size. */
const BATCH_UNITS = ['gal', 'L'] as const;

/** Units offered for a step timer, with how many minutes each is worth. */
const TIMER_UNITS = [
  { value: 'min', label: 'minutes', minutes: 1 },
  { value: 'hr', label: 'hours', minutes: 60 },
  { value: 'day', label: 'days', minutes: 1440 },
] as const;

type TimerUnit = (typeof TIMER_UNITS)[number]['value'];

type SectionId = 'general' | 'steps' | 'timers';

/**
 * The page's cards and the headings inside them, as listed in the table of
 * contents. Each id matches an element id of `recipe-<id>` in the template.
 */
const SECTIONS: { id: SectionId; label: string; children: { id: string; label: string }[] }[] = [
  {
    id: 'general',
    label: 'General',
    children: [
      { id: 'core-ingredients', label: 'Core ingredients' },
      { id: 'additional-ingredients', label: 'Additional ingredients' },
    ],
  },
  { id: 'steps', label: 'Steps', children: [] },
  {
    id: 'timers',
    label: 'Timers',
    children: [{ id: 'nutrient-schedule', label: 'Suggested nutrient schedule' }],
  },
];

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

/** Reactive-form shape for a single step and its timer. */
type StepGroup = FormGroup<{
  text: FormControl<string>;
  timerValue: FormControl<number | null>;
  timerUnit: FormControl<TimerUnit>;
}>;

/**
 * Add / edit form for a mead recipe, laid out as a header ribbon (title + save)
 * over three cards: General, Steps and Timers. Honey, Water and Yeast are
 * required core fields; below them the user adds any number of extra
 * ingredients and ordered directions, each with an optional timer. On submit the
 * core fields plus the extras are flattened into a single ingredient list
 * matching the API's `RecipeIngredient` shape.
 */
@Component({
  selector: 'app-recipe-form',
  imports: [
    DecimalPipe,
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly sections = SECTIONS;
  private readonly collapsed = signal<ReadonlySet<SectionId>>(new Set());

  protected readonly units = UNITS;
  protected readonly batchUnits = BATCH_UNITS;
  protected readonly timerUnits = TIMER_UNITS;
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
    batchSize: this.fb.control<number | null>(null, Validators.min(0)),
    batchSizeUnit: this.fb.nonNullable.control<string>('gal'),
    honeyType: this.fb.nonNullable.control('', Validators.required),
    honeyWeight: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    honeyUnit: this.fb.nonNullable.control<string>('lb', Validators.required),
    waterType: this.fb.nonNullable.control('', Validators.required),
    yeastType: this.fb.nonNullable.control('', Validators.required),
    ingredients: this.fb.array<IngredientGroup>([]),
    steps: this.fb.array<StepGroup>([]),
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  /** Nutrient schedule worked out from the yeast, honey, batch size and nutrient entered so far. */
  protected readonly suggestion = computed(() => {
    const raw = this.formValue();
    return suggestNutrientSchedule({
      yeastName: raw.yeastType,
      honeyWeight: raw.honeyWeight,
      honeyUnit: raw.honeyUnit,
      batchSize: raw.batchSize,
      batchSizeUnit: raw.batchSizeUnit,
      nutrientNames: raw.ingredients
        .filter((i) => i.category.toLowerCase() === 'nutrient')
        .map((i) => i.name),
    });
  });

  // Step the user picked to insert suggested additions after; null until they choose.
  private readonly insertAfterChoice = signal<number | null>(null);

  /**
   * Index of the step suggested additions go after: the user's pick, else the
   * first step that mentions pitching the yeast, else the last step.
   */
  protected readonly insertAfter = computed(() => {
    const steps = this.formValue().steps;
    const choice = this.insertAfterChoice();
    if (choice !== null && choice < steps.length) {
      return choice;
    }
    const pitch = steps.findIndex((s) => /pitch/i.test(s.text));
    return pitch >= 0 ? pitch : steps.length - 1;
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

  protected addStep(text = '', timerMinutes = 0): void {
    this.steps.push(this.createStepGroup(text, timerMinutes));
  }

  protected removeStep(index: number): void {
    this.steps.removeAt(index);
  }

  protected isCollapsed(section: SectionId): boolean {
    return this.collapsed().has(section);
  }

  protected toggleSection(section: SectionId): void {
    this.setCollapsed(section, !this.isCollapsed(section));
  }

  /** Scrolls to a card, or a heading inside it, opening the card first if it is collapsed. */
  protected goTo(section: SectionId, target: string = section): void {
    this.setCollapsed(section, false);
    // A collapsed card's content has no position until it is rendered again.
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector(`#recipe-${target}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      { injector: this.injector },
    );
  }

  protected setInsertAfter(index: number): void {
    this.insertAfterChoice.set(index);
  }

  /** Inserts the suggested nutrient additions as steps, each with its wait as the timer. */
  protected addSuggestedSteps(): void {
    const suggestion = this.suggestion();
    if (suggestion.status !== 'ok') {
      return;
    }

    const start = this.insertAfter() + 1;
    const total = suggestion.additions.length;
    suggestion.additions.forEach((addition, i) => {
      const text = this.additionStepText(addition, suggestion.nutrient, total);
      this.steps.insert(start + i, this.createStepGroup(text, addition.waitMinutes));
    });
    this.insertAfterChoice.set(null);
    this.snackBar.open(`Added ${total} nutrient steps.`, 'Dismiss', { duration: 4000 });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      this.expandInvalidSections();
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

  private setCollapsed(section: SectionId, collapsed: boolean): void {
    const next = new Set(this.collapsed());
    if (collapsed) {
      next.add(section);
    } else {
      next.delete(section);
    }
    this.collapsed.set(next);
  }

  /** Re-opens any collapsed card that holds an invalid field, so its error can be seen. */
  private expandInvalidSections(): void {
    const { steps, ...general } = this.form.controls;
    if (Object.values(general).some((control) => control.invalid)) {
      this.setCollapsed('general', false);
    }
    if (steps.controls.some((step) => step.controls.text.invalid)) {
      this.setCollapsed('steps', false);
    }
    if (steps.controls.some((step) => step.controls.timerValue.invalid)) {
      this.setCollapsed('timers', false);
    }
  }

  private createIngredientGroup(value?: RecipeIngredient): IngredientGroup {
    return this.fb.group({
      name: this.fb.nonNullable.control(value?.name ?? '', Validators.required),
      category: this.fb.nonNullable.control(value?.category ?? 'Other', Validators.required),
      quantity: this.fb.nonNullable.control(value?.quantity ?? ''),
    });
  }

  private createStepGroup(text: string, timerMinutes: number): StepGroup {
    const { value, unit } = this.splitTimer(timerMinutes);
    return this.fb.group({
      text: this.fb.nonNullable.control(text, Validators.required),
      timerValue: this.fb.control<number | null>(value, Validators.min(0)),
      timerUnit: this.fb.nonNullable.control<TimerUnit>(unit),
    });
  }

  /** Splits stored minutes into the largest unit that divides them evenly, e.g. 1440 -> 1 day. */
  private splitTimer(minutes: number): { value: number | null; unit: TimerUnit } {
    if (!minutes || minutes <= 0) {
      return { value: null, unit: 'hr' };
    }
    const unit =
      [...TIMER_UNITS].reverse().find((u) => minutes % u.minutes === 0) ?? TIMER_UNITS[0];
    return { value: minutes / unit.minutes, unit: unit.value };
  }

  private timerMinutes(value: number | null, unit: TimerUnit): number {
    const perUnit = TIMER_UNITS.find((u) => u.value === unit)?.minutes ?? 1;
    return value && value > 0 ? Math.round(value * perUnit) : 0;
  }

  private additionStepText(addition: NutrientAddition, nutrient: string, total: number): string {
    const grams = addition.grams.toFixed(2);
    const base = `Add ${grams} g ${nutrient} (addition ${addition.index} of ${total}).`;
    return addition.triggerGravity
      ? `${base} Add sooner if gravity reaches ${addition.triggerGravity.toFixed(3)}.`
      : base;
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
    const batchUnit = recipe.batchSizeUnit ?? '';

    this.form.patchValue({
      name: recipe.name,
      description: recipe.description ?? '',
      batchSize: recipe.batchSize || null,
      batchSizeUnit: (BATCH_UNITS as readonly string[]).includes(batchUnit) ? batchUnit : 'gal',
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
      .forEach((s) => this.addStep(s.text, s.timerMinutes));
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
      .map((step, index) => ({
        order: index + 1,
        text: step.text.trim(),
        timerMinutes: this.timerMinutes(step.timerValue, step.timerUnit),
      }))
      .filter((s) => s.text.length > 0);

    const description = raw.description.trim();

    return {
      name: raw.name.trim(),
      ingredients,
      steps,
      ...(description ? { description } : {}),
      ...(raw.batchSize ? { batchSize: raw.batchSize, batchSizeUnit: raw.batchSizeUnit } : {}),
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
