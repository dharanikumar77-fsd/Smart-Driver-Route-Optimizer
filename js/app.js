let dijkstraEngine = null, mapController = null, aiCopilot = null, currentDijkstraResult = null;
let fuelChartInstance = null, tracePlayInterval = null, currentTraceStep = 0, traceSteps = [];

document.addEventListener("DOMContentLoaded", () => {
  dijkstraEngine = new DijkstraEngine(TN_CITIES, TN_ROADS);
  mapController = new TNMapController("mapContainer");
  window.mapController = mapController;
  aiCopilot = new AICopilot();

  setLanguage("en");

  // Tab Manager
  document.querySelectorAll("[data-tab-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".main-tab-content").forEach(c => c.classList.add("hidden"));
      document.querySelectorAll("[data-tab-target]").forEach(b => b.classList.remove("border-blue-600", "text-blue-600", "font-bold"));
      btn.classList.add("border-blue-600", "text-blue-600", "font-bold");
      const target = document.getElementById(btn.getAttribute("data-tab-target"));
      target.classList.remove("hidden");
      if (target.id === "tabContentMap" && mapController) setTimeout(() => mapController.map.invalidateSize(), 50);
    });
  });

  document.getElementById("runOptimizationBtn")?.addEventListener("click", runRouteOptimization);
  document.getElementById("settingsModalBtn")?.addEventListener("click", () => document.getElementById("settingsModal").classList.remove("hidden"));
  document.getElementById("resetMapViewBtn")?.addEventListener("click", () => mapController.resetView());
  document.getElementById("swapCitiesBtn")?.addEventListener("click", () => {
    const s = document.getElementById("sourceCitySelect"); const d = document.getElementById("destCitySelect");
    const tmp = s.value; s.value = d.value; d.value = tmp; runRouteOptimization();
  });

  // PDF Export
  document.getElementById("downloadPdfBtn")?.addEventListener("click", downloadItineraryPDF);

  // DSA Stepper
  document.getElementById("dsaPrevStep")?.addEventListener("click", () => stepDSA(-1));
  document.getElementById("dsaNextStep")?.addEventListener("click", () => stepDSA(1));
  document.getElementById("dsaPlayStep")?.addEventListener("click", toggleDSAPlay);
  document.getElementById("dsaResetStep")?.addEventListener("click", resetDSAStepper);
  document.getElementById("dsaStepSlider")?.addEventListener("input", (e) => { currentTraceStep = parseInt(e.target.value) || 0; updateDSAStepUI(); });

  // AI Submit
  document.getElementById("aiSendBtn")?.addEventListener("click", async () => {
    const inp = document.getElementById("aiChatInput");
    const container = document.getElementById("aiChatMessagesContainer");
    if (!inp.value.trim()) return;

    container.innerHTML += `<div class="flex justify-end mb-2"><div class="bg-blue-600 text-white rounded-2xl rounded-tr-none px-3.5 py-2.5 max-w-[85%] text-xs shadow-sm">${inp.value}</div></div>`;
    const msg = inp.value; inp.value = "";

    const res = await aiCopilot.processUserQuery(msg);
    container.innerHTML += `<div class="flex justify-start mb-2"><div class="bg-white text-slate-800 rounded-2xl rounded-tl-none px-3.5 py-2.5 max-w-[90%] text-xs border shadow-sm">${res}</div></div>`;
    container.scrollTop = container.scrollHeight;
  });

  setTimeout(() => runRouteOptimization(), 400);
});

window.setMapEndpoint = function (type, city) {
  if (type === 'source') document.getElementById("sourceCitySelect").value = city;
  if (type === 'dest') document.getElementById("destCitySelect").value = city;
  mapController.map.closePopup();
  runRouteOptimization();
};

