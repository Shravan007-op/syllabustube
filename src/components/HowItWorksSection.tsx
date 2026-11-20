export function HowItWorksSection() {
  const steps = [
    {
      num: '01.',
      title: 'Upload or Paste Your Syllabus',
      description:
        'Drop your university syllabus PDF, JPG, or PNG image — or paste unit headings directly into the text editor.',
    },
    {
      num: '02.',
      title: 'Set Country, Language & Channel Priority',
      description:
        'Rank Indian educators first, choose English, Hindi, Marathi, or other languages, and add favourite YouTube channels.',
    },
    {
      num: '03.',
      title: 'Study Unit-by-Unit With Curated Videos',
      description:
        'Browse 3, 5, or 10 top-ranked video lectures per topic without hunting through unrelated search results.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="border-t border-slate-200 bg-white py-14 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-[#0B1528]">
            How SyllabusTube Works
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Designed for university students who want structured video playlists mapped directly to their exam syllabus.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-6"
            >
              <span className="font-mono text-sm font-semibold text-[#1D4ED8]">
                {step.num}
              </span>
              <h3 className="mt-2 text-base font-bold text-[#0B1528]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
