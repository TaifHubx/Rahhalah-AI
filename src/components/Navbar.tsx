import { Link } from "@tanstack/react-router";
import { UserRound, Menu, Compass } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "الرئيسية" },
  { to: "/explore", label: "استكشف" },
  { to: "/trip", label: "رحلتي" },
  { to: "/challenges", label: "التحديات" },
  { to: "/rewards", label: "المكافآت" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-card/90 backdrop-blur">
      <nav
        aria-label="التنقل الرئيسي"
        className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
      >
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold text-primary">رحّالة</span>
        </Link>

        <ul className="hidden min-w-0 items-center justify-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-primary"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="الملف الشخصي" className="min-h-11 min-w-11">
            <UserRound className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="القائمة"
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
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}