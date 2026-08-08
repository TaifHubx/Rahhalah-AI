import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, OpenStatus } from "@/components/StatusChips";
import type { Destination } from "@/lib/mock-data";

export function DestinationCard({
  destination,
  onAdd,
  added,
  showRating,
}: {
  destination: Destination;
  onAdd?: (id: string) => void;
  added?: boolean;
  showRating?: boolean;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)]">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={destination.image}
          alt={destination.name}
          loading="lazy"
          width={1024}
          height={768}
          className="size-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-foreground">{destination.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{destination.city}</span>
              <span aria-hidden>•</span>
              <span className="truncate">{destination.category}</span>
            </p>
          </div>
          {showRating && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold/20 px-2 py-1 text-xs font-bold text-gold-foreground">
              <Star className="size-3.5 fill-current" aria-hidden />
              {destination.rating}
            </span>
          )}
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {destination.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <OpenStatus isOpen={destination.isOpen} />
          {destination.familyFriendly && <Chip tone="gold">👨‍👩‍👧 مناسب للعائلات</Chip>}
          <Chip tone={destination.accessible ? "success" : "neutral"}>
            {destination.accessible ? "♿ مناسب لأصحاب الهمم" : "♿ وصول محدود"}
          </Chip>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" className="flex-1">
            <Link to="/destination/$id" params={{ id: destination.id }}>
              {onAdd ? "عرض التفاصيل" : "استكشف"}
            </Link>
          </Button>
          {onAdd && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onAdd(destination.id)}
            >
              {added ? "✓ في رحلتي" : "أضف لرحلتي"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}