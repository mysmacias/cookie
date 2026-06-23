export interface Env {
  DB: D1Database;
  EMAIL?: SendEmail;
  MEDIA_BUCKET?: R2Bucket;
  EMAIL_FROM?: string;
  APP_URL?: string;
  RECIPE_API_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type OAuthProvider = 'google' | 'github';
