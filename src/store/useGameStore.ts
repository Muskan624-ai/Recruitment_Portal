import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type GameStage =
  | 'SPAWN'
  | 'SIGNUP'
  | 'COURTYARD'
  | 'SUBMITTED'
  | 'SHORTLISTED'
  | 'SLOT_BOOKING'
  | 'INDUCTED';

export type ActiveModal =
  | null
  | 'SIGNUP'
  | 'DOMAIN_FORM'
  | 'SETTINGS'
  | 'SLOT_PICKER';

export type DomainId = 'CoreML' | 'WebDev' | 'Design' | 'Mgmt';

export type AnchorName =
  | 'Anchor_Spawn_Point'
  | 'Anchor_Gate_SignUp'
  | 'Anchor_Portal_CoreML'
  | 'Anchor_Portal_WebDev'
  | 'Anchor_Portal_Design'
  | 'Anchor_Portal_Mgmt'
  | 'Anchor_Summit_Astrolabe';

export interface DomainQuestion {
  id: string;
  domain: DomainId;
  code: string;
  prompt: string;
  hint: string;
  maxChars: number;
}

export interface UserProfile {
  email: string;
  fullName: string;
  regNumber: string;
  phone: string;
  selectedDomains: DomainId[];
  oauthVerified: boolean;
  signedUpAt?: string;
  backendRegistered?: boolean;
  backendDomainMap?: Partial<Record<DomainId, string>>;
}

export interface BookedSlot {
  domain: DomainId;
  date: string;
  dateLabel: string;
  timeSlot: string;
  panelCode: string;
  bookedAt: string;
}

export const DOMAIN_META: Record<
  DomainId,
  {
    id: DomainId;
    label: string;
    shortLabel: string;
    subtitle: string;
    anchor: AnchorName;
    runeNode: string;
    veilNode: string;
    archNode: string;
    lintelNode: string;
    accentHex: string;
    questions: DomainQuestion[];
  }
