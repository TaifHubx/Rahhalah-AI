import { importLibrary, setOptions, type LibraryMap } from "@googlemaps/js-api-loader";

/**
 * نقطة تحميل مشتركة واحدة لسكربت Google Maps JavaScript API — يستخدمها كل
 * من مكوّن الخريطة (JourneyMap) وطبقة جلب الإحداثيات (geocoding) كي لا يُستدعى
 * setOptions() أكثر من مرة. عميل فقط (لا يجوز تنفيذه أثناء الـ SSR) — استدعِه
 * فقط من داخل useEffect أو من دالة تُنفَّذ في المتصفح حصراً.
 */

let optionsReady: boolean | null = null;

function ensureOptions(): boolean {
  if (optionsReady !== null) return optionsReady;
  const apiKey = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"];
  if (!apiKey) {
    optionsReady = false;
    return false;
  }
  setOptions({ key: apiKey, v: "weekly" });
  optionsReady = true;
  return true;
}

export function getGoogleMapsMapId(): string | null {
  return import.meta.env["VITE_GOOGLE_MAPS_MAP_ID"] || null;
}

export function loadGoogleMapsLibrary<K extends keyof LibraryMap>(name: K): Promise<LibraryMap[K]> {
  if (!ensureOptions()) {
    return Promise.reject(
      new Error("VITE_GOOGLE_MAPS_API_KEY غير مُعرَّف — أضفه في .env (انظر .env.example)."),
    );
  }
  return importLibrary(name);
}
