import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import {
  ACCESS_NEED_LABEL_EN,
  accessNeeds,
  CITY_LABEL_EN,
  cities,
  COMPANION_LABEL_EN,
  PLACE_TYPE_LABEL_EN,
  placeTypes,
  tripCompanions,
} from "@/lib/mock-data";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "خطط رحلتي بذكاء | رحّالة" },
      {
        name: "description",
        content: "أجب عن أربع خطوات بسيطة ليصمم رحّالة خطة رحلة سعودية مخصصة لك.",
      },
      { property: "og:title", content: "خطط رحلتي بذكاء | رحّالة" },
      { property: "og:description", content: "أربع خطوات سريعة وتحصل على جدول رحلة جاهز." },
    ],
  }),
  component: PlanPage,
});

type Answers = {
  city: string;
  companion: string;
  types: string[];
  access: string;
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

// عناوين الخطوات مترجمة عبر i18n؛ قيم الخيارات نفسها (المدن، أنواع الرفقة...) تبقى عربية
// ثابتة داخلياً لأنها تُرسل كما هي لبناء الرحلة بالذكاء الاصطناعي وربط الإحداثيات الجغرافية —
// فقط تسمية العرض تُترجم عبر خرائط *_LABEL_EN أعلاه، بنفس نمط explore.tsx/mock-data.ts.
const stepTitles: TranslationKey[] = ["plan.step0", "plan.step1", "plan.step2", "plan.step3"];

function PlanPage() {
  const { t, tf, lang } = useI18n();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    city: "",
    companion: "",
    types: [],
    access: "",
  });

  const canNext =
    (step === 0 && answers.city) ||
    (step === 1 && answers.companion) ||
    (step === 2 && answers.types.length > 0) ||
    (step === 3 && answers.access);

  return (
    <div>
      <PageHeader title={t("plan.title")} subtitle={t("plan.subtitle")} />

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-2" aria-hidden>
          {stepTitles.map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-gold" : "bg-border")}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {tf("plan.stepOf", { n: step + 1, m: stepTitles.length })}
        </p>

        <h2 className="mt-4 text-xl font-bold">{t(stepTitles[step]!)}</h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {step === 0 &&
            cities.map((c) => (
              <OptionButton
                key={c}
                selected={answers.city === c}
                onClick={() => setAnswers((a) => ({ ...a, city: c }))}
              >
                {lang === "en" ? (CITY_LABEL_EN[c] ?? c) : c}
              </OptionButton>
            ))}

          {step === 1 &&
            tripCompanions.map((c) => (
              <OptionButton
                key={c}
                selected={answers.companion === c}
                onClick={() => setAnswers((a) => ({ ...a, companion: c }))}
              >
                {lang === "en" ? (COMPANION_LABEL_EN[c] ?? c) : c}
              </OptionButton>
            ))}

          {step === 2 &&
            placeTypes.map((t2) => (
              <OptionButton
                key={t2}
                selected={answers.types.includes(t2)}
                onClick={() =>
                  setAnswers((a) => ({
                    ...a,
                    types: a.types.includes(t2)
                      ? a.types.filter((x) => x !== t2)
                      : [...a.types, t2],
                  }))
                }
              >
                {lang === "en" ? (PLACE_TYPE_LABEL_EN[t2] ?? t2) : t2}
              </OptionButton>
            ))}

          {step === 3 &&
            accessNeeds.map((n) => (
              <OptionButton
                key={n}
                selected={answers.access === n}
                onClick={() => setAnswers((a) => ({ ...a, access: n }))}
              >
                {lang === "en" ? (ACCESS_NEED_LABEL_EN[n] ?? n) : n}
              </OptionButton>
            ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowRight className="size-4" aria-hidden />
              {t("plan.back")}
            </Button>
          )}
          {step < stepTitles.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              {t("plan.next")}
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button asChild variant="gold" size="lg">
              <Link
                to="/trip"
                search={{
                  city: answers.city,
                  companion: answers.companion,
                  types: answers.types,
                  access: answers.access,
                }}
              >
                {t("plan.create")}
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to="/explore">{t("plan.skip")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
