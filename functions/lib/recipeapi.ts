const BASE_URL = 'https://recipeapi.io/api/v1';

export interface RecipeApiIngredient {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  optional: boolean;
}

export interface RecipeApiRecipe {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  meal_type: string;
  cuisine: string;
  dietary_tags: string[];
  servings: number;
  prep_time: number;
  cook_time: number;
  calories_per_serving?: number;
  protein?: number;
  instructions: string[];
  ingredients: RecipeApiIngredient[];
}

export interface RecipeApiListResponse {
  data: RecipeApiRecipe[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    language: string;
  };
}

export class RecipeApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RecipeApiError';
  }
}

async function recipeApiFetch<T>(apiKey: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new RecipeApiError(res.status, body.error?.message ?? `Recipe API error (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export async function searchRecipes(
  apiKey: string,
  params: Record<string, string>,
): Promise<RecipeApiListResponse> {
  return recipeApiFetch<RecipeApiListResponse>(apiKey, '/recipes', params);
}

export async function fetchRecipeById(apiKey: string, id: number): Promise<RecipeApiRecipe> {
  const res = await recipeApiFetch<{ data: RecipeApiRecipe }>(apiKey, `/recipes/${id}`);
  return res.data;
}
