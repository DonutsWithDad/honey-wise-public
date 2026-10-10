/**
 * Client-side mirrors of the HoneyWise API recipe contracts. Property names match
 * the API's camelCase JSON exactly (see HoneyWise.Api Contracts/Recipe.cs &
 * Controllers/Ingredients/GetIngredientPresetsQuery.cs).
 */

/** A single ingredient. Free-form so users can capture anything not in the presets. */
export interface RecipeIngredient {
  name: string;
  /** Honey | Water | Yeast | Spice | Fruit | Nutrient | Stabilizer | Other. */
  category: string;
  /** Free-text amount, e.g. "3 lb", "1 gallon", "1 tsp". */
  quantity: string;
}

/** A single ordered direction step, entered as plain text. */
export interface RecipeStep {
  order: number;
  text: string;
  /** Minutes to wait after the previous step before this one. 0 means no timer. */
  timerMinutes: number;
}

/** Full recipe returned by GET /Recipes/{id}. */
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  /** Total must volume in `batchSizeUnit`. 0 or absent means not set. */
  batchSize?: number;
  /** gal | L. */
  batchSizeUnit?: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Row returned by GET /Recipes for the list view. Carries the flat ingredient
 * list (including the core Honey/Water/Yeast entries) so the list page can
 * search and filter without fetching each full recipe.
 */
export interface RecipeSummary {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  updatedAt: string;
}

/**
 * Payload for POST /Recipes and PUT /Recipes/{id}. Server-owned fields (id,
 * userId, timestamps) are intentionally omitted; the API assigns them.
 */
export interface RecipeInput {
  name: string;
  description?: string;
  batchSize?: number;
  batchSizeUnit?: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

/** Shape returned by GET /Ingredients, used to populate the recipe form. */
export interface IngredientPresets {
  honeyTypes: string[];
  waterTypes: string[];
  yeastTypes: string[];
  categories: string[];
  presetsByCategory: Record<string, string[]>;
}
