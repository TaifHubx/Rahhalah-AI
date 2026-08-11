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
  /**
   * سياق مكان دقيق وقابل للتحديد الجغرافي (Place Context) من الذكاء الاصطناعي — اسم
   * المعلم/الحي الكامل بدل اسم مدينة عام، يُستخدم كنص استعلام أساسي لـ Google Places
   * (انظر resolveGeocodeQuery) لتغذية الخريطة التفاعلية بإحداثيات دقيقة.
   */
  placeQuery: string;
  /** الحي/المنطقة داخل المدينة من الذكاء الاصطناعي (مثال: "حطين") — يُدمج مع placeQuery للاستعلام. */
  locationContext: string;
  /** ترتيب المحطة كما رآه الموديل — إعلامي فقط؛ order أعلاه (فهرس المصفوفة) هو المعتمد للعرض والمسار. */
  sequenceOrder: number;
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

/**
 * يحدّد نص/مفتاح استعلام Places لمحطة، بالأولوية التالية:
 * ١) اسم رسمي معروف موثّق يدوياً (KNOWN_PLACE_QUERIES) لمعالم واجهنا فيها غموضاً سابقاً.
 * ٢) placeQuery القادم من الذكاء الاصطناعي مباشرة — سياق مكان دقيق مصمَّم خصيصاً لهذا الغرض.
 * ٣) heuristic احتياطي (place/title + المدينة) لو غاب placeQuery لأي سبب (توافق قديم).
 */
export function resolveGeocodeQuery(
  item: Pick<
    JourneyStop,
    "id" | "place" | "title" | "destinationId" | "placeQuery" | "locationContext"
  >,
): GeocodeQuery {
  const city = getDestination(item.destinationId)?.city ?? "";
  const specific = item.place && item.place !== city ? item.place : item.title;
  // ندمج placeQuery (اسم المعلم الكامل) مع locationContext (الحي) إن كان الأخير مضافاً فعلاً
  // معلومة جديدة (وليس مكرَّراً داخل placeQuery نفسه) — سياق مكان أقوى للبحث الجغرافي.
  const aiQuery = item.placeQuery?.trim();
  const context = item.locationContext?.trim();
  const richAiQuery =
    aiQuery && context && !aiQuery.includes(context) ? `${aiQuery}، ${context}` : aiQuery;
  const query =
    KNOWN_PLACE_QUERIES[specific] ?? (richAiQuery || [specific, city].filter(Boolean).join("، "));
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
  /** سياق مكان دقيق لجلب إحداثيات الخريطة — انظر توثيق JourneyStop.placeQuery أعلاه. */
  placeQuery: string;
  /** انظر توثيق JourneyStop.locationContext أعلاه. */
  locationContext: string;
  /** انظر توثيق JourneyStop.sequenceOrder أعلاه. */
  sequenceOrder: number;
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
export function buildJourneyFromItinerary(
  dayStops: AiItineraryStop[],
  lang: "ar" | "en" = "ar",
): JourneyStop[] {
  return dayStops.map((stop, index) => {
    const next = dayStops[index + 1];
    // نُقدّر مدة المحطة من الفجوة الزمنية حتى المحطة التالية في نفس جدول الذكاء الاصطناعي
    // (لا مدة ثابتة مفترَضة)، مع حد أدنى معقول وقيمة افتراضية لآخر محطة في اليوم.
    const durationMin = next ? Math.max(30, toMinutes(next.time) - toMinutes(stop.time)) : 90;
    const endTime = toClock(toMinutes(stop.time) + durationMin);
    const destination = getDestination(stop.destinationId);
    // stop.tip يأتي من الذكاء الاصطناعي مباشرة بلغة الواجهة الحالية أصلاً؛ هذا فقط احتياط
    // نادر لو أغفله الموديل — يستخدم وصف الكتالوج الثابت بنفس لغة الواجهة.
    const fallbackDescription =
      lang === "en" ? destination?.descriptionEn : destination?.description;
    return {
      id: `${stop.destinationId}-${index}-${stop.time.replace(":", "")}`,
      order: index + 1,
      time: stop.time,
      endTime,
      title: stop.title,
      place: stop.place,
      placeQuery: stop.placeQuery || stop.place || stop.title,
      locationContext: stop.locationContext || "",
      // order (فهرس المصفوفة) هو المعتمد فعلياً لضمان تسلسل مسار ثابت دون ثغرات/تكرار حتى
      // لو أخطأ الموديل برقم sequenceOrder؛ نحتفظ بقيمته كإعلام فقط.
      sequenceOrder: stop.sequenceOrder || index + 1,
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
      description: stop.tip || fallbackDescription || "",
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

const prayerLabels: Record<"ar" | "en", Record<string, string>> = {
  ar: { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" },
  en: { Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" },
};

/** أقرب صلاة تقع داخل نافذة النشاط أو بعده بقليل. */
export function nearestPrayer(
  stopTime: string,
  endTime: string,
  timings?: PrayerTimings,
  lang: "ar" | "en" = "ar",
) {
  if (!timings) return "";
  const start = toMinutes(stopTime);
  const end = toMinutes(endTime) + 45;
  const labels = prayerLabels[lang];
  let best: { name: string; time: string; diff: number } | null = null;
  for (const [key, value] of Object.entries(timings)) {
    if (!value) continue;
    const t = toMinutes(String(value).slice(0, 5));
    if (t < start || t > end) continue;
    const diff = t - start;
    if (!best || diff < best.diff)
      best = { name: labels[key] ?? key, time: String(value).slice(0, 5), diff };
  }
  return best ? `${best.name} ${best.time}` : "";
}

export interface WeatherHour {
  hour: string;
  tempC: number;
  rainChance: number;
}

const WEATHER_LABEL: Record<"ar" | "en", { clear: string; rain: string; clouds: string }> = {
  ar: { clear: "صافٍ", rain: "احتمال مطر", clouds: "غيوم" },
  en: { clear: "Clear", rain: "Rain likely", clouds: "Cloudy" },
};

export function weatherForTime(time: string, hours?: WeatherHour[], lang: "ar" | "en" = "ar") {
  if (!hours?.length) return "";
  const target = toMinutes(time);
  const closest = hours.reduce((best, h) =>
    Math.abs(toMinutes(h.hour) - target) < Math.abs(toMinutes(best.hour) - target) ? h : best,
  );
  const label = WEATHER_LABEL[lang];
  const condition =
    closest.rainChance >= 50 ? label.rain : closest.rainChance >= 25 ? label.clouds : label.clear;
  return `${closest.tempC}° ${condition}`;
}
