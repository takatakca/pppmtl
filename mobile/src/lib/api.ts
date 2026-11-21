// Client for the MontrealHub API on the website (/api/mobile/v1, src/lib/mobile/ on pppmtl.com).
import * as Crypto from 'expo-crypto';
import { SITE_ORIGIN } from './config';
import { randomHex } from './logic';
import { readSecret, writeSecret } from './storage';
import type { Catalog, OrderView, PlaceOrderInput, PlaceResult } from './types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const DEVICE_KEY = 'mh.device.v1';
let device: string | null = null;

/** One random id per install, used by the restaurant only to keep two phones' identical carts apart. */
async function deviceId(): Promise<string> {
  if (device) return device;
  const saved = await readSecret(DEVICE_KEY);
  if (saved && /^[a-f0-9]{64}$/.test(saved)) return (device = saved);
  device = randomHex(Crypto.getRandomBytes(32));
  await writeSecret(DEVICE_KEY, device);
  return device;
}

async function call<R>(method: 'GET' | 'POST', path: string, body?: unknown, headers: Record<string, string> = {}, timeoutMs = 25000): Promise<R> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${SITE_ORIGIN}${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'network');
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok && !(data && typeof data === 'object' && 'error' in data)) throw new ApiError(response.status, `http_${response.status}`);
  return data as R;
}

export const api = {
  catalog: () => call<Catalog>('GET', '/api/mobile/v1/catalog'),
  check: (input: PlaceOrderInput) => call<{ valid: boolean; errors: PlaceResult['error'][] }>('POST', '/api/mobile/v1/orders/check', input),
  async place(input: PlaceOrderInput): Promise<PlaceResult> {
    return call<PlaceResult>('POST', '/api/mobile/v1/orders/place', input, { 'X-MontrealHub-Device': await deviceId() }, 45000);
  },
  status: (orders: Array<{ id: string; token: string }>) => call<{ orders: OrderView[] }>('POST', '/api/mobile/v1/orders/status', { orders }),
  cancel: (id: string, token: string, reason: string) => call<PlaceResult>('POST', '/api/mobile/v1/orders/cancel', { id, token, reason }),
};
