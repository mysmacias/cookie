import { registerPlugin } from '@capacitor/core';

import type { CookieRecipeIntelligencePlugin } from './definitions';
import { CookieRecipeIntelligenceWeb } from './web';

export const CookieRecipeIntelligence = registerPlugin<CookieRecipeIntelligencePlugin>(
  'CookieRecipeIntelligence',
  {
    web: () => new CookieRecipeIntelligenceWeb(),
  },
);

export * from './definitions';
