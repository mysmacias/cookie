import { registerPlugin } from '@capacitor/core';
import { CookieRecipeIntelligenceWeb } from './web';
export const CookieRecipeIntelligence = registerPlugin('CookieRecipeIntelligence', {
    web: () => new CookieRecipeIntelligenceWeb(),
});
export * from './definitions';