> = {
  CoreML: {
    id: 'CoreML',
    label: 'Core Machine Learning',
    shortLabel: 'CORE_ML',
    subtitle: 'Neural Architectures, Vision, NLP & Theoretical AI',
    anchor: 'Anchor_Portal_CoreML',
    runeNode: 'Rune_CoreML',
    veilNode: 'Portal_CoreML_Veil',
    archNode: 'Portal_CoreML_Arch',
    lintelNode: 'Portal_CoreML_Lintel',
    accentHex: '#00E5FF',
    questions: [
      {
        id: 'coreml_q1',
        domain: 'CoreML',
        code: 'QUERY 01 // CORE_ML',
        prompt:
          'When training a deep transformer or vision backbone on a noisy, imbalanced dataset, how do you diagnose whether poor validation performance stems from representation collapse, overfitting, or label noise?',
        hint: 'Discuss loss landscapes, activation spectra, or concrete ablation steps you would run.',
        maxChars: 1200,
      },
      {
        id: 'coreml_q2',
        domain: 'CoreML',
        code: 'QUERY 02 // CORE_ML',
        prompt:
          'Describe a machine learning system, paper implementation, or experiment you have built from scratch. What was the hardest mathematical or engineering bottleneck you encountered?',
        hint: 'Link to repositories, benchmarks, or architectural trade-offs if applicable.',
        maxChars: 1200,
      },
      {
        id: 'coreml_q3',
        domain: 'CoreML',
        code: 'QUERY 03 // CORE_ML',
        prompt:
          'If given compute access to fine-tune or distill a 7B+ multimodal model for campus-scale research, what specific problem would you tackle and how would you evaluate success?',
        hint: 'Focus on dataset curation, evaluation metrics, and deployment realism.',
        maxChars: 1000,
      },
    ],
  },
  WebDev: {
    id: 'WebDev',
    label: 'Web & App Engineering',
    shortLabel: 'WEB_APP_DEV',
    subtitle: 'Full-Stack Distributed Systems, WebGL & Cloud Native Apps',
    anchor: 'Anchor_Portal_WebDev',
    runeNode: 'Rune_WebDev',
    veilNode: 'Portal_WebDev_Veil',
    archNode: 'Portal_WebDev_Arch',
    lintelNode: 'Portal_WebDev_Lintel',
    accentHex: '#00E5FF',
    questions: [
      {
        id: 'webdev_q1',
        domain: 'WebDev',
        code: 'QUERY 01 // WEB_APP_DEV',
        prompt:
          '3,000 students hit "Book Interview Slot" within the same 5-second window. How do you architect the frontend state, API layer, and database transactions to guarantee zero double-bookings without crashing the server?',
        hint: 'Consider optimistic UI, idempotency keys, row-level locking / Redis atomic holds, and debouncing.',
        maxChars: 1200,
      },
      {
        id: 'webdev_q2',
        domain: 'WebDev',
        code: 'QUERY 02 // WEB_APP_DEV',
        prompt:
          'What is the most technically ambitious web or mobile application you have shipped? Walk us through its component architecture, state management, and performance optimizations.',
        hint: 'Include live links, GitHub repos, or specific profiling wins.',
        maxChars: 1200,
      },
      {
        id: 'webdev_q3',
        domain: 'WebDev',
        code: 'QUERY 03 // WEB_APP_DEV',
        prompt:
          'How do you keep rich interactive visual layers (such as WebGL/Three.js canvases or real-time telemetry dashboards) strictly decoupled from mission-critical form and authentication state?',
        hint: 'Explain event buses, external stores (Zustand/Rx), and error boundary isolation.',
        maxChars: 1000,
      },
    ],
  },
  Design: {
    id: 'Design',
    label: 'Design & Spatial Media',
    shortLabel: 'DESIGN_MEDIA',
    subtitle: 'Interface Systems, 3D Environments, Motion & Visual Identity',
    anchor: 'Anchor_Portal_Design',
    runeNode: 'Rune_Design',
    veilNode: 'Portal_Design_Veil',
    archNode: 'Portal_Design_Arch',
    lintelNode: 'Portal_Design_Lintel',
    accentHex: '#00E5FF',
    questions: [
      {
        id: 'design_q1',
        domain: 'Design',
        code: 'QUERY 01 // DESIGN_MEDIA',
        prompt:
          'Great interfaces feel like a natural extension of their world (like Monument Valley) while remaining effortless to navigate on a 6-inch phone screen. How do you balance atmospheric storytelling with strict usability and accessibility?',
        hint: 'Reference typography hierarchy, contrast ratios, touch targets, and spatial cues.',
        maxChars: 1200,
      },
      {
        id: 'design_q2',
        domain: 'Design',
        code: 'QUERY 02 // DESIGN_MEDIA',
        prompt:
          'Share your strongest design case study, 3D environment, or motion reel (Figma, Behance, Blender, After Effects, or live site). What intentional design system rules did you establish?',
        hint: 'Paste your portfolio link and break down your grid, token system, and iteration process.',
        maxChars: 1200,
      },
      {
        id: 'design_q3',
        domain: 'Design',
        code: 'QUERY 03 // DESIGN_MEDIA',
        prompt:
          'AI products often default to generic chat boxes. Propose a novel visual metaphor or spatial interface for interacting with a multi-agent research assistant.',
        hint: 'Think about how confidence, memory, and branching reasoning can be represented visually.',
        maxChars: 1000,
      },
    ],
  },
  Mgmt: {
    id: 'Mgmt',
    label: 'Operations & Management',
    shortLabel: 'MANAGEMENT',
    subtitle: 'Flagship Hackathons, Sponsorship Strategy, Outreach & Operations',
    anchor: 'Anchor_Portal_Mgmt',
    runeNode: 'Rune_Mgmt',
    veilNode: 'Portal_Mgmt_Veil',
    archNode: 'Portal_Mgmt_Arch',
    lintelNode: 'Portal_Mgmt_Lintel',
    accentHex: '#00E5FF',
    questions: [
      {
        id: 'mgmt_q1',
        domain: 'Mgmt',
        code: 'QUERY 01 // MANAGEMENT',
        prompt:
          'It is 2 hours before the keynote of TAM’s 500-person national AI hackathon. The primary cloud sponsor’s API credits fail and auditorium Wi-Fi drops to 15%. Walk us through your exact 30-minute triage and communication plan.',
        hint: 'Detail stakeholder delegation, participant communication, and technical fallback coordination.',
        maxChars: 1200,
      },
      {
        id: 'mgmt_q2',
        domain: 'Mgmt',
        code: 'QUERY 02 // MANAGEMENT',
        prompt:
          'How do you pitch The AI-ML Club to an enterprise AI lab or developer-tooling sponsor so they view the partnership as high-ROI developer relations rather than a routine college sponsorship?',
        hint: 'Describe deliverables, talent pipelines, and post-event conversion metrics.',
        maxChars: 1200,
      },
      {
        id: 'mgmt_q3',
        domain: 'Mgmt',
        code: 'QUERY 03 // MANAGEMENT',
        prompt:
          'Tell us about an event, initiative, or cross-functional team you led under tight constraints. How did you keep morale high and execution sharp?',
        hint: 'Share measurable outcomes, attendance numbers, or operational frameworks.',
        maxChars: 1000,
      },
    ],
  },
};

