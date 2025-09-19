export type UserRole = 'CANDIDATE' | 'INTERVIEWER' | 'ADMIN';

export type ExperienceLevel = 'JUNIOR' | 'MIDDLE' | 'SENIOR';

export type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de' | 'zh';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  languages: SupportedLanguage[];
  level: ExperienceLevel;
  timezone: string;
  specialties: string[];
}
