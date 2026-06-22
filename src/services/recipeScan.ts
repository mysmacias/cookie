// Web replacement for the iOS-only Apple Intelligence recipe scanner.
// The image is sent to a Cloudflare Pages Function (`/api/scan-recipe`) which
// runs Claude vision and returns a structured recipe draft.

export interface ParsedIngredientDraft {
  name: string;
  amount: string;
}

export interface ParsedStepDraft {
  title: string;
  description: string;
}

export interface ParsedRecipeDraft {
  title: string;
  description: string;
  prepTime: string;
  timeDisplay: string;
  bakeTime: string;
  yields: string;
  category: string;
  tags: string[];
  ingredients: ParsedIngredientDraft[];
  steps: ParsedStepDraft[];
  chefNote: string;
}

export interface ScanRecipeFromImageResult {
  summary: string;
  recipe: ParsedRecipeDraft;
}

export class RecipeScanError extends Error {}

/**
 * Send a recipe photo (data URL or bare base64) to the scan endpoint and get a
 * structured draft back. Throws RecipeScanError with a user-readable message on failure.
 */
export async function scanRecipeFromImage(imageBase64: string): Promise<ScanRecipeFromImageResult> {
  let res: Response;
  try {
    res = await fetch('/api/scan-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
  } catch {
    throw new RecipeScanError('Could not reach the scanning service. Check your connection and try again.');
  }

  if (!res.ok) {
    let message = 'Scan failed. Please try again.';
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body — keep the default message
    }
    if (res.status === 503) {
      message = 'Photo scanning is not configured on this server yet.';
    }
    throw new RecipeScanError(message);
  }

  return (await res.json()) as ScanRecipeFromImageResult;
}
