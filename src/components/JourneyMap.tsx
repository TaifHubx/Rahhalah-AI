import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/StatusChips";
import { cn } from "@/lib/utils";
import type { JourneyStop } from "@/lib/journey";

/**
 * خريطة رحلة تفاعلية مبنية بالكامل داخل التطبيق (SVG) — بدون مفاتيح خارجية.
 * Markers مرقّمة بترتيب الرحلة + مسار متحرك + بطاقة معاينة عند الضغط على Marker.
 */

interface Props {
  stops: JourneyStop[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const PAD = 12;

export function JourneyMap({ stops, activeId, onSelect }: Props) {
  const [peekId, setPeekId] = useState<string | null>(null);

  const points = useMemo(() => {
    if (stops.length === 0) return [];
    const lats = stops.map((s) => s.lat);
    const lngs = stops.map((s) => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = Math.max(maxLat - minLat, 0.01);
    const spanLng = Math.max(maxLng - minLng, 0.01);
    const placed = stops.map((s) => ({
      stop: s,
      x: PAD + ((s.lng - minLng) / spanLng) * (100 - PAD * 2),
      y: 100 - PAD - ((s.lat - minLat) / spanLat) * (100 - PAD * 2),
    }));

    // إبعاد المحطات المتقاربة جداً حتى تبقى الدبابيس مقروءة
    const MIN = 11;
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i]!;
          const b = placed[j]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist >= MIN) continue;
          const push = (MIN - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x = Math.min(100 - PAD, Math.max(PAD, a.x - ux * push));
          a.y = Math.min(100 - PAD, Math.max(PAD, a.y - uy * push));
          b.x = Math.min(100 - PAD, Math.max(PAD, b.x + ux * push));
          b.y = Math.min(100 - PAD, Math.max(PAD, b.y + uy * push));
        }
      }
    }
    return placed;
  }, [stops]);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const routeKey = points.map((p) => p.stop.id).join("-");

  const active = points.find((p) => p.stop.id === activeId) ?? null;
  const peek = points.find((p) => p.stop.id === peekId) ?? null;

  // تقريب الخريطة نحو المحطة النشطة
  const scale = active ? 1.55 : 1;
  const tx = active ? 50 - active.x * scale : 0;
  const ty = active ? 50 - active.y * scale : 0;

  useEffect(() => {
    if (activeId) setPeekId(activeId);
  }, [activeId]);

  if (stops.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
        لا توجد محطات لعرضها على الخريطة بعد.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-sand shadow-[var(--shadow-soft)]">
      <svg
        viewBox="0 0 100 100"
        className="h-[300px] w-full sm:h-[380px]"
        role="img"
        aria-label="خريطة محطات الرحلة بالترتيب"
      >
        <defs>
          <pattern id="journey-grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#journey-grid)" className="text-border" />

        <g
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="2 2"
          />
          <path
            key={routeKey}
            d={path}
            fill="none"
            stroke="currentColor"
            className="text-primary animate-[journey-draw_1.6s_ease-out_forwards]"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset="100"
          />

          {points.map((p, i) => {
            const next = points[i + 1];
            if (!next?.stop.distanceKm) return null;
            return (
              <text
                key={`leg-${p.stop.id}`}
                x={(p.x + next.x) / 2}
                y={(p.y + next.y) / 2 - 1.5}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 2.6 }}
              >
                {next.stop.distanceKm} كم • {next.stop.travelMin} د
              </text>
            );
          })}

          {points.map((p) => {
            const isActive = p.stop.id === activeId;
            return (
              <g
                key={p.stop.id}
                role="button"
                tabIndex={0}
                aria-label={`المحطة ${p.stop.order}: ${p.stop.title}`}
                className="cursor-pointer"
                onClick={() => {
                  onSelect(p.stop.id);
                  setPeekId(p.stop.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(p.stop.id);
                    setPeekId(p.stop.id);
                  }
                }}
              >
                {isActive && (
                  <circle cx={p.x} cy={p.y} r="5.4" className="fill-gold/25 animate-pulse" />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 3.6 : 3}
                  className={cn(isActive ? "fill-gold" : "fill-primary")}
                  stroke="white"
                  strokeWidth="0.6"
                />
                <text
                  x={p.x}
                  y={p.y + 1.1}
                  textAnchor="middle"
                  className={cn(isActive ? "fill-primary" : "fill-primary-foreground")}
                  style={{ fontSize: 3, fontWeight: 700 }}
                >
                  {p.stop.order}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <p className="pointer-events-none absolute start-3 top-3 rounded-full bg-card/85 px-3 py-1 text-xs text-muted-foreground">
        {stops.length} محطات • اضغط أي دبوس لعرض التفاصيل
      </p>

      {peek && (
        <article className="absolute inset-x-3 bottom-3 grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          {peek.stop.image ? (
            <img
              src={peek.stop.image}
              alt={peek.stop.place}
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
              <h3 className="truncate font-bold">{peek.stop.title}</h3>
              <button
                type="button"
                aria-label="إغلاق البطاقة"
                onClick={() => setPeekId(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              الوصول {peek.stop.time}
              <span aria-hidden>•</span>
              <span className="truncate">{peek.stop.place}</span>
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {peek.stop.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip tone="gold">المحطة {peek.stop.order}</Chip>
              <Button asChild size="sm" variant="outline">
                <Link to="/destination/$id" params={{ id: peek.stop.destinationId }}>
                  <Navigation className="size-3.5" aria-hidden />
                  عرض التفاصيل
                </Link>
              </Button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

export function useMapScroll() {
  return useRef<HTMLDivElement>(null);
}
