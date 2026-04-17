const axios = require('axios');

// In-memory cache to prevent NASA API rate limits
let cachedEvents = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const now = Date.now();
  
  if (cachedEvents && (now - lastFetchTime < CACHE_DURATION)) {
    return res.status(200).json(cachedEvents);
  }

  try {
    // Fetch from NASA EONET v3
    // We get the last 60 days of mostly active events
    const response = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
      params: {
        status: 'open',
        days: 60
      }
    });

    const events = response.data.events;
    
    // Pure Logic: Advanced Normalization & Severity Calculation
    const normalizedData = events.map(event => {
      // Find the most recent coordinate
      const latestGeo = event.geometry[event.geometry.length - 1];
      
      let lat = 0;
      let lng = 0;
      
      // GeoJSON can be Point or Polygon
      if (latestGeo.type === 'Point') {
        lng = latestGeo.coordinates[0];
        lat = latestGeo.coordinates[1];
      } else if (latestGeo.type === 'Polygon') {
        // Approximate center of the polygon
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

      // Calculate severity based on active duration
      // The older it is but still open = higher severity
      let firstDate = new Date(event.geometry[0].date);
      let lastDate = new Date(latestGeo.date);
      let durationDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
      
      // Scale severity 1-10
      let severity = Math.min(10, Math.max(1, Math.ceil(durationDays / 5)));
      
      // For immediate recent events, bump severity slightly
      if (durationDays === 0) severity = 3;

      let category = event.categories.length > 0 ? event.categories[0].title : 'Unknown';

      return {
        id: event.id,
        title: event.title,
        category: category,
        severity: severity,
        activeDays: Math.round(durationDays),
        lat: lat,
        lng: lng,
        source: event.sources[0]?.url || 'NASA',
        lastUpdated: latestGeo.date
      };
    });

    // Grouping by categories for stats
    const stats = {
      total: normalizedData.length,
      categories: {}
    };

    normalizedData.forEach(ev => {
      if (!stats.categories[ev.category]) {
        stats.categories[ev.category] = 0;
      }
      stats.categories[ev.category]++;
    });

    const payload = {
      status: 'success',
      timestamp: new Date().toISOString(),
      stats,
      data: normalizedData
    };

    // Cache it
    cachedEvents = payload;
    lastFetchTime = now;

    res.status(200).json(payload);
  } catch (error) {
    console.error("NASA API Error:", error.message);
    
    // If cached version exists, serve it even if expired during an error
    if (cachedEvents) {
      return res.status(200).json({
        ...cachedEvents,
        note: 'Serving stale cache due to NASA API failure'
      });
    }

    res.status(500).json({ error: 'Failed to fetch tracking data' });
  }
};
