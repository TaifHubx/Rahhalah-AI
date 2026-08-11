import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Chip } from "@/components/StatusChips";
import { localizeReward, rewards } from "@/lib/mock-data";
import { appStore, useAppStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "مكافآتي | رحّالة" },
      {
        name: "description",
        content: "استبدل نقاط رحّالة بقهوة مجانية وخصومات على التجارب السياحية والمطاعم الشريكة.",
      },
      { property: "og:title", content: "مكافآتي | رحّالة" },
      { property: "og:description", content: "نقاطك تتحول إلى تجارب وخصومات حقيقية." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { t, lang } = useI18n();
  const { points } = useAppStore();

  return (
    <div>
      <PageHeader title={t("rewards.title")} subtitle={t("rewards.subtitle")} />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <section className="rounded-2xl bg-primary p-6 text-primary-foreground">
          <p className="text-sm text-primary-foreground/80">{t("rewards.currentBalance")}</p>
          <p className="mt-1 text-3xl font-bold">
            {points} {t("rewards.pointsSuffix")}
          </p>
        </section>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {rewards.map((r) => {
            const affordable = points >= r.points;
            const rText = localizeReward(r, lang);
            return (
              <article
                key={r.id}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">
                      {r.emoji} {rText.title}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{rText.partner}</p>
                  </div>
                  <Chip tone="gold">
                    {r.points} {t("rewards.pointsUnit")}
                  </Chip>
                </div>

                <Button
                  className="mt-4 w-full"
                  variant={affordable ? "default" : "outline"}
                  disabled={!affordable}
                  onClick={() => {
                    appStore.redeem(r.points);
                    toast.success(
                      `${t("rewards.redeemedPrefix")} «${rText.title}» ${t("rewards.redeemedSuffix")}`.trim(),
                    );
                  }}
                >
                  {affordable ? t("rewards.redeem") : t("rewards.notEnough")}
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
