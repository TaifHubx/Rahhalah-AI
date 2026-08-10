import { catalogEntry } from "./destination-catalog";

/**
 * نداءات Google Maps Platform الحقيقية عبر Lovable Connector Gateway.
 * المفاتيح تُقرأ من بيئة السيرفر فقط ولا تُرسل للواجهة.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function keys() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !maps) return null;
  return { lovable, maps };
}

function headers(k: { lovable: string; maps: string }, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${k.lovable}`,
    "X-Connection-Api-Key": k.maps,
    "Content-Type": "application/json",
    ...extra,
  };
}

export interface TravelLeg {
  fromId: string;
  toId: string;
  distanceKm: number;
  travelMinutes: number;
}

/** زمن ومسافة التنقل الحقيقيين بين وجهتين (Google Routes API). */
export async function getTravelTime(args: Record<string, unknown>) {
  const fromId = String(args["fromDestinationId"] ?? "");
  const toId = String(args["toDestinationId"] ?? "");
  const from = catalogEntry(fromId);
  const to = catalogEntry(toId);
  if (!from || !to) return { error: "معرّف وجهة غير معروف", fromId, toId };
  const k = keys();
  if (!k) return { error: "خدمة الخرائط غير مهيّأة", fromId, toId };

  try {
    const res = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: headers(k, { "X-Goog-FieldMask": "routes.duration,routes.distanceMeters" }),
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: "DRIVE",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Routes API error", res.status, body);
      return { error: `تعذّر جلب زمن التنقل (${res.status})`, fromId, toId };
    }
    const data = (await res.json()) as {
      routes?: { distanceMeters?: number; duration?: string }[];
    };
    const route = data.routes?.[0];
    if (!route) return { error: "لا يوجد مسار بري بين الوجهتين", fromId, toId };
    const seconds = Number(String(route.duration ?? "0").replace("s", "")) || 0;
    return {
      fromId,
      toId,
      from: from.name,
      to: to.name,
      distanceKm: Math.round(((route.distanceMeters ?? 0) / 1000) * 10) / 10,
      travelMinutes: Math.max(1, Math.round(seconds / 60)),
      mode: "سيارة",
    };
  } catch {
    return { error: "تعذّر الوصول لخدمة المسارات", fromId, toId };
  }
}

/** حالة المكان الحقيقية: مفتوح الآن، أوقات العمل، التقييم وعدد المقيّمين (Places API New). */
export async function getPlaceStatus(args: Record<string, unknown>) {
  const id = String(args["destinationId"] ?? "");
  const entry = catalogEntry(id);
  if (!entry) return { destinationId: id, error: "وجهة غير معروفة" };
  const k = keys();
  if (!k) return { destinationId: id, error: "خدمة الخرائط غير مهيّأة" };

  try {
    const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: "POST",
      headers: headers(k, {
        "X-Goog-FieldMask":
          "places.displayName,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.regularOpeningHours.weekdayDescriptions,places.location",
      }),
      body: JSON.stringify({ textQuery: entry.placeQuery, maxResultCount: 1 }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Places API error", res.status, body);
      return { destinationId: id, error: `تعذّر جلب حالة المكان (${res.status})` };
    }
    const data = (await res.json()) as {
      places?: {
        displayName?: { text?: string };
        rating?: number;
        userRatingCount?: number;
        currentOpeningHours?: { openNow?: boolean };
        regularOpeningHours?: { weekdayDescriptions?: string[] };
      }[];
    };
    const place = data.places?.[0];
    if (!place) return { destinationId: id, error: "لا توجد بيانات لهذا المكان" };
    return {
      destinationId: id,
      name: entry.name,
      googleName: place.displayName?.text ?? "",
      openNow: place.currentOpeningHours?.openNow ?? null,
      weekdayHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
      rating: place.rating ?? null,
      /** عدد المقيّمين مؤشر واقعي على الإقبال/الازدحام النسبي. */
      reviewCount: place.userRatingCount ?? null,
      accessible: entry.accessible,
      indoor: entry.indoor,
    };
  } catch {
    return { destinationId: id, error: "تعذّر الوصول لخدمة الأماكن" };
  }
}
