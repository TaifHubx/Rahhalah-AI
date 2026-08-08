import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Bus, CalendarDays, CloudRain, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/StatusChips";
import { todayItinerary, type TimelineItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trip")({
  head: () => ({
    meta: [
      { title: "رحلتي اليوم | رحّالة" },
      {
        name: "description",
        content: "جدول رحلتك اليومي في السعودية مع تكيّف لحظي حسب الطقس والازدحام والحجوزات.",
      },
      { property: "og:title", content: "رحلتي اليوم | رحّالة" },
      { property: "og:description", content: "خط زمني ذكي يتكيف مع الظروف الحقيقية لرحلتك." },
    ],
  }),
  component: TripPage,
});

function TripPage() {
  const [items, setItems] = useState<TimelineItem[]>(todayItinerary);
  const [alertState, setAlertState] = useState<"open" | "accepted" | "kept">("open");

  function acceptSuggestion() {
    setItems((prev) =>
      prev.map((i) =>
        i.id === "t4"
          ? {
              ...i,
              title: "المتحف الوطني",
              place: "الرياض",
              weather: "نشاط داخلي – غير متأثر بالمطر",
              indoor: true,
              booking: "مؤكد",
              travel: "١٠ دقائق بالسيارة",
            }
          : i,
      ),
    );
    setAlertState("accepted");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">رحلتي اليوم</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            الرياض • السبت • {items.length} أنشطة
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/plan">تعديل التفضيلات</Link>
        </Button>
      </div>

      {alertState === "open" && (
        <section
          aria-live="polite"
          className="mt-6 rounded-2xl border border-warning/50 bg-warning/12 p-5"
        >
          <h2 className="flex items-center gap-2 font-bold text-warning-foreground">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            تغيّر في خطتك
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            متوقع هطول أمطار الساعة ٤:٠٠ مساءً، لذلك نقترح استبدال النشاط الخارجي بنشاط داخلي قريب.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">النشاط الحالي</p>
              <p className="mt-1 font-bold">ممشى خارجي</p>
              <Chip className="mt-2" tone="warning">
                <CloudRain className="size-3.5" aria-hidden /> أمطار متوقعة
              </Chip>
            </div>
            <div className="rounded-xl border border-success/40 bg-card p-3">
              <p className="text-xs text-muted-foreground">البديل المقترح</p>
              <p className="mt-1 font-bold">المتحف الوطني</p>
              <Chip className="mt-2" tone="success">
                نشاط داخلي • ١٠ دقائق
              </Chip>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="gold" onClick={acceptSuggestion}>
              تحديث الجدول ✨
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
          تم تحديث جدولك: نشاط الساعة ٤:٠٠ أصبح زيارة المتحف الوطني.
        </p>
      )}

      {alertState === "kept" && (
        <p
          aria-live="polite"
          className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground"
        >
          أبقينا خطتك كما هي. سنتابع حالة الطقس وننبّهك عند أي تغيّر.
        </p>
      )}

      <ol className="mt-8 space-y-4">
        {items.map((item) => (
          <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
            <div className="flex flex-col items-center">
              <span className="rounded-lg bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                {item.time}
              </span>
              <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
            </div>

            <article
              className={cn(
                "min-w-0 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]",
                item.status === "جارٍ" ? "border-gold" : "border-border/70",
              )}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <h3 className="truncate font-bold">{item.title}</h3>
                <Chip tone={item.status === "منجز" ? "success" : item.status === "جارٍ" ? "gold" : "neutral"}>
                  {item.status}
                </Chip>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{item.place}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip>{item.indoor ? "🏛️" : "☀️"} {item.weather}</Chip>
                <Chip tone={item.booking === "مؤكد" ? "success" : "neutral"}>
                  الحجز: {item.booking}
                </Chip>
                <Chip>
                  <Bus className="size-3.5" aria-hidden /> {item.travel}
                </Chip>
              </div>
            </article>
          </li>
        ))}
      </ol>

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