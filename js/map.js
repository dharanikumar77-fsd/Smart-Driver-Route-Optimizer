class TNMapController {
  constructor(containerId) {
    // Initialize map centered on Tamil Nadu
    this.map = L.map(containerId, { center: [11.1271, 78.6569], zoom: 7, attributionControl: false });

    // Fix: Replaced restricted CartoDB with Esri Light Gray Canvas (Free, No API Key, Clean Aesthetic)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16
    }).addTo(this.map);

    this.cityMarkers = {}; this.routeLine = null; this.animMarker = null;

    if (typeof TAMIL_NADU_BORDER_GEOJSON !== "undefined") {
      L.geoJSON(TAMIL_NADU_BORDER_GEOJSON, { style: { color: "#1e40af", weight: 3, dashArray: "5,5", fillOpacity: 0.03 } }).addTo(this.map);
    }

    this.drawBackgroundGraph();
    this.drawCities();
    this.addLegend();
  }

  // Draws the static colored network graph beneath the active route
  drawBackgroundGraph() {
    TN_ROADS.forEach(road => {
      const c1 = TN_CITIES[road.from], c2 = TN_CITIES[road.to];
      if (!c1 || !c2) return;
      let color = "#10b981"; // NH (Green)
      if (road.type === "normal") color = "#f59e0b"; // SH (Orange)
      if (road.type === "hilly") color = "#ef4444"; // Ghat (Red)

      L.polyline([[c1.lat, c1.lng], [c2.lat, c2.lng]], { color: color, weight: 3, opacity: 0.5 }).addTo(this.map);
    });
  }

  drawCities() {
    // Clear existing city markers if re-rendering for language change
    if (this.cityMarkers) {
      Object.values(this.cityMarkers).forEach(marker => this.map.removeLayer(marker));
    }
    this.cityMarkers = {};

    for (const key in TN_CITIES) {
      const city = TN_CITIES[key];
      const localizedName = getCityName(key);

      // Draw city nodes
      const m = L.circleMarker([city.lat, city.lng], { radius: 5, fillColor: "#3b82f6", color: "#ffffff", weight: 2, fillOpacity: 1 }).addTo(this.map);

      // Interactive popup with global translation
      const popupHtml = `
        <div class="font-sans text-xs p-1 min-w-[180px]">
          <div class="flex justify-between items-center border-b pb-1 mb-2">
            <h4 class="font-bold text-sm text-slate-800">${localizedName}</h4>
            <span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">${city.tier}</span>
          </div>
          <div class="space-y-1.5 mb-3 text-slate-600">
            <p>⛽ <b>Fuel:</b> ${city.fuel_station ? `₹${city.fuel_station.price}/L` : 'N/A'}</p>
          </div>
          <div class="flex gap-2 w-full">
            <button onclick="window.setMapEndpoint('source', '${key}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded shadow-sm transition">Set Origin</button>
            <button onclick="window.setMapEndpoint('dest', '${key}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded shadow-sm transition">Set Dest</button>
          </div>
        </div>
      `;
      m.bindPopup(popupHtml);
      m.bindTooltip(`<b>${localizedName}</b>`, { direction: 'top', offset: [0, -5] });
      this.cityMarkers[key] = m;
    }
  }

  addLegend() {
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = `
        <h4 data-i18n="legend_title">ROAD NETWORK LEGEND</h4>
        <div class="map-legend-row"><i style="background: #10b981"></i> <span data-i18n="legend_nh">National Highway (NH)</span></div>
        <div class="map-legend-row"><i style="background: #f59e0b"></i> <span data-i18n="legend_sh">State Highway (2-Lane SH)</span></div>
        <div class="map-legend-row"><i style="background: #ef4444"></i> <span data-i18n="legend_ghat">Ghat / Mountain Road</span></div>
        <div class="mt-2 text-[10px] text-slate-500 border-t pt-1 flex justify-between">
          <span>☕ <span data-i18n="legend_tea">Tea Kadai</span></span><span>🏨 <span data-i18n="legend_resort">Resort</span></span><span>⛽ <span data-i18n="legend_pump">Fuel Pump</span></span>
        </div>
      `;
      return div;
    };
    legend.addTo(this.map);
  }

  displayRoute(result) {
    if (this.routeLine) this.map.removeLayer(this.routeLine);
    if (this.animMarker) this.map.removeLayer(this.animMarker);

    const coords = result.pathNodes.map(c => [TN_CITIES[c].lat, TN_CITIES[c].lng]);

    // Draw thick blue optimal path
    this.routeLine = L.polyline(coords, { color: "#2563eb", weight: 6, opacity: 0.9, lineCap: 'round' }).addTo(this.map);
    this.map.fitBounds(this.routeLine.getBounds(), { padding: [50, 50] });

    // Vehicle Animation Setup
    const emojis = { "car": "🚗", "bus": "🚌", "truck": "🚛", "heavy_truck": "🚚", "bike": "🏍️" };
    const vEmoji = emojis[result.vehicle.id] || "🚗";
    const icon = L.divIcon({ html: vEmoji, className: 'emoji-marker', iconSize: [30, 30] });

    this.animMarker = L.marker(coords[0], { icon: icon, zIndexOffset: 1000 }).addTo(this.map);
    this.startAnimation(coords);
  }

  startAnimation(coords) {
    if (coords.length < 2) return;
    let step = 0;
    const totalSteps = 100 * (coords.length - 1);

    const animate = () => {
      if (!this.animMarker) return;
      if (step >= totalSteps) { step = 0; } // Loop animation infinitely

      const segment = Math.floor(step / 100);
      const frac = (step % 100) / 100;
      if (segment < coords.length - 1) {
        const p1 = coords[segment], p2 = coords[segment + 1];
        const lat = p1[0] + (p2[0] - p1[0]) * frac;
        const lng = p1[1] + (p2[1] - p1[1]) * frac;
        this.animMarker.setLatLng([lat, lng]);
      }
      step++;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  resetView() {
    this.map.setView([11.1271, 78.6569], 7);
  }
}