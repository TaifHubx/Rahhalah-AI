import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/StatusChips";
import { JourneyMap } from "@/components/JourneyMap";
import { getCityConditions } from "@/lib/live.functions";
import { todayItinerary, type TimelineItem } from "@/lib/mock-data";
import {
  adaptationPlan,
  buildJourney,
  nearestPrayer,
  weatherForTime,
  type PrayerTimings,
  type WeatherHour,
} from "@/lib/journey";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trip")({
  head: () => ({
    meta: [
      { title: "رحلتي اليوم | رحّالة" },
      {
        name: "description",
        content: "جدول رحلتك اليومي في السعودية مع خريطة تفاعلية وتكيّف لحظي حسب الطقس وأوقات الصلاة.",
      },
      { property: "og:title", content: "رحلتي اليوم | رحّالة" },
      { property: "og:description", content: "خط زمني ذكي وخريطة مسار تتكيف مع ظروف رحلتك." },
    ],
  }),
  component: TripPage,
});

const CITY = "الرياض";

function TripPage() {
  const [items, setItems] = useState<TimelineItem[]>(todayItinerary);
  const [alertState, setAlertState] = useState<"open" | "accepted" | "kept">("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const fetchConditions = useServerFn(getCityConditions);
  const conditions = useQuery({
    queryKey: ["conditions", CITY],
    queryFn: () => fetchConditions({ data: { city: CITY } }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const hours = (conditions.data?.weather as { hours?: WeatherHour[] } | undefined)?.hours;
  const timings = (conditions.data?.prayer as { timings?: PrayerTimings } | undefined)?.timings;

  const stops = useMemo(() => {
    return buildJourney(items).map((s) => ({
      ...s,
      weather: weatherForTime(s.time, hours) || s.weather,
      prayerNote: nearestPrayer(s.time, s.endTime, timings),
    }));
  }, [items, hours, timings]);

  function focusStop(id: string) {
    setActiveId(id);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function acceptSuggestion() {
    setItems((prev) =>
      prev.map((i) =>
        i.id === adaptationPlan.targetId
          ? {
              ...i,
              id: adaptationPlan.to.id,
              title: adaptationPlan.to.title,
              place: adaptationPlan.to.place,
              weather: "نشاط داخلي – غير متأثر بالطقس",
              indoor: true,
              booking: "مؤكد",
              travel: "١٠ دقائق بالسيارة",
            }
          : i,
      ),
    );
    setActiveId(adaptationPlan.to.id);
    setAlertState("accepted");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">رحلتي اليوم</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {CITY} • السبت • {items.length} أنشطة
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/plan">تعديل التفضيلات</Link>
        </Button>
      </div>

      {/* حالة بيانات الطقس وأوقات الصلاة */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
        {conditions.isPending && (
          <Chip>
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> جاري جلب الطقس وأوقات الصلاة...
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
                <Moon className="size-3.5" aria-hidden /> المغرب {String(timings.Maghrib).slice(0, 5)}
              </Chip>
            )}
          </>
        )}
      </div>

      {/* الخريطة التفاعلية */}
      <section ref={mapRef} className="mt-6 scroll-mt-24">
        <h2 className="mb-3 flex items-center gap-2 font-bold">
          <RouteIcon className="size-4 shrink-0" aria-hidden />
          مسار الرحلة على الخريطة
        </h2>
        <JourneyMap stops={stops} activeId={activeId} onSelect={setActiveId} />
      </section>

      {alertState === "open" && (
        <section
          aria-live="polite"
          className="mt-6 rounded-2xl border border-warning/50 bg-warning/12 p-5"
        >
          <h2 className="flex items-center gap-2 font-bold text-warning-foreground">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            تغيّر في خطتك
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{adaptationPlan.reason}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">النشاط المتأثر</p>
              <p className="mt-1 font-bold">{adaptationPlan.from.title}</p>
              <Chip className="mt-2" tone="warning">
                <CloudRain className="size-3.5" aria-hidden /> {adaptationPlan.from.place}
              </Chip>
            </div>
            <div className="rounded-xl border border-success/40 bg-card p-3">
              <p className="text-xs text-muted-foreground">البديل المقترح</p>
              <p className="mt-1 font-bold">{adaptationPlan.to.title}</p>
              <Chip className="mt-2" tone="success">
                {adaptationPlan.to.note}
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
          تم تحديث جدولك ومسار الخريطة: نشاط الساعة ١٦:٠٠ أصبح {adaptationPlan.to.title}.
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
          لا توجد محطات في رحلتك بعد.
          <div className="mt-3">
            <Button asChild size="sm">
              <Link to="/plan">ابدأ التخطيط</Link>
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
                    item.id === activeId
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
                  item.id === activeId
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
                      item.status === "منجز" ? "success" : item.status === "جارٍ" ? "gold" : "neutral"
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
                  <Chip tone={item.booking === "مؤكد" ? "success" : "neutral"}>
                    الحجز: {item.booking}
                  </Chip>
                  <Chip>
                    <Bus className="size-3.5" aria-hidden />{" "}
                    {item.distanceKm !== null
                      ? `${item.distanceKm} كم • ${item.travelMin} د`
                      : item.travel}
                  </Chip>
                </div>

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
    </div>
  );
}