window.dispatchAutonomousRoute = function (data) {
  if (data.source) document.getElementById("sourceCitySelect").value = data.source;
  if (data.destination) document.getElementById("destCitySelect").value = data.destination;
  if (data.vehicle) document.getElementById("vehicleSelect").value = data.vehicle;
  runRouteOptimization();
};

function runRouteOptimization() {
  const src = document.getElementById("sourceCitySelect").value;
  const dest = document.getElementById("destCitySelect").value;
  if (src === dest) { alert("Source and destination must be different."); return; }

  const mileage = parseFloat(document.getElementById("mileageInput").value);
  const curFuel = parseFloat(document.getElementById("fuelInput").value);

  const res = dijkstraEngine.findOptimalRoute(src, dest, document.getElementById("vehicleSelect").value, curFuel, mileage);
  if (!res.success) return;

  currentDijkstraResult = res;
  mapController.displayRoute(res);

  // --- DYNAMICALLY SUM REST MINUTES FROM SCHEDULE BREAKS ---
  let totalRestMins = res.itinerary?.totalRestMins || res.itinerary?.totalRestTime || 0;

  if (!totalRestMins && res.itinerary && Array.isArray(res.itinerary.schedule)) {
    res.itinerary.schedule.forEach(s => {
      if (s.durationMins) totalRestMins += parseInt(s.durationMins, 10);
      else if (s.duration) totalRestMins += parseInt(s.duration, 10);
      else if (s.restMins) totalRestMins += parseInt(s.restMins, 10);
      else if (s.type === "TEA_BREAK") totalRestMins += 20;
      else if (s.type === "MEAL_REST" || s.type === "REST" || s.type === "FATIGUE_REST") totalRestMins += 45;
    });
  }

  const totalTripMins = res.rawDrivingTimeMins + totalRestMins;

  // Update KPI Cards
  document.getElementById("sumTotalDistance").textContent = `${res.totalDistance} km`;
  document.getElementById("sumDriveTime").textContent = `${Math.floor(res.rawDrivingTimeMins / 60)}h ${res.rawDrivingTimeMins % 60}m`;
  document.getElementById("sumRestTime").textContent = `${totalRestMins} ${t('unit_mins')}`;
  document.getElementById("sumTotalDuration").textContent = `${Math.floor(totalTripMins / 60)}h ${totalTripMins % 60}m`;
  document.getElementById("sumRefuelStops").textContent = res.itinerary.totalRefuels;

  const totalFuelUsed = (res.totalDistance / mileage).toFixed(1);
  document.getElementById("sumFuelRequired").textContent = `${totalFuelUsed} L`;

  renderItinerary(res);
  renderAnalyticsChart(res);
  setupDSAStepper(res.executionTrace);
  updateWarningBanner(res);

  document.getElementById("aiSafetyBriefingContainer").innerHTML = aiCopilot.generateRouteBriefing(res);
  document.getElementById("pdfRouteTitle").textContent = `${getCityName(src)} ➔ ${getCityName(dest)} (${getVehicleName(res.vehicle.id)})`;
}

