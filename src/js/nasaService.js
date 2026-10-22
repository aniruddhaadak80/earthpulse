import axios from 'axios';
import { buildPayload } from './normalize.js';

// In-memory cache to prevent excessive NASA API calls during navigation
let cachedEvents = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Ask the serverless API layer first. It normalises the payload and caches
 * it, so the browser does not have to hit the NASA API on every visit.
 */
async function fetchFromApi() {
  const response = await fetch('/api/events', { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`API responded with ${response.status}`);
  }
  return await response.json();
}

/**
 * Fallback for static hosting (the GitHub Pages demo has no serverless
 * function): fetch NASA EONET v3 directly and normalise it in the browser.
 */
async function fetchFromNasa() {
  const response = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
    params: { status: 'open', days: 60 }
  });
  return buildPayload(response.data.events);
}

export async function fetchNasaEvents() {
  const now = Date.now();

  if (cachedEvents && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedEvents;
  }

  let payload;
  try {
    payload = await fetchFromApi();
  } catch (apiError) {
    try {
      payload = await fetchFromNasa();
    } catch (nasaError) {
      console.error("NASA API Error:", nasaError.message);
      if (cachedEvents) {
        return { ...cachedEvents, note: 'Serving stale cache' };
      }
      throw new Error('Failed to fetch tracking data');
    }
  }

  cachedEvents = payload;
  lastFetchTime = now;

  return payload;
}
