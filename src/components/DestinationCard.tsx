import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, OpenStatus } from "@/components/StatusChips";
import { useI18n } from "@/lib/i18n";
import { useLiveDestinationStatus } from "@/lib/geocoding";
import { localizeDestination, type Destination } from "@/lib/mock-data";

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
  const { t, lang } = useI18n();
  const text = localizeDestination(destination, lang, t);
  // "مفتوح الآن" و"مناسب لذوي الهمم" حيّان فعلاً من Google Places — تُستبدَل القيمة الثابتة
  // المخزّنة محلياً فور وصول رد Google (fallback بانتظاره أو لو تعذّر الجلب). لا يوجد حقل
  // "مناسب للعائلات" حقيقي في Google Places إطلاقاً، فتلك الشارة أُزيلت نهائياً.
  const live = useLiveDestinationStatus(destination.name, destination.city, {
    isOpen: destination.isOpen,
    accessible: destination.accessible,
  });
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)]">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={destination.image}
          alt={text.name}
          loading="lazy"
          width={1024}
          height={768}
          className="size-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-foreground">{text.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{text.cityLabel}</span>
              <span aria-hidden>•</span>
              <span className="truncate">{text.categoryLabel}</span>
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
          {text.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <OpenStatus isOpen={live.isOpen} />
          <Chip tone={live.accessible ? "success" : "neutral"}>
            {live.accessible ? t("card.accessible") : t("card.limitedAccess")}
          </Chip>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" className="flex-1">
            <Link to="/destination/$id" params={{ id: destination.id }}>
              {onAdd ? t("card.viewDetails") : t("card.explore")}
            </Link>
          </Button>
          {onAdd && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onAdd(destination.id)}
            >
              {added ? t("card.inTrip") : t("card.addToTrip")}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
