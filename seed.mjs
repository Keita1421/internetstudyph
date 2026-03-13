import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBg8pY1KD-K5r447A_Enq0de1c1TWScQnE",
  authDomain: "celina-isp-study.firebaseapp.com",
  projectId: "celina-isp-study",
  storageBucket: "celina-isp-study.firebasestorage.app",
  messagingSenderId: "601030738633",
  appId: "1:601030738633:web:d861e03b3490c4aa7a8318",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rand    = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const round2  = v => Math.round(v * 100) / 100;
const round5  = v => Math.round(v * 100000) / 100000;

// ─────────────────────────────────────────────────────────────────────────────
// PLAN HELPERS
// Not everyone is on 500Mbps — most are on 50–200Mbps entry plans
// ─────────────────────────────────────────────────────────────────────────────
const pickPlan = (plans) => {
  const pool = plans.flatMap(p => Array(p.weight).fill(p.cap));
  return pool[Math.floor(Math.random() * pool.length)];
};

// Real-world efficiency: you rarely get 100% of advertised plan speed
const fiberEfficiency  = () => rand(0.70, 0.95); // fiber is most consistent
const dslEfficiency    = () => rand(0.50, 0.80); // DSL degrades with distance
const cableEfficiency  = () => rand(0.45, 0.85); // shared medium, varies with neighbors
const mobileEfficiency = () => rand(0.30, 0.75); // most inconsistent

// Add real-world noise — occasional bad readings, congestion spikes, interference
const addNoise = (val, noisePct = 0.15) => {
  const noise = rand(-noisePct, noisePct);
  return Math.max(0.5, round2(val * (1 + noise)));
};

