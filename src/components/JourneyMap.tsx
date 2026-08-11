import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/StatusChips";
import { cn } from "@/lib/utils";
import { getGoogleMapsMapId, loadGoogleMapsLibrary } from "@/lib/google-maps-client";
import { useI18n } from "@/lib/i18n";
import type { JourneyStop } from "@/lib/journey";

/**
 * خريطة رحلة تفاعلية حقيقية (Google Maps JavaScript API) — متزامنة ثنائياً مع
 * الجدول الزمني عبر focusedPlaceId، مع دبابيس مخصصة (AdvancedMarkerElement)
 * وعرض سينمائي تلقائي (Autoplay Walkthrough): الكاميرا تمشي مع خط مسار واحد
 * متسلسل بصرامة [موقع المستخدم ← محطة 1 ← محطة 2 ← ...] بدل إظهار كل المحطات
 * دفعة واحدة.
 *
 * Component مستقل (Standalone) يبني الخريطة داخل useEffect عند التركيب
 * (مكافئ ngAfterViewInit في Angular) — تحميل سكربت Google Maps يحدث فقط في
 * المتصفح عبر importLibrary()، لا يجوز تنفيذه أثناء الـ SSR.
 *
 * مهم: لا تُرسم أي دبابيس محطات أو مسار قبل اكتمال إحداثيات Google Places الحقيقية
 * لكل المحطات الحالية (stop.geocoded) — أو انتهاء مهلة انتظار قصوى احتياطية. هذا يمنع
 * تجمّع كل المحطات غير المحسومة عند نقطة واحدة (FALLBACK_CENTER) ورسم خطوط وهمية بينها؛
 * انظر الأثر الموحّد أدناه الذي يحسب `geocodedStops` ويستخدمه حصراً لكل ما يتعلق
 * بالإحداثيات (الدبابيس، المسار، الكاميرا).
 *
 * يتطلب متغيّري بيئة (انظر .env.example):
 *   VITE_GOOGLE_MAPS_API_KEY — مفتاح Maps JavaScript API.
 *   VITE_GOOGLE_MAPS_MAP_ID  — مطلوب لتفعيل AdvancedMarkerElement (الدبابيس المخصصة).
 */

interface Props {
  stops: JourneyStop[];
  focusedPlaceId: string | null;
  onFocusPlace: (id: string) => void;
}

const ROUTE_STEPS = 16;
const ROUTE_STEP_MS = 70;
const ROUTE_ARRIVAL_PAUSE_MS = 1000;
const INITIAL_FOCUS_MS = 800; // مدة تركيز الكاميرا على المستخدم قبل بدء العرض التلقائي
const MAX_GEOCODE_WAIT_MS = 6000; // أقصى انتظار لاكتمال إحداثيات كل المحطات قبل البدء رغم ذلك

/** إخفاء تسميات نقاط الاهتمام (مطاعم/مقاهي/فنادق...) — لا تُطبَّق إن كان mapId مضبوطاً
 * بتنسيق سحابي في Cloud Console؛ عندها يجب تعطيلها من محرّر نمط الخريطة هناك بدلاً من هنا. */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * يقرأ لون التصميم الحالي (فاتح/داكن) من متغيرات CSS ويحوّله إلى rgb() مفهوم لمحرّك
 * رسم خرائط Google — الذي لا يفسّر oklch() كما يفعل السياق CSS/SVG العادي.
 */
function resolveCssColor(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const probe = document.createElement("span");
  probe.style.color = raw;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}

function buildPinElement(order: number, active: boolean) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="relative flex ${active ? "size-10" : "size-9"} items-center justify-center transition-all duration-300">
      ${active ? '<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/50"></span>' : ""}
      <span class="relative flex ${active ? "size-9" : "size-8"} items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition-colors ${
        active ? "bg-gold text-primary" : "bg-primary text-primary-foreground"
      }">${order}</span>
    </div>
  `;
  return wrapper.firstElementChild as HTMLElement;
}

/** عنصر HTML لدبوس موقع المستخدم — أيقونة شخص مميزة (لون مختلف عن دبابيس المحطات). */
function buildUserElement() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="relative flex size-9 items-center justify-center">
      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500/40"></span>
      <span class="relative flex size-8 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-white shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-4">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
    </div>
  `;
  return wrapper.firstElementChild as HTMLElement;
}

