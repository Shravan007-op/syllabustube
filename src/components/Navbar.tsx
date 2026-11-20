import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Brand Wordmark */}
        <a
          href="#top"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#0B1528] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E3D] focus-visible:ring-offset-2 rounded-md"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F1E3D] text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <polygon points="10,8 15,11 10,14" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span>SyllabusTube</span>
        </a>

        {/* Primary Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600"
        >
          <a
            href="#upload-section"
            className="whitespace-nowrap shrink-0 py-1 hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E3D] rounded"
          >
            Upload Syllabus
          </a>
          <a
            href="#preferences-section"
            className="whitespace-nowrap shrink-0 py-1 hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E3D] rounded"
          >
            Preferences
          </a>
          <a
            href="#how-it-works"
            className="whitespace-nowrap shrink-0 py-1 hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E3D] rounded"
          >
            How It Works
          </a>
        </nav>

        {/* Mobile Drawer Trigger */}
        <div className="flex items-center md:hidden shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#0B1528] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          <a
            href="#upload-section"
            onClick={handleLinkClick}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B1528]"
          >
            Upload Syllabus
          </a>
          <a
            href="#preferences-section"
            onClick={handleLinkClick}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B1528]"
          >
            Preferences
          </a>
          <a
            href="#how-it-works"
            onClick={handleLinkClick}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B1528]"
          >
            How It Works
          </a>
        </div>
      )}
    </header>
  );
}
