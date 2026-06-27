import { describe, it, expect } from 'vitest';
import {
  extractJsonLdBlocks,
  extractSchemaRecipeFromHtml,
  findSchemaRecipe,
  parseIngredientString,
  parseIsoDurationMinutes,
  parseSchemaInstructions,
  resolveSchemaImage,
} from './scraper';
import { mapSchemaToCookieRecipe } from './scrape-mapper';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Test Recipe</title></head>
<body>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Chocolate Chip Cookies",
  "description": "Classic chewy cookies.",
  "image": "https://example.com/cookies.jpg",
  "prepTime": "PT15M",
  "cookTime": "PT12M",
  "totalTime": "PT27M",
  "recipeYield": "24 cookies",
  "recipeCategory": "Dessert",
  "keywords": "cookies, dessert, baking",
  "recipeIngredient": [
    "2 cups all-purpose flour",
    "1 cup chocolate chips"
  ],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Mix dry ingredients." },
    { "@type": "HowToStep", "text": "Bake until golden." }
  ]
}
</script>
</body>
</html>
`;

describe('scraper JSON-LD extraction', () => {
  it('extracts recipe from HTML', () => {
    const blocks = extractJsonLdBlocks(SAMPLE_HTML);
    expect(blocks.length).toBe(1);
    const recipe = findSchemaRecipe(blocks[0]);
    expect(recipe?.name).toBe('Chocolate Chip Cookies');
  });

  it('parses ISO durations', () => {
    expect(parseIsoDurationMinutes('PT1H30M')).toBe(90);
    expect(parseIsoDurationMinutes('PT15M')).toBe(15);
  });

  it('parses ingredient strings', () => {
    expect(parseIngredientString('2 cups flour')).toEqual({ amount: '2 cups', name: 'flour' });
    expect(parseIngredientString('salt')).toEqual({ amount: '', name: 'salt' });
  });

  it('parses instructions', () => {
    const steps = parseSchemaInstructions([
      { text: 'Step one' },
      { text: 'Step two' },
    ]);
    expect(steps).toEqual(['Step one', 'Step two']);
  });

  it('resolves image URLs', () => {
    expect(resolveSchemaImage('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(resolveSchemaImage([{ url: 'https://example.com/b.jpg' }])).toBe('https://example.com/b.jpg');
  });

  it('extracts JSON-LD from unquoted script attributes (Yoast style)', () => {
    const html = `<script type=application/ld+json class=yoast-schema-graph>
      {"@context":"https://schema.org","@graph":[{"@type":"Recipe","name":"Guac","recipeIngredient":["1 avocado"]}]}
    </script>`;
    const recipe = extractSchemaRecipeFromHtml(html);
    expect(recipe?.name).toBe('Guac');
  });

  it('picks the most complete recipe when a page embeds several', () => {
    const html = `
      <script type="application/ld+json">
      {"@type":"Recipe","name":"Related Snippet","recipeIngredient":["1 thing"]}
      </script>
      <script type="application/ld+json">
      {"@type":"Recipe","name":"Main Recipe","recipeIngredient":["a","b","c"],
       "recipeInstructions":[{"@type":"HowToStep","text":"Do it"}]}
      </script>`;
    expect(extractSchemaRecipeFromHtml(html)?.name).toBe('Main Recipe');
  });
});

describe('mapSchemaToCookieRecipe', () => {
  it('maps schema.org recipe to Cookie shape with source URL', async () => {
    const recipe = findSchemaRecipe(extractJsonLdBlocks(SAMPLE_HTML)[0])!;
    const mapped = await mapSchemaToCookieRecipe(recipe, 'https://example.com/cookies');
    expect(mapped.title).toBe('Chocolate Chip Cookies');
    expect(mapped.sourceUrl).toBe('https://example.com/cookies');
    expect(mapped.id).toMatch(/^scrape_/);
    expect(mapped.ingredients).toHaveLength(2);
    expect(mapped.steps).toHaveLength(2);
    expect(mapped.tags).toContain('web');
  });
});
