/**
 * The EarthPulse serverless API layer.
 *
 * The same module is used by the Vercel serverless function
 * (https://<host>/api/events) and by the local Express mirror in server.js.
 *
 * It fetches the raw NASA EONET v3 payload, normalises it and keeps a short
 * memory cache so the upstream API is not hammered.
 */
import { buildPayload } from '../src/js/normalize.js';

const NASA_EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

let cachedPayload = null;
let lastFetchTime = 0;

async function fetchFromNasa() {
  const response = await fetch(`${NASA_EONET_URL}?status=open&days=60`);
  if (!response.ok) {
    throw new Error(`NASA EONET responded with ${response.status}`);
  }
  const body = await response.json();
  return buildPayload(body.events);
}

async function getPayload() {
  const now = Date.now();
  if (cachedPayload && now - lastFetchTime < CACHE_DURATION) {
    return cachedPayload;
  }
  try {
    const payload = await fetchFromNasa();
    cachedPayload = payload;
    lastFetchTime = now;
    return payload;
  } catch (error) {
    if (cachedPayload) {
      return { ...cachedPayload, note: 'Serving stale cache' };
    }
    throw error;
  }
}

export default async function handler(req, res) {
  try {
    const payload = await getPayload();
    res.status(200).json(payload);
  } catch (error) {
    res.status(502).json({
      status: 'error',
      error: error && error.message ? error.message : 'Failed to fetch tracking data',
    });
  }
}
