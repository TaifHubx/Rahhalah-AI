export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="relative overflow-hidden border-b border-border/70 bg-sand">
      <div aria-hidden className="pattern-najdi absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}