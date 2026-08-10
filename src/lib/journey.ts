import { getDestination, todayItinerary, type TimelineItem } from "@/lib/mock-data";

/**
 * طبقة الرحلة التفاعلية: تضيف الإحداثيات والمسافات والمدد فوق جدول اليوم الحالي
 * دون تغيير بيانات المشروع الأصلية (mock-data تبقى كما هي).
 */

export interface JourneyStop extends TimelineItem {
  order: number;
  destinationId: string;
  lat: number;
  lng: number;
  image: string;
  description: string;
  endTime: string;
  durationMin: number;
  distanceKm: number | null;
  travelMin: number | null;
  prayerNote: string;
}

interface StopMeta {
  destinationId: string;
  lat: number;
  lng: number;
  durationMin: number;
  description: string;
}

const stopMeta: Record<string, StopMeta> = {
  t1: {
    destinationId: "diriyah",
    lat: 24.7369,
    lng: 46.5751,
    durationMin: 60,
    description: "فطور نجدي في مقاهي البجيري المطلّة على الطريف.",
  },
  t2: {
    destinationId: "diriyah",
    lat: 24.7337,
    lng: 46.5757,
    durationMin: 120,
    description: "جولة في حي الطريف الطيني وعاصمة الدولة السعودية الأولى.",
  },
  t3: {
    destinationId: "diriyah",
    lat: 24.7402,
    lng: 46.5793,
    durationMin: 75,
    description: "غداء نجدي تقليدي قريب من البوابة الرئيسية.",
  },
  t4: {
    destinationId: "diriyah",
    lat: 24.6612,
    lng: 46.6089,
    durationMin: 90,
    description: "ممشى وادي حنيفة بين النخيل والمسطحات المائية.",
  },
  t5: {
    destinationId: "boulevard",
    lat: 24.7657,
    lng: 46.6337,
    durationMin: 150,
    description: "أمسية ترفيهية بين المطاعم والعروض الحية في بوليفارد سيتي.",
  },
  // بديل التكيّف الذكي
  museum: {
    destinationId: "museum",
    lat: 24.6474,
    lng: 46.7106,
    durationMin: 90,
    description: "نشاط داخلي مكيّف يعرض تاريخ الجزيرة العربية عبر ثماني قاعات.",
  },
};

const fallbackMeta: StopMeta = {
  destinationId: "diriyah",
  lat: 24.7136,
  lng: 46.6753,
  durationMin: 60,
  description: "محطة ضمن رحلتك اليوم.",
};

export function metaFor(id: string): StopMeta {
  return stopMeta[id] ?? fallbackMeta;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":");
  return Number(h ?? 0) * 60 + Number(m ?? 0);
}

function toClock(total: number) {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function buildJourney(items: TimelineItem[]): JourneyStop[] {
  return items.map((item, index) => {
    const meta = metaFor(item.id);
    const prev = index > 0 ? metaFor(items[index - 1]!.id) : null;
    const distanceKm = prev ? Math.round(haversineKm(prev, meta) * 10) / 10 : null;
    const travelMin = distanceKm === null ? null : Math.max(4, Math.round(distanceKm * 2.2));
    const destination = getDestination(meta.destinationId);
    return {
      ...item,
      order: index + 1,
      destinationId: meta.destinationId,
      lat: meta.lat,
      lng: meta.lng,
      image: destination?.image ?? "",
      description: meta.description,
      durationMin: meta.durationMin,
      endTime: toClock(toMinutes(item.time) + meta.durationMin),
      distanceKm,
      travelMin,
      prayerNote: "",
    };
  });
}

export const defaultJourneyItems = todayItinerary;

export interface PrayerTimings {
  Fajr?: string;
  Dhuhr?: string;
  Asr?: string;
  Maghrib?: string;
  Isha?: string;
}

const prayerLabels: Record<string, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

/** أقرب صلاة تقع داخل نافذة النشاط أو بعده بقليل. */
export function nearestPrayer(stopTime: string, endTime: string, timings?: PrayerTimings) {
  if (!timings) return "";
  const start = toMinutes(stopTime);
  const end = toMinutes(endTime) + 45;
  let best: { name: string; time: string; diff: number } | null = null;
  for (const [key, value] of Object.entries(timings)) {
    if (!value) continue;
    const t = toMinutes(String(value).slice(0, 5));
    if (t < start || t > end) continue;
    const diff = t - start;
    if (!best || diff < best.diff) best = { name: prayerLabels[key] ?? key, time: String(value).slice(0, 5), diff };
  }
  return best ? `${best.name} ${best.time}` : "";
}

export interface WeatherHour {
  hour: string;
  tempC: number;
  rainChance: number;
}

export function weatherForTime(time: string, hours?: WeatherHour[]) {
  if (!hours?.length) return "";
  const target = toMinutes(time);
  const closest = hours.reduce((best, h) =>
    Math.abs(toMinutes(h.hour) - target) < Math.abs(toMinutes(best.hour) - target) ? h : best,
  );
  const rain = closest.rainChance >= 50 ? " • احتمال مطر" : closest.rainChance >= 25 ? " • غيوم" : "";
  return `${closest.tempC}° ${rain ? rain.replace(" • ", "") : "صافٍ"}`;
}

/** بديل التكيّف الذكي (Mock) — نشاط داخلي بدل النشاط الخارجي المتأثر. */
export const adaptationPlan = {
  targetId: "t4",
  reason:
    "بسبب ارتفاع احتمال المطر ودرجة الحرارة في هذا الوقت، نقترح تأجيل النشاط الخارجي وزيارة مكان داخلي قريب الآن.",
  from: { title: "ممشى خارجي", place: "وادي حنيفة" },
  to: {
    id: "museum",
    title: "المتحف الوطني",
    place: "الرياض",
    note: "نشاط داخلي مكيّف • ١٠ دقائق بالسيارة",
  },
};
