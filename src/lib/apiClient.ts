import { DomainId } from '@/store/useGameStore';

/**
 * Base URL for the Recruitment Backend (`backend/src/server.ts` defaults to PORT=5000).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const TOKEN_STORAGE_KEY = 'tam_recruitment_jwt_token';

/**
 * Backend stage enum matching `backend/prisma/schema.prisma`
 */
export type BackendStage =
  | 'FORM_FILLING'
  | 'SHORTLISTED'
  | 'SLOT_CHOOSING'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'REJECTED';

export interface BackendDomain {
  id: string; // 24-char hex MongoDB ObjectId
  name: string;
  slug: string;
  description?: string | null;
  subsections?: Array<{ id: string; name: string }>;
}

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  regNumber: string;
  image?: string | null;
  role: 'CANDIDATE' | 'ADMIN';
  preferredDomainIds: string[];
  stage: BackendStage;
  formSubmittedAt?: string | null;
}

export interface BackendConfigResponse {
  isOpen: boolean;
  formDeadline: string;
  serverTime: string;
  msRemaining: number;
}

export interface BackendFormQuestion {
  id: string; // 24-char hex MongoDB ObjectId
  subsectionId: string | null;
  text: string;
  required: boolean;
  maxLength: number;
  answer: string;
  savedAt: string | null;
}

export interface BackendFormDomain {
  id: string;
  name: string;
  subsections: Array<{ id: string; name: string }>;
  questions: BackendFormQuestion[];
}

export interface BackendFormResponse {
  submitted: boolean;
  deadlinePassed: boolean;
  editable: boolean;
  isOpen: boolean;
  formDeadline: string;
  serverTime: string;
  msRemaining: number;
  progress: {
    requiredAnswered: number;
    requiredTotal: number;
  };
  domains: BackendFormDomain[];
}

export interface BackendStatusResponse {
  stages: Array<{ key: BackendStage; label: string; order: number }>;
  currentStage: BackendStage;
  currentIndex: number | null;
  rejected: boolean;
  formSubmitted: boolean;
  canChooseSlots: boolean;
  formDeadline: string;
  submitted: boolean;
  deadlinePassed: boolean;
  editable: boolean;
}

export interface BackendSlotItem {
  id: string;
  subsectionId: string;
  startTime: string;
  endTime: string;
  remaining: number;
  bookedByMe: boolean;
}

export interface BackendBookingItem {
  id: string;
  userId: string;
  slotId: string;
  domainId: string;
  subsectionId: string;
  createdAt: string;
  slot: {
    startTime: string;
    endTime: string;
  };
}

/**
 * JWT Token Helpers (persisted in localStorage)
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

/**
 * Maps a backend domain (`slug` or `name`) to one of the 4 3D Courtyard Portal keys.
 * Note: `backend/prisma/seed.ts` seeds `web-dev`, `design`, and `content` (mapped to `Mgmt`),
 * while also supporting `core-ml` / `ai-ml` for `CoreML`.
 */
export function mapBackendDomainToPortalId(
  domain: Pick<BackendDomain, 'slug' | 'name'>
): DomainId {
  const s = (domain.slug || '').toLowerCase();
  const n = (domain.name || '').toLowerCase();

  if (s.includes('web') || n.includes('web')) return 'WebDev';
  if (s.includes('design') || n.includes('design')) return 'Design';
  if (
    s.includes('content') ||
    s.includes('mgmt') ||
    s.includes('manage') ||
    n.includes('content') ||
    n.includes('manage')
  ) {
    return 'Mgmt';
  }
  return 'CoreML';
}

/**
 * Validates whether a string is a 24-character hex MongoDB ObjectId (`/^[0-9a-fA-F]{24}$/`).
 */
export function isValidMongoObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Normalizes and validates an Indian 10-digit mobile number according to `backend/src/utils/validators.ts`:
 * Strips spaces/hyphens, checks `/^(\+91)?[6-9]\d{9}$/`, and returns the 10-digit string (or `null` if invalid).
 */
export function normalizeBackendPhone(rawPhone: string): string | null {
  const stripped = rawPhone.trim().replace(/[\s-]/g, '');
  if (!/^(\+91)?[6-9]\d{9}$/.test(stripped)) {
    return null;
  }
  return stripped.slice(-10);
}

/**
 * Validates a VIT registration number according to `backend/src/utils/validators.ts` (`/^\d{2}[A-Z]{3}\d{4,5}$/`).
 */
