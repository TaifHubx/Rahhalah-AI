import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DestinationCard } from "@/components/DestinationCard";
import { destinations } from "@/lib/mock-data";
import { appStore, useAppStore } from "@/lib/app-store";
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
      { property: "og:description", content: "وجهات مقترحة تناسب تفضيلاتك مع حالة الفتح والازدحام." },
    ],
  }),
  component: ExplorePage,
});

const filters = [
  "الكل",
  "تراثي",
  "طبيعي",
  "ترفيهي",
  "عائلي",
  "أصحاب الهمم",
  "مفتوح الآن",
] as const;

function ExplorePage() {
  const [active, setActive] = useState<(typeof filters)[number]>("الكل");
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
      <PageHeader
        title="وجهات مقترحة لك"
        subtitle="اخترنا هذه الوجهات بناءً على تفضيلاتك. استخدم الفلاتر لتضييق النتائج."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div
          role="group"
          aria-label="فلاتر الوجهات"
          className="flex flex-wrap gap-2"
        >
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={active === f}
              onClick={() => setActive(f)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                active === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{results.length} وجهة مطابقة</p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((d) => (
            <DestinationCard
              key={d.id}
              destination={d}
              showRating
              added={tripIds.includes(d.id)}
              onAdd={(id) => {
                appStore.addToTrip(id);
                toast.success(`تمت إضافة ${d.name} إلى رحلتك`);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}