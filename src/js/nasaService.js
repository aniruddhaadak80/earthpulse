import axios from 'axios';

// In-memory cache to prevent excessive NASA API calls during navigation
let cachedEvents = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function fetchNasaEvents() {
  const now = Date.now();
  
  if (cachedEvents && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedEvents;
  }

  try {
    // Fetch from NASA EONET v3
    const response = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
      params: { status: 'open', days: 60 }
    });

    const events = response.data.events;
    
    // Pure Logic: Advanced Normalization & Severity Calculation runs right on the client
    const normalizedData = events.map(event => {
      const latestGeo = event.geometry[event.geometry.length - 1];
      
      let lat = 0;
      let lng = 0;
      
      // Calculate Centroid points dynamically depending on Geometry type
      if (latestGeo.type === 'Point') {
        lng = latestGeo.coordinates[0];
        lat = latestGeo.coordinates[1];
      } else if (latestGeo.type === 'Polygon') {
        const points = latestGeo.coordinates[0];
        let lngSum = 0;
        let latSum = 0;
        points.forEach(p => {
          lngSum += p[0];
          latSum += p[1];
        });
        lng = lngSum / points.length;
        lat = latSum / points.length;
      }

      // Calculate severity based on active duration natively
      let firstDate = new Date(event.geometry[0].date);
      let lastDate = new Date(latestGeo.date);
      let durationDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
      
      let severity = Math.min(10, Math.max(1, Math.ceil(durationDays / 5)));
      if (durationDays === 0) severity = 3;

      let category = event.categories.length > 0 ? event.categories[0].title : 'Unknown';

      return {
        id: event.id,
        title: event.title,
        category: category,
        severity: Math.round(severity),
        activeDays: Math.round(durationDays),
        lat: lat,
        lng: lng,
        source: event.sources[0]?.url || 'NASA',
        lastUpdated: latestGeo.date
      };
    });

    const stats = {
      total: normalizedData.length,
      categories: {}
    };

    normalizedData.forEach(ev => {
        stats.categories[ev.category] = (stats.categories[ev.category] || 0) + 1;
    });

    const payload = {
      status: 'success',
      timestamp: new Date().toISOString(),
      stats,
      data: normalizedData
    };

    cachedEvents = payload;
    lastFetchTime = now;

    return payload;
  } catch (error) {
    console.error("NASA API Error:", error.message);
    if (cachedEvents) {
      return { ...cachedEvents, note: 'Serving stale cache' };
    }
    throw new Error('Failed to fetch tracking data');
  }
}
