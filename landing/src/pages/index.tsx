import Head from 'next/head';
import Link from 'next/link';

const sections = [
  {
    heading: 'Interview marketplace',
    description:
      'Book mock interviews with certified engineers, polyglot interviewers and mentors matched by profession, stack and timezone.',
    cta: 'Explore interview formats',
    href: '/interview'
  },
  {
    heading: 'AI enhanced analytics',
    description:
      'SuperMock analyses every response with multiple AI providers, delivering actionable scorecards and long term growth plans.',
    cta: 'See analytics preview',
    href: '/analytics'
  },
  {
    heading: 'Knowledge trainer',
    description:
      'Strengthen weak spots identified during sessions with adaptive drills, coding challenges and behavioural prompts.',
    cta: 'Train smarter',
    href: '/trainer'
  }
];

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>SuperMock · Hybrid AI Mock Interviews</title>
      </Head>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
        <header className="flex flex-col gap-6 text-center">
          <span className="mx-auto rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-brand-200">
            Practice. Learn. Get hired.
          </span>
          <h1 className="text-4xl font-bold md:text-6xl">
            Human + AI powered interview preparation without borders
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-slate-300">
            SuperMock matches you with seasoned interviewers across 18+ IT roles, delivers six-language support and turns every
            session into a personalised training plan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg" href="/signup">
              Start beta access
            </Link>
            <Link className="text-sm font-semibold text-brand-200 hover:text-brand-100" href="/docs/overview">
              Read product vision →
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {sections.map((section) => (
            <article key={section.heading} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
              <h2 className="text-xl font-semibold text-white">{section.heading}</h2>
              <p className="mt-2 text-sm text-slate-300">{section.description}</p>
              <Link className="mt-4 inline-flex text-sm font-semibold text-brand-200" href={section.href}>
                {section.cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-left">
          <h2 className="text-2xl font-semibold text-white">Built for the global community</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">Languages</p>
              <p className="text-lg text-white">English · Русский · Español · Français · Deutsch · 中文</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">Roles</p>
              <p className="text-lg text-white">18+ IT specialties covering engineering, data, product and design</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">Social mission</p>
              <p className="text-lg text-white">10% of revenue funds scholarships & inclusive interview coaching</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
