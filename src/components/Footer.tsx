import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/70 bg-card">
      <div aria-hidden className="pattern-band h-1.5 w-full" />
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p className="font-bold text-primary">رحّالة | Rahhalah</p>
        <p className="mt-1">{t("footer.tagline")}</p>
        <p className="mt-3 text-xs">{t("footer.poweredBy")}</p>
      </div>
    </footer>
  );
}
