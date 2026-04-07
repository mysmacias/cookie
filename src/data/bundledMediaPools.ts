/** Curated Unsplash food imagery for bundled recipes (free to use per Unsplash License). */

const q = '?auto=format&fit=crop&w=800&q=80';

function u(id: string): string {
  return `https://images.unsplash.com/${id}${q}`;
}

/** Verified 200 OK; triplicated so stride-based picks see more variety before repeating. */
const BASE_FOOD_IMAGES: string[] = [
  u('photo-1547592166-23ac45744acd'),
  u('photo-1565299507177-b0ac66763828'),
  u('photo-1540189549336-e6e99c3679fe'),
  u('photo-1529042410759-befb1204b468'),
  u('photo-1517248135467-4c7edcad34c4'),
  u('photo-1504674900247-0877df9cc836'),
  u('photo-1546069901-ba9599a7e63c'),
  u('photo-1563379926898-05f4575a45d8'),
  u('photo-1551218808-94e220e084d2'),
  u('photo-1567620905732-2d1ec7ab7445'),
  u('photo-1555939594-58d7cb561ad1'),
  u('photo-1490645935967-10de6ba17061'),
  u('photo-1466978913421-dad2ebd01d17'),
  u('photo-1512621776951-a57141f2eefd'),
  u('photo-1551024506-0bccd828d307'),
  u('photo-1512058564366-18510be2db19'),
  u('photo-1515003197210-e0cd71810b5f'),
  u('photo-1504754524776-8f4f37790ca0'),
  u('photo-1464226184884-fa280b87c399'),
  u('photo-1565958011703-44f9829ba187'),
];

export const FOOD_IMAGE_URLS: string[] = [...BASE_FOOD_IMAGES, ...BASE_FOOD_IMAGES, ...BASE_FOOD_IMAGES];
