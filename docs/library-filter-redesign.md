# Library filter bar — redesign plan

Status: **proposal / mapping only.** No code or recipe data has been changed.
Branch: `redesign/library-filter-bar`.

This document covers two linked pieces of work:

1. **UI** — collapse the three-row "wall of pills" into one toolbar (Option A).
2. **Data** — fix the category taxonomy that makes the filter list so long in the
   first place (cuisine as the single category axis; everything else → tags).

The UI change is shippable on its own. The data change makes the UI change look
intentional instead of merely tidier.

---

## 1. UI — consolidated toolbar (Option A)

The current bar stacks three rows of identical pills
([`LibraryToolbar.tsx`](../src/components/LibraryToolbar.tsx),
[`LibraryScreen.tsx:85`](../src/screens/LibraryScreen.tsx)):

- Row 1 mixes five control *types* dressed as the same pill: a toggle
  (All/Bookmarked), a `<select>` (sort), action buttons (Select, Export), an icon
  button (+), and a segmented control (grid columns).
- Rows 2 and 3 are unbounded category and tag pills derived from recipe data, so
  they overflow into horizontal scroll.

### Target

| Region | Now | Proposed |
| --- | --- | --- |
| Filter scope | Two pills (All / Bookmarked) | One segmented control (`All` / `Saved`) |
| Category | Full scrolling pill row | Single dropdown menu (single-select, matches `categoryFilter`) |
| Cuisine | Full scrolling pill row | **Multi-select** dropdown (checkbox menu) — a dish can be more than one cuisine |
| Tags | Full scrolling pill row | "Filters" popover with active-count badge (multi-select, matches `tagFilters`) |
| Active filters | (implicit in the pills) | Thin row of removable chips below the bar + "Clear all" |
| Select / Export / Add | Three full pills | Quiet icon buttons, right-aligned |
| Grid density | 4-button segmented pill | Compact stepper |
| Sort | `<select>` pill | Quiet menu button |

One state-model change: the cuisine filter goes from single (`categoryFilter:
string | null`) to multi (`cuisineFilters: string[]`, "match any"). Everything else
maps to existing state in
[`useLibraryFilters.ts`](../src/hooks/useLibraryFilters.ts)
(`filter`, `tagFilters`, `sort`, `gridCols`, `selectionMode`).

---

## 2. Data — faceted re-taxonomy

### The problem

"Category" currently conflates **four axes**: cuisine, protein, course, and theme.
That is why the list is ~33 entries long and feels arbitrary (`Beef` is a sibling
of `Curry Night` and `Miscellaneous`).

The data also comes from two sources that classify differently:

- **Bundled recipes** (24) — `category` is usually the cuisine, with a few themes.
- **MealDB recipes** (24) — `category` is the **protein**; the cuisine lives in the
  **tags** (e.g. `category: "Chicken"`, `tags: [..., "greek", "mediterranean"]`).
  By tags this set is **8 Greek + 16 Italian**.

### The rule — facets, and cuisine is multi-valued

There is no single privileged "category." Classification is **faceted**: cuisine,
course, protein, dietary, theme. Each facet is a separate dimension a recipe can be
filtered on.

Critically, **cuisine itself is multi-valued** — a dish can be a fusion of more than
one. A ceviche tostada is genuinely both **Mexican and Peruvian**; forcing one would
be wrong. So cuisine is an array, not a single string, and the cuisine filter is
"match any of the selected."

### Data model

Cuisine needs to hold multiple values. Two ways to get there:

- **Additive (recommended, low-risk).** Add `cuisines: string[]` to the `Recipe`
  type. Keep the existing `category: string` as the **primary cuisine** (`cuisines[0]`)
  for card display, sort, and backward compatibility. Filtering reads `cuisines`.
  No DB column drop; the migration just backfills `cuisines` from `category` + tags.
- **Full migration.** Replace `category` with `cuisines: string[]` everywhere
  (type, [`RecipeCard`](../src/components/RecipeCard.tsx), the `category-asc` sort in
  [`useLibraryFilters.ts`](../src/hooks/useLibraryFilters.ts), search, D1 schema).
  Cleaner end state, wider blast radius.

Either way, the 19-name cuisine vocabulary below is the same — the only difference is
whether a recipe points at one of them or several.

### Cuisine vocabulary (19) — recipes may carry one or more

`American` · `Brazilian` · `Caribbean` · `Chinese` · `French` · `Greek` ·
`Indian` · `Indonesian` · `Italian` · `Japanese` · `Korean` · `Levantine` ·
`Mexican` · `Moroccan` · `Polish` · `Spanish` · `Thai` · `Turkish` · `Vietnamese`

