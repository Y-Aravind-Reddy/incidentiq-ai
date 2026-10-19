import https from 'node:https';
import { Readable } from 'node:stream';

/**
 * Use Node's native HTTPS transport for the server-side Gemini SDK. This avoids
 * the observed Undici connection timeout while preserving TLS verification.
 */
export async function nodeHttpsFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const sourceRequest = input instanceof Request ? input : undefined;
  const url = input instanceof URL ? input : new URL(sourceRequest?.url ?? String(input));
  if (url.protocol !== 'https:') throw new TypeError('Gemini transport only permits HTTPS requests.');

  const headers = new Headers(init.headers ?? sourceRequest?.headers);
  if (!headers.has('accept-encoding')) headers.set('accept-encoding', 'identity');
  const method = init.method ?? sourceRequest?.method ?? 'GET';
  let body: BodyInit | null | undefined = init.body;
  if (body === undefined && sourceRequest && method !== 'GET' && method !== 'HEAD') {
    body = await sourceRequest.arrayBuffer();
  }
  const signal = init.signal ?? sourceRequest?.signal;

  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method,
      headers: Object.fromEntries(headers.entries()),
      signal,
      rejectUnauthorized: true,
    }, (response) => {
      const noBody = method === 'HEAD' || response.statusCode === 204 || response.statusCode === 304;
      const responseBody = noBody ? null : Readable.toWeb(response);
      resolve(new Response(responseBody as BodyInit | null, {
        status: response.statusCode ?? 200,
        statusText: response.statusMessage,
        headers: response.headers as HeadersInit,
      }));
    });
    request.once('error', reject);
    if (body instanceof ReadableStream) Readable.fromWeb(body as never).pipe(request);
    else request.end(body as string | Uint8Array | undefined);
  });
}
