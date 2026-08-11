import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DestinationCard } from "@/components/DestinationCard";
import { destinations, localizeDestination } from "@/lib/mock-data";
import { appStore, useAppStore } from "@/lib/app-store";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "استكشف الوجهات السعودية | رحّالة" },
      {
        name: "description",
        content: "تصفّح وجهات تراثية وطبيعية وترفيهية في السعودية مع فلاتر للعائلات وأصحاب الهمم.",
      },
      { property: "og:title", content: "استكشف الوجهات السعودية | رحّالة" },
      {
        property: "og:description",
        content: "وجهات مقترحة تناسب تفضيلاتك مع حالة الفتح والازدحام.",
      },
    ],
  }),
  component: ExplorePage,
});

// القيم الداخلية (المفاتيح) تبقى عربية ثابتة لمطابقة d.category في mock-data — فقط تسمية
// العرض (label) هي التي تُترجم عبر i18n. انظر ai.functions.ts/mock-data.ts لنفس النمط.
const filters = [
  { value: "الكل", label: "explore.filter.all" satisfies TranslationKey },
  { value: "تراثي", label: "explore.filter.heritage" satisfies TranslationKey },
  { value: "طبيعي", label: "explore.filter.nature" satisfies TranslationKey },
  { value: "ترفيهي", label: "explore.filter.entertainment" satisfies TranslationKey },
  { value: "عائلي", label: "explore.filter.family" satisfies TranslationKey },
  { value: "أصحاب الهمم", label: "explore.filter.accessible" satisfies TranslationKey },
  { value: "مفتوح الآن", label: "explore.filter.openNow" satisfies TranslationKey },
] as const;

function ExplorePage() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState<(typeof filters)[number]["value"]>("الكل");
  const { tripIds } = useAppStore();

  const results = useMemo(
    () =>
      destinations.filter((d) => {
        if (active === "الكل") return true;
        if (active === "عائلي") return d.familyFriendly;
        if (active === "أصحاب الهمم") return d.accessible;
        if (active === "مفتوح الآن") return d.isOpen;
        return d.category === active;
      }),
    [active],
  );

  return (
    <div>
      <PageHeader title={t("explore.title")} subtitle={t("explore.subtitle")} />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div role="group" aria-label={t("explore.filtersLabel")} className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={active === f.value}
              onClick={() => setActive(f.value)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                active === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {t(f.label)}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {results.length} {t("explore.resultsSuffix")}
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((d) => (
            <DestinationCard
              key={d.id}
              destination={d}
              showRating
              added={tripIds.includes(d.id)}
              onAdd={(id) => {
                appStore.addToTrip(id);
                const name = localizeDestination(d, lang, t).name;
                toast.success(t("explore.addedToast").replace("{name}", name));
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
