import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { discoverSimilarDestinations } from "@/lib/ai.functions";
import { getDestination, localizeDestination } from "@/lib/mock-data";

type Result = Awaited<ReturnType<typeof discoverSimilarDestinations>>;

const MAX_BYTES = 6 * 1024 * 1024;

/** رحّالة AI — رفع صورة لمكان عالمي واقتراح شبيهه السعودي عبر Gemini Vision. */
export function RahhalahAi() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPreview(null);
    setResult(null);
    setBusy(false);
  }

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("common.error"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("حجم الصورة كبير جداً (الحد ٦ ميجابايت)");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });

    setPreview(dataUrl);
    setResult(null);
    setBusy(true);
    try {
      const data = await discoverSimilarDestinations({
        data: { imageDataUrl: dataUrl, lang },
      });
      setResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="gold"
        aria-label={t("ai.open")}
        onClick={() => setOpen(true)}
        className="fixed bottom-5 end-5 z-50 h-14 gap-2 rounded-full px-5 shadow-[var(--shadow-card)]"
      >
        <Sparkles className="size-5" aria-hidden />
        <span className="hidden sm:inline">{t("ai.title")}</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-gold-foreground" aria-hidden />
              {t("ai.title")}
            </DialogTitle>
            <DialogDescription>{t("ai.subtitle")}</DialogDescription>
          </DialogHeader>

          {preview && (
            <img
              src={preview}
              alt="الصورة المرفوعة"
              loading="lazy"
              className="aspect-video w-full rounded-xl object-cover"
            />
          )}

          {!preview && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid w-full place-items-center gap-2 rounded-2xl border-2 border-dashed border-border p-10 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <ImagePlus className="size-8" aria-hidden />
              {t("ai.upload")}
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={t("ai.upload")}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />

          <div aria-live="polite">
            {busy && (
              <p className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("ai.analyzing")}
              </p>
            )}

            {result && !busy && (
              <div className="grid gap-4">
                <div className="rounded-xl bg-sand p-4">
                  <p className="text-xs text-muted-foreground">{t("ai.recognized")}</p>
                  <p className="mt-1 font-bold">{result.recognizedPlace || "—"}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {result.sceneSummary}
                  </p>
                </div>

                <h3 className="font-bold">{t("ai.matches")}</h3>
                {result.matches.map((match) => {
                  const dest = getDestination(match.destinationId);
                  return (
                    <article
                      key={match.destinationId}
                      className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-border/70 p-3"
                    >
                      {dest && (
                        <img
                          src={dest.image}
                          alt={localizeDestination(dest, lang, t).name}
                          loading="lazy"
                          width={1024}
                          height={768}
                          className="size-20 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                          <h4 className="truncate font-bold">{match.destinationName}</h4>
                          <span className="shrink-0 text-xs font-bold text-primary">
                            {match.similarity}%
                          </span>
                        </div>
                        <Progress value={match.similarity} className="mt-2 h-1.5" />
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {match.reason}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("ai.bestTime")}: {match.bestTime}
                        </p>
                        {dest && (
                          <Button asChild size="sm" variant="outline" className="mt-2">
                            <Link
                              to="/destination/$id"
                              params={{ id: dest.id }}
                              onClick={() => setOpen(false)}
                            >
                              {t("ai.view")}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}

                <Button variant="ghost" onClick={reset}>
                  <X className="size-4" aria-hidden />
                  {t("ai.retry")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
