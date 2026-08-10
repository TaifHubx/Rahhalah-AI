import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Bus,
  CalendarDays,
  Clock,
  CloudRain,
  Loader2,
  Map as MapIcon,
  MapPin,
  Moon,
  RefreshCw,
  Route as RouteIcon,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/StatusChips";
import { JourneyMap } from "@/components/JourneyMap";
import { getCityConditions } from "@/lib/live.functions";
import { adaptItineraryToConditions, generateSmartItinerary } from "@/lib/ai.functions";
import { resolvePlaceCoords, type GeocodeResult } from "@/lib/geocoding";
import {
  buildJourneyFromItinerary,
  nearestPrayer,
  resolveGeocodeQuery,
  weatherForTime,
  withComputedDistances,
  withGeocodedCoords,
  type AiItineraryStop,
  type PrayerTimings,
  type WeatherHour,
} from "@/lib/journey";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trip")({
  validateSearch: (search: Record<string, unknown>) => ({
    city: typeof search["city"] === "string" && search["city"] ? search["city"] : undefined,
    companion: typeof search["companion"] === "string" ? search["companion"] : undefined,
    types: Array.isArray(search["types"]) ? search["types"].map(String) : [],
    access: typeof search["access"] === "string" ? search["access"] : undefined,
    days:
      typeof search["days"] === "number" && search["days"] > 0
        ? Math.round(search["days"])
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "رحلتي | رحّالة" },
      {
        name: "description",
        content: "خطة رحلة سعودية مولَّدة حياً بالذكاء الاصطناعي مع خريطة تفاعلية وتكيّف لحظي.",
      },
      { property: "og:title", content: "رحلتي | رحّالة" },
      { property: "og:description", content: "خط زمني ذكي وخريطة مسار تتكيف مع ظروف رحلتك." },
    ],
  }),
  component: TripPage,
});

const weekdayFormatter = new Intl.DateTimeFormat("ar-SA", { weekday: "long" });

function stopId(destinationId: string, index: number, time: string) {
  return `${destinationId}-${index}-${time.replace(":", "")}`;
}

