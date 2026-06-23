// Cloudflare Pages Function: POST /api/scan-recipe
//
// Web replacement for the iOS Apple Intelligence recipe scanner. Accepts a
// recipe photo (data URL or bare base64) and uses Claude vision with structured
// outputs to return a recipe draft the Add Recipe form can apply directly.
//
// Requires the ANTHROPIC_API_KEY secret to be set on the Pages project
// (`wrangler pages secret put ANTHROPIC_API_KEY`, or via the dashboard).

import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../lib/env';
import { requireUser } from '../lib/auth';
import { json } from '../lib/response';

interface ScanEnv extends Env {
  ANTHROPIC_API_KEY?: string;
}

const MODEL = 'claude-opus-4-8';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const SUPPORTED_MEDIA_TYPES: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Structured-output schema mirroring ScanRecipeFromImageResult on the client.
const RECIPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', description: 'One-sentence summary of the dish.' },
    recipe: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        prepTime: { type: 'string', description: 'e.g. "20 mins" — empty string if unknown' },
        timeDisplay: { type: 'string', description: 'Total time for the card, e.g. "45 mins"' },
        bakeTime: { type: 'string' },
        yields: { type: 'string', description: 'e.g. "24 cookies"' },
        category: { type: 'string', description: 'e.g. Dessert, Bread, Main Course' },
        tags: { type: 'array', items: { type: 'string' } },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              amount: { type: 'string', description: 'e.g. "1 cup"' },
            },
            required: ['name', 'amount'],
          },
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string', description: 'Short step heading' },
              description: { type: 'string' },
            },
            required: ['title', 'description'],
          },
        },
        chefNote: { type: 'string' },
      },
      required: [
        'title', 'description', 'prepTime', 'timeDisplay', 'bakeTime',
        'yields', 'category', 'tags', 'ingredients', 'steps', 'chefNote',
      ],
    },
  },
  required: ['summary', 'recipe'],
} as const;

const SYSTEM_PROMPT =
  'You read photos of recipes (handwritten cards, cookbook pages, screenshots) and ' +
  'transcribe them into a structured recipe. Preserve the original wording and ' +
  'measurements as faithfully as possible. If a field is not present in the image, ' +
  'return an empty string (or empty array). Do not invent ingredients or steps that ' +
  'are not in the photo. Write a brief one-sentence summary of the dish.';

function jsonResponse(body: unknown, status = 200): Response {
  return json(body, status);
}

/** Split a data URL or bare base64 string into Claude's image source fields. */
function parseImage(input: string): { mediaType: ImageMediaType; data: string } | null {
  if (typeof input !== 'string' || input.length === 0) return null;

  const dataUrlMatch = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (dataUrlMatch) {
    const declared = dataUrlMatch[1] as ImageMediaType;
    const mediaType = SUPPORTED_MEDIA_TYPES.includes(declared) ? declared : 'image/jpeg';
    return { mediaType, data: dataUrlMatch[2] };
  }
  // Bare base64 — assume JPEG (the app encodes camera/library photos as JPEG).
  return { mediaType: 'image/jpeg', data: input };
}

export const onRequestPost: PagesFunction<ScanEnv> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'Photo scanning is not configured on this server.' }, 503);
  }

  const day = new Date().toISOString().slice(0, 10);
  const usage = await env.DB.prepare(
    'SELECT count FROM scan_usage WHERE user_id = ? AND day = ?',
  ).bind(userOrResponse.id, day).first<{ count: number }>();
  if (usage && usage.count >= 20) {
    return jsonResponse({ error: 'Daily scan limit reached. Try again tomorrow.' }, 429);
  }

  let imageBase64: unknown;
  try {
    const body = (await request.json()) as { imageBase64?: unknown };
    imageBase64 = body.imageBase64;
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const image = parseImage(imageBase64 as string);
  if (!image) {
    return jsonResponse({ error: 'No image provided.' }, 400);
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: 'json_schema', schema: RECIPE_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: image.mediaType, data: image.data },
            },
            { type: 'text', text: 'Transcribe this recipe into the structured format.' },
          ],
        },
      ],
    });

    if (message.stop_reason === 'refusal') {
      return jsonResponse({ error: 'The image could not be processed. Try a clearer photo.' }, 422);
    }

    const textBlock = message.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );
    if (!textBlock) {
      return jsonResponse({ error: 'Could not read a recipe from that image.' }, 422);
    }

    const parsed = JSON.parse(textBlock.text);

    await env.DB.prepare(
      `INSERT INTO scan_usage (user_id, day, count) VALUES (?, ?, 1)
       ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1`,
    ).bind(userOrResponse.id, day).run();

    return jsonResponse(parsed);
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 429) {
      return jsonResponse({ error: 'The scanning service is busy. Please try again in a moment.' }, 429);
    }
    return jsonResponse({ error: 'Scan failed. Please try again.' }, 502);
  }
};
