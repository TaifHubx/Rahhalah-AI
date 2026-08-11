import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Loader2, Medal, Trophy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/lib/progress";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { destinations, localizeDestination } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "لوحة المتصدرين | رحّالة" },
      {
        name: "description",
        content: "ترتيب الرحّالة حسب النقاط في السعودية — عام وحسب كل وجهة.",
      },
      { property: "og:title", content: "لوحة المتصدرين 🏆 | رحّالة" },
      { property: "og:description", content: "تنافس مع الرحّالة واجمع نقاطاً في كل وجهة." },
    ],
  }),
  component: LeaderboardPage,
});

const rankIcons = [Crown, Trophy, Medal];

function LeaderboardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [scope, setScope] = useState<string | null>(null);
  const { data, isPending, isError } = useLeaderboard(scope);

  return (
    <div>
      <PageHeader title={`${t("leaderboard.title")} 🏆`} subtitle={t("leaderboard.subtitle")} />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={scope === null ? "default" : "outline"}
            onClick={() => setScope(null)}
          >
            {t("leaderboard.overall")}
          </Button>
          {destinations.map((d) => (
            <Button
              key={d.id}
              size="sm"
              variant={scope === d.id ? "default" : "outline"}
              onClick={() => setScope(d.id)}
            >
              {localizeDestination(d, lang, t).name}
            </Button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 border-b border-border/70 bg-secondary/60 px-4 py-3 text-xs font-bold text-muted-foreground">
            <span>{t("leaderboard.rank")}</span>
            <span>{t("leaderboard.traveler")}</span>
            <span>{t("leaderboard.points")}</span>
          </div>

          {isPending ? (
            <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("common.loading")}
            </p>
          ) : isError ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("common.error")}</p>
          ) : (data?.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {t("leaderboard.empty")}
            </p>
          ) : (
            <ol>
              {data!.map((row, index) => {
                const Icon = rankIcons[index];
                const isMe = user?.id === row.userId;
                return (
                  <li
                    key={row.userId}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0",
                      isMe && "bg-gold/12",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold">
                      {Icon ? (
                        <Icon className="size-4 text-gold-foreground" aria-hidden />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0 truncate font-medium">
                      {row.name}
                      {isMe && (
                        <span className="ms-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {t("leaderboard.you")}
                        </span>
                      )}
                      {scope && (
                        <span className="ms-2 text-xs text-muted-foreground">
                          {row.challenges} 📸
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-primary">
                      {row.points} {t("points.label")}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
