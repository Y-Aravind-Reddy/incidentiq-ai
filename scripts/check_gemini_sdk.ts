import dns from 'node:dns/promises';
import { getDefaultResultOrder, setDefaultResultOrder } from 'node:dns';
import https from 'node:https';
import tls from 'node:tls';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { env } from '../src/config/env.ts';
import { classifyGeminiProviderError } from '../src/agent/gemini.ts';
import { nodeHttpsFetch } from '../src/agent/nodeHttpsFetch.ts';

const HOST = 'generativelanguage.googleapis.com';
const timeoutMs = 5_000;

function probeTls(address: string, family: number): Promise<{ family: number; result: string; elapsed_ms: number; code?: string }> {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = tls.connect({ host: address, port: 443, servername: HOST, rejectUnauthorized: true });
    const done = (result: string, code?: string) => {
      const elapsed_ms = Date.now() - started;
      socket.destroy();
      resolve({ family, result, elapsed_ms, ...(code ? { code } : {}) });
    };
    socket.setTimeout(timeoutMs, () => done('timeout'));
    socket.once('secureConnect', () => done(socket.authorized ? 'tls_ok' : 'tls_rejected'));
    socket.once('error', (error: NodeJS.ErrnoException) => {
      const allowed = new Set(['EACCES', 'ECONNREFUSED', 'ENETUNREACH', 'ETIMEDOUT', 'ECONNRESET', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);
      done('connect_or_tls_error', error.code && allowed.has(error.code) ? error.code : 'other');
    });
  });
}

function probeHttps(): Promise<{ result: string; status?: number; elapsed_ms: number; code?: string }> {
  const started = Date.now();
  return new Promise((resolve) => {
    const request = https.get({ hostname: HOST, path: '/', timeout: timeoutMs, rejectUnauthorized: true }, (response) => {
      response.resume();
      response.once('end', () => resolve({ result: 'http_response', status: response.statusCode, elapsed_ms: Date.now() - started }));
    });
    request.once('timeout', () => request.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    request.once('error', (error: NodeJS.ErrnoException) => {
      const allowed = new Set(['EACCES', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH', 'ETIMEDOUT', 'ECONNRESET']);
      resolve({ result: 'request_error', elapsed_ms: Date.now() - started, ...(error.code && allowed.has(error.code) ? { code: error.code } : {}) });
    });
  });
}

async function probeFetch(): Promise<{ result: string; status?: number; elapsed_ms: number; error_class?: string; code?: string }> {
  const started = Date.now();
  try {
    const response = await fetch(`https://${HOST}/`, { signal: AbortSignal.timeout(8_000) });
    await response.body?.cancel();
    return { result: 'http_response', status: response.status, elapsed_ms: Date.now() - started };
  } catch (error) {
    const safe = classifyGeminiProviderError(error);
    return { result: safe.category, elapsed_ms: Date.now() - started, ...(safe.error_class ? { error_class: safe.error_class } : {}), ...(safe.code ? { code: safe.code } : {}) };
  }
}

async function probeSdk(useNodeHttps = false): Promise<{ result: string; category?: string; http_status?: number; error_class?: string; safe_code?: string; elapsed_ms: number; structured_response_valid?: boolean; json_parseable?: boolean; response_length?: number; returned_ok_true?: boolean; finish_reason?: string; block_reason?: string }> {
  const started = Date.now();
  try {
    const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: 30_000, ...(useNodeHttps ? { fetch: nodeHttpsFetch } : {}) } });
    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: 'Return the requested JSON object.',
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false,
        },
        maxOutputTokens: 512,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    let parsed: unknown;
    let json_parseable = false;
    try { parsed = JSON.parse(response.text ?? ''); json_parseable = true; } catch { /* Record only parse status; never output the text. */ }
    const returned_ok_true = Boolean(parsed && typeof parsed === 'object' && 'ok' in parsed && parsed.ok === true);
    const firstCandidate = response.candidates?.[0];
    const finishReason = typeof firstCandidate?.finishReason === 'string' ? firstCandidate.finishReason : undefined;
    const blockReason = typeof response.promptFeedback?.blockReason === 'string' ? response.promptFeedback.blockReason : undefined;
    return {
      result: 'response_received', elapsed_ms: Date.now() - started,
      structured_response_valid: json_parseable && returned_ok_true, json_parseable,
      response_length: response.text?.length ?? 0, returned_ok_true,
      ...(finishReason ? { finish_reason: finishReason } : {}), ...(blockReason ? { block_reason: blockReason } : {}),
    };
  } catch (error) {
    const safe = classifyGeminiProviderError(error);
    return { result: 'request_failed', category: safe.category, http_status: safe.status, error_class: safe.error_class, safe_code: safe.code, elapsed_ms: Date.now() - started };
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--ipv4-first')) setDefaultResultOrder('ipv4first');
  console.log(JSON.stringify({ node: process.version, undici: process.versions.undici ?? 'unavailable', dns_order: getDefaultResultOrder(), model: env.GEMINI_MODEL, key_configured: Boolean(env.GEMINI_API_KEY) }));
  if (!env.GEMINI_API_KEY) {
    console.log(JSON.stringify({ sdk: 'not_run', reason: 'api_key_missing' }));
    process.exitCode = 1;
    return;
  }

  let transport: Record<string, unknown> | undefined;
  if (!process.argv.includes('--sdk-only')) {
    const lookupResult = await dns.lookup(HOST, { all: true, verbatim: true });
    const families = [...new Set(lookupResult.map(({ family }) => family))];
    const tlsResults = Promise.all(families.map((family) => {
      const address = lookupResult.find((entry) => entry.family === family)!.address;
      return probeTls(address, family);
    }));
    const [probes, httpsResult, fetchResult] = await Promise.all([tlsResults, probeHttps(), probeFetch()]);
    transport = { dns_families: families, tls_probes: probes, node_https: httpsResult, node_fetch: fetchResult };
  }
  const sdkResult = await probeSdk(process.argv.includes('--native-https-only'));
  console.log(JSON.stringify({ ...transport, sdk_transport: process.argv.includes('--native-https-only') ? 'node_https' : 'undici_default', sdk: sdkResult }));
  if (sdkResult.result !== 'response_received' || !sdkResult.structured_response_valid) process.exitCode = 1;
}

main().catch(() => {
  console.log(JSON.stringify({ diagnostic: 'failed', category: 'unknown_provider_error' }));
  process.exitCode = 1;
});
