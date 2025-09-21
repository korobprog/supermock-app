import Head from 'next/head';
import Link from 'next/link';

const features = [
  {
    title: 'Real-time interviews',
    description: 'High fidelity WebRTC experience with collaborative tools built for technical interviews.',
    href: '/interview'
  },
  {
    title: 'AI analytics & feedback',
    description: 'Leverage multi-provider AI analysis to get structured, multilingual feedback after every session.',
    href: '/analytics'
  },
  {
    title: 'Knowledge trainer',
    description: 'Adaptive drills and coding challenges generated from your interview history and goals.',
    href: '/trainer'
  },
  {
    title: 'Slot dashboard',
    description: 'Browse slots with tabs, filters, participant details and notification preferences in one view.',
    href: '/slots'
  },
  {
    title: 'Interviewer dashboard',
    description: 'Manage availability, upcoming sessions and interview summaries in one place.',
    href: '/interviewer'
  }
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>SuperMock Desktop</title>
      </Head>
      <main>
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-secondary">
            Hybrid AI + Human interviews
          </span>
          <h1 className="max-w-2xl text-4xl font-bold md:text-5xl">
            Prepare for technical interviews with the realism of SuperMock
          </h1>
          <p className="max-w-2xl text-slate-300">
            Join live mock interviews hosted by experienced engineers, capture actionable AI feedback, and track your growth
            across six languages and 18+ specializations.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/slots"
              className="rounded-lg bg-secondary px-5 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 hover:bg-secondary/90"
            >
              Open slots dashboard
            </Link>
            <span className="text-xs text-slate-500">
              Tip: browse available slots, filter by language and tools, and join interviews on `/slots`
            </span>
          </div>
        </header>

        <section className="grid w-full max-w-5xl gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
              <h2 className="text-xl font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
              <Link className="mt-4 inline-flex text-sm font-semibold text-secondary hover:text-secondary/80" href={feature.href}>
                Explore
              </Link>
            </article>
          ))}
        </section>

        <footer className="text-xs text-slate-500">
          SuperMock Desktop Shell · v0.1.0 · Designed for https://app.supermock.ru
        </footer>
      </main>
    </>
  );
}