export function isValidBackendRegNumber(rawReg: string): boolean {
  return /^\d{2}[A-Z]{3}\d{4,5}$/.test(rawReg.trim().toUpperCase());
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Core HTTP helper with automatic Bearer token injection and 5-second timeout.
 */
async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiClientError(
        res.status,
        data?.error || `Request failed with status ${res.status}`,
        data?.code,
        data?.details
      );
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Typed Backend API Methods matching `backend/src/routes/*`
 */
export const apiClient = {
  /** GET /api/config -> countdown timer data */
  getConfig: () => requestJson<BackendConfigResponse>('/config'),

  /** GET /api/domains -> active domains & subsections */
  getDomains: () =>
    requestJson<{ domains: BackendDomain[] }>('/domains'),

  /** POST /api/auth/google -> exchange Google idToken for backend JWT */
  loginWithGoogle: async (idToken: string) => {
    const res = await requestJson<{
      token: string;
      registered: boolean;
      user: BackendUser | null;
      google: { email: string; name: string; picture: string | null };
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  /** GET /api/me -> current candidate profile & preferred domains */
  getMe: () =>
    requestJson<{
      registered: boolean;
      user?: BackendUser;
      preferredDomains?: Array<{ id: string; name: string; slug: string }>;
      google?: { email: string; name: string; picture: string | null };
    }>('/me'),

  /** POST /api/signup -> initial candidate registration (email comes from JWT) */
  signUp: (payload: {
    name: string;
    phone: string;
    regNumber: string;
    preferredDomainIds: string[];
  }) =>
    requestJson<{ user: BackendUser }>('/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** PUT /api/me -> update existing candidate profile / preferredDomainIds */
  updateMe: (payload: {
    name?: string;
    phone?: string;
    regNumber?: string;
    preferredDomainIds?: string[];
  }) =>
    requestJson<{ user: BackendUser }>('/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /** GET /api/form -> questions for chosen domains + saved answers + lock state */
  getForm: () => requestJson<BackendFormResponse>('/form'),

  /** PUT /api/form/answers -> save single question answer */
  saveAnswer: (questionId: string, text: string) =>
    requestJson<{ questionId: string; savedAt: string }>('/form/answers', {
      method: 'PUT',
      body: JSON.stringify({ questionId, text }),
    }),

  /** POST /api/form/submit -> final irreversible form submit */
  submitForm: () =>
    requestJson<{ submitted: boolean }>('/form/submit', {
      method: 'POST',
    }),

  /** GET /api/status -> 5-stage application flowchart status */
  getStatus: () => requestJson<BackendStatusResponse>('/status'),

  /** GET /api/slots/calendar -> availability per date in YYYY-MM */
  getSlotCalendar: (params: {
    domainId: string;
    subsectionId?: string;
    month: string;
  }) => {
    const qs = new URLSearchParams({
      domainId: params.domainId,
      month: params.month,
      ...(params.subsectionId ? { subsectionId: params.subsectionId } : {}),
    });
    return requestJson<{
      month: string;
      days: Array<{ date: string; totalSlots: number; availableSlots: number }>;
    }>(`/slots/calendar?${qs.toString()}`);
  },

  /** GET /api/slots -> slots for clicked YYYY-MM-DD date */
  getSlotsForDate: (params: {
    domainId: string;
    subsectionId?: string;
    date: string;
  }) => {
    const qs = new URLSearchParams({
      domainId: params.domainId,
      date: params.date,
      ...(params.subsectionId ? { subsectionId: params.subsectionId } : {}),
    });
    return requestJson<{ date: string; slots: BackendSlotItem[] }>(
      `/slots?${qs.toString()}`
    );
  },

  /** GET /api/slots/book -> candidate's existing slot bookings */
  getMyBookings: () =>
    requestJson<{ bookings: BackendBookingItem[] }>('/slots/book'),

  /** POST /api/slots/book -> book a slot atomically */
  bookSlot: (slotId: string) =>
    requestJson<{ booking: BackendBookingItem }>('/slots/book', {
      method: 'POST',
      body: JSON.stringify({ slotId }),
    }),

  /** DELETE /api/slots/book?bookingId=... -> cancel a booking (>= 12h before start) */
  cancelBooking: (bookingId: string) =>
    requestJson<{ cancelled: boolean }>(
      `/slots/book?bookingId=${encodeURIComponent(bookingId)}`,
      {
        method: 'DELETE',
      }
    ),
};
