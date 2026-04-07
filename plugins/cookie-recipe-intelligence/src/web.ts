import { WebPlugin } from '@capacitor/core';

import type {
  CheckModelAvailabilityResult,
  CookieRecipeIntelligencePlugin,
  ScanRecipeFromImageOptions,
  ScanRecipeFromImageResult,
} from './definitions';

export class CookieRecipeIntelligenceWeb extends WebPlugin implements CookieRecipeIntelligencePlugin {
  async scanRecipeFromImage(_options: ScanRecipeFromImageOptions): Promise<ScanRecipeFromImageResult> {
    throw this.unimplemented('Recipe photo scan is only available on iOS with Apple Intelligence.');
  }

  async checkModelAvailability(): Promise<CheckModelAvailabilityResult> {
    return { available: false, reason: 'unknown' };
  }
}
