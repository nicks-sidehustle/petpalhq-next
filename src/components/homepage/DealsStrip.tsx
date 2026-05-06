export default function DealsStrip() {
  return (
    <aside
      className="rounded-lg p-4 border border-dashed border-gray-300 text-center"
      style={{ backgroundColor: "var(--color-cream-deep)", color: "var(--color-text-muted)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-1">Deals &amp; Featured</p>
      <p className="text-sm">Price drops and featured picks coming soon.</p>
    </aside>
  );
}