export function JourneyMap({ stops, focusedPlaceId, onFocusPlace }: Props) {
  const { t, tf } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerLibRef = useRef<google.maps.MarkerLibrary | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  // خط مسار واحد فقط — يُبنى بتسلسل صارم [موقع المستخدم ← محطة 1 ← محطة 2 ← ...]
  const routeLineRef = useRef<google.maps.Polyline | null>(null);
  const animationTokenRef = useRef(0);
  const geocodeWaitTimerRef = useRef<number | null>(null);
  // يحمل دائماً المحطات المحسومة إحداثياً فقط (geocoded: true) — أي كود يتعامل مع الإحداثيات
  // (walkTo، الكاميرا، حدود العرض النهائي) يقرأ من هذا المرجع حصراً، فلا يمكنه أبداً رسم
  // نقطة عند FALLBACK_CENTER حتى في حالة انتهاء مهلة الانتظار القصوى بمحطات غير مكتملة.
  const stopsRef = useRef<JourneyStop[]>([]);
  const focusedPlaceIdRef = useRef(focusedPlaceId);
  const onFocusPlaceRef = useRef(onFocusPlace);

  // حالة "الرحلة السينمائية": نقطة الانطلاق، آخر محطة وصلت إليها الكاميرا، وهل عُرضت الرحلة كاملة بعد
  const originRef = useRef<google.maps.LatLngLiteral | null>(null);
  const lastVisitedIndexRef = useRef(-1); // -1 = عند نقطة الانطلاق، لم تُزر أي محطة بعد
  const journeyCompleteRef = useRef(false);
  const stopsKeyRef = useRef("");

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  // undefined = لم يُحسم بعد (بانتظار رد المتصفح)، null = تعذّر/رُفض الإذن، كائن = إحداثيات مؤكدة
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null | undefined>(
    undefined,
  );
  // true بعد انتهاء مهلة الانتظار القصوى (MAX_GEOCODE_WAIT_MS) رغم عدم اكتمال الجميع —
  // صمّام أمان يمنع تجمّداً أبدياً إن تعذّر جلب مكان واحد نهائياً؛ يُعاد ضبطه لكل رحلة جديدة.
  const [geocodeTimedOut, setGeocodeTimedOut] = useState(false);

  const allStopsGeocoded = stops.length > 0 && stops.every((s) => s.geocoded);
  // القائمة الوحيدة المستخدمة لأي رسم/حساب متعلّق بالموقع الجغرافي — لا تحتوي أبداً على
  // محطة لم تُحسَم إحداثياتها بعد، بصرف النظر عن حالة الانتظار الحالية.
  const geocodedStops = useMemo(() => stops.filter((s) => s.geocoded), [stops]);

  stopsRef.current = geocodedStops;
  focusedPlaceIdRef.current = focusedPlaceId;
  onFocusPlaceRef.current = onFocusPlace;

  // جلب موقع المستخدم الحالي. العرض السينمائي ينتظر userLocation !== undefined (نجاحاً أو فشلاً)
  // قبل أن ينطلق — timeout الخاص بالمتصفح أدناه يضمن عدم الانتظار إلى الأبد.
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(null); // لا يوجد دعم للموقع أصلاً — نستخدم نقطة البداية الافتراضية فوراً
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 },
    );
  }, []);

  // بناء الخريطة عند التركيب (Standalone init — مكافئ ngAfterViewInit)
  useEffect(() => {
    let cancelled = false;
    const mapId = getGoogleMapsMapId();

    void Promise.all([loadGoogleMapsLibrary("maps"), loadGoogleMapsLibrary("marker")])
      .then(([mapsLib, markerLib]) => {
        if (cancelled || !containerRef.current) return;
        const map = new mapsLib.Map(containerRef.current, {
          center: { lat: 24.7136, lng: 46.6753 },
          zoom: 12,
          mapId,
          // ملاحظة: styles تُتجاهل من Google إن كان mapId مضبوطاً بنمط سحابي — راجع
          // تعليق MAP_STYLES أعلاه.
          styles: mapId ? null : MAP_STYLES,
          scrollwheel: false,
          gestureHandling: "greedy",
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
        });
        mapRef.current = map;
        markerLibRef.current = markerLib;
        setMapReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("تعذّر تحميل Google Maps:", err);
        setLoadError(mapId ? t("map.loadErrorGeneric") : t("map.loadErrorNoKey"));
      });

    const markers = markersRef.current;
    return () => {
      cancelled = true;
      animationTokenRef.current += 1;
      if (geocodeWaitTimerRef.current !== null) {
        window.clearTimeout(geocodeWaitTimerRef.current);
        geocodeWaitTimerRef.current = null;
      }
      markers.forEach((marker) => {
        marker.map = null;
      });
      markers.clear();
      if (userMarkerRef.current) userMarkerRef.current.map = null;
      userMarkerRef.current = null;
      routeLineRef.current?.setMap(null);
      routeLineRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // الكاميرا المتحركة: تمشي تدريجياً (panTo) مع رسم المسار خطوة بخطوة (Linear Interpolation)
  // من نقطة إلى التي تليها بالتسلسل الصارم فقط: أصل → محطة i-1 → محطة i.
  // stopsRef هنا هو دائماً القائمة المحسومة إحداثياً فقط — لا يمكن أبداً أن يرسم نقطة FALLBACK_CENTER.
  async function walkTo(targetIndex: number, token: number) {
    const map = mapRef.current;
    const origin = originRef.current;
    if (!map || !origin) return;

    if (!routeLineRef.current) {
      const color = resolveCssColor("--color-primary", "#7a5230");
      routeLineRef.current = new google.maps.Polyline({
        map,
        path: [origin],
        strokeColor: color,
        strokeWeight: 4,
        strokeOpacity: 1,
        geodesic: true,
      });
    }
    const line = routeLineRef.current;

    for (let i = lastVisitedIndexRef.current + 1; i <= targetIndex; i++) {
      const stop = stopsRef.current[i];
      if (!stop) break;
      const prevStop = i > 0 ? stopsRef.current[i - 1] : null;
      const from: google.maps.LatLngLiteral = prevStop
        ? { lat: prevStop.lat, lng: prevStop.lng }
        : origin;
      const to: google.maps.LatLngLiteral = { lat: stop.lat, lng: stop.lng };

      for (let step = 1; step <= ROUTE_STEPS; step++) {
        if (token !== animationTokenRef.current) return; // race condition: تحديث آخر ألغى هذه الحركة
        const t = step / ROUTE_STEPS;
        const point: google.maps.LatLngLiteral = {
          lat: from.lat + (to.lat - from.lat) * t,
          lng: from.lng + (to.lng - from.lng) * t,
        };
        line.getPath().push(new google.maps.LatLng(point.lat, point.lng));
        map.panTo(point);
        await sleep(ROUTE_STEP_MS);
      }

      if (token !== animationTokenRef.current) return;
      lastVisitedIndexRef.current = i;
      setPeekId(stop.id); // إظهار بطاقة المحطة فور وصول الكاميرا إليها

      // وقفة قصيرة عند الوصول لكل محطة تعطي إحساساً واضحاً بالوصول قبل الانتقال للتالية
      if (i < targetIndex) {
        await sleep(ROUTE_ARRIVAL_PAUSE_MS);
      }
    }

    if (token !== animationTokenRef.current) return;

    // بعد الوصول لآخر محطة في الرحلة: توسيط الخريطة على الرحلة كاملة مرة واحدة
    if (targetIndex === stopsRef.current.length - 1 && !journeyCompleteRef.current) {
      journeyCompleteRef.current = true;
      await sleep(ROUTE_ARRIVAL_PAUSE_MS);
      if (token !== animationTokenRef.current) return;
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(origin);
      stopsRef.current.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
      map.fitBounds(bounds, 48);
    }
  }

  // مزامنة الدبابيس مع قائمة المحطات — بلا تحريك كاميرا هنا. لا تُرسم أي دبابيس/مسار
  // للمحطات إلا بعد اكتمال إحداثيات الجميع (allStopsGeocoded) أو انتهاء المهلة القصوى
  // (geocodeTimedOut)، وحينها تُرسم كل الدبابيس والمسار دفعة واحدة في نفس التنفيذ.
  useEffect(() => {
    const map = mapRef.current;
    const markerLib = markerLibRef.current;
    if (!mapReady || !map || !markerLib) return;

    if (stops.length === 0) {
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current.clear();
      routeLineRef.current?.setMap(null);
      routeLineRef.current = null;
      return;
    }

    // دبوس موقع المستخدم — مستقل عن جاهزية geocoding المحطات (إحداثيات GPS حيّة حقيقية،
    // وليست FALLBACK_CENTER، فلا داعي لانتظارها).
    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.position = userLocation;
      } else {
        userMarkerRef.current = new markerLib.AdvancedMarkerElement({
          map,
          position: userLocation,
          content: buildUserElement(),
          zIndex: 500,
        });
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
      userMarkerRef.current = null;
    }

    // إعادة ضبط تقدّم الرحلة عند تغيّر تسلسل المحطات فعلياً (وليس فقط تحديث بيانات الطقس مثلاً)
    const key = stops.map((s) => s.id).join("-");
    let effectiveTimedOut = geocodeTimedOut;
    if (key !== stopsKeyRef.current) {
      stopsKeyRef.current = key;
      lastVisitedIndexRef.current = -1;
      journeyCompleteRef.current = false;
      originRef.current = null;
      animationTokenRef.current += 1;
      routeLineRef.current?.setMap(null);
      routeLineRef.current = null;
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current.clear();
      if (geocodeWaitTimerRef.current !== null) {
        window.clearTimeout(geocodeWaitTimerRef.current);
        geocodeWaitTimerRef.current = null;
      }
      // محلياً في هذا التنفيذ فوراً (بانتظار أن تنعكس setGeocodeTimedOut(false) برندر لاحق) —
      // كي لا نُكمل خطأً بحالة "منتهية المهلة" متبقّية من رحلة سابقة مختلفة تماماً.
      effectiveTimedOut = false;
      setGeocodeTimedOut(false);
    }

    const ready = allStopsGeocoded || effectiveTimedOut;
    if (!ready) {
      if (geocodeWaitTimerRef.current === null) {
        geocodeWaitTimerRef.current = window.setTimeout(() => {
          geocodeWaitTimerRef.current = null;
          setGeocodeTimedOut(true);
        }, MAX_GEOCODE_WAIT_MS);
      }
      return; // ننتظر — لا نضع أي محطة عند FALLBACK_CENTER إطلاقاً
    }

    if (geocodeWaitTimerRef.current !== null) {
      window.clearTimeout(geocodeWaitTimerRef.current);
      geocodeWaitTimerRef.current = null;
    }

    const nextIds = new Set(geocodedStops.map((s) => s.id));
    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.map = null;
        markersRef.current.delete(id);
      }
    });

    geocodedStops.forEach((stop) => {
      const isActive = stop.id === focusedPlaceIdRef.current;
      const existing = markersRef.current.get(stop.id);
      if (existing) {
        existing.position = { lat: stop.lat, lng: stop.lng };
        existing.content = buildPinElement(stop.order, isActive);
        existing.zIndex = isActive ? 1000 : 0;
      } else {
        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: { lat: stop.lat, lng: stop.lng },
          content: buildPinElement(stop.order, isActive),
          zIndex: isActive ? 1000 : 0,
          gmpClickable: true,
        });
        marker.addListener("click", () => {
          onFocusPlaceRef.current(stop.id);
        });
        markersRef.current.set(stop.id, marker);
      }
    });
  }, [stops, geocodedStops, mapReady, userLocation, allStopsGeocoded, geocodeTimedOut]);

  // بدء العرض السينمائي التلقائي (Autoplay Walkthrough) — مرة واحدة فقط عند الجاهزية:
  // تركّز الكاميرا على موقع المستخدم بزووم قريب، ثم تمشي تلقائياً عبر كل المحطات بالتتابع.
  // لا ينطلق شيء قبل أن يُحسم userLocation، ولا قبل اكتمال إحداثيات كل المحطات (أو انتهاء
  // المهلة القصوى) — نفس شرط الجاهزية المستخدم في أثر مزامنة الدبابيس أعلاه.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || stopsRef.current.length === 0 || originRef.current) return;
    if (userLocation === undefined) return; // بانتظار تأكيد الموقع قبل رسم أي خط أو تحريك الكاميرا
    if (!allStopsGeocoded && !geocodeTimedOut) return; // ننتظر جاهزية كل الإحداثيات أولاً

    const currentStops = stopsRef.current;
    const origin: google.maps.LatLngLiteral = userLocation ?? {
      lat: currentStops[0]!.lat,
      lng: currentStops[0]!.lng,
    }; // تعذّر الموقع نهائياً — نبدأ من المحطة الأولى
    originRef.current = origin;
    map.panTo(origin);
    map.setZoom(15);

    animationTokenRef.current += 1;
    const token = animationTokenRef.current;
    window.setTimeout(() => {
      if (token !== animationTokenRef.current || !mapRef.current) return;
      void walkTo(stopsRef.current.length - 1, token);
    }, INITIAL_FOCUS_MS);
  }, [mapReady, stops, userLocation, allStopsGeocoded, geocodeTimedOut]);

  // التزامن ثنائي الاتجاه: الضغط على كرت/دبوس محطة يحرّك الكاميرا خطوة بخطوة عبر المحطات غير المزارة،
  // أو يركّز مباشرة إن كانت المحطة مزارة من قبل
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusedPlaceId) return;

    markersRef.current.forEach((marker, id) => {
      const stop = stopsRef.current.find((s) => s.id === id);
      if (!stop) return;
      const isActive = id === focusedPlaceId;
      marker.content = buildPinElement(stop.order, isActive);
      marker.zIndex = isActive ? 1000 : 0;
    });

    const targetIndex = stopsRef.current.findIndex((s) => s.id === focusedPlaceId);
    if (targetIndex === -1) return; // المحطة لم تُحسَم إحداثياتها بعد — لا يوجد دبوس/موضع لها بعد

    if (targetIndex <= lastVisitedIndexRef.current) {
      // محطة زُرت من قبل — تركيز سريع دون إعادة رسم المسار
      const stop = stopsRef.current[targetIndex]!;
      map.panTo({ lat: stop.lat, lng: stop.lng });
      map.setZoom(15);
      setPeekId(focusedPlaceId);
      return;
    }

    animationTokenRef.current += 1;
    void walkTo(targetIndex, animationTokenRef.current);
  }, [focusedPlaceId, mapReady]);

  const peek = stops.find((s) => s.id === peekId) ?? null;
  const waitingForGeocoding = mapReady && stops.length > 0 && !allStopsGeocoded && !geocodeTimedOut;

  if (stops.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
        {t("map.noStops")}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-warning/50 bg-warning/10 p-6 text-center text-sm text-warning-foreground">
        <AlertTriangle className="size-5 shrink-0" aria-hidden />
        {loadError}
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-border/70 bg-sand shadow-[var(--shadow-soft)]">
      <div
        ref={containerRef}
        className="h-[300px] w-full sm:h-[380px]"
        role="application"
        aria-label={t("map.ariaLabel")}
      />

      {(!mapReady || waitingForGeocoding) && (
        <div className="absolute inset-0 z-[900] flex items-center justify-center gap-2 bg-sand text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {mapReady ? t("map.locatingStops") : t("map.loadingMap")}
        </div>
      )}

      <p className="pointer-events-none absolute start-3 top-3 z-[400] rounded-full bg-card/85 px-3 py-1 text-xs text-muted-foreground">
        {tf("map.stopsHint", { n: stops.length })}
      </p>

      {/* بطاقة معاينة عائمة بدل InfoWindow الافتراضية */}
      <article
        className={cn(
          "absolute inset-x-3 bottom-3 z-[1000] grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-[var(--shadow-soft)] transition-all duration-300 ease-out",
          peek ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {peek?.image ? (
          <img
            src={peek.image}
            alt={peek.place}
            loading="lazy"
            className="size-[76px] rounded-xl object-cover"
          />
        ) : (
          <div className="flex size-[76px] items-center justify-center rounded-xl bg-secondary">
            <MapPin className="size-5 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <h3 className="truncate font-bold">{peek?.title}</h3>
            <button
              type="button"
              aria-label={t("map.closeCard")}
              onClick={() => setPeekId(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            {t("map.arrival")} {peek?.time}
            <span aria-hidden>•</span>
            <span className="truncate">{peek?.place}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {peek?.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip tone="gold">{tf("map.stopLabel", { n: peek?.order ?? "" })}</Chip>
            {peek && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams({
                    api: "1",
                    query: `${peek.lat},${peek.lng}`,
                  });
                  // query_place_id يفتح الموقع الدقيق مباشرة إن توفّر Place ID حقيقي من Google Places
                  if (peek.placeId) params.set("query_place_id", peek.placeId);
                  window.open(
                    `https://www.google.com/maps/search/?${params.toString()}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <MapPin className="size-3.5" aria-hidden />
                {t("map.viewLocation")}
              </Button>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
