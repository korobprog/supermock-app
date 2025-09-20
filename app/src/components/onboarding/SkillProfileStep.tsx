import { useMemo, useState, type FormEvent } from 'react';

import {
  ALL_PROFESSION_TOOLS,
  PROFESSION_OPTIONS,
  RECENTLY_POPULAR_TOOLS,
  type ProfessionCategory
} from '@/data/professions';
import { useSaveOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { useUserProfile } from '@/store/useUserProfile';

const CATEGORY_TITLES: Record<ProfessionCategory, string> = {
  'core-engineering': 'Основные роли разработки',
  'specialized-engineering': 'Специализированные инженерные роли',
  'product-design': 'Дизайн и продукт',
  emerging: 'Нишевые и гибридные роли'
};

const CATEGORY_ORDER: ProfessionCategory[] = [
  'core-engineering',
  'specialized-engineering',
  'product-design',
  'emerging'
];

const LANGUAGE_TO_INTL_LOCALE: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  zh: 'zh-CN'
};

function formatDraftTimestamp(iso: string | null, localeCode: string): string | null {
  if (!iso) {
    return null;
  }

  const intlLocale = LANGUAGE_TO_INTL_LOCALE[localeCode] ?? 'en-US';

  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat(intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      day: '2-digit',
      month: 'short'
    }).format(dt);
  } catch (error) {
    return null;
  }
}