function TripPage() {
  const search = useSearch({ from: "/trip" });
  const city = search.city;
  const companion = search.companion || "فردي";
  const types = search.types;
  const access = search.access || "بدون متطلبات خاصة";
  const days = search.days || 1;
  const hasPreferences = Boolean(city);

  const [items, setItems] = useState<AiItineraryStop[]>([]);
  const [alertState, setAlertState] = useState<"open" | "accepted" | "kept">("open");
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [geocodedById, setGeocodedById] = useState<Record<string, GeocodeResult>>({});
  const pendingGeocodeRef = useRef(new Set<string>());
  const loadedItineraryKeyRef = useRef<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // توليد حي للخطة عبر Gemini AI استناداً إلى تفضيلات المستخدم الحقيقية من نموذج /plan —
  // بلا أي خطة افتراضية ثابتة. لا يُطلَق شيء قبل توفر مدينة فعلية من الاستعلام.
  const fetchItinerary = useServerFn(generateSmartItinerary);
  const itineraryKey = `${city ?? ""}|${companion}|${types.join(",")}|${access}|${days}`;
  const itinerary = useQuery({
    queryKey: ["itinerary", itineraryKey],
    queryFn: () =>
      fetchItinerary({
        data: {
          city: city!,
          companions: companion,
          interests: types,
          accessNeeds: access,
          days,
          lang: "ar",
        },
      }),
    enabled: hasPreferences,
    staleTime: Infinity,
    retry: 1,
  });

  // نُحمّل محطات اليوم الأول من الخطة المولَّدة إلى حالة محلية قابلة للتعديل (لاستيعاب قبول
  // اقتراح التكيّف لاحقاً) — فقط عند وصول خطة جديدة فعلياً، دون استبدال تعديلات المستخدم
  // المحلية عند أي إعادة رسم غير متعلقة.
  useEffect(() => {
    if (!itinerary.data || loadedItineraryKeyRef.current === itineraryKey) return;
    loadedItineraryKeyRef.current = itineraryKey;
    setItems(itinerary.data.days[0]?.stops ?? []);
    setAlertState("open");
    setGeocodedById({});
  }, [itinerary.data, itineraryKey]);

  const resolvedCity = itinerary.data?.city || city || "";

  const fetchConditions = useServerFn(getCityConditions);
  const conditions = useQuery({
    queryKey: ["conditions", resolvedCity],
    queryFn: () => fetchConditions({ data: { city: resolvedCity } }),
    enabled: Boolean(resolvedCity),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const hours = (conditions.data?.weather as { hours?: WeatherHour[] } | undefined)?.hours;
  const timings = (conditions.data?.prayer as { timings?: PrayerTimings } | undefined)?.timings;

  // تكيّف لحظي حي عبر Gemini AI (بدل اقتراح ثابت): يفحص الجدول الحالي فعلياً مقابل طقس
  // المدينة الحقيقي، ويقترح بديلاً واقعياً من كتالوج الوجهات إن لزم.
  const fetchAdaptation = useServerFn(adaptItineraryToConditions);
  const adaptationInputKey = items.map((i) => `${i.time}-${i.title}-${i.place}`).join("|");
  const adaptation = useQuery({
    queryKey: ["adaptation", resolvedCity, adaptationInputKey],
    queryFn: () =>
      fetchAdaptation({
        data: {
          city: resolvedCity,
          stops: items.map((i) => ({
            time: i.time,
            title: i.title,
            place: i.place,
            indoor: i.indoor,
          })),
          lang: "ar",
        },
      }),
    enabled: Boolean(resolvedCity) && items.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const baseStops = useMemo(() => buildJourneyFromItinerary(items), [items]);

  // جلب إحداثيات كل محطة جديدة (أو أُبدلت) عبر Google Places — بلا اعتماد على أي
  // إحداثيات مخزّنة يدوياً. يعمل تلقائياً عند توليد خطة جديدة وعند أي تعديل على `items`
  // (مثل قبول اقتراح التكيّف). المفتاح `${id}-${اسم المكان}` (وليس id وحده) يضمن إبطال
  // الكاش فوراً وإعادة الجلب لو تغيّر اسم الوجهة/النشاط حتى مع بقاء نفس المعرّف.
  useEffect(() => {
    let cancelled = false;
    baseStops.forEach((stop) => {
      const { key, query, placeId } = resolveGeocodeQuery(stop);
      if (geocodedById[key] || pendingGeocodeRef.current.has(key)) return;
      pendingGeocodeRef.current.add(key);

      void resolvePlaceCoords(placeId ? { query, placeId } : { query }).then((result) => {
        pendingGeocodeRef.current.delete(key);
        if (cancelled || !result) return;
        setGeocodedById((prev) => (prev[key] ? prev : { ...prev, [key]: result }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [baseStops, geocodedById]);

  const stops = useMemo(() => {
    const withCoords = withComputedDistances(withGeocodedCoords(baseStops, geocodedById));
    return withCoords.map((s) => ({
      ...s,
      weather: weatherForTime(s.time, hours) || s.weather,
      prayerNote: nearestPrayer(s.time, s.endTime, timings),
    }));
  }, [baseStops, geocodedById, hours, timings]);

  // المحطة المتأثرة فعلياً في الجدول المحلي — مطابقة نص العنوان الذي حدّده الذكاء الاصطناعي
  // (لا نطابق سلسلة فارغة أبداً: بلا replacedStopTitle حقيقي لا يوجد فهرس مطابق).
  const replacedTitle = adaptation.data?.needsChange ? adaptation.data.replacedStopTitle : null;
  const affectedIndex = replacedTitle
    ? items.findIndex((i) => i.title === replacedTitle || i.title.includes(replacedTitle))
    : -1;
  const affectedStop = affectedIndex >= 0 ? items[affectedIndex] : null;

  function focusStop(id: string) {
    setFocusedPlaceId(id);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function acceptSuggestion() {
    const suggestion = adaptation.data?.suggestion;
    if (!suggestion || affectedIndex === -1) return;
    const targetIndex = affectedIndex;

    const newTime = suggestion.time || items[targetIndex]!.time;
    setItems((prev) =>
      prev.map((stop, index) =>
        index === targetIndex
          ? {
              ...stop,
              title: suggestion.title,
              destinationId: suggestion.destinationId,
              place: suggestion.place,
              time: newTime,
              indoor: true,
              weatherNote: "نشاط داخلي مكيّف — بديل ذكي حسب الطقس",
              tip: suggestion.why,
            }
          : stop,
      ),
    );
    setFocusedPlaceId(stopId(suggestion.destinationId, targetIndex, newTime));
    setAlertState("accepted");
  }

  if (!hasPreferences) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Wand2 className="mx-auto size-10 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">لم تُحدَّد رحلتك بعد</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          أجب عن خطوات بسيطة في التخطيط الذكي، وسيبني الذكاء الاصطناعي رحلة مخصّصة لك فوراً.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/plan">ابدأ التخطيط ✨</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">
            رحلتي {resolvedCity && `في ${resolvedCity}`}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {resolvedCity || city} • {weekdayFormatter.format(new Date())} • {items.length} أنشطة
            {days > 1 && ` • اليوم الأول من ${days} أيام`}
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/plan">تعديل التفضيلات</Link>
        </Button>
      </div>

      {itinerary.isPending && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium">الذكاء الاصطناعي يبني رحلتك في {city}...</p>
          <p className="text-xs text-muted-foreground">قد يستغرق هذا بضع ثوانٍ.</p>
        </div>
      )}

      {itinerary.isError && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-warning/50 bg-warning/10 p-10 text-center">
          <AlertTriangle className="size-6 text-warning-foreground" aria-hidden />
          <p className="text-sm font-medium text-warning-foreground">
            تعذّر توليد الرحلة الآن.{" "}
            {itinerary.error instanceof Error ? itinerary.error.message : ""}
          </p>
          <Button size="sm" onClick={() => void itinerary.refetch()}>
            <RefreshCw className="size-3.5" aria-hidden />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {itinerary.isSuccess && (
        <>
          {/* حالة بيانات الطقس وأوقات الصلاة */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
            {conditions.isPending && (
              <Chip>
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> جاري جلب الطقس وأوقات
                الصلاة...
              </Chip>
            )}
            {conditions.isError && (
              <>
                <Chip tone="warning">تعذّر جلب البيانات الحيّة — نعرض بيانات تقديرية</Chip>
                <Button size="sm" variant="ghost" onClick={() => void conditions.refetch()}>
                  <RefreshCw className="size-3.5" aria-hidden />
                  إعادة المحاولة
                </Button>
              </>
            )}
            {conditions.isSuccess && (
              <>
                <Chip tone="success">☀️ طقس اليوم محدّث</Chip>
                {timings?.Maghrib && (
                  <Chip>
                    <Moon className="size-3.5" aria-hidden /> المغرب{" "}
                    {String(timings.Maghrib).slice(0, 5)}
                  </Chip>
                )}
              </>
            )}
          </div>

          {itinerary.data.summary && (
            <p className="mt-4 rounded-2xl bg-sand p-4 text-sm leading-relaxed text-foreground">
              {itinerary.data.summary}
            </p>
          )}

          {/* الخريطة التفاعلية */}
          <section ref={mapRef} className="mt-6 scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <RouteIcon className="size-4 shrink-0" aria-hidden />
              مسار الرحلة على الخريطة
            </h2>
            <JourneyMap
              stops={stops}
              focusedPlaceId={focusedPlaceId}
              onFocusPlace={setFocusedPlaceId}
            />
          </section>

          {alertState === "open" &&
            adaptation.data?.needsChange &&
            adaptation.data.suggestion &&
            affectedStop && (
              <section
                aria-live="polite"
                className="mt-6 rounded-2xl border border-warning/50 bg-warning/12 p-5"
              >
                <h2 className="flex items-center gap-2 font-bold text-warning-foreground">
                  <AlertTriangle className="size-5 shrink-0" aria-hidden />
                  تغيّر في خطتك
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {adaptation.data.reason}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">النشاط المتأثر</p>
                    <p className="mt-1 font-bold">{affectedStop.title}</p>
                    <Chip className="mt-2" tone="warning">
                      <CloudRain className="size-3.5" aria-hidden /> {affectedStop.place}
                    </Chip>
                  </div>
                  <div className="rounded-xl border border-success/40 bg-card p-3">
                    <p className="text-xs text-muted-foreground">البديل المقترح</p>
                    <p className="mt-1 font-bold">{adaptation.data.suggestion.title}</p>
                    <Chip className="mt-2" tone="success">
                      {adaptation.data.suggestion.why}
                    </Chip>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="gold" onClick={acceptSuggestion}>
                    تحديث رحلتي ✨
                  </Button>
                  <Button variant="outline" onClick={() => setAlertState("kept")}>
                    الإبقاء على خطتي
                  </Button>
                </div>
              </section>
            )}

          {alertState === "accepted" && (
            <p
              aria-live="polite"
              className="mt-6 flex items-center gap-2 rounded-2xl border border-success/40 bg-success/12 p-4 text-sm font-medium text-success"
            >
              <Sparkles className="size-4 shrink-0" aria-hidden />
              تم تحديث جدولك ومسار الخريطة حسب اقتراح الذكاء الاصطناعي.
            </p>
          )}

          {alertState === "kept" && (
            <div
              aria-live="polite"
              className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground"
            >
              أبقينا خطتك كما هي. سنتابع حالة الطقس وننبّهك عند أي تغيّر.
              <Button size="sm" variant="ghost" onClick={() => setAlertState("open")}>
                <RefreshCw className="size-3.5" aria-hidden />
                عرض الاقتراح مجدداً
              </Button>
            </div>
          )}

          {stops.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لم يُعد الذكاء الاصطناعي أي محطات لهذه الرحلة.
              <div className="mt-3">
                <Button asChild size="sm">
                  <Link to="/plan">أعد التخطيط</Link>
                </Button>
              </div>
            </div>
          ) : (
            <ol className="mt-8 space-y-4">
              {stops.map((item) => (
                <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                        item.id === focusedPlaceId
                          ? "bg-gold text-gold-foreground"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {item.order}
                    </span>
                    <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                  </div>

                  <article
                    className={cn(
                      "min-w-0 cursor-pointer rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] transition-colors",
                      item.id === focusedPlaceId
                        ? "border-gold"
                        : item.status === "جارٍ"
                          ? "border-gold/60"
                          : "border-border/70",
                    )}
                    onClick={() => focusStop(item.id)}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <h3 className="truncate font-bold">{item.title}</h3>
                      <Chip
                        tone={
                          item.status === "منجز"
                            ? "success"
                            : item.status === "جارٍ"
                              ? "gold"
                              : "neutral"
                        }
                      >
                        {item.status}
                      </Chip>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{item.place}</span>
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Chip>
                        <Clock className="size-3.5" aria-hidden /> {item.time} – {item.endTime} •{" "}
                        {item.durationMin} د
                      </Chip>
                      <Chip>
                        {item.indoor ? "🏛️" : "☀️"} {item.weather}
                      </Chip>
                      {item.prayerNote && (
                        <Chip tone="gold">
                          <Moon className="size-3.5" aria-hidden /> {item.prayerNote}
                        </Chip>
                      )}
                      <Chip>
                        <Bus className="size-3.5" aria-hidden />{" "}
                        {item.distanceKm !== null
                          ? `${item.distanceKm} كم • ${item.travelMin} د`
                          : item.travel}
                      </Chip>
                    </div>

                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          focusStop(item.id);
                        }}
                      >
                        <MapIcon className="size-3.5" aria-hidden />
                        عرض على الخريطة
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          to="/destination/$id"
                          params={{ id: item.destinationId }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          تفاصيل المكان
                        </Link>
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-8 rounded-2xl bg-sand p-5">
            <h2 className="font-bold">جاهز للمزيد؟</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              نفّذ تحديات تصوير في وجهات رحلتك واجمع نقاطاً قابلة للاستبدال.
            </p>
            <Button asChild className="mt-4">
              <Link to="/challenges">استكشف التحديات</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
