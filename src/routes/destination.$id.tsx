import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, OpenStatus } from "@/components/StatusChips";
import { challenges, getDestination } from "@/lib/mock-data";
import { appStore, useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/destination/$id")({
  loader: ({ params }) => {
    const destination = getDestination(params.id);
    if (!destination) throw notFound();
    return { destination };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "الوجهة غير متاحة | رحّالة" }, { name: "robots", content: "noindex" }] };
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
  const { destination: d } = Route.useLoaderData();
  const { tripIds } = useAppStore();
  const added = tripIds.includes(d.id);
  const related = challenges.filter((c) => c.destinationId === d.id);

  return (
    <div>
      <div className="relative">
        <img
          src={d.image}
          alt={d.name}
          width={1024}
          height={768}
          className="h-64 w-full object-cover sm:h-80"
        />
        <div className="absolute inset-0 bg-primary/55" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-4 pb-6">
          <h1 className="text-2xl font-bold text-primary-foreground sm:text-4xl">{d.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-primary-foreground/85">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {d.city}
            <span aria-hidden>•</span>
            <Star className="size-4 shrink-0 fill-current text-gold" aria-hidden />
            {d.rating}
            <span aria-hidden>•</span>
            {d.category}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap gap-2">
          <OpenStatus isOpen={d.isOpen} />
          <Chip tone="warning">☀️ {d.weather}</Chip>
          <Chip>👥 ازدحام {d.crowd}</Chip>
          <Chip tone={d.accessible ? "success" : "neutral"}>
            ♿ {d.accessible ? "مناسب لأصحاب الهمم" : "وصول محدود"}
          </Chip>
          {d.familyFriendly && <Chip tone="gold">👨‍👩‍👧 مناسب للعائلات</Chip>}
        </div>

        <p className="mt-6 leading-relaxed text-foreground">{d.description}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="flex items-center gap-2 font-bold">
              <Clock className="size-4 shrink-0" aria-hidden />
              ساعات العمل
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{d.hours}</p>
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="font-bold">معلومات الوصول</h2>
            <p className="mt-2 text-sm text-muted-foreground">{d.accessibilityNote}</p>
          </section>
        </div>

        <section className="mt-6">
          <h2 className="font-bold">الأنشطة المتاحة</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {d.activities.map((a: string) => (
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
              toast.success(`تمت إضافة ${d.name} إلى رحلتك`);
            }}
          >
            {added ? "✓ مضافة إلى رحلتي" : "أضف إلى رحلتي"}
          </Button>
          <Button
            size="lg"
            variant="gold"
            onClick={() => toast.success("تم إرسال طلب الحجز (تجربة أولية)")}
          >
            احجز الآن
          </Button>
        </div>

        <section className="mt-10 rounded-2xl bg-sand p-5">
          <h2 className="font-bold">تحديات يمكنك تنفيذها هنا</h2>
          {related.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">لا توجد تحديات في هذه الوجهة حالياً.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {related.map((c) => (
                <li
                  key={c.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.task}</p>
                  </div>
                  <Chip tone="gold">+{c.points}</Chip>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" className="mt-4">
            <Link to="/challenges">ابدأ التحدي</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}