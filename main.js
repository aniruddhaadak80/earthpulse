import { fetchNasaEvents } from './src/js/nasaService.js';

// EarthPulse NASA Backend fetch and D3 Geo Engine mapping

let globalEventsData = [];
let currentFilter = 'all';

// DOM Elements
const sidebarList = document.getElementById('event-list');
const statTotal = document.getElementById('stat-total');
const filterBtns = document.querySelectorAll('.filter-btn');
const overlay = document.getElementById('connecting-overlay');
const tooltip = document.createElement('div');
tooltip.className = 'map-tooltip';
document.body.appendChild(tooltip);

// Canvas Map Setup
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
let width, height;

// D3 Projection and Path setup
let projection = d3.geoMercator();
let geoPath = d3.geoPath().projection(projection).context(ctx);

// World Map Data (Low-res countries)
let worldGeoData = null;

// Initialization
async function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Bind filters
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.cat;
      renderApp();
    });
  });

  try {
    // 1. Load world map geojson (free topology data)
    const worldRes = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');
    const topoData = await worldRes.json();
    worldGeoData = topojson.feature(topoData, topoData.objects.countries);

    // 2. Fetch processed event data strictly using frontend logics
    const pulseData = await fetchNasaEvents();

    if (pulseData.status === 'success') {
      globalEventsData = pulseData.data;
      updateStats(pulseData.stats);
    } else {
      console.error("Backend returned error status");
    }

    // Hide loader and start render loop
    overlay.classList.add('hidden');
    renderApp();
    startAnimationLoop();
    setupCanvasInteractivity();

  } catch (err) {
    console.error("Failed to initialize EarthPulse:", err);
    overlay.querySelector('h2').innerText = "Connection Failed";
    overlay.querySelector('p').innerText = "Ensure the Node.js backend is running (npm run dev:server)";
    overlay.querySelector('.spinner').style.display = 'none';
  }
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  
  // Update projection to fit screen nicely
  projection.translate([width / 2, height / 2 + 50]).scale((width / 6));
  
  if (worldGeoData) {
    renderMap();
  }
}

function getFilteredEvents() {
  if (currentFilter === 'all') return globalEventsData;
  return globalEventsData.filter(e => e.category === currentFilter);
}

// ==== UI Logic ====

function updateStats(stats) {
  statTotal.innerText = stats.total;
}

function renderSidebar(events) {
  sidebarList.innerHTML = '';
  
  if (events.length === 0) {
    sidebarList.innerHTML = '<div class="loading-state">No active events in this category.</div>';
    return;
  }

  // Sort by severity (descending)
  const sortedEvents = [...events].sort((a,b) => b.severity - a.severity);

  sortedEvents.forEach(ev => {
    const card = document.createElement('div');
    
    // Assign severity class
    let sevClass = 'sev-low';
    if (ev.severity > 3) sevClass = 'sev-med';
    if (ev.severity > 6) sevClass = 'sev-high';
    if (ev.severity >= 9) sevClass = 'sev-extreme';

    card.className = `event-card ${sevClass}`;
    
    card.innerHTML = `
      <div class="card-header">
        <span class="category-tag">${ev.category}</span>
        <span class="duration-tag">${ev.activeDays} days active</span>
      </div>
      <h3>${ev.title}</h3>
      <div class="event-details">
        <div>Lat: ${ev.lat.toFixed(2)}, Lng: ${ev.lng.toFixed(2)}</div>
        <div>Severity Rating: ${ev.severity}/10</div>
        <div style="margin-top: 6px;"><a href="${ev.source}" target="_blank">View Source Data</a></div>
      </div>
    `;

    // Click to expand card and pan map
    card.addEventListener('click', () => {
      // Toggle accordion
      const wasExpanded = card.classList.contains('expanded');
      document.querySelectorAll('.event-card').forEach(c => c.classList.remove('expanded'));
      if (!wasExpanded) card.classList.add('expanded');

      // Highlight on map (Trigger pulse effect)
      highlightEventOnMap(ev);
    });

    sidebarList.appendChild(card);
  });
}

function renderApp() {
  const visibleEvents = getFilteredEvents();
  renderSidebar(visibleEvents);
  renderMap(); // Force redraw static map
}

// ==== Map Rendering Logic ====

let time = 0;
let animationId;
let highlightedEvent = null;

