import { Link } from "@tanstack/react-router";
import { LogOut, Menu, Compass, UserRound, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/lib/auth";
import { useProgress } from "@/lib/progress";
import { useI18n, type TranslationKey } from "@/lib/i18n";

const links = [
  { to: "/", key: "nav.home" },
  { to: "/explore", key: "nav.explore" },
  { to: "/trip", key: "nav.trip" },
  { to: "/challenges", key: "nav.challenges" },
  { to: "/leaderboard", key: "nav.leaderboard" },
  { to: "/rewards", key: "nav.rewards" },
] as const satisfies readonly { to: string; key: TranslationKey }[];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const { points, signedIn } = useProgress();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-card/90 backdrop-blur">
      <nav
        aria-label={t("nav.menu")}
        className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
      >
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold text-primary">{t("nav.brand")}</span>
        </Link>

        <ul className="hidden min-w-0 items-center justify-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-primary"
              >
                {t(l.key)}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1">
          {signedIn && (
            <span className="hidden items-center gap-1 rounded-full bg-gold/20 px-3 py-1.5 text-xs font-bold text-gold-foreground sm:flex">
              <Trophy className="size-3.5" aria-hidden />
              {points} {t("points.label")}
            </span>
          )}
          <LanguageSwitcher />
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("auth.logout")}
              className="min-h-11 min-w-11"
              onClick={() => void signOut()}
            >
              <LogOut className="size-5" />
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={t("auth.login")}
              className="min-h-11 min-w-11"
            >
              <Link to="/auth">
                <UserRound className="size-5" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("nav.menu")}
            aria-expanded={open}
            className="min-h-11 min-w-11 md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </nav>

      {open && (
        <ul className="grid gap-1 border-t border-border/70 px-4 py-3 md:hidden">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: l.to === "/" }}
                className="block rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary data-[status=active]:bg-secondary data-[status=active]:text-primary"
              >
                {t(l.key)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
