import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DestinationCard } from "@/components/DestinationCard";
import { destinations } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import heroImg from "@/assets/hero-diriyah.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "رحّالة | تخطيط رحلات السعودية بذكاء" },
      {
        name: "description",
        content:
          "رحّالة منصة سياحة سعودية بالذكاء الاصطناعي: اكتشف الوجهات، خطط رحلتك، وتكيّف مع الظروف لحظة بلحظة.",
      },
      { property: "og:title", content: "رحّالة | رحلتك للسعودية تبدأ من هنا" },
      {
        property: "og:description",
        content: "اكتشف وجهات تناسبك، خطط رحلتك بذكاء، واستمتع بتجربة تتكيف معك لحظة بلحظة.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  const popular = destinations.filter((d) => ["diriyah", "alula", "jeddah", "abha"].includes(d.id));
  const pillars = [
    { icon: Brain, title: t("home.pillar1Title"), text: t("home.pillar1Text") },
    { icon: RefreshCw, title: t("home.pillar2Title"), text: t("home.pillar2Text") },
    { icon: Trophy, title: t("home.pillar3Title"), text: t("home.pillar3Text") },
  ];

  return (
    <div>
      <section className="relative">
        <img
          src={heroImg}
          alt={t("home.heroAlt")}
          width={1920}
          height={1088}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/70" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-xs font-bold text-gold-foreground">
              {t("home.badge")}
            </span>
            <h1 className="mt-5 text-3xl leading-tight font-bold text-primary-foreground sm:text-5xl">
              {t("home.title")}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
              {t("home.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="gold">
                <Link to="/plan">{t("home.planCta")}</Link>
              </Button>
              <Button asChild size="lg" variant="onDark">
                <Link to="/explore">{t("home.exploreCta")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/70 bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl bg-sand/60 p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <p.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">{t("home.popularTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.popularSubtitle")}</p>
          </div>
          <Button asChild variant="ghost" className="shrink-0">
            <Link to="/explore">{t("home.viewAll")}</Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((d) => (
            <DestinationCard key={d.id} destination={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
