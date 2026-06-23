export function json(body: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

export function error(message: string, status = 400, code?: string): Response {
  return json({ error: message, code: code ?? 'error' }, status);
}
