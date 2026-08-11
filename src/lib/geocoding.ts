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
