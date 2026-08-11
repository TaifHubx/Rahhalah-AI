import { useEffect, useState } from "react";
import { loadGoogleMapsLibrary } from "@/lib/google-maps-client";

/**
 * جلب إحداثيات دقيقة لمكان حقيقي عبر Google Places API (Text Search) بدل
 * الاعتماد على أي إحداثيات مخزّنة يدوياً داخل المشروع. عميل فقط — لا يُستدعى
 * إلا من useEffect (لا يجوز أثناء الـ SSR).
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  placeId: string;
}

// كاش بالذاكرة حسب نص الاستعلام + مركز الانحياز — يمنع تكرار نفس نداء Places عند كل
// إعادة رسم (مثلاً عند وصول بيانات طقس جديدة لا تغيّر تسلسل المحطات). مدمج بمدينة الانحياز
// كي لا يُعاد استخدام نتيجة رحلة مدينة أخرى لنص استعلام قد يتشابه صدفة.
const cache = new Map<string, GeocodeResult | null>();

// مراكز تقريبية لمدن رحّالة الستة (نفس المدن المعروضة في معالج /plan) — تُستخدم لبناء دائرة
// انحياز جغرافي (locationBias) صحيحة لمدينة الرحلة الفعلية بدل انحياز ثابت نحو الرياض دائماً
// (كان هذا يُضعف دقة النتائج الغامضة لأي مدينة غير الرياض).
const CITY_CENTERS: Record<string, google.maps.LatLngLiteral> = {
  الرياض: { lat: 24.7136, lng: 46.6753 },
  جدة: { lat: 21.4858, lng: 39.1925 },
  العلا: { lat: 26.6089, lng: 37.9216 },
  أبها: { lat: 18.2164, lng: 42.5053 },
  الدمام: { lat: 26.4207, lng: 50.0888 },
  "المدينة المنورة": { lat: 24.5247, lng: 39.5692 },
};

function biasFor(city: string | undefined): google.maps.CircleLiteral {
  const center = (city && CITY_CENTERS[city.trim()]) || CITY_CENTERS["الرياض"]!;
  // دائرة نصف قطرها ٤٠ كم بدل نقطة واحدة، لأن locationBias كنقطة LatLng مجرّدة انحياز
  // ضعيف جداً في الترتيب (وهو ما تسبّب سابقاً بنتائج مثل ظهور "بوليفارد" في مكان مختلف
  // عن حطين الفعلية).
  return { center, radius: 40_000 };
}

export async function geocodePlace(query: string, city?: string): Promise<GeocodeResult | null> {
  const key = `${city ?? ""}|${query.trim()}`;
  if (!query.trim()) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const places = await loadGoogleMapsLibrary("places");
    // ملاحظة: componentRestrictions لا وجود له في SearchByTextRequest (هو حقل من
    // Geocoding API/Autocomplete القديمة). المكافئ هنا locationBias (انحياز ناعم فقط،
    // كما أعلاه) أو locationRestriction لفرض حدود جغرافية صارمة إن احتجنا ذلك لاحقاً.
    const { places: results } = await places.Place.searchByText({
      textQuery: query.trim(),
      fields: ["location", "id"],
      locationBias: biasFor(city),
      language: "ar",
      region: "sa",
      maxResultCount: 1,
    });

    const place = results[0];
    const location = place?.location;
    if (!place || !location) {
      cache.set(key, null); // نتيجة سلبية مؤكدة — لا داعي لإعادة البحث بنفس النص
      return null;
    }

    const result: GeocodeResult = { lat: location.lat(), lng: location.lng(), placeId: place.id };
    cache.set(key, result);
    return result;
  } catch (err) {
    // لا نُخزّن الفشل (مفتاح غير صالح، خطأ شبكة عابر...) في الكاش كي تُعاد المحاولة لاحقاً
    console.error("تعذّر جلب إحداثيات المكان عبر Google Places:", key, err);
    return null;
  }
}

/**
 * جلب إحداثيات مكان عبر Place ID موثّق مباشرة — بلا أي بحث نصي، لضمان دقة ١٠٠٪ حقيقية.
 * يُستخدم فقط للمعالم المدرَجة في KNOWN_PLACE_IDS (انظر src/lib/known-places.ts).
 */