export default function SkillProfileStep() {
  const profile = useUserProfile((state) => state.profile);
  const setProfession = useUserProfile((state) => state.setProfession);
  const setCustomProfession = useUserProfile((state) => state.setCustomProfession);
  const addTool = useUserProfile((state) => state.addExpertiseTool);
  const removeTool = useUserProfile((state) => state.removeExpertiseTool);

  const [toolQuery, setToolQuery] = useState('');
  const saveDraftMutation = useSaveOnboardingDraft();

  const groupedOptions = useMemo(() => {
    return PROFESSION_OPTIONS.reduce<Record<ProfessionCategory, typeof PROFESSION_OPTIONS>>(
      (acc, option) => {
        acc[option.category] = acc[option.category] || [];
        acc[option.category]!.push(option);
        return acc;
      },
      {
        'core-engineering': [],
        'specialized-engineering': [],
        'product-design': [],
        emerging: []
      }
    );
  }, []);

  const normalizedSelectedTools = useMemo(
    () => new Set(profile.expertiseTools.map((tool) => tool.toLowerCase())),
    [profile.expertiseTools]
  );

  const suggestionPool = useMemo(() => {
    if (!toolQuery.trim()) {
      return ALL_PROFESSION_TOOLS.filter((tool) => !normalizedSelectedTools.has(tool.toLowerCase()));
    }

    const query = toolQuery.trim().toLowerCase();
    return ALL_PROFESSION_TOOLS.filter((tool) =>
      tool.toLowerCase().includes(query) && !normalizedSelectedTools.has(tool.toLowerCase())
    );
  }, [toolQuery, normalizedSelectedTools]);

  const suggestions = useMemo(() => suggestionPool.slice(0, 8), [suggestionPool]);

  const recentTools = useMemo(
    () => RECENTLY_POPULAR_TOOLS.filter((tool) => !normalizedSelectedTools.has(tool.toLowerCase())),
    [normalizedSelectedTools]
  );

  const handleAddTool = (tool: string) => {
    const trimmed = tool.trim();
    if (!trimmed) {
      return;
    }

    addTool(trimmed);
    setToolQuery('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAddTool(toolQuery);
  };

  const draftTimestamp = formatDraftTimestamp(profile.draftUpdatedAt, profile.locale);
  const handleSyncDraft = () => {
    saveDraftMutation.mutate();
  };

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary/80">
            Step 3 · Onboarding
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Tell us about your craft and tools
          </h1>
          <p className="max-w-xl text-sm text-slate-300">
            We match mentors and interviewers by role and toolset. Choose your primary direction and add the
            technologies you are most confident in today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Progress</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-8 rounded-full bg-secondary" />
            <span className="h-2 w-8 rounded-full bg-secondary" />
            <span className="h-2 w-8 rounded-full bg-secondary" />
          </div>
        </div>
      </header>

      <div className="mt-8 space-y-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Выберите основную профессию</h2>
            {draftTimestamp && (
              <p className="text-xs text-slate-500">Черновик сохранён {draftTimestamp}</p>
            )}
          </div>
          {CATEGORY_ORDER.map((category) => {
            const options = groupedOptions[category];
            if (!options?.length) {
              return null;
            }

            return (
              <div key={category} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {CATEGORY_TITLES[category]}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {options.map((option) => {
                    const isSelected = profile.professionId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={[
                          'flex h-full flex-col justify-between rounded-2xl border px-5 py-4 text-left transition',
                          isSelected
                            ? 'border-secondary/80 bg-secondary/10 text-white shadow-sm shadow-secondary/30'
                            : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                        ].join(' ')}
                        onClick={() => {
                          setProfession(isSelected ? null : option.id);
                        }}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-lg font-semibold text-white">{option.title}</h4>
                            {isSelected && (
                              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-slate-950">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300">{option.description}</p>
                          {option.tools.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {option.tools.map((tool) => (
                                <span
                                  key={tool}
                                  className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-1 text-xs text-slate-300"
                                >
                                  {tool}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {profile.professionId === 'other' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200" htmlFor="custom-profession">
              Опишите вашу роль
            </label>
            <input
              id="custom-profession"
              type="text"
              value={profile.customProfession}
              onChange={(event) => setCustomProfession(event.target.value)}
              placeholder="Например: Tech Lead, Data Analyst, SRE консультант"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Инструменты и стек</h2>
              <span className="text-xs text-slate-500">
                Добавьте 3-7 ключевых технологий, чтобы рекомендовать релевантные интервью
              </span>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold text-slate-200" htmlFor="tool-search">
                Что вы используете каждый день?
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="tool-search"
                  type="text"
                  value={toolQuery}
                  onChange={(event) => setToolQuery(event.target.value)}
                  placeholder="Например: React, Terraform, Cypress, SQL"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl border border-secondary/70 bg-secondary px-5 py-3 text-sm font-semibold text-slate-950 shadow shadow-secondary/30 transition hover:bg-secondary/90"
                >
                  Добавить
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Нажмите Enter, чтобы добавить технологию, или выберите из подсказок ниже
              </p>
            </form>
          </div>

          {profile.expertiseTools.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400">Ваш черновик стека</h3>
              <div className="flex flex-wrap gap-2">
                {profile.expertiseTools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-2 rounded-xl border border-secondary/50 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary"
                  >
                    {tool}
                    <button
                      type="button"
                      className="text-secondary/80 hover:text-secondary"
                      onClick={() => removeTool(tool)}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400">Подсказки по поиску</h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.length > 0 ? (
                suggestions.map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-xs text-slate-300 transition hover:border-secondary/60 hover:text-secondary"
                    onClick={() => handleAddTool(tool)}
                  >
                    {tool}
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-500">
                  Ничего не нашли? Добавьте свой инструмент прямо из строки поиска.
                </span>
              )}
            </div>
          </div>

          {recentTools.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400">
                Недавно популярные (seed данные площадки)
              </h3>
              <div className="flex flex-wrap gap-2">
                {recentTools.map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
                    onClick={() => handleAddTool(tool)}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-950/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSyncDraft}
                disabled={saveDraftMutation.isPending}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-secondary/60 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveDraftMutation.isPending ? 'Сохраняем…' : 'Синхронизировать через API'}
              </button>
              {saveDraftMutation.isSuccess && (
                <span className="text-xs text-emerald-300">
                  Черновик отправлен: {saveDraftMutation.data?.savedAt ?? 'сервер подтвердил сохранение'}
                </span>
              )}
              {saveDraftMutation.isError && (
                <span className="text-xs text-amber-300">
                  Не удалось синхронизировать. Повторите позже.
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300">
              Черновик профиля сохраняется локально — при подключении аккаунта мы отправим его в ваш профиль SuperMock.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
