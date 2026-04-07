import { WebPlugin } from '@capacitor/core';
import type { CheckModelAvailabilityResult, CookieRecipeIntelligencePlugin, ScanRecipeFromImageOptions, ScanRecipeFromImageResult } from './definitions';
export declare class CookieRecipeIntelligenceWeb extends WebPlugin implements CookieRecipeIntelligencePlugin {
    scanRecipeFromImage(_options: ScanRecipeFromImageOptions): Promise<ScanRecipeFromImageResult>;
    checkModelAvailability(): Promise<CheckModelAvailabilityResult>;
}
