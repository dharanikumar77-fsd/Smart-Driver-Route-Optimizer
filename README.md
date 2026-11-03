# 🧭 Smart Driver Route and Rest Optimizer

A feature-complete, responsive web application designed for interactive pathfinding, fatigue management, and telemetry analytics across Tamil Nadu's road network. Powered by **Dijkstra’s Algorithm** with custom Min-Heap execution visualizers, full **9-language regional UI localization**, hands-free **multilingual voice input**, and **Firebase authentication**.

---

## 🌟 Key Features

### ⚡ Smart Dijkstra Pathfinding & Rest Optimization
* **Custom Routing Engine:** Calculates optimal paths using an adjacency-list network model of Tamil Nadu cities and highways.
* **Vehicle-Aware Speed & Safety Controls:** Dynamic adjustments for Passenger Cars, Buses, Commercial Trucks, Heavy Cargo, and Two-Wheelers with critical speed warnings for Ghat/mountain roads.
* **Automated Rest Scheduling:** Dynamically calculates mandatory 45-minute fatigue recovery stops and 20-minute tea breaks based on driving duration and continuous transit distance.
* **Fuel & Refuel Telemetry:** Calculates total fuel required, remaining fuel levels per leg, and pinpoints mandatory refuel stops.

### 🌐 9-Language Regional UI Localization
* Supports seamless switching between 9 languages:
  * 🇬🇧 **English**
  * 🇮🇳 **தமிழ் (Tamil)**
  * 🇮🇳 **हिन्दी (Hindi)**
  * 🇮🇳 **తెలుగు (Telugu)**
  * 🇮🇳 **ಕನ್ನಡ (Kannada)**
  * 🇮🇳 **മലയാളം (Malayalam)**
  * 🇮🇳 **বাংলা (Bengali)**
  * 🇮🇳 **मराठी (Marathi)**
  * 🇮🇳 **ગુજરાતી (Gujarati)**
* **Dynamic UI Binding:** Live translations for header controls, KPI cards, form parameters, speed limit safety protocols, map markers, tooltips, popups, timeline badges, and PDF exports.

### 🎤 Per-Field Multilingual Voice Control
* **Hands-Free Speech Input:** Dedicated microphone buttons for Origin, Destination, Vehicle Category, Mileage, and Fuel inputs.
* **Native Dialect Recognition:** Web Speech API integration mapped to speech locales matching the active language setting (e.g., `ta-IN`, `hi-IN`).

### 🔬 Interactive DSA Engine Inspector
* Step-by-step visual inspection of Dijkstra’s Algorithm execution.
* Live tracking of the **Min-Heap Priority Queue (Frontier)** state, time complexity $O((V + E) \log V)$, space complexity $O(V + E)$, and **Settled Node Sets ($S$)**.

### 📊 Telemetry & Fuel Analytics
* Real-time interactive telemetry charts built with Chart.js.
* Visualizes route speed profiles against real-time fuel depletion curves.

### 📥 High-Resolution PDF Itinerary Export
* Generates high-contrast A4 print documents using `html2pdf.js` with 3x DPI scaling.
* Displays step-by-step instructions, leg distances, speed limits, remaining fuel, and running cumulative travel distance.

### 📶 Offline Detection & Firebase Security
* **Network Connectivity Monitor:** Instant status listener displaying a top warning banner when disconnected.
* **Firebase Auth:** User registration and sign-in with password visibility toggles.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Tailwind CSS (via CDN), ES6 Vanilla JavaScript
* **Mapping Engine:** Leaflet.js with Esri Light Gray Canvas tiles & GeoJSON boundary rendering
* **Data Visualization:** Chart.js
* **Export Engine:** `html2pdf.js` & `html2canvas`
* **Authentication:** Firebase v10 Web SDK (Modular Auth)
* **Speech Processing:** Web Speech API (`webkitSpeechRecognition`)

---

## 📁 Repository Structure

```text
├── index.html                  # Main application structure & settings modal
├── css/
│   └── styles.css              # Custom styling & high-contrast PDF print overrides
└── js/
    ├── app.js                  # Main UI controller & voice recognition engine
    ├── auth.js                 # Firebase authentication & password toggle logic
    ├── dijkstra.js             # Core Dijkstra routing algorithm & Min-Heap PQ
    ├── i18n.js                 # 9-language translation dictionary & DOM binder
    ├── map.js                  # Leaflet map controller & dynamic marker renderer
    ├── ai_assistant.js         # AI Safety Copilot briefing engine
    ├── tamilnadu_data.js       # City node network & road distance matrix
    └── tamilnadu_boundary.js   # GeoJSON border boundaries for Tamil Nadu