function renderItinerary(res) {
  const c = document.getElementById("itineraryTimelineList");
  let runningDist = 0;

  c.innerHTML = res.itinerary.schedule.map(s => {
    let icon = s.type === "START" ? "🟢" : s.type === "DESTINATION" ? "🏁" : s.type === "TEA_BREAK" ? "☕" : s.type === "MEAL_REST" ? "🏨" : s.type === "REFUEL" ? "⛽" : "🚗";

    // 1. Extract step distance safely from property or text details (e.g. "56 km")
    let stepDist = 0;
    if (typeof s.distance === "number" && !isNaN(s.distance) && s.distance > 0) {
      stepDist = s.distance;
    } else if (s.details) {
      const match = s.details.match(/(\d+(\.\d+)?)\s*km/i);
      if (match) stepDist = parseFloat(match[1]);
    }

    // 2. Accumulate distance for travelled legs
    runningDist += stepDist;

    // 3. Determine cumulative distance to display
    let displayCumulative = runningDist;
    if (typeof s.cumulativeDistance === "number" && s.cumulativeDistance > runningDist) {
      displayCumulative = s.cumulativeDistance;
    }

    let distanceBadge = stepDist > 0 ? `<span class="text-[11px] text-slate-900 font-bold font-mono bg-white px-2.5 py-1 rounded inline-block border border-slate-300 shadow-sm">📏 ${t('lbl_distance')}: ${stepDist} ${t('unit_km')}</span>` : '';
    let speedBadge = s.speedLimit ? `<span class="text-[11px] text-slate-900 font-bold font-mono bg-white px-2.5 py-1 rounded inline-block border border-slate-300 shadow-sm">🏎️ ${t('lbl_speed_limit')}: ${s.speedLimit} ${t('unit_kmh')}</span>` : '';
    let cumulativeBadge = `<span class="text-[11px] text-slate-900 font-bold font-mono bg-white px-2.5 py-1 rounded inline-block border border-slate-300 shadow-sm">📍 ${t('lbl_dist_so_far')}: ${displayCumulative} ${t('unit_km')}</span>`;

    return `<div class="pdf-timeline-item relative pl-8 pb-4 border-l-2 border-blue-500 ml-3">
      <div class="absolute -left-[17px] top-0.5 w-8 h-8 rounded-full bg-white shadow-md border-2 border-slate-400 flex items-center justify-center text-sm">${icon}</div>
      <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-300">
        <div class="font-bold text-sm text-slate-900 mb-1">${s.title}</div>
        <div class="text-xs font-semibold text-slate-800">${s.details}</div>
        <div class="flex flex-wrap gap-2 mt-2">
          <span class="text-[11px] text-slate-900 font-bold font-mono bg-white px-2.5 py-1 rounded inline-block border border-slate-300 shadow-sm">⛽ ${t('tank_label')}: ${s.remainingFuel} L</span>
          ${distanceBadge}
          ${speedBadge}
          ${cumulativeBadge}
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderAnalyticsChart(res) {
  const canvas = document.getElementById("analyticsChartCanvas");
  if (!canvas) return;
  const labels = [], fuel = [], speed = [];

  res.itinerary.schedule.forEach(e => {
    let loc = e.city ? getCityName(e.city) : (e.title.split("➔")[1] ? e.title.split("➔")[1].trim() : "Stop");
    labels.push(loc);
    fuel.push(e.remainingFuel);
    speed.push(e.speedLimit || 60);
  });

  if (fuelChartInstance) fuelChartInstance.destroy();

  fuelChartInstance = new Chart(canvas.getContext("2d"), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: t('chart_fuel_level'), data: fuel, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, yAxisID: 'y', tension: 0.3, pointBackgroundColor: '#fff' },
        { label: t('chart_speed_limit'), data: speed, borderColor: '#10b981', borderDash: [5, 5], yAxisID: 'y1', pointRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
      scales: {
        y: { position: 'left', title: { display: true, text: t('chart_fuel_level'), font: { size: 10 } } },
        y1: { position: 'right', title: { display: true, text: t('chart_speed_limit'), font: { size: 10 } } }
      }
    }
  });
}

function updateWarningBanner(res) {
  const banner = document.getElementById("dynamicWarningBanner");
  const hasGhat = res.pathLegs.some(l => l.type === "hilly");
  const isHeavy = ["heavy_truck", "truck", "bus"].includes(res.vehicle.id);

  if (hasGhat && isHeavy) {
    banner.innerHTML = `⚠️ ${t('warning_ghat_heavy')} (${getVehicleName(res.vehicle.id)})`;
    banner.className = "bg-rose-600 text-white px-4 py-2.5 text-sm font-bold text-center block";
  }
  else if (hasGhat) {
    banner.innerHTML = `⚠️ ${t('warning_ghat')}`;
    banner.className = "bg-amber-500 text-white px-4 py-2.5 text-sm font-bold text-center block";
  }
  else {
    banner.className = "hidden";
  }
}

function downloadItineraryPDF() {
  const element = document.getElementById('pdfExportZone');
  const pdfHeader = document.getElementById('pdfHeader');

  // Activate High-Contrast Print Mode for clear text rendering
  pdfHeader.classList.remove('hidden');
  element.classList.add('pdf-print-mode');

  const opt = {
    margin: [10, 10, 10, 10],
    filename: 'Smart_Driver_Itinerary.pdf',
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: {
      scale: 3,              // Boosts DPI for razor-sharp text
      useCORS: true,
      scrollY: 0,
      backgroundColor: '#ffffff',
      logging: false
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    // Reset UI after export completes
    pdfHeader.classList.add('hidden');
    element.classList.remove('pdf-print-mode');
  });
}

// DSA Inspector Logic
function setupDSAStepper(trace) { traceSteps = trace || []; currentTraceStep = 0; updateDSAStepUI(); }
function stepDSA(d) { currentTraceStep = Math.max(0, Math.min(traceSteps.length - 1, currentTraceStep + d)); updateDSAStepUI(); }
function resetDSAStepper() { if (tracePlayInterval) clearInterval(tracePlayInterval); tracePlayInterval = null; currentTraceStep = 0; updateDSAStepUI(); document.getElementById("dsaPlayStep").textContent = "▶ Play Animation"; }
function toggleDSAPlay() {
  const btn = document.getElementById("dsaPlayStep");
  if (tracePlayInterval) { clearInterval(tracePlayInterval); tracePlayInterval = null; btn.textContent = "▶ Play Animation"; }
  else {
    btn.textContent = "⏸ Pause";
    tracePlayInterval = setInterval(() => {
      if (currentTraceStep < traceSteps.length - 1) { currentTraceStep++; updateDSAStepUI(); }
      else { clearInterval(tracePlayInterval); tracePlayInterval = null; btn.textContent = "▶ Play Animation"; }
    }, 500);
  }
}
function updateDSAStepUI() {
  if (!traceSteps.length) return;
  const curr = traceSteps[currentTraceStep];
  document.getElementById("dsaStepCounter").textContent = `Step ${curr.step} / ${traceSteps.length}`;

  let descHtml = curr.desc;
  if (curr.type === 'RELAX') descHtml = `<span class="text-blue-700">${curr.desc}</span>`;
  else if (curr.type === 'VISIT') descHtml = `<span class="text-emerald-700">${curr.desc}</span>`;
  document.getElementById("dsaStepDescription").innerHTML = descHtml;

  document.getElementById("dsaStepSlider").max = traceSteps.length - 1;
  document.getElementById("dsaStepSlider").value = currentTraceStep;

  document.getElementById("dsaPQTableBody").innerHTML = curr.pqSnapshot.length ? curr.pqSnapshot.slice(0, 5).map((i, idx) => `<tr><td class="px-3 py-1.5 border-b">${idx === 0 ? 'Min [0]' : `[${idx}]`}</td><td class="px-3 py-1.5 border-b font-bold">${i.item}</td><td class="px-3 py-1.5 border-b text-right text-blue-600">${i.priority} mins</td></tr>`).join('') : `<tr><td colspan="3" class="px-3 py-2 italic text-slate-400">Queue Empty</td></tr>`;

  document.getElementById("dsaSettledNodes").innerHTML = curr.visitedList.length ? curr.visitedList.map(n => `<span class="px-2 py-1 bg-emerald-100 text-emerald-800 rounded border border-emerald-200 text-[11px] font-bold shadow-sm">✓ ${n}</span>`).join('') : `<span class="text-xs text-slate-400 italic">No nodes settled yet</span>`;
}

// --- Network Connectivity Monitor ---
window.addEventListener('load', () => {
  const offlineBanner = document.getElementById('offlineBanner');

  function updateOnlineStatus() {
    if (!navigator.onLine) {
      if (offlineBanner) {
        offlineBanner.classList.remove('hidden');
        offlineBanner.textContent = CURRENT_LANG && typeof t === 'function' ?
          (CURRENT_LANG === 'ta' ? '⚠️ இணைய இணைப்பு இல்லை. நீங்கள் தற்போது ஆஃப்லைனில் உள்ளீர்கள்.' : '⚠️ No internet connection detected. You are currently offline.') :
          '⚠️ No internet connection detected. You are currently offline.';
      }
    } else {
      if (offlineBanner) {
        offlineBanner.classList.add('hidden');
      }
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Initial check on load
  updateOnlineStatus();
});
// --- MULTILINGUAL PER-FIELD VOICE CONTROL ENGINE ---
window.startFieldVoice = function (fieldId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
    return;
  }

  const recognition = new SpeechRecognition();

  // Map application's active language code to Web Speech API locale
  const speechLangMap = {
    en: 'en-IN',
    ta: 'ta-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    gu: 'gu-IN'
  };

  recognition.lang = speechLangMap[CURRENT_LANG] || 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  const targetElem = document.getElementById(fieldId);
  if (!targetElem) return;

  // Visual feedback on listening
  targetElem.classList.add("ring-2", "ring-blue-500", "bg-blue-50");

  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    targetElem.classList.remove("ring-2", "ring-blue-500", "bg-blue-50");

    if (fieldId === "sourceCitySelect" || fieldId === "destCitySelect") {
      matchAndSetCity(fieldId, transcript);
    } else if (fieldId === "vehicleSelect") {
      matchAndSetVehicle(fieldId, transcript);
    } else if (fieldId === "mileageInput" || fieldId === "fuelInput") {
      extractAndSetNumber(fieldId, transcript);
    }

    // Auto-calculate route after updating input
    if (typeof runRouteOptimization === 'function') {
      runRouteOptimization();
    }
  };

  recognition.onerror = () => {
    targetElem.classList.remove("ring-2", "ring-blue-500", "bg-blue-50");
  };

  recognition.onend = () => {
    targetElem.classList.remove("ring-2", "ring-blue-500", "bg-blue-50");
  };
};

// Helper: Match spoken city against localized names or English keys
function matchAndSetCity(fieldId, spokenText) {
  const select = document.getElementById(fieldId);
  if (!select || typeof TN_CITIES === 'undefined') return;

  let matchedKey = null;

  for (const key in TN_CITIES) {
    const engName = key.toLowerCase();
    const localizedName = (typeof getCityName === 'function' ? getCityName(key) : "").toLowerCase();

    if (spokenText.includes(engName) || (localizedName && spokenText.includes(localizedName))) {
      matchedKey = key;
      break;
    }
  }

  if (matchedKey) {
    select.value = matchedKey;
  }
}

// Helper: Match spoken vehicle category
function matchAndSetVehicle(fieldId, spokenText) {
  const select = document.getElementById(fieldId);
  if (!select || typeof VEHICLE_PROFILES === 'undefined') return;

  let matchedKey = null;

  for (const vKey in VEHICLE_PROFILES) {
    const engName = vKey.toLowerCase();
    const localizedName = (typeof getVehicleName === 'function' ? getVehicleName(vKey) : "").toLowerCase();

    if (spokenText.includes(engName) || (localizedName && spokenText.includes(localizedName))) {
      matchedKey = vKey;
      break;
    }
  }

  if (matchedKey) {
    select.value = matchedKey;
  }
}

// Helper: Extract numbers for Mileage / Fuel input fields
function extractAndSetNumber(fieldId, spokenText) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  // Extract digits (including decimals) from speech transcript
  const matches = spokenText.match(/(\d+(\.\d+)?)/);
  if (matches) {
    input.value = parseFloat(matches[1]);
  }
}