export interface ToastNotice {
  id: number;
  message: string;
  tone: 'gold' | 'cyan';
}

export interface GameState {
  // Spatial & Funnel Progression
  currentStage: GameStage;
  targetAnchor: AnchorName;
  currentAnchor: AnchorName;
  navigationNonce: number;
  isMoving: boolean;
  activeModal: ActiveModal;
  activeDomain: DomainId;

  // Audio / UI Feedback & Camera View Mode
  soundEnabled: boolean;
  cameraZoomMultiplier: number;
  isCameraZoomedOut: boolean;
  toastNotice: ToastNotice | null;
  pulsedDomain: { domain: DomainId; timestamp: number } | null;

  // Candidate Profile & Form Cache
  userProfile: UserProfile;
  savedDrafts: Record<string, string>;
  savedQuestionTimestamps: Record<string, string>;
  applicationSealed: boolean;
  sealedAt: string | null;

  // Summit & Slot Booking
  isShortlisted: boolean;
  holdingSlotKey: string | null;
  holdingExpiresAt: number | null;
  bookedSlot: BookedSlot | null;
  lastSyncTimestamp: string | null;

  // Actions
  navigateToAnchor: (anchor: AnchorName) => void;
  setTargetAnchor: (anchor: AnchorName) => void;
  setCurrentAnchor: (anchor: AnchorName) => void;
  setIsMoving: (moving: boolean) => void;
  setActiveModal: (modal: ActiveModal) => void;
  setActiveDomain: (domain: DomainId) => void;
  setCurrentStage: (stage: GameStage) => void;
  toggleSound: () => void;
  setCameraZoomMultiplier: (mult: number) => void;
  setCameraZoomedOut: (zoomedOut: boolean) => void;
  toggleCameraZoomOut: () => void;
  showToast: (message: string, tone?: 'gold' | 'cyan') => void;
  clearToast: () => void;
  triggerPortalPulse: (domain: DomainId) => void;

  // Profile & Auth Actions
  completeSignUp: (profile: UserProfile) => void;
  updateProfileDomains: (domains: DomainId[]) => void;

  // Draft & Question Actions
  updateDraftInstant: (questionId: string, text: string) => void;
  saveQuestionResponse: (questionId: string, domain?: DomainId) => void;
  isDomainComplete: (domain: DomainId) => boolean;
  sealAndTransmitApplication: () => void;

  // Shortlist & Astrolabe Slot Actions
  setShortlistedRole: (shortlisted: boolean) => void;
  holdSlot: (slotKey: string) => void;
  confirmSlotBooking: (slot: BookedSlot) => void;
  resetSession: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  email: '',
  fullName: '',
  regNumber: '',
  phone: '',
  selectedDomains: ['CoreML', 'WebDev'],
  oauthVerified: false,
};

/**
 * Strictly verifies that every field of the first registration pop-up
 * has been filled properly before unlocking movement past Anchor_Gate_SignUp.
 */
