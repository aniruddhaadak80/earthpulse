/**
 * Normalisation of the raw NASA EONET v3 payload.
 *
 * This module is shared by the client (src/js/nasaService.js) and by the
 * serverless API layer (api/events.js) so both produce the same shape.
 * It is pure: no I/O, no framework, no client-only API.
 */

/** Centre of a GeoJSON Polygon, used for the map marker of large events. */
export function polygonCentroid(points) {
  if (!Array.isArray(points) || points.length === 0) return { lat: 0, lng: 0 };
  let lngSum = 0;
  let latSum = 0;
  for (const point of points) {
    lngSum += point[0];
    latSum += point[1];
  }
  return { lat: latSum / points.length, lng: lngSum / points.length };
}

/** Severity on a 1-10 scale, derived from how long the event has been open. */
export function severityFor(durationDays) {
  if (durationDays === 0) return 3;
  return Math.min(10, Math.max(1, Math.ceil(durationDays / 5)));
}

/** Turn the raw EONET events into the shape the dashboard renders. */
export function normalizeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events
    .filter((event) => Array.isArray(event.geometry) && event.geometry.length > 0)
    .map((event) => {
      const latestGeo = event.geometry[event.geometry.length - 1];

      let lat = 0;
      let lng = 0;

      if (latestGeo.type === 'Point') {
        lng = latestGeo.coordinates[0];
        lat = latestGeo.coordinates[1];
      } else if (latestGeo.type === 'Polygon') {
        const centroid = polygonCentroid(latestGeo.coordinates[0]);
        lat = centroid.lat;
        lng = centroid.lng;
      }

      const firstDate = new Date(event.geometry[0].date);
      const lastDate = new Date(latestGeo.date);
      const durationDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

      const category = event.categories.length > 0 ? event.categories[0].title : 'Unknown';

      return {
        id: event.id,
        title: event.title,
        category,
        severity: Math.round(severityFor(durationDays)),
        activeDays: Math.round(durationDays),
        lat,
        lng,
        source: (event.sources && event.sources[0] && event.sources[0].url) || 'NASA',
        lastUpdated: latestGeo.date,
      };
    });
}

/** Wrap the normalised events in the payload the dashboard expects. */
export function buildPayload(events) {
  const normalizedData = normalizeEvents(events);

  const stats = {
    total: normalizedData.length,
    categories: {},
  };
  for (const ev of normalizedData) {
    stats.categories[ev.category] = (stats.categories[ev.category] || 0) + 1;
  }

  return {
    status: 'success',
    timestamp: new Date().toISOString(),
    stats,
    data: normalizedData,
  };
}
