import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "gold";
  className?: string;
}) {
  const tones = {
    neutral: "bg-secondary text-secondary-foreground",
    success: "bg-success/12 text-success",
    warning: "bg-warning/18 text-warning-foreground",
    gold: "bg-gold/20 text-gold-foreground",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OpenStatus({ isOpen }: { isOpen: boolean }) {
  const { t } = useI18n();
  return (
    <Chip tone={isOpen ? "success" : "neutral"}>
      {isOpen ? t("card.openNow") : t("card.closedNow")}
    </Chip>
  );
}
