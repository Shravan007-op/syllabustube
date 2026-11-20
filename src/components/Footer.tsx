export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface py-6 text-center text-xs text-text-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-mono text-[11px]">
          SyllabusTube · Structured Study Roadmaps
        </p>
        <p className="text-[11px] text-text-subtle">
          Client-side extraction. Video results sourced via YouTube Data API.
        </p>
      </div>
    </footer>
  );
}