Short and consistent — clean in a multi-select checkbox menu, and short enough that
even a pill row would read as intentional.

### Cuisine → action map

Cuisines kept (some renamed):

| Current category | Cuisine(s) |
| --- | --- |
| Brazilian, Caribbean, Chinese, French, Greek, Indonesian, Japanese, Korean, Polish, Thai, Turkish, Vietnamese | unchanged |
| Sichuan | **Chinese** (+ tag `sichuan`) |
| Levant | **Levantine** |
| North African | **Moroccan** |
| Tapas | **Spanish** (+ tag `tapas`) |

MealDB protein categories → demote to tag; cuisine comes from the recipe's existing
cuisine tag (Greek or Italian):

| Current category | Becomes tag | Cuisine(s) |
| --- | --- | --- |
| Chicken, Beef, Lamb, Seafood, Pasta, Vegetarian, Dessert, Miscellaneous | yes | from existing cuisine tag (Greek / Italian) |

### Judgment-call recipes (theme categories → resolved cuisine)

Each resolved from title + tags, not guessed blindly. Cuisine is a list, so fusion
dishes get more than one:

| Recipe | Current category | Cuisine(s) | New tags |
| --- | --- | --- | --- |
| Spicy Tomato & Chili Pasta | Main Course | **Italian** | `pasta`, `main` |
| Spanish Tortilla Española | Tapas | **Spanish** | `tapas` |
| Lebanese Fattoush | Levant | **Levantine** | — |
| Mexican Esquites | Street Food | **Mexican** | `street-food` |
| Indian Masoor Dal | Curry Night | **Indian** | `curry-night` |
| Citrus Shrimp Ceviche Tostada | Coastal Latin | **Mexican + Peruvian** | `ceviche` |
| Moroccan Chicken Tagine | North African | **Moroccan** | — |
| Sichuan Mapo Tofu | Sichuan | **Chinese** | `sichuan` |
| Classic Chocolate Chip Cookies | Heirloom Recipe | **American** ⚠ | `dessert`, `baking`, `heirloom` |
| Artisan Glazed Donuts | Bakery Classic | **American** ⚠ | `bakery`, `breakfast` |
| Overnight Country Sourdough | Bread | **American** ⚠ | `bread` |

The ceviche tostada is the case that proved the model: it's filed under **both**
Mexican and Peruvian, and a search for either surfaces it.

⚠ = no cuisine signal in the data. **Cookies / Donuts / Sourdough** got `American`
as the least-bad bucket; the alternative is leaving `cuisines` empty (they'd still be
findable by their tags) rather than inventing a cuisine.

### Tags introduced

`sichuan`, `tapas`, `street-food`, `curry-night`, `pasta`, `main`, `dessert`,
`baking`, `heirloom`, `bakery`, `breakfast`, `bread`, `ceviche` — plus the demoted
MealDB proteins (`chicken`, `beef`, `lamb`, `seafood`, `vegetarian`).

---

## 3. When greenlit — what changes

- [`src/types.ts`](../src/types.ts) — add `cuisines: string[]` (additive model);
  keep `category` as the primary/display cuisine.
- [`src/data/bundledRecipes.ts`](../src/data/bundledRecipes.ts) — set `cuisines`
  (+ append tags) per the tables above; `category` = `cuisines[0]`.
- [`src/data/mealDbSeeds.ts`](../src/data/mealDbSeeds.ts) — `cuisines` from the
  cuisine tag, append the protein as a tag.
- [`useLibraryFilters.ts`](../src/hooks/useLibraryFilters.ts) — `categoryFilter:
  string | null` → `cuisineFilters: string[]` (match-any); derive the cuisine list
  from the union of all `cuisines`.
- **D1 migration** — `migrations/000X_recategorize.sql` (or a one-off script) to
  backfill `cuisines` on live rows. **Not written** — needs the live distribution
  first (the seed mapping won't cover user-added recipes).
- UI: [`LibraryToolbar.tsx`](../src/components/LibraryToolbar.tsx) +
  [`LibraryScreen.tsx`](../src/screens/LibraryScreen.tsx) for Option A, with the
  cuisine control as a multi-select.

## Open questions

1. Data model: additive `cuisines[]` alongside `category` (recommended), or full
   migration that replaces `category`?
2. Cookies / Donuts / Sourdough — `American`, or leave `cuisines` empty?
3. Live D1 — query the real distribution before writing the migration?