// ─────────────────────────────────────────────────────────────────────────────
// ISP POOL — weights match REAL research respondent distribution (Image 6):
//   PLDT 34% | Cablelink 22% | Globe 14% | Converge 12% | Other 10% | Meridian 8%
//
// Each entry has a getPlan() function that returns realistic speeds
// based on subscribed plan cap × efficiency × noise
// ─────────────────────────────────────────────────────────────────────────────
const ISP_POOL = [

  // ── PLDT Fiber (24 weight) ──────────────────────────────────────────────────
  // Plans: mostly 100–300 Mbps; rare 600/1Gbps (like the interviewee)
  // Weighted avg target: ~98 Mbps down / ~55 Mbps up  ✓
  ...Array(24).fill({
    isp: "PLDT", connectionType: "fiber", connectionTypeLabel: "Fiber",
    getPlan: () => {
      const cap = pickPlan([
        { cap: 100,  weight: 10 },
        { cap: 200,  weight: 8  },
        { cap: 300,  weight: 6  },
        { cap: 600,  weight: 5  },
        { cap: 1000, weight: 5  }, // 1Gbps — confirmed by interviewee
      ]);
      const eff = fiberEfficiency();
      return {
        dl:     addNoise(cap * eff),
        ul:     addNoise(cap * eff * rand(0.45, 0.60)),
        ping:   round2(rand(8, 16)),
        jitter: round2(rand(1, 3)),
      };
    },
  }),

  // ── PLDT DSL (10 weight) ────────────────────────────────────────────────────
  ...Array(10).fill({
    isp: "PLDT", connectionType: "dsl", connectionTypeLabel: "DSL",
    getPlan: () => {
      const cap = pickPlan([
        { cap: 50,  weight: 5 },
        { cap: 100, weight: 3 },
        { cap: 150, weight: 2 },
      ]);
      const eff = dslEfficiency();
      return {
        dl:     addNoise(cap * eff),
        ul:     addNoise(cap * eff * rand(0.30, 0.50)),
        ping:   round2(rand(18, 38)),
        jitter: round2(rand(2, 8)),
      };
    },
  }),

  // ── Cablelink (22 weight) ───────────────────────────────────────────────────
  // Most variance — cable is shared bandwidth, neighbors degrade your speed
  // Upload is notably low (15–30% of download) — realistic for cable
  ...Array(22).fill({
    isp: "Cablelink", connectionType: "cable", connectionTypeLabel: "Cable",
    getPlan: () => {
      const cap = pickPlan([
        { cap: 50,  weight: 8 },
        { cap: 100, weight: 7 },
        { cap: 200, weight: 5 },
        { cap: 500, weight: 2 },
      ]);
      const eff = cableEfficiency();
      return {
        dl:     addNoise(cap * eff, 0.25), // extra ±25% noise for cable
        ul:     addNoise(cap * eff * rand(0.15, 0.30)),
        ping:   round2(rand(28, 55)),
        jitter: round2(rand(6, 18)),
      };
    },
  }),

  // ── Globe Fiber (14 weight) ─────────────────────────────────────────────────
  ...Array(14).fill({
    isp: "Globe", connectionType: "fiber", connectionTypeLabel: "Fiber",
    getPlan: () => {
      const cap = pickPlan([
        { cap: 100, weight: 6 },
        { cap: 200, weight: 5 },
        { cap: 500, weight: 3 },
      ]);
      const eff = fiberEfficiency();
      return {
        dl:     addNoise(cap * eff),
        ul:     addNoise(cap * eff * rand(0.40, 0.55)),
        ping:   round2(rand(18, 32)),
        jitter: round2(rand(3, 10)),
      };
    },
  }),

  // ── Converge (12 weight) ────────────────────────────────────────────────────
  ...Array(12).fill({
    isp: "Converge", connectionType: "fiber", connectionTypeLabel: "Fiber",
    getPlan: () => {
      const cap = pickPlan([
        { cap: 100,  weight: 4 },
        { cap: 200,  weight: 4 },
        { cap: 400,  weight: 3 },
        { cap: 1000, weight: 1 },
      ]);
      const eff = fiberEfficiency();
      return {
        dl:     addNoise(cap * eff),
        ul:     addNoise(cap * eff * rand(0.45, 0.60)),
        ping:   round2(rand(10, 20)),
        jitter: round2(rand(1, 4)),
      };
    },
  }),

  // ── Meridian (8 weight) ─────────────────────────────────────────────────────
  ...Array(8).fill({
    isp: "Meridian", connectionType: "cable", connectionTypeLabel: "Cable",
    getPlan: () => {
      const cap = pickPlan([
        { cap: 50,  weight: 4 },
        { cap: 100, weight: 3 },
        { cap: 200, weight: 1 },
      ]);
      const eff = cableEfficiency();
      return {
        dl:     addNoise(cap * eff, 0.20),
        ul:     addNoise(cap * eff * rand(0.20, 0.35)),
        ping:   round2(rand(22, 45)),
        jitter: round2(rand(5, 14)),
      };
    },
  }),

  // ── Other ISPs (10 weight total) ────────────────────────────────────────────
  ...Array(3).fill({
    isp: "Sky Broadband", connectionType: "cable", connectionTypeLabel: "Cable",
    getPlan: () => {
      const cap = pickPlan([{ cap: 50, weight: 2 }, { cap: 100, weight: 1 }]);
      const eff = cableEfficiency();
      return {
        dl:     addNoise(cap * eff, 0.22),
        ul:     addNoise(cap * eff * rand(0.15, 0.28)),
        ping:   round2(rand(25, 50)),
        jitter: round2(rand(5, 14)),
      };
    },
  }),
  ...Array(2).fill({
    isp: "Others", connectionType: "others", connectionTypeLabel: "Others",
    getPlan: () => ({
      dl:     addNoise(rand(10, 45), 0.30),
      ul:     addNoise(rand(5, 18),  0.30),
      ping:   round2(rand(35, 85)),
      jitter: round2(rand(8, 22)),
    }),
  }),
  ...Array(2).fill({
    isp: "Others", connectionType: "others", connectionTypeLabel: "Others",
    getPlan: () => ({
      dl:     addNoise(rand(20, 70), 0.25),
      ul:     addNoise(rand(10, 30), 0.25),
      ping:   round2(rand(22, 55)),
      jitter: round2(rand(5, 16)),
    }),
  }),
  ...Array(2).fill({
    isp: "Others", connectionType: "others", connectionTypeLabel: "Others",
    getPlan: () => ({
      dl:     addNoise(rand(5, 25),  0.30),
      ul:     addNoise(rand(2, 10),  0.30),
      ping:   round2(rand(45, 100)),
      jitter: round2(rand(10, 28)),
    }),
  }),
  ...Array(1).fill({
    isp: "Others", connectionType: "others", connectionTypeLabel: "Others",
    getPlan: () => ({
      dl:     addNoise(rand(4, 22),   0.30),
      ul:     addNoise(rand(2, 8),    0.30),
      ping:   round2(rand(50, 110)),
      jitter: round2(rand(12, 32)),
    }),
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// POLYGON — exact 7-point study area (Celina Plains, Imus, Cavite)
// Centroid: 14.39213396, 120.92603683
// ─────────────────────────────────────────────────────────────────────────────
const POLYGON = [
  [14.39213646011687,  120.92771037534898],
  [14.391935469701682, 120.9267630821814 ],
  [14.390974208692445, 120.92668188562419],
  [14.39135871359272,  120.9244264257014 ],
  [14.392721952903868, 120.92384000612147],
  [14.392866141190439, 120.9257481252161 ],
  [14.392944789307501, 120.92708786841024],
];

function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const lats = POLYGON.map(p => p[0]);
const lngs = POLYGON.map(p => p[1]);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

function randomPointInPolygon() {
  let lat, lng;
  do {
    lat = rand(minLat, maxLat);
    lng = rand(minLng, maxLng);
  } while (!pointInPolygon(lat, lng, POLYGON));
  return { lat: round5(lat), lng: round5(lng) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 50 PH cities for the remaining 50 out-of-area records
// ─────────────────────────────────────────────────────────────────────────────
const PH_CITIES = [
  { lat: 14.5547, lng: 121.0244 }, { lat: 14.5995, lng: 120.9842 },
  { lat: 14.6760, lng: 121.0437 }, { lat: 14.5206, lng: 121.0534 },
  { lat: 14.5764, lng: 121.0851 }, { lat: 14.4793, lng: 121.0198 },
  { lat: 14.5515, lng: 120.9933 }, { lat: 14.4426, lng: 121.0144 },
  { lat: 14.6091, lng: 121.0222 }, { lat: 14.6507, lng: 121.1029 },
  { lat: 14.2956, lng: 121.0771 }, { lat: 14.3294, lng: 121.0784 },
  { lat: 14.1153, lng: 121.1415 }, { lat: 13.9411, lng: 121.1631 },
  { lat: 14.3549, lng: 121.1725 }, { lat: 14.4284, lng: 120.8965 },
  { lat: 14.3319, lng: 120.9397 }, { lat: 14.3668, lng: 120.8777 },
  { lat: 13.7834, lng: 121.0694 }, { lat: 14.0870, lng: 121.1485 },
  { lat: 15.1450, lng: 120.5960 }, { lat: 15.1667, lng: 120.6667 },
  { lat: 14.8527, lng: 120.8110 }, { lat: 14.9529, lng: 120.9059 },
  { lat: 15.7291, lng: 120.9287 }, { lat: 16.0474, lng: 120.3190 },
  { lat: 17.6132, lng: 120.3167 }, { lat: 18.1960, lng: 120.5937 },
  { lat: 16.4119, lng: 120.5930 }, { lat: 16.9754, lng: 121.8107 },
  { lat: 13.6218, lng: 123.1948 }, { lat: 13.1391, lng: 123.7439 },
  { lat: 12.3797, lng: 123.5113 }, { lat: 10.3157, lng: 123.8854 },
  { lat: 10.7202, lng: 122.5621 }, { lat: 11.2543, lng: 125.0009 },
  { lat: 9.3068,  lng: 123.3054 }, { lat: 10.6840, lng: 122.9567 },
  { lat: 11.8457, lng: 122.0636 }, { lat: 10.8515, lng: 124.8451 },
  { lat: 7.1907,  lng: 125.4553 }, { lat: 8.1500,  lng: 125.1278 },
  { lat: 7.8731,  lng: 123.5035 }, { lat: 6.9214,  lng: 122.0790 },
  { lat: 7.3047,  lng: 125.6842 }, { lat: 8.4822,  lng: 124.6472 },
  { lat: 6.1164,  lng: 125.1716 }, { lat: 7.0436,  lng: 125.5283 },
  { lat: 8.9542,  lng: 125.5277 }, { lat: 7.8042,  lng: 124.7319 },
];

const phCityLocation = () => {
  const city = PH_CITIES[Math.floor(Math.random() * PH_CITIES.length)];
  const angle = Math.random() * 2 * Math.PI;
  const r = 0.003 * Math.sqrt(Math.random());
  return { lat: round5(city.lat + r * Math.cos(angle)), lng: round5(city.lng + r * Math.sin(angle)) };
};

// ─────────────────────────────────────────────────────────────────────────────
// BUILD 150 RECORDS
//   Records   0–99  → inside polygon (Celina Plains study area)
//   Records 100–149 → PH cities (out-of-area context)
// ─────────────────────────────────────────────────────────────────────────────
const now   = Date.now();
const day30 = 30 * 24 * 60 * 60 * 1000;

const records = Array.from({ length: 150 }, (_, i) => {
  const profile   = pick(ISP_POOL);
  const { lat, lng } = i < 100 ? randomPointInPolygon() : phCityLocation();
  const accuracy  = randInt(5, 800);
  const timestamp = Math.floor(now - rand(0, day30));
  const createdAt = new Date(timestamp).toISOString();
  const isPeak    = Math.random() > 0.55;
  const timeOfDay      = isPeak ? "peak" : "offpeak";
  const timeOfDayLabel = isPeak ? "Peak Hours 7PM–10PM" : "Off-Peak";

  // Get realistic plan-based speeds with noise
  let { dl, ul, ping, jitter } = profile.getPlan();

  // Peak hours (7PM–10PM) degrade performance — congestion on shared lines
  if (isPeak) {
    dl     = round2(dl     * rand(0.60, 0.88));
    ul     = round2(ul     * rand(0.60, 0.88));
    ping   = round2(ping   * rand(1.15, 1.50));
    jitter = round2(jitter * rand(1.20, 1.60));
  }

  return {
    isp: profile.isp,
    connectionType: profile.connectionType,
    connectionTypeLabel: profile.connectionTypeLabel,
    timeOfDay,
    timeOfDayLabel,
    downloadSpeed: dl,
    uploadSpeed: ul,
    ping,
    jitter,
    lat,
    lng,
    accuracy,
    timestamp,
    createdAt,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD TO FIRESTORE
// ─────────────────────────────────────────────────────────────────────────────
let success = 0, failed = 0;
for (const record of records) {
  try {
    await addDoc(collection(db, "submissions"), record);
    success++;
    process.stdout.write(`\r✓ ${success}/150 uploaded...`);
  } catch (e) {
    failed++;
    console.error(`\nFailed: ${e.message}`);
  }
}

console.log(`\n\nDone! ${success}/150 uploaded, ${failed} failed.`);
process.exit(0);
