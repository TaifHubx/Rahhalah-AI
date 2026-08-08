import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { accessNeeds, cities, placeTypes, tripCompanions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "خطط رحلتي بذكاء | رحّالة" },
      {
        name: "description",
        content: "أجب عن خمس خطوات بسيطة ليصمم رحّالة خطة رحلة سعودية مخصصة لك.",
      },
      { property: "og:title", content: "خطط رحلتي بذكاء | رحّالة" },
      { property: "og:description", content: "خمس خطوات سريعة وتحصل على جدول رحلة جاهز." },
    ],
  }),
  component: PlanPage,
});

type Answers = {
  city: string;
  companion: string;
  types: string[];
  access: string;
  days: number;
};

function OptionButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-4 text-start text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/8 text-primary"
          : "border-border bg-card hover:bg-secondary",
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      {selected && <Check className="size-4 shrink-0" aria-hidden />}
    </button>
  );
}

const steps = ["أين تريد الذهاب؟", "مع من تسافر؟", "ما نوع الأماكن التي تفضلها؟", "احتياجات الوصول", "مدة الرحلة"];

function PlanPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    city: "",
    companion: "",
    types: [],
    access: "",
    days: 3,
  });

  const canNext =
    (step === 0 && answers.city) ||
    (step === 1 && answers.companion) ||
    (step === 2 && answers.types.length > 0) ||
    (step === 3 && answers.access) ||
    step === 4;

  return (
    <div>
      <PageHeader title="لنبنِ رحلتك" subtitle="خمس خطوات قصيرة فقط — بدون نماذج طويلة." />

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-2" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-gold" : "bg-border",
              )}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          الخطوة {step + 1} من {steps.length}
        </p>

        <h2 className="mt-4 text-xl font-bold">{steps[step]}</h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {step === 0 &&
            cities.map((c) => (
              <OptionButton
                key={c}
                selected={answers.city === c}
                onClick={() => setAnswers((a) => ({ ...a, city: c }))}
              >
                {c}
              </OptionButton>
            ))}

          {step === 1 &&
            tripCompanions.map((c) => (
              <OptionButton
                key={c}
                selected={answers.companion === c}
                onClick={() => setAnswers((a) => ({ ...a, companion: c }))}
              >
                {c}
              </OptionButton>
            ))}

          {step === 2 &&
            placeTypes.map((t) => (
              <OptionButton
                key={t}
                selected={answers.types.includes(t)}
                onClick={() =>
                  setAnswers((a) => ({
                    ...a,
                    types: a.types.includes(t)
                      ? a.types.filter((x) => x !== t)
                      : [...a.types, t],
                  }))
                }
              >
                {t}
              </OptionButton>
            ))}

          {step === 3 &&
            accessNeeds.map((n) => (
              <OptionButton
                key={n}
                selected={answers.access === n}
                onClick={() => setAnswers((a) => ({ ...a, access: n }))}
              >
                {n}
              </OptionButton>
            ))}

          {step === 4 && (
            <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">عدد الأيام</span>
                <span className="text-3xl font-bold text-primary">{answers.days}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={answers.days === d}
                    onClick={() => setAnswers((a) => ({ ...a, days: d }))}
                    className={cn(
                      "min-h-11 min-w-11 rounded-xl border px-4 text-sm font-medium",
                      answers.days === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-secondary",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowRight className="size-4" aria-hidden />
              السابق
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              التالي
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button asChild variant="gold" size="lg">
              <Link to="/trip">أنشئ رحلتي ✨</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to="/explore">تخطي والاستكشاف</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}