export async function geocodeByPlaceId(placeId: string): Promise<GeocodeResult | null> {
  const key = `place_id:${placeId}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const places = await loadGoogleMapsLibrary("places");
    const place = new places.Place({ id: placeId, requestedLanguage: "ar" });
    await place.fetchFields({ fields: ["location", "id"] });
    const location = place.location;
    if (!location) {
      cache.set(key, null);
      return null;
    }
    const result: GeocodeResult = { lat: location.lat(), lng: location.lng(), placeId: place.id };
    cache.set(key, result);
    return result;
  } catch (err) {
    console.error("تعذّر جلب إحداثيات المكان عبر Place ID:", placeId, err);
    return null;
  }
}

/**
 * يحلّ إحداثيات محطة: يفضّل Place ID موثّقاً إن وُجد (دقة ١٠٠٪)، وإلا يلجأ للبحث
 * النصي بالاستعلام المُمرَّر (الاسم الرسمي من KNOWN_PLACE_QUERIES إن توفر، أو نص عام).
 */
export async function resolvePlaceCoords(params: {
  query: string;
  placeId?: string;
  city?: string;
}): Promise<GeocodeResult | null> {
  if (params.placeId) {
    const byId = await geocodeByPlaceId(params.placeId);
    if (byId) return byId;
  }
  return geocodePlace(params.query, params.city);
}

export interface LiveDestinationStatus {
  /** null = لم تنشر Google بيانات ساعات عمل موثوقة لهذا المكان (وليس بالضرورة "مغلق"). */
  openNow: boolean | null;
  /** null = لم تنشر Google بيانات وصول لذوي الهمم لهذا المكان (وليس بالضرورة "غير مهيّأ"). */
  wheelchairAccessible: boolean | null;
}

const statusCache = new Map<string, LiveDestinationStatus | null>();

/**
 * حالة حيّة من Google Places (New) لمعلم سياحي: هل هو مفتوح الآن فعلياً، وهل مدخله
 * مهيّأ لذوي الهمم — عبر الحقلين الرسميين regularOpeningHours/isOpen() وaccessibilityOptions.
 * لا يوجد حقل مكافئ لـ"مناسب للعائلات" في Google Places إطلاقاً، فلا نحاول استنتاجه هنا.
 */
export async function fetchDestinationLiveStatus(
  name: string,
  city: string,
): Promise<LiveDestinationStatus | null> {
  const key = `status|${city}|${name}`;
  if (statusCache.has(key)) return statusCache.get(key) ?? null;

  try {
    const places = await loadGoogleMapsLibrary("places");
    const { places: results } = await places.Place.searchByText({
      textQuery: `${name}، ${city}`,
      fields: ["id", "location", "regularOpeningHours", "accessibilityOptions"],
      locationBias: biasFor(city),
      language: "ar",
      region: "sa",
      maxResultCount: 1,
    });

    const place = results[0];
    if (!place) {
      statusCache.set(key, null);
      return null;
    }

    // isOpen() مبني على regularOpeningHours/currentOpeningHours المطلوبين أعلاه في fields —
    // يعيد undefined لو لم تنشر Google ساعات عمل لهذا المكان (وليس بالضرورة "مغلق فعلاً").
    let openNow: boolean | null = null;
    try {
      const open = await place.isOpen();
      openNow = open ?? null;
    } catch {
      openNow = null;
    }

    const status: LiveDestinationStatus = {
      openNow,
      wheelchairAccessible: place.accessibilityOptions?.hasWheelchairAccessibleEntrance ?? null,
    };
    statusCache.set(key, status);
    return status;
  } catch (err) {
    console.error("تعذّر جلب حالة المكان الحية عبر Google Places:", key, err);
    return null;
  }
}

/**
 * Hook عميل لبطاقات الوجهات: يجلب حالة "مفتوح الآن" و"مناسب لذوي الهمم" الحيّة من Google
 * Places عند التركيب، مع استخدام القيمة الثابتة المخزّنة محلياً (fallback) بانتظار الرد أو
 * لو تعذّر الجلب — لا تُخفى الشارة أبداً، فقط تتحدّث لقيمة حقيقية إن توفرت.
 */
export function useLiveDestinationStatus(
  name: string,
  city: string,
  fallback: { isOpen: boolean; accessible: boolean },
) {
  const [status, setStatus] = useState<LiveDestinationStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus(null);
    void fetchDestinationLiveStatus(name, city).then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, [name, city]);

  return {
    isOpen: status?.openNow ?? fallback.isOpen,
    accessible: status?.wheelchairAccessible ?? fallback.accessible,
    isLive: status !== null,
  };
}
