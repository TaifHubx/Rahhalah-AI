import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { Chip } from "@/components/StatusChips";
import { challenges, getDestination } from "@/lib/mock-data";
import { appStore, useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "استكشف واربح | تحديات رحّالة" },
      {
        name: "description",
        content: "تحديات تصوير في الوجهات السعودية: صوّر، تحقّق بالذكاء الاصطناعي، واجمع النقاط.",
      },
      { property: "og:title", content: "استكشف واربح 🏆 | رحّالة" },
      { property: "og:description", content: "تحديات تصوير ممتعة تمنحك نقاطاً في كل وجهة." },
    ],
  }),
  component: ChallengesPage,
});

type Phase = "idle" | "verifying" | "done";

function ChallengeCard({ id, title, task, points, place }: {
  id: string;
  title: string;
  task: string;
  points: number;
  place: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { completedChallenges } = useAppStore();
  const completed = completedChallenges.includes(id);

  function handleFile(file?: File) {
    if (file) setPreview(URL.createObjectURL(file));
    setPhase("verifying");
    // محاكاة تحقق الذكاء الاصطناعي — يُستبدل لاحقاً بنداء Gemini
    setTimeout(() => {
      appStore.completeChallenge(id, points);
      setPhase("done");
    }, 2200);
  }

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{place}</p>
        </div>
        <Chip tone="gold">+{points} نقطة</Chip>
      </div>

      <p className="mt-3 text-sm leading-relaxed">{task}</p>

      {preview && (
        <img
          src={preview}
          alt="الصورة التي أرسلتها للتحدي"
          loading="lazy"
          className="mt-4 aspect-video w-full rounded-xl object-cover"
        />
      )}

      <div className="mt-4" aria-live="polite">
        {completed || phase === "done" ? (
          <div className="rounded-xl border border-success/40 bg-success/12 p-3 text-sm font-medium text-success">
            🎉 أحسنت! تم التحقق من الصورة — +{points} نقطة
          </div>
        ) : phase === "verifying" ? (
          <div className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            جاري التحقق من الصورة بالذكاء الاصطناعي...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => inputRef.current?.click()}>
              <Camera className="size-4" aria-hidden />
              ابدأ التحدي
            </Button>
            <Button variant="outline" onClick={() => handleFile()}>
              <Upload className="size-4" aria-hidden />
              رفع صورة تجريبية
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label={`ارفع صورة لتحدي ${title}`}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function ChallengesPage() {
  const { points } = useAppStore();
  const nextTier = 500;

  return (
    <div>
      <PageHeader
        title="استكشف واربح 🏆"
        subtitle="تحديات تصوير في وجهات رحلتك — نتحقق من صورتك بالذكاء الاصطناعي ونمنحك النقاط."
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <section className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h2 className="min-w-0 truncate font-bold">تقدّم نقاطك</h2>
            <span className="shrink-0 text-sm font-bold text-primary">
              {points} / {nextTier}
            </span>
          </div>
          <Progress
            value={Math.min(100, (points / nextTier) * 100)}
            className="mt-3"
            aria-label="التقدم نحو المستوى التالي"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            تبقّى {Math.max(0, nextTier - points)} نقطة للوصول إلى مستوى «رحّال ذهبي».
          </p>
        </section>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              id={c.id}
              title={c.title}
              task={c.task}
              points={c.points}
              place={getDestination(c.destinationId)?.name ?? ""}
            />
          ))}
        </div>
      </div>
    </div>
  );
}