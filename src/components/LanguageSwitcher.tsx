import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, toggleLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className="min-h-11 gap-1.5 px-2 font-bold"
    >
      <Languages className="size-4" aria-hidden />
      {lang === "ar" ? "EN" : "ع"}
    </Button>
  );
}
