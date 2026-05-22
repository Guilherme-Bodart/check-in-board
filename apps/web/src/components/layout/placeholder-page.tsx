export function PlaceholderPage({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        {description}
      </p>
    </section>
  );
}
