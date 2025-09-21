import type { PaymentProvider } from './payments.js';

export type UserRole = 'CANDIDATE' | 'INTERVIEWER' | 'ADMIN';

export const SUBSCRIPTION_PLANS = ['FREE', 'TEAM', 'PRO'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_STATUSES = ['inactive', 'trialing', 'active', 'past_due', 'canceled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface UserSubscriptionPreferences {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  country: string;
  currency?: string;
  provider: PaymentProvider;
  complianceAcknowledged?: string[];
  requestedInvoiceAt?: string;
}

export type UserProfileRecord = Record<string, unknown> & {
  subscription?: UserSubscriptionPreferences;
};

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

export type CandidateProfileDto = {
  id: string;
  userId: string;
  displayName: string;
  timezone: string;
  experienceYears: number;
  preferredRoles: string[];
  preferredLanguages: string[];
  focusAreas: string[];
  bio?: string;
  createdAt: string;
  updatedAt: string;
};

export type CandidateProfileInput = {
  userId: string;
  displayName: string;
  timezone: string;
  experienceYears: number;
  preferredRoles: string[];
  preferredLanguages: string[];
  focusAreas: string[];
  bio?: string;
};

export type CandidateProfileUpdateInput = Partial<Omit<CandidateProfileInput, 'userId'>>;

export type PaginatedCandidatesDto = {
  candidates: CandidateProfileDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type InterviewerProfileDto = {
  id: string;
  userId: string;
  displayName: string;
  timezone: string;
  experienceYears: number;
  languages: string[];
  specializations: string[];
  bio?: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
};

export type InterviewerProfileInput = {
  userId: string;
  displayName: string;
  timezone: string;
  experienceYears: number;
  languages: string[];
  specializations: string[];
  bio?: string;
};

export type InterviewerProfileUpdateInput = Partial<Omit<InterviewerProfileInput, 'userId'>> & {
  rating?: number;
};

export type PaginatedInterviewersDto = {
  interviewers: InterviewerProfileDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type UserDto = {
  id: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: string | null;
  profile: UserProfileRecord | null;
  avatarUrl?: string;
  candidateProfile: CandidateProfileDto | null;
  interviewerProfile: InterviewerProfileDto | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  email: string;
  role: UserRole;
  password?: string;
  passwordSaltRounds?: number;
  profile?: UserProfileRecord | null;
  avatarUrl?: string | null;
};

export type UpdateUserInput = {
  email?: string;
  role?: UserRole;
  password?: string;
  passwordSaltRounds?: number;
  profile?: UserProfileRecord | null;
  avatarUrl?: string | null;
};

export type PaginatedUsersDto = {
  users: UserDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type OnboardingDraftPayload = {
  id: string;
  email: string;
  locale: SupportedLanguage;
  languages: SupportedLanguage[];
  timezone: string;
  timezoneSource: 'auto' | 'manual';
  professionId: string | null;
  customProfession?: string;
  expertiseTools: string[];
  data?: Record<string, unknown>;
  role?: UserRole;
  displayName?: string;
  experienceYears?: number;
  focusAreas?: string[];
  preferredRoles?: string[];
  bio?: string;
};

export type OnboardingDraftResponse = {
  draftId: string;
  savedAt: string;
  expiresAt?: string;
};

export type OnboardingDraftDto = OnboardingDraftPayload & {
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CompleteOnboardingPayload = {
  draftId: string;
  userId: string;
  role: UserRole;
  displayName: string;
  experienceYears: number;
  timezone: string;
  languages: SupportedLanguage[];
  focusAreas: string[];
  preferredRoles: string[];
  bio?: string;
  expertiseTools?: string[];
  customProfession?: string;
};

export type CompleteOnboardingResponse = {
  user: UserDto;
  candidateProfile?: CandidateProfileDto | null;
  interviewerProfile?: InterviewerProfileDto | null;
};

export type CreateInvitationInput = {
  email: string;
  role: UserRole;
  invitedById?: string;
  ttlMs?: number;
  metadata?: Record<string, unknown>;
};

export type ListInvitationsParams = {
  status?: 'pending' | 'accepted' | 'revoked';
  email?: string;
  role?: UserRole;
};

export type InvitationDto = {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  invitedById?: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
