import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, OpenStatus } from "@/components/StatusChips";
import {
  challenges,
  getDestination,
  localizeChallenge,
  localizeDestination,
} from "@/lib/mock-data";
import { appStore, useAppStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n";
import { useLiveDestinationStatus } from "@/lib/geocoding";

export const Route = createFileRoute("/destination/$id")({
  loader: ({ params }) => {
    const destination = getDestination(params.id);
    if (!destination) throw notFound();
    return { destination };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "الوجهة غير متاحة | رحّالة" }, { name: "robots", content: "noindex" }],
      };
    }
    const d = loaderData.destination;
    return {
      meta: [
        { title: `${d.name} | رحّالة` },
        { name: "description", content: d.description },
        { property: "og:title", content: `${d.name} — ${d.city} | رحّالة` },
        { property: "og:description", content: d.description },
      ],
    };
  },
  component: DestinationPage,
});

function DestinationPage() {
  const { t, lang } = useI18n();
  const { destination: d } = Route.useLoaderData();
  const { tripIds } = useAppStore();
  const added = tripIds.includes(d.id);
  const related = challenges.filter((c) => c.destinationId === d.id);
  const text = localizeDestination(d, lang, t);
  // نفس الحالة الحيّة المستخدمة في بطاقة الوجهة (Google Places) — انظر DestinationCard.tsx.
  const live = useLiveDestinationStatus(d.name, d.city, {
    isOpen: d.isOpen,
    accessible: d.accessible,
  });

  return (
    <div>
      <div className="relative">
        <img
          src={d.image}
          alt={text.name}
          width={1024}
          height={768}
          className="h-64 w-full object-cover sm:h-80"
        />
        <div className="absolute inset-0 bg-primary/55" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-4 pb-6">
          <h1 className="text-2xl font-bold text-primary-foreground sm:text-4xl">{text.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-primary-foreground/85">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {text.cityLabel}
            <span aria-hidden>•</span>
            <Star className="size-4 shrink-0 fill-current text-gold" aria-hidden />
            {d.rating}
            <span aria-hidden>•</span>
            {text.categoryLabel}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap gap-2">
          <OpenStatus isOpen={live.isOpen} />
          <Chip tone="warning">☀️ {text.weather}</Chip>
          <Chip>
            👥 {t("destination.crowd")} {text.crowdLabel}
          </Chip>
          <Chip tone={live.accessible ? "success" : "neutral"}>
            {live.accessible ? t("card.accessible") : t("card.limitedAccess")}
          </Chip>
        </div>

        <p className="mt-6 leading-relaxed text-foreground">{text.description}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="flex items-center gap-2 font-bold">
              <Clock className="size-4 shrink-0" aria-hidden />
              {t("destination.hours")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{text.hours}</p>
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="font-bold">{t("destination.accessInfo")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{text.accessibilityNote}</p>
          </section>
        </div>

        <section className="mt-6">
          <h2 className="font-bold">{t("destination.activities")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {text.activities.map((a: string) => (
              <li key={a}>
                <Chip>{a}</Chip>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            size="lg"
            onClick={() => {
              appStore.addToTrip(d.id);
              toast.success(t("destination.addedToast").replace("{name}", text.name));
            }}
          >
            {added ? t("destination.addedToTrip") : t("destination.addToTrip")}
          </Button>
          <Button
            size="lg"
            variant="gold"
            onClick={() => toast.success(t("destination.bookedToast"))}
          >
            {t("destination.bookNow")}
          </Button>
        </div>

        <section className="mt-10 rounded-2xl bg-sand p-5">
          <h2 className="font-bold">{t("destination.challengesHere")}</h2>
          {related.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("destination.noChallenges")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {related.map((c) => {
                const cText = localizeChallenge(c, lang);
                return (
                  <li
                    key={c.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-card p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{cText.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{cText.task}</p>
                    </div>
                    <Chip tone="gold">+{c.points}</Chip>
                  </li>
                );
              })}
            </ul>
          )}
          <Button asChild variant="outline" className="mt-4">
            <Link to="/challenges">{t("destination.startChallenge")}</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
