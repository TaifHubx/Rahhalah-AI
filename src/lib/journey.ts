import { getDestination } from "@/lib/mock-data";
import { KNOWN_PLACE_IDS, KNOWN_PLACE_QUERIES } from "@/lib/known-places";

/**
 * طبقة الرحلة التفاعلية — تبني محطات حقيقية من خطة Gemini AI (انظر
 * src/lib/ai/features.server.ts:buildSmartItinerary) وتُثريها بإحداثيات حقيقية من
 * Google Places. لا توجد هنا أي خطة افتراضية ثابتة أو إحداثيات مخزّنة يدوياً —
 * كل رحلة تُبنى ديناميكياً من مخرجات الذكاء الاصطناعي فقط.
 */

export type StopStatus = "منجز" | "جارٍ" | "قادم";

export interface JourneyStop {
  id: string;
  order: number;
  time: string;
  endTime: string;
  title: string;
  place: string;
  destinationId: string;
  indoor: boolean;
  travel: string;
  /** ملاحظة الطقس السياقية من الذكاء الاصطناعي وقت التوليد — تُستبدَل بـ weatherForTime() إن توفرت بيانات طقس حيّة أحدث. */
  weather: string;
  status: StopStatus;
  /** إحداثيات حقيقية من Google Places — تبدأ عند FALLBACK_CENTER بانتظار geocoded=true. */
  lat: number;
  lng: number;
  /** معرّف مكان Google (Place ID) بعد جلبه من Places API — null إلى أن يُحسم الاستعلام. */
  placeId: string | null;
  /** true بعد استبدال إحداثيات lat/lng الافتراضية بنتيجة حقيقية من Google Places. */
  geocoded: boolean;
  image: string;
  description: string;
  durationMin: number;
  distanceKm: number | null;
  travelMin: number | null;
  prayerNote: string;
}

/** مركز الرياض — نقطة بداية محايدة مؤقتة إلى أن يُحسم موقع المحطة الحقيقي عبر Places API. */
export const FALLBACK_CENTER = { lat: 24.7136, lng: 46.6753 };

export interface GeocodeQuery {
  /**
   * مفتاح كاش/إبطال مركّب: معرّف المحطة + اسم المكان المحدَّد. يضمن إعادة الجلب فوراً
   * عند تغيّر اسم الوجهة/النشاط حتى لو بقي نفس stop.id (بخلاف الاعتماد على id وحده).
   */
  key: string;
  /** نص الاستعلام المُرسَل لـ Places API — الاسم الرسمي من KNOWN_PLACE_QUERIES إن توفر. */
  query: string;
  /** Place ID موثّق إن كان هذا المعلم مدرَجاً في KNOWN_PLACE_IDS — يتيح جلباً مباشراً دقيقاً ١٠٠٪. */
  placeId?: string;
}

