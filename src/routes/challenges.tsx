import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, CheckCircle2, Loader2, RefreshCw, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { Chip } from "@/components/StatusChips";
import {
  challenges,
  getDestination,
  localizeChallenge,
  localizeDestination,
} from "@/lib/mock-data";
import { verifyChallengePhoto } from "@/lib/ai.functions";
import { useProgress } from "@/lib/progress";
import { useI18n } from "@/lib/i18n";

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

type Phase = "idle" | "verifying" | "success" | "failed" | "error";

interface Result {
  confidence: number;
  detected: string;
  feedback: string;
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    reader.readAsDataURL(file);
  });
}

function ChallengeCard({
  id,
  destinationId,
  title,
  task,
  points,
  place,
}: {
  id: string;
  destinationId: string;
  title: string;
  task: string;
  points: number;
  place: string;
}) {
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const verify = useServerFn(verifyChallengePhoto);
  const { completedChallenges, completeChallenge } = useProgress();
  const completed = completedChallenges.includes(id);

  async function handleFile(file?: File) {
    if (!file) return;
    setResult(null);
    setErrorMessage("");
    setPhase("verifying");
    try {
      const imageDataUrl = await readFile(file);
      setPreview(imageDataUrl);
      const res = await verify({
        data: { imageDataUrl, task, destinationName: place, lang },
      });
      setResult({ confidence: res.confidence, detected: res.detected, feedback: res.feedback });
      if (res.verified) {
        await completeChallenge({ challengeId: id, destinationId, points });
        setPhase("success");
      } else {
        setPhase("failed");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "تعذّر التحقق من الصورة");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setErrorMessage("");
  }

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{place}</p>
        </div>
        <Chip tone="gold">
          +{points} {t("challenges.pointsUnit")}
        </Chip>
      </div>

      <p className="mt-3 text-sm leading-relaxed">{task}</p>

      {preview && (
        <img
          src={preview}
          alt={t("challenges.uploadAlt")}
          loading="lazy"
          className="mt-4 aspect-video w-full rounded-xl object-cover"
        />
      )}

      <div className="mt-4" aria-live="polite">
        {completed || phase === "success" ? (
          <div className="rounded-xl border border-success/40 bg-success/12 p-3 text-sm text-success">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              {t("challenges.acceptedPrefix")} +{points} {t("challenges.pointsUnit")}
            </p>
            {result && (
              <p className="mt-2 text-xs leading-relaxed">
                {result.feedback || result.detected} • {t("challenges.confidence")}{" "}
                {result.confidence}%
              </p>
            )}
          </div>
        ) : phase === "verifying" ? (
          <div className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("challenges.verifying")}
          </div>
        ) : phase === "failed" ? (
          <div className="rounded-xl border border-warning/50 bg-warning/12 p-3 text-sm text-warning-foreground">
            <p className="flex items-center gap-2 font-medium">
              <XCircle className="size-4 shrink-0" aria-hidden />
              {t("challenges.rejectedTitle")}
            </p>
            <p className="mt-2 text-xs leading-relaxed">
              {result?.feedback || t("challenges.rejectedDefault")}
              {result?.detected ? ` (${t("challenges.detectedPrefix")} ${result.detected})` : ""}
            </p>
            <Button className="mt-3" size="sm" variant="outline" onClick={reset}>
              <RefreshCw className="size-3.5" aria-hidden />
              {t("challenges.tryAgain")}
            </Button>
          </div>
        ) : phase === "error" ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">{t("challenges.verifyErrorTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed">{errorMessage}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={reset}>
              <RefreshCw className="size-3.5" aria-hidden />
              {t("trip.retry")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => inputRef.current?.click()}>
              <Camera className="size-4" aria-hidden />
              {t("challenges.start")}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label={`${t("challenges.start")}: ${title}`}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" aria-hidden />
              {t("challenges.uploadFromDevice")}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function ChallengesPage() {
  const { t, lang } = useI18n();
  const { points, loading, completedChallenges } = useProgress();
  const nextTier = 500;

  return (
    <div>
      <PageHeader title={t("challenges.title")} subtitle={t("challenges.subtitle")} />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <section className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h2 className="min-w-0 truncate font-bold">{t("challenges.progressTitle")}</h2>
            {/* dir="ltr" صريح: بدونه ينعكس ترتيب "نقاطك / الهدف" بصرياً داخل صفحة RTL فيبدو
                معكوساً (كأن نقاطك أعلى من الهدف)، رغم صحة القيمة والترتيب المنطقي في الكود. */}
            <span dir="ltr" className="shrink-0 text-sm font-bold text-primary">
              {loading ? "..." : `${points} / ${nextTier}`}
            </span>
          </div>
          <Progress
            value={Math.min(100, (points / nextTier) * 100)}
            className="mt-3"
            aria-label={t("challenges.progressAria")}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {t("challenges.remainingPrefix")} {Math.max(0, nextTier - points)}{" "}
            {t("challenges.remainingSuffix")} {completedChallenges.length}{" "}
            {t("challenges.remainingTail")}
          </p>
        </section>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {challenges.map((c) => {
            const cText = localizeChallenge(c, lang);
            const dest = getDestination(c.destinationId);
            const place = dest ? localizeDestination(dest, lang, t).name : "";
            return (
              <ChallengeCard
                key={c.id}
                id={c.id}
                destinationId={c.destinationId}
                title={cText.title}
                task={cText.task}
                points={c.points}
                place={place}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
