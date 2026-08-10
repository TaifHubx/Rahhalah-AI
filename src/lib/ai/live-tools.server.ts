import type { ToolDef } from "./gateway.server";
import { catalogEntry, destinationCatalog } from "./destination-catalog";
import { getPlaceStatus, getTravelTime } from "./maps.server";

/**
 * أدوات "البيانات الحقيقية" التي يستدعيها Gemini عبر Function Calling.
 * الطقس يأتي من Open-Meteo (مجاني بدون مفتاح)، وأوقات الصلاة من Aladhan API.
 * أوقات العمل تُقرأ من فهرس الوجهات.
 */

const cityCoords: Record<string, { lat: number; lon: number }> = {
  الرياض: { lat: 24.7136, lon: 46.6753 },
  جدة: { lat: 21.4858, lon: 39.1925 },
  العلا: { lat: 26.6089, lon: 37.9216 },
  أبها: { lat: 18.2164, lon: 42.5053 },
  عسير: { lat: 18.2164, lon: 42.5053 },
  الطائف: { lat: 21.2854, lon: 40.4183 },
  جيزان: { lat: 16.8892, lon: 42.5511 },
  "المدينة المنورة": { lat: 24.5247, lon: 39.5692 },
  الدمام: { lat: 26.4207, lon: 50.0888 },
};

function coordsFor(city: string) {
  return cityCoords[city.trim()] ?? cityCoords["الرياض"]!;
}

export async function getWeather(args: Record<string, unknown>) {
  const city = String(args["city"] ?? "الرياض");
  const { lat, lon } = coordsFor(city);
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability&forecast_days=1&timezone=Asia%2FRiyadh`,
    );
    if (!res.ok) return { city, error: "تعذّر جلب الطقس" };
    const data = (await res.json()) as {
      hourly?: { time: string[]; temperature_2m: number[]; precipitation_probability: number[] };
    };
    const hourly = data.hourly;
    if (!hourly) return { city, error: "لا توجد بيانات طقس" };
    const hours = hourly.time.map((time, i) => ({
      hour: time.slice(11, 16),
      tempC: Math.round(hourly.temperature_2m[i] ?? 0),
      rainChance: hourly.precipitation_probability[i] ?? 0,
    }));
    const rainy = hours.filter((h) => h.rainChance >= 50).map((h) => h.hour);
    return { city, hours: hours.filter((_, i) => i % 3 === 0), rainyHours: rainy };
  } catch {
    return { city, error: "تعذّر الوصول لخدمة الطقس" };
  }
}

export async function getPrayerTimes(args: Record<string, unknown>) {
  const city = String(args["city"] ?? "الرياض");
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Saudi%20Arabia&method=4`,
    );
    if (!res.ok) return { city, error: "تعذّر جلب أوقات الصلاة" };
    const data = (await res.json()) as { data?: { timings?: Record<string, string> } };
    const t = data.data?.timings;
    if (!t) return { city, error: "لا توجد بيانات" };
    return {
      city,
      timings: {
        Fajr: t["Fajr"],
        Dhuhr: t["Dhuhr"],
        Asr: t["Asr"],
        Maghrib: t["Maghrib"],
        Isha: t["Isha"],
      },
    };
  } catch {
    return { city, error: "تعذّر الوصول لخدمة أوقات الصلاة" };
  }
}

export function getDestinationInfo(args: Record<string, unknown>) {
  const id = String(args["destinationId"] ?? "");
  const entry = catalogEntry(id);
  if (!entry) return { destinationId: id, error: "وجهة غير معروفة" };
  return {
    destinationId: id,
    name: entry.name,
    region: entry.region,
    traits: entry.traits,
    declaredHours: entry.hours,
    indoor: entry.indoor,
    accessible: entry.accessible,
    lat: entry.lat,
    lng: entry.lng,
  };
}

export const liveTools: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "حالة الطقس ودرجات الحرارة واحتمالات المطر بالساعة لمدينة سعودية اليوم.",
      parameters: {
        type: "object",
        properties: { city: { type: "string", description: "اسم المدينة بالعربية" } },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_prayer_times",
      description: "أوقات الصلاة اليوم لمدينة سعودية، لتفادي جدولة نشاط في وقت الصلاة.",
      parameters: {
        type: "object",
        properties: { city: { type: "string", description: "اسم المدينة بالعربية" } },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_destination_info",
      description: "معلومات الوجهة: طبيعتها، إحداثياتها، إن كانت داخلية، ومدى ملاءمتها لأصحاب الهمم.",
      parameters: {
        type: "object",
        properties: { destinationId: { type: "string", description: "معرّف الوجهة" } },
        required: ["destinationId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_place_status",
      description:
        "الحالة الحقيقية للمكان من Google Places: مفتوح الآن، أوقات العمل الأسبوعية، التقييم وعدد المقيّمين (مؤشر الإقبال).",
      parameters: {
        type: "object",
        properties: { destinationId: { type: "string", description: "معرّف الوجهة" } },
        required: ["destinationId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_travel_time",
      description:
        "المسافة الحقيقية بالكيلومتر وزمن التنقل بالسيارة بالدقائق بين وجهتين، من Google Routes API.",
      parameters: {
        type: "object",
        properties: {
          fromDestinationId: { type: "string", description: "معرّف وجهة الانطلاق" },
          toDestinationId: { type: "string", description: "معرّف وجهة الوصول" },
        },
        required: ["fromDestinationId", "toDestinationId"],
      },
    },
  },
];

export const liveToolHandlers = {
  get_weather: getWeather,
  get_prayer_times: getPrayerTimes,
  get_destination_info: getDestinationInfo,
  get_place_status: getPlaceStatus,
  get_travel_time: getTravelTime,
};
