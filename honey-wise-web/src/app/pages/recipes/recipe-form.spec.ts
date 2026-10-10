import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RecipeForm } from './recipe-form';
import { Recipe } from '../../core/recipe.models';

const PRESETS = {
  honeyTypes: ['Clover'],
  waterTypes: ['Spring'],
  yeastTypes: ['Lalvin 71B'],
  categories: ['Honey', 'Water', 'Yeast', 'Nutrient'],
  presetsByCategory: { Nutrient: ['Fermaid O'] },
};

describe('RecipeForm', () => {
  let fixture: ComponentFixture<RecipeForm>;
  let http: HttpTestingController;

  async function setup(routeId?: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [RecipeForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(routeId
          ? [
              {
                provide: ActivatedRoute,
                useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } },
              },
            ]
          : []),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeForm);
    http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith('/Ingredients')).flush(PRESETS);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  afterEach(() => http.verify());

  it('shows the ribbon and the three cards for a new recipe', async () => {
    await setup();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.recipe-form-header h1')?.textContent).toContain('Add Recipe');
    expect(el.querySelector('.recipe-form-header button[type="submit"]')).not.toBeNull();
    const titles = Array.from(el.querySelectorAll('mat-card-title')).map((t) => t.textContent);
    expect(titles).toEqual(['General', 'Steps', 'Timers']);
    expect(text()).toContain('to see suggested nutrient timers');
  });

  it('collapses a card from its header and re-opens it from the contents list', async () => {
    await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const steps = el.querySelector<HTMLElement>('#recipe-steps')!;
    const content = steps.querySelector<HTMLElement>('.card-fields')!;
    const toggle = steps.querySelector<HTMLButtonElement>('.card-toggle')!;

    toggle.click();
    fixture.detectChanges();
    expect(steps.classList).toContain('card-collapsed');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(getComputedStyle(content).display).toBe('none');
    // Collapsing hides the fields but keeps them in the form.
    expect(fixture.componentInstance['form'].controls.steps.length).toBe(1);

    const links = Array.from(el.querySelectorAll<HTMLButtonElement>('.recipe-form-toc button'));
    expect(links.map((b) => b.textContent?.trim())).toEqual([
      'General',
      'Core ingredients',
      'Additional ingredients',
      'Steps',
      'Timers',
      'Suggested nutrient schedule',
    ]);
    const scrolled = spyOn(steps, 'scrollIntoView');
    links[3].click();
    fixture.detectChanges();
    // The scroll waits for the app's next render pass, after the card has re-opened.
    TestBed.inject(ApplicationRef).tick();
    expect(steps.classList).not.toContain('card-collapsed');
    expect(getComputedStyle(content).display).toBe('flex');
    expect(scrolled).toHaveBeenCalled();
  });

  it('re-opens a collapsed card when saving finds an error inside it', async () => {
    await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const general = el.querySelector<HTMLElement>('#recipe-general')!;
    const timers = el.querySelector<HTMLElement>('#recipe-timers')!;
    general.querySelector<HTMLButtonElement>('.card-toggle')!.click();
    timers.querySelector<HTMLButtonElement>('.card-toggle')!.click();
    fixture.detectChanges();

    // Name, honey, water and yeast are still empty; no timer is invalid.
    fixture.componentInstance['submit']();
    fixture.detectChanges();
    expect(general.classList).not.toContain('card-collapsed');
    expect(timers.classList).toContain('card-collapsed');
  });

  it('keeps the contents list beside the cards and below the ribbon', async () => {
    await setup();
    const host = fixture.nativeElement as HTMLElement;
    host.style.cssText = 'display:block;height:500px;width:1000px';
    document.body.appendChild(host);
    fixture.detectChanges();

    const header = host.querySelector<HTMLElement>('.recipe-form-header')!;
    const scroll = host.querySelector<HTMLElement>('.recipe-form-scroll')!;
    const body = host.querySelector<HTMLElement>('.recipe-form-body')!;
    const toc = host.querySelector<HTMLElement>('.recipe-form-toc')!;
    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);

    for (const top of [0, 300, scroll.scrollHeight]) {
      scroll.scrollTop = top;
      const ribbon = header.getBoundingClientRect();
      const contents = toc.getBoundingClientRect();
      // The ribbon has not moved, and the contents list is fully visible beneath it.
      expect(ribbon.top).toBeCloseTo(host.getBoundingClientRect().top, 0);
      expect(contents.top).toBeGreaterThanOrEqual(ribbon.bottom);
      expect(contents.bottom).toBeLessThanOrEqual(scroll.getBoundingClientRect().bottom);
      expect(contents.left).toBeGreaterThanOrEqual(body.getBoundingClientRect().right);
    }
    host.remove();
  });

  it('suggests a nutrient schedule, adds it as timed steps and saves the timers', async () => {
    await setup();
    const component = fixture.componentInstance;
    const form = component['form'];

    form.patchValue({
      name: 'Traditional',
      batchSize: 1,
      honeyType: 'Clover',
      honeyWeight: 100 / 35,
      waterType: 'Spring',
      yeastType: 'Lalvin 71B',
    });
    component['addIngredient']({ name: 'Fermaid O', category: 'Nutrient', quantity: '' });
    form.controls.steps.at(0).patchValue({ text: 'Mix the must' });
    component['addStep']('Pitch the yeast');
    component['addStep']('Rack to secondary', 30 * 1440);
    fixture.detectChanges();

    expect(text()).toContain('low nitrogen demand');
    expect(text()).toContain('3.57 g in total');
    // Defaults to the step that mentions pitching.
    expect(component['insertAfter']()).toBe(1);

    const addButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Add to steps'));
    addButton?.click();
    fixture.detectChanges();

    const steps = form.getRawValue().steps;
    expect(steps.length).toBe(7);
    expect(steps[2].text).toContain('Add 0.89 g Fermaid O (addition 1 of 4)');
    expect(steps[2].timerValue).toBe(1);
    expect(steps[2].timerUnit).toBe('day');
    expect(steps[5].text).toContain('gravity reaches 1.067');
    expect(steps[6].text).toBe('Rack to secondary');

    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component['submit']();

    const request = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/Recipes'));
    expect(request.request.body.batchSize).toBe(1);
    expect(request.request.body.batchSizeUnit).toBe('gal');
    expect(request.request.body.steps.map((s: { timerMinutes: number }) => s.timerMinutes)).toEqual(
      [0, 0, 1440, 1440, 1440, 1440, 43200],
    );
    request.flush({ id: 'new-id' });
  });

  it('loads an existing recipe with its timers and batch size', async () => {
    await setup('abc');
    const recipe: Recipe = {
      id: 'abc',
      name: 'Saved',
      batchSize: 5,
      batchSizeUnit: 'L',
      ingredients: [
        { name: 'Clover', category: 'Honey', quantity: '1.5 kg' },
        { name: 'Spring', category: 'Water', quantity: '' },
        { name: 'Lalvin D47', category: 'Yeast', quantity: '' },
      ],
      steps: [
        { order: 1, text: 'Rehydrate yeast', timerMinutes: 0 },
        { order: 2, text: 'Pitch', timerMinutes: 20 },
        { order: 3, text: 'Add nutrient', timerMinutes: 2880 },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    http.expectOne((r) => r.url.endsWith('/Recipes/abc')).flush(recipe);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.recipe-form-header h1')?.textContent).toContain('Edit Recipe');

    const raw = fixture.componentInstance['form'].getRawValue();
    expect(raw.batchSize).toBe(5);
    expect(raw.batchSizeUnit).toBe('L');
    expect(raw.steps.map((s) => [s.timerValue, s.timerUnit])).toEqual([
      [null, 'hr'],
      [20, 'min'],
      [2, 'day'],
    ]);
    expect(el.querySelectorAll('.timer-row').length).toBe(3);
  });
});
