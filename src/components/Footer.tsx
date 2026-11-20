export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#0B1528] text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-base font-bold text-white">SyllabusTube</p>
          <p className="mt-1 text-xs text-slate-400">
            Educational syllabus search engine · Unit-by-unit YouTube learning roadmaps
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
          <a href="#upload-section" className="hover:text-white transition-colors">
            Upload Syllabus
          </a>
          <a href="#preferences-section" className="hover:text-white transition-colors">
            Preferences
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
        </div>
      </div>
    </footer>
  );
}