/** يحدّد نص/مفتاح استعلام Places لمحطة، مفضِّلاً الاسم الرسمي المعروف عند توفره. */
export function resolveGeocodeQuery(
  item: Pick<JourneyStop, "id" | "place" | "title" | "destinationId">,
): GeocodeQuery {
  const city = getDestination(item.destinationId)?.city ?? "";
  const specific = item.place && item.place !== city ? item.place : item.title;
  const query = KNOWN_PLACE_QUERIES[specific] ?? [specific, city].filter(Boolean).join("، ");
  const key = `${item.id}-${specific}`;
  const knownPlaceId = KNOWN_PLACE_IDS[specific];
  return knownPlaceId ? { key, query, placeId: knownPlaceId } : { key, query };
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
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** حالة المحطة الحقيقية بمقارنة الوقت الحالي بنافذة الزمن المجدولة — لا قيمة ثابتة. */
function computeStatus(time: string, endTime: string): StopStatus {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(time);
  const end = toMinutes(endTime);
  if (nowMinutes >= end) return "منجز";
  if (nowMinutes >= start) return "جارٍ";
  return "قادم";
}

/** شكل محطة كما تُعيدها buildSmartItinerary/adaptItinerary (انظر src/lib/ai/features.server.ts). */
export interface AiItineraryStop {
  time: string;
  title: string;
  destinationId: string;
  place: string;
  indoor: boolean;
  weatherNote: string;
  travel: string;
  tip: string;
}

/**
 * يبني محطات يوم واحد من خطة الذكاء الاصطناعي — بلا أي إحداثيات حقيقية بعد (كل محطة
 * تبدأ عند FALLBACK_CENTER بانتظار جلبها من Google Places). استدعِ withGeocodedCoords()
 * ثم withComputedDistances() فوق الناتج لإكمال الموقع والمسافات الفعلية.
 */
export function buildJourneyFromItinerary(dayStops: AiItineraryStop[]): JourneyStop[] {
  return dayStops.map((stop, index) => {
    const next = dayStops[index + 1];
    // نُقدّر مدة المحطة من الفجوة الزمنية حتى المحطة التالية في نفس جدول الذكاء الاصطناعي
    // (لا مدة ثابتة مفترَضة)، مع حد أدنى معقول وقيمة افتراضية لآخر محطة في اليوم.
    const durationMin = next ? Math.max(30, toMinutes(next.time) - toMinutes(stop.time)) : 90;
    const endTime = toClock(toMinutes(stop.time) + durationMin);
    const destination = getDestination(stop.destinationId);
    return {
      id: `${stop.destinationId}-${index}-${stop.time.replace(":", "")}`,
      order: index + 1,
      time: stop.time,
      endTime,
      title: stop.title,
      place: stop.place,
      destinationId: stop.destinationId,
      indoor: stop.indoor,
      travel: stop.travel,
      weather: stop.weatherNote,
      status: computeStatus(stop.time, endTime),
      lat: FALLBACK_CENTER.lat,
      lng: FALLBACK_CENTER.lng,
      placeId: null,
      geocoded: false,
      image: destination?.image ?? "",
      description: stop.tip || destination?.description || "",
      durationMin,
      distanceKm: null,
      travelMin: null,
      prayerNote: "",
    };
  });
}

export interface GeocodedCoords {
  lat: number;
  lng: number;
  placeId: string;
}

/**
 * يستبدل إحداثيات المحطات الافتراضية بنتائج Google Places الحقيقية المتوفرة حتى الآن.
 * overrides مفتاحها GeocodeQuery.key (id + اسم المكان) وليس id وحده — انظر resolveGeocodeQuery.
 */
export function withGeocodedCoords(
  stops: JourneyStop[],
  overrides: Record<string, GeocodedCoords>,
): JourneyStop[] {
  return stops.map((stop) => {
    const override = overrides[resolveGeocodeQuery(stop).key];
    if (!override) return stop;
    return {
      ...stop,
      lat: override.lat,
      lng: override.lng,
      placeId: override.placeId,
      geocoded: true,
    };
  });
}

/** يحسب المسافة/مدة التنقل بين كل محطة والتي تسبقها استناداً إلى الإحداثيات الحالية. */
export function withComputedDistances(stops: JourneyStop[]): JourneyStop[] {
  return stops.map((stop, index) => {
    const prev = index > 0 ? stops[index - 1]! : null;
    const distanceKm = prev ? Math.round(haversineKm(prev, stop) * 10) / 10 : null;
    const travelMin = distanceKm === null ? null : Math.max(4, Math.round(distanceKm * 2.2));
    return { ...stop, distanceKm, travelMin };
  });
}

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
    if (!best || diff < best.diff)
      best = { name: prayerLabels[key] ?? key, time: String(value).slice(0, 5), diff };
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
  const rain =
    closest.rainChance >= 50 ? " • احتمال مطر" : closest.rainChance >= 25 ? " • غيوم" : "";
  return `${closest.tempC}° ${rain ? rain.replace(" • ", "") : "صافٍ"}`;
}