function renderMap() {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // 1. Draw base landmasses (Holo-grid style)
  ctx.beginPath();
  geoPath(worldGeoData);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'; // Dark blue base
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'; // Cyan borders
  ctx.lineWidth = 1;
  ctx.stroke();

  // 2. Draw map grid pattern overlay for high-tech look
  drawGrid();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

function getRipplesForEvent(ev, t) {
  // Advanced Math: Pulse logic
  // Creates expanding rings based on time, offset by event id so they pulse asynchronously
  const frequency = 2; // speed
  const maxRadius = ev.severity * 4 + 10;
  
  // Phase shift based on ID to make them look organic and not completely synced
  const phase = parseInt(ev.id.replace(/\D/g, '') || '0') % 10;
  
  let currentRadius = ((t * frequency) + phase * 2) % maxRadius;
  let opacity = Math.max(0, 1 - (currentRadius / maxRadius));
  
  return { radius: currentRadius, opacity };
}

function getEventColor(ev) {
  if (ev.severity >= 9) return '239, 68, 68'; // Red
  if (ev.severity > 6) return '248, 113, 113'; // Light Red
  if (ev.severity > 3) return '250, 204, 21'; // Yellow
  return '74, 222, 128'; // Green
}

function startAnimationLoop() {
  time += 0.05;
  
  // We don't want to re-draw the huge SVG-like world map every frame because it's slow.
  // Instead, we use an offscreen canvas or redraw the whole map. 
  // For extreme performance, we draw the world to a hidden canvas once and just use drawImage.
  // BUT the map is simple enough, we will redraw the base for simplicity.
  renderMap(); 
  
  const events = getFilteredEvents();
  
  // Draw event pulses
  events.forEach(ev => {
    // Project geo coordinates to [x, y] on canvas
    const p = projection([ev.lng, ev.lat]);
    if (!p) return;
    
    const [x, y] = p;
    const colorRGB = getEventColor(ev);
    
    // Core dot
    ctx.beginPath();
    ctx.arc(x, y, 2.5 + (ev.severity * 0.2), 0, 2 * Math.PI);
    ctx.fillStyle = `rgb(${colorRGB})`;
    ctx.fill();

    // Pulse effect
    const ripple = getRipplesForEvent(ev, time);
    ctx.beginPath();
    ctx.arc(x, y, ripple.radius, 0, 2 * Math.PI);
    ctx.strokeStyle = `rgba(${colorRGB}, ${ripple.opacity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Highlight ring if this is the active event clicked
    if (highlightedEvent && highlightedEvent.id === ev.id) {
       ctx.beginPath();
       ctx.arc(x, y, 20 + Math.sin(time*2)*5, 0, 2*Math.PI);
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 2;
       ctx.stroke();
       
       // Draw crosshair
       ctx.beginPath();
       ctx.moveTo(x-30, y); ctx.lineTo(x-10, y);
       ctx.moveTo(x+30, y); ctx.lineTo(x+10, y);
       ctx.moveTo(x, y-30); ctx.lineTo(x, y-10);
       ctx.moveTo(x, y+30); ctx.lineTo(x, y+10);
       ctx.stroke();
    }
  });

  animationId = requestAnimationFrame(startAnimationLoop);
}

function highlightEventOnMap(ev) {
  highlightedEvent = ev;
}

function setupCanvasInteractivity() {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let hovered = null;
    const events = getFilteredEvents();
    
    // Check collisions
    for (let ev of events) {
      const p = projection([ev.lng, ev.lat]);
      if (p) {
        const dx = mouseX - p[0];
        const dy = mouseY - p[1];
        if (Math.sqrt(dx*dx + dy*dy) < 8) { // 8px hit radius
          hovered = ev;
          break;
        }
      }
    }
    
    if (hovered) {
      canvas.style.cursor = 'pointer';
      tooltip.style.opacity = 1;
      tooltip.style.left = (e.clientX + 15) + 'px';
      tooltip.style.top = (e.clientY + 15) + 'px';
      tooltip.innerHTML = `
        <h4>${hovered.category} ALERT</h4>
        <div>${hovered.title}</div>
        <div style="margin-top:4px; opacity:0.8; font-size:11px;">Severity: ${hovered.severity} | Active: ${hovered.activeDays}d</div>
      `;
    } else {
      canvas.style.cursor = 'crosshair';
      tooltip.style.opacity = 0;
    }
  });

  // Pan Map (Simplified Click Map)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const events = getFilteredEvents();
    for (let ev of events) {
      const p = projection([ev.lng, ev.lat]);
      if (p) {
        const dx = mouseX - p[0];
        const dy = mouseY - p[1];
        if (Math.sqrt(dx*dx + dy*dy) < 10) {
          highlightEventOnMap(ev);
           // Scroll sidebar to this card logic could go here
          break;
        }
      }
    }
  });
}

// Start
init();
