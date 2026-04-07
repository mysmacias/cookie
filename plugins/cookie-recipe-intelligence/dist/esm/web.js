import { WebPlugin } from '@capacitor/core';
export class CookieRecipeIntelligenceWeb extends WebPlugin {
    async scanRecipeFromImage(_options) {
        throw this.unimplemented('Recipe photo scan is only available on iOS with Apple Intelligence.');
    }
    async checkModelAvailability() {
        return { available: false, reason: 'unknown' };
    }
}