export function isRegistrationComplete(profile?: UserProfile | null): boolean {
  if (!profile || !profile.oauthVerified) return false;
  const email = (profile.email || '').trim().toLowerCase();
  if (!email.endsWith('@vitstudent.ac.in') || email.length < 18) return false;
  const name = (profile.fullName || '').trim();
  if (name.length < 2 || name.length > 100) return false;
  const reg = (profile.regNumber || '').trim().toUpperCase();
  if (!/^\d{2}[A-Z]{3}\d{4,5}$/.test(reg)) return false;
  const phoneStripped = (profile.phone || '').trim().replace(/[\s-]/g, '');
  if (!/^(\+91)?[6-9]\d{9}$/.test(phoneStripped)) return false;
  if (!Array.isArray(profile.selectedDomains) || profile.selectedDomains.length === 0) {
    return false;
  }
  return true;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentStage: 'SPAWN',
      targetAnchor: 'Anchor_Spawn_Point',
      currentAnchor: 'Anchor_Spawn_Point',
      navigationNonce: 0,
      isMoving: false,
      activeModal: null,
      activeDomain: 'CoreML',

      soundEnabled: true,
      cameraZoomMultiplier: 1,
      isCameraZoomedOut: false,
      toastNotice: null,
      pulsedDomain: null,

      userProfile: DEFAULT_PROFILE,
      savedDrafts: {},
      savedQuestionTimestamps: {},
      applicationSealed: false,
      sealedAt: null,

      isShortlisted: false,
      holdingSlotKey: null,
      holdingExpiresAt: null,
      bookedSlot: null,
      lastSyncTimestamp: null,

      navigateToAnchor: (anchor) =>
        set((s) => {
          // Strict Gate Barrier: Cannot navigate beyond Anchor_Gate_SignUp until the first pop-up is completely filled
          const regDone = isRegistrationComplete(s.userProfile);
          const clampedAnchor =
            !regDone &&
            anchor !== 'Anchor_Spawn_Point' &&
            anchor !== 'Anchor_Gate_SignUp'
              ? 'Anchor_Gate_SignUp'
              : anchor;
          return {
            targetAnchor: clampedAnchor,
            isCameraZoomedOut: false,
            navigationNonce: s.navigationNonce + 1,
          };
        }),

      setTargetAnchor: (anchor) =>
        set((s) => {
          const regDone = isRegistrationComplete(s.userProfile);
          const clampedAnchor =
            !regDone &&
            anchor !== 'Anchor_Spawn_Point' &&
            anchor !== 'Anchor_Gate_SignUp'
              ? 'Anchor_Gate_SignUp'
              : anchor;
          return {
            targetAnchor: clampedAnchor,
            isCameraZoomedOut: false,
            navigationNonce: s.navigationNonce + 1,
          };
        }),

      setCurrentAnchor: (anchor) => set({ currentAnchor: anchor }),
      setIsMoving: (moving) => set({ isMoving: moving }),
      setActiveModal: (modal) =>
        set((s) => {
          // Strictly block questionnaire or slot booking modals until the first Sign-Up pop-up is completely filled
          if (
            !isRegistrationComplete(s.userProfile) &&
            (modal === 'DOMAIN_FORM' || modal === 'SLOT_PICKER')
          ) {
            return {
              activeModal: 'SIGNUP',
              toastNotice: {
                id: Date.now(),
                message:
                  'Please fill in all registration details properly before opening the domain questionnaires.',
                tone: 'gold',
              },
            };
          }
          return { activeModal: modal };
        }),
      setActiveDomain: (domain) => set({ activeDomain: domain }),
      setCurrentStage: (stage) => set({ currentStage: stage }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setCameraZoomMultiplier: (mult) => set({ cameraZoomMultiplier: mult }),
      setCameraZoomedOut: (zoomedOut) => set({ isCameraZoomedOut: zoomedOut }),
      toggleCameraZoomOut: () =>
        set((s) => ({ isCameraZoomedOut: !s.isCameraZoomedOut })),

      showToast: (message, tone = 'gold') =>
        set({
          toastNotice: {
            id: Date.now(),
            message,
            tone,
          },
        }),

      clearToast: () => set({ toastNotice: null }),

      triggerPortalPulse: (domain) =>
        set({
          pulsedDomain: { domain, timestamp: Date.now() },
        }),

      completeSignUp: (profile) => {
        const firstDomain = profile.selectedDomains[0] || 'CoreML';
        set(() => ({
          userProfile: {
            ...profile,
            signedUpAt: new Date().toISOString(),
          },
          currentStage: 'COURTYARD',
          activeDomain: firstDomain,
          activeModal: null,
          currentAnchor: 'Anchor_Gate_SignUp',
          targetAnchor: 'Anchor_Gate_SignUp',
          lastSyncTimestamp: new Date().toISOString(),
          toastNotice: {
            id: Date.now(),
            message:
              'Registration complete! Use Arrow Keys or WASD to climb the waterfall stairs into the courtyard.',
            tone: 'cyan',
          },
        }));
      },

      updateProfileDomains: (domains) =>
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            selectedDomains: domains.length > 0 ? domains : ['CoreML'],
          },
        })),

      updateDraftInstant: (questionId, text) =>
        set((state) => ({
          savedDrafts: {
            ...state.savedDrafts,
            [questionId]: text,
          },
        })),

      saveQuestionResponse: (questionId, domain) =>
        set((state) => ({
          savedQuestionTimestamps: {
            ...state.savedQuestionTimestamps,
            [questionId]: new Date().toISOString(),
          },
          lastSyncTimestamp: new Date().toISOString(),
          pulsedDomain: domain
            ? { domain, timestamp: Date.now() }
            : state.pulsedDomain,
        })),

      isDomainComplete: (domain) => {
        const state = get();
        const questions = DOMAIN_META[domain].questions;
        return questions.every((q) => {
          const draft = (state.savedDrafts[q.id] || '').trim();
          const savedAt = state.savedQuestionTimestamps[q.id];
          return draft.length >= 10 && Boolean(savedAt);
        });
      },

      sealAndTransmitApplication: () =>
        set((state) => ({
          applicationSealed: true,
          sealedAt: new Date().toISOString(),
          currentStage: state.isShortlisted ? 'SHORTLISTED' : 'SUBMITTED',
          activeModal: null,
          lastSyncTimestamp: new Date().toISOString(),
          toastNotice: {
            id: Date.now(),
            message: 'Application submitted! Your responses are now under review by the club board.',
            tone: 'cyan',
          },
        })),

      setShortlistedRole: (shortlisted) =>
        set((state) => ({
          isShortlisted: shortlisted,
          currentStage: shortlisted
            ? state.bookedSlot
              ? 'INDUCTED'
              : 'SHORTLISTED'
            : state.applicationSealed
            ? 'SUBMITTED'
            : state.userProfile.oauthVerified
            ? 'COURTYARD'
            : 'SPAWN',
          targetAnchor: shortlisted
            ? 'Anchor_Summit_Astrolabe'
            : state.currentAnchor === 'Anchor_Summit_Astrolabe'
            ? 'Anchor_Portal_CoreML'
            : state.targetAnchor,
          navigationNonce: state.navigationNonce + 1,
          toastNotice: {
            id: Date.now(),
            message: shortlisted
              ? 'Shortlisted! The upper staircase is now open for interview slot booking.'
              : 'Your application is under review. Interview booking unlocks once shortlisted.',
            tone: shortlisted ? 'gold' : 'cyan',
          },
        })),

      holdSlot: (slotKey) =>
        set({
          holdingSlotKey: slotKey,
          holdingExpiresAt: Date.now() + 2 * 60 * 1000, // 2-minute atomic hold
        }),

      confirmSlotBooking: (slot) =>
        set({
          bookedSlot: slot,
          holdingSlotKey: null,
          holdingExpiresAt: null,
          currentStage: 'INDUCTED',
          lastSyncTimestamp: new Date().toISOString(),
          toastNotice: {
            id: Date.now(),
            message: `Interview confirmed for ${slot.dateLabel} (${slot.timeSlot}). You can now download your calendar invite.`,
            tone: 'gold',
          },
        }),

      resetSession: () =>
        set((s) => ({
          currentStage: 'SPAWN',
          targetAnchor: 'Anchor_Spawn_Point',
          currentAnchor: 'Anchor_Spawn_Point',
          navigationNonce: s.navigationNonce + 1,
          isMoving: false,
          activeModal: null,
          activeDomain: 'CoreML',
          userProfile: DEFAULT_PROFILE,
          savedDrafts: {},
          savedQuestionTimestamps: {},
          applicationSealed: false,
          sealedAt: null,
          isShortlisted: false,
          holdingSlotKey: null,
          holdingExpiresAt: null,
          bookedSlot: null,
          lastSyncTimestamp: null,
          toastNotice: {
            id: Date.now(),
            message: 'Signed out. Your local session has been reset.',
            tone: 'cyan',
          },
        })),
    }),
    {
      name: 'tam-impossible-spire-storage-v3',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStage: state.currentStage,
        targetAnchor: state.targetAnchor,
        currentAnchor: state.currentAnchor,
        activeDomain: state.activeDomain,
        soundEnabled: state.soundEnabled,
        userProfile: state.userProfile,
        savedDrafts: state.savedDrafts,
        savedQuestionTimestamps: state.savedQuestionTimestamps,
        applicationSealed: state.applicationSealed,
        sealedAt: state.sealedAt,
        isShortlisted: state.isShortlisted,
        bookedSlot: state.bookedSlot,
        lastSyncTimestamp: state.lastSyncTimestamp,
      }),
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<GameState>),
        };
        if (!isRegistrationComplete(merged.userProfile)) {
          merged.userProfile = {
            ...merged.userProfile,
            oauthVerified: false,
          };
          if (
            merged.currentAnchor !== 'Anchor_Spawn_Point' &&
            merged.currentAnchor !== 'Anchor_Gate_SignUp'
          ) {
            merged.currentAnchor = 'Anchor_Gate_SignUp';
            merged.targetAnchor = 'Anchor_Gate_SignUp';
          }
        }
        return merged;
      },
    }
  )
);
