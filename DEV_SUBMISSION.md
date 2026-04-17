---
title: "EarthPulse: A Real-Time Planetary Crisis Monitor Built with Node.js & D3 🌍"
published: false
tags: devchallenge, weekendchallenge, earthday, nodejs, javascript
---

*This is a completely custom, pure-logic submission for the [Weekend Challenge: Earth Day Edition](https://dev.to/challenges/weekend-2026-04-16).*

---

## 🌍 The Concept

While there's a lot of incredible AI technology out there, for Earth Day, I wanted to take a step back and look at **pure structural logic and data transformation**. I wanted to build an application that tracks exactly what is happening to our Earth in *real-time*, aggregating thousands of live natural disaster metrics globally without using any pre-built visualization libraries like Leaflet or Mapbox. 

I built **EarthPulse** — a full-stack, high-performance monitoring dashboard that ingests live satellite tracking data from NASA and mathematically renders it onto a custom-built D3 canvas. 

> *"I wanted to build a dashboard that feels less like a generic web app, and more like a high-tech satellite control center."*

## 📸 The Application

The frontend renders a highly stylized, animated UI mapping live threats (Wildfires, Volcanoes, Severe Storms, and Icebergs). The map interacts directly with a sidebar that tracks real-time days-active duration and calculates severity algorithms!

🚀 **[Experience EarthPulse Live](https://aniruddhaadak80.github.io/earthpulse/)**

![EarthPulse Interactive Map View](https://raw.githubusercontent.com/aniruddhaadak80/earthpulse/main/src/assets/hero.png)
*(Click around the globe to explore the custom CSS pulsing markers and the data normalization sidebar algorithms in real-time.)*

---

## 💻 Source Code

The full monorepo (Express Backend + Vite Frontend) is available on my GitHub:

{% github aniruddhaadak80/earthpulse %}

---

## 🛠️ How I Built It (The "Pure Logic" Approach)

I built this project completely from scratch, placing a massive emphasis on API normalization, backend processing, and raw front-end Canvas drawing.

### ⚙️ The Backend (Node.js + Express)
Instead of hammering the NASA API directly from the client (which is slow and introduces rate-limiting and CORS issues), I built a Vercel-ready Serverless API layer. 
*   **Data Ingestion:** I connect to the `NASA EONET v3` endpoint.
*   **Normalization Logic:** The backend parses raw GeoJSON polygons, calculates the mathematical centroid for massive forest fires, measures the delta between the start date and the last-updated date to compute an "Active Days" metric, and assigns a scale 1-10 severity rating based on mathematical thresholds.
*   **Caching:** A strict memory cache is implemented to ensure blazing-fast load times.

### 🎨 The Frontend (Vite + Vanilla JS + High-Tech CSS)
*   **The Renderer:** I am not using standard map tiles. Instead, I fetch raw raw global topology data (`topojson`) and use `D3.geoMercator` to actively draw the entire planet onto an HTML5 Canvas! 
*   **The Animations:** I built complex mathematical pulse offsets so each disaster marker animates asynchronously across the canvas based on its severity rating!
*   **The UI Styling:** Beautiful `backdrop-filter: blur(12px)` overlays and custom scrollbars give it a glassmorphism, HUD-style aesthetic.

## 🏆 Prize Strategy

I am submitting this to the Earth Day challenge relying purely on **high-level backend architecture and visual styling**, proving that you don't need a massive framework to create an incredibly impactful, data-rich environmental tool!

*"Let's stay informed about our planet, so we can protect it."* 💚
