'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Save,
  Send,
  Lock,
  Layers,
  Check,
} from 'lucide-react';
import {
  useGameStore,
  DOMAIN_META,
  DomainId,
  DomainQuestion,
} from '@/store/useGameStore';
import {
  apiClient,
  getAuthToken,
  isValidMongoObjectId,
  mapBackendDomainToPortalId,
  ApiClientError,
} from '@/lib/apiClient';

function AutoExpandingQuestionCard({
  question,
  index,
  disabled,
}: {
  question: DomainQuestion;
  index: number;
  disabled: boolean;
}) {
  // Initialize from Zustand cache once on mount; keystrokes stay in local component state
  const [localText, setLocalText] = useState<string>(
    () => useGameStore.getState().savedDrafts[question.id] || ''
  );
  const savedAt = useGameStore((s) => s.savedQuestionTimestamps[question.id]);
  const updateDraftInstant = useGameStore((s) => s.updateDraftInstant);
  const saveQuestionResponse = useGameStore((s) => s.saveQuestionResponse);

  const [justPulsed, setJustPulsed] = useState(false);
  const [syncState, setSyncState] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storeWriteTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, question.maxChars);
    setLocalText(val);
    setSyncState('SAVING');

    // Auto-expand textarea height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.max(110, e.target.scrollHeight)}px`;

    // Coalesce localStorage draft write (120ms)
    if (storeWriteTimerRef.current) {
      clearTimeout(storeWriteTimerRef.current);
    }
    storeWriteTimerRef.current = setTimeout(() => {
      updateDraftInstant(question.id, val);
    }, 120);

    // Debounced auto-save after 3s of inactivity
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (val.trim().length >= 10) {
        updateDraftInstant(question.id, val);
        saveQuestionResponse(question.id, question.domain);
        if (getAuthToken() && isValidMongoObjectId(question.id)) {
          apiClient.saveAnswer(question.id, val).catch(() => {
            // Keep local save when backend is unreachable
          });
        }
        setSyncState('SAVED');
      } else {
        setSyncState('IDLE');
      }
    }, 3000);
  };

  const handleManualSave = () => {
    if (localText.trim().length < 10) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (storeWriteTimerRef.current) clearTimeout(storeWriteTimerRef.current);
    updateDraftInstant(question.id, localText);
    saveQuestionResponse(question.id, question.domain);
    if (getAuthToken() && isValidMongoObjectId(question.id)) {
      apiClient.saveAnswer(question.id, localText).catch(() => {
        // Keep local save when backend is unreachable
      });
    }
    setSyncState('SAVED');
    setJustPulsed(true);
    setTimeout(() => setJustPulsed(false), 1200);
  };

  const isSavedAndValid = localText.trim().length >= 10 && Boolean(savedAt);

  return (
    <div
      className={`p-5 rounded-xl border transition-all ${
        justPulsed
          ? 'bg-[#FCE4EC]/30 border-[#EE6E93]'
          : isSavedAndValid
          ? 'bg-white border-[#00897B]/40'
          : 'bg-[#F4EFEA]/80 border-[#E6DCD2]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#7C7267]">
          Question {index + 1}
        </span>

        <div className="flex items-center gap-2">
          {syncState === 'SAVING' && (
            <span className="font-sans text-xs text-[#E65100]">
              Saving draft...
            </span>
          )}
          {isSavedAndValid && syncState !== 'SAVING' && (
            <span className="font-sans text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#E0F2F1] text-[#00695C] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}
        </div>
      </div>

      <h3 className="font-sans text-sm font-semibold text-[#1F2328] leading-snug mb-1.5">
        {question.prompt}
      </h3>
      <p className="font-sans text-xs text-[#6E7781] mb-3">{question.hint}</p>

      <textarea
        value={localText}
        disabled={disabled}
        onChange={handleTextChange}
        rows={4}
        placeholder="Write your response here (minimum 10 characters)..."
        className="w-full bg-white border border-[#E6DCD2] focus:border-[#EE6E93] rounded-lg p-3.5 font-sans text-sm text-[#1F2328] placeholder:text-[#8C827A] focus:outline-none transition-colors resize-none leading-relaxed disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        <span className="font-sans text-xs text-[#7C7267]">
          {localText.length} / {question.maxChars} characters
        </span>

        <button
          type="button"
          disabled={disabled || localText.trim().length < 10}
          onClick={handleManualSave}
          className={`px-4 py-1.5 rounded-lg font-sans text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            justPulsed
              ? 'bg-[#00897B] text-white'
              : 'bg-white border border-[#E6DCD2] text-[#2A2E33] hover:border-[#EE6E93] hover:text-[#C2185B]'
          }`}
        >
          {justPulsed ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-[#EE6E93]" />
              <span>Save Draft</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function QuestionModal() {
  const activeModal = useGameStore((s) => s.activeModal);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const activeDomain = useGameStore((s) => s.activeDomain);
  const setActiveDomain = useGameStore((s) => s.setActiveDomain);
  const navigateToAnchor = useGameStore((s) => s.navigateToAnchor);
  const userProfile = useGameStore((s) => s.userProfile);
  const isDomainComplete = useGameStore((s) => s.isDomainComplete);
  const applicationSealed = useGameStore((s) => s.applicationSealed);
  const sealAndTransmitApplication = useGameStore(
    (s) => s.sealAndTransmitApplication
  );
  const updateDraftInstant = useGameStore((s) => s.updateDraftInstant);
  const saveQuestionResponse = useGameStore((s) => s.saveQuestionResponse);
  const showToast = useGameStore((s) => s.showToast);

  const [confirmSealModal, setConfirmSealModal] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [backendQuestionsByDomain, setBackendQuestionsByDomain] = useState<
    Partial<Record<DomainId, DomainQuestion[]>>
  >({});

  // Sync live form questions & saved answers from GET /api/form when backend JWT is active
  useEffect(() => {
    if (activeModal !== 'DOMAIN_FORM' || !userProfile.oauthVerified) return;
    if (!getAuthToken()) return;

    let cancelled = false;
    apiClient
      .getForm()
      .then((res) => {
        if (cancelled) return;
        const mapped: Partial<Record<DomainId, DomainQuestion[]>> = {};
        for (const d of res.domains || []) {
          const portalId = mapBackendDomainToPortalId({
            slug: d.name,
            name: d.name,
          });
          if (d.questions && d.questions.length > 0) {
            mapped[portalId] = d.questions.map((q, idx) => {
              if (q.answer) {
                updateDraftInstant(q.id, q.answer);
                if (q.savedAt) {
                  saveQuestionResponse(q.id);
                }
              }
              return {
                id: q.id,
                domain: portalId,
                code: `QUESTION 0${idx + 1}`,
                prompt: q.text,
                hint: q.required
                  ? 'Required question • Saved automatically to your application'
                  : 'Optional question',
                maxChars: q.maxLength || 1200,
              };
            });
          }
        }
        if (Object.keys(mapped).length > 0) {
          setBackendQuestionsByDomain(mapped);
        }
      })
      .catch(() => {
        // Offline mode: use built-in DOMAIN_META questions
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeModal,
    userProfile.oauthVerified,
    updateDraftInstant,
    saveQuestionResponse,
  ]);

  if (activeModal !== 'DOMAIN_FORM' || !userProfile.oauthVerified) return null;

  const currentDomainMeta = DOMAIN_META[activeDomain];
  const activeQuestions =
    backendQuestionsByDomain[activeDomain] || currentDomainMeta.questions;

  const checkDomainComplete = (domainId: DomainId) => {
    const customQuestions = backendQuestionsByDomain[domainId];
    if (customQuestions && customQuestions.length > 0) {
      const state = useGameStore.getState();
      return customQuestions.every((q) => {
        const draft = (state.savedDrafts[q.id] || '').trim();
        const savedAt = state.savedQuestionTimestamps[q.id];
        return draft.length >= 10 && Boolean(savedAt);
      });
    }
    return isDomainComplete(domainId);
  };

  const handleSelectDomainTab = (domainId: DomainId) => {
    setActiveDomain(domainId);
    navigateToAnchor(DOMAIN_META[domainId].anchor);
  };

  const completedSelectedCount = userProfile.selectedDomains.filter((d) =>
    checkDomainComplete(d)
  ).length;
  const allSelectedDomainsComplete =
    userProfile.selectedDomains.length > 0 &&
    completedSelectedCount === userProfile.selectedDomains.length;

  const handleConfirmFinalSubmit = async () => {
    if (!allSelectedDomainsComplete) {
      showToast(
        'Please complete and save all questions across all your selected domains before submitting.',
        'gold'
      );
      return;
    }

    if (getAuthToken()) {
      setIsSubmittingForm(true);
      try {
        await apiClient.submitForm();
      } catch (err) {
        if (err instanceof ApiClientError && err.status > 0) {
          setIsSubmittingForm(false);
          showToast(err.message, 'gold');
          return;
        }
        // Offline fallback: proceed with local submission
      }
      setIsSubmittingForm(false);
    }

    sealAndTransmitApplication();
    setConfirmSealModal(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-teal-950/20 backdrop-blur-md flex items-center justify-center p-3 md:p-5 pointer-events-auto"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="mv-panel w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Subtle Circular (✕) Close Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DCD2] bg-[#FAF6F0]/85">
          <button
            onClick={() => setActiveModal(null)}
            aria-label="Close Domain Questionnaire"
            className="w-8 h-8 rounded-full border border-[#E6DCD2] bg-white/80 flex items-center justify-center text-xs text-[#57606A] hover:text-[#2A2E33] hover:border-[#EE6E93] hover:bg-[#FCE4EC]/40 transition-all cursor-pointer"
          >
            ✕
          </button>

          <div className="text-center">
            <h2
              className="font-display text-xs md:text-sm font-semibold text-[#2A2E33] uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              {currentDomainMeta.label} Questionnaire
            </h2>
            <p className="font-sans text-xs text-[#7C7267] mt-0.5">
              Recruitment 2026 • The AI-ML Club
            </p>
          </div>

          <button
            onClick={() => setActiveModal('SIGNUP')}
            title="Edit Selected Domains"
            className="px-3 py-1.5 rounded-lg border border-[#E6DCD2] bg-white/80 font-sans text-xs font-medium text-[#C2185B] hover:border-[#EE6E93] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Preferences</span>
          </button>
        </div>

        {/* Multi-Domain Tab Bar */}
        <div className="flex overflow-x-auto border-b border-[#E6DCD2] bg-[#F4EFEA]/60 px-4 pt-2 gap-2">
          {(Object.keys(DOMAIN_META) as DomainId[]).map((d) => {
            const meta = DOMAIN_META[d];
            const isSelectedInProfile = userProfile.selectedDomains.includes(d);
            const isCurrent = activeDomain === d;
            const completed = checkDomainComplete(d);

            if (!isSelectedInProfile) return null;

            return (
              <button
                key={d}
                onClick={() => handleSelectDomainTab(d)}
                className={`px-4 py-2.5 font-sans text-xs font-medium border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'border-[#EE6E93] text-[#2A2E33] font-semibold bg-white/70 rounded-t-lg'
                    : 'border-transparent text-[#8C827A] hover:text-[#2A2E33]'
                }`}
              >
                <span>{meta.label}</span>
                {completed ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E0F2F1] text-[#00695C]">
                    Applied
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FCE4EC] text-[#C2185B]">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Question Cards */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-4">
          {applicationSealed && (
            <div className="p-4 rounded-xl bg-[#E0F2F1]/70 border border-[#00897B]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[#00695C]">
                <Lock className="w-4 h-4 shrink-0" />
                <p className="font-sans text-xs font-medium">
                  Your application has been submitted and is currently under review by the club board.
                </p>
              </div>
              <button
                onClick={() => setActiveModal('SETTINGS')}
                className="px-3.5 py-1.5 rounded-lg bg-[#00897B] text-white font-sans text-xs font-semibold shrink-0 cursor-pointer hover:bg-[#00796B] transition-colors"
              >
                View Status
              </button>
            </div>
          )}

          {activeQuestions.map((q, idx) => (
            <AutoExpandingQuestionCard
              key={q.id}
              question={q}
              index={idx}
              disabled={applicationSealed}
            />
          ))}
        </div>

        {/* Footer: Local Save Status & Submit Application Action */}
        <div className="px-6 py-4 border-t border-[#E6DCD2] bg-[#FAF6F0]/95 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            <span className="font-sans text-xs text-[#667085]">
              All changes saved locally ({completedSelectedCount}/
              {userProfile.selectedDomains.length} domains ready)
            </span>
          </div>

          {!applicationSealed && (
            <div className="flex items-center gap-2.5">
              {!confirmSealModal ? (
                <button
                  type="button"
                  disabled={!allSelectedDomainsComplete}
                  title={
                    !allSelectedDomainsComplete
                      ? 'Complete all selected domain questionnaires before final submission'
                      : 'Submit your application'
                  }
                  onClick={() => setConfirmSealModal(true)}
                  className="px-5 py-2.5 rounded-lg bg-[#EE6E93] hover:bg-[#D85A7F] disabled:opacity-40 disabled:cursor-not-allowed text-white font-sans text-xs font-semibold tracking-wide flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Application</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 bg-[#FCE4EC]/60 border border-[#EE6E93]/40 px-3.5 py-2 rounded-lg">
                  <span className="font-sans text-xs font-medium text-[#2A2E33]">
                    Submit final responses for review?
                  </span>
                  <button
                    type="button"
                    disabled={isSubmittingForm}
                    onClick={handleConfirmFinalSubmit}
                    className="px-3.5 py-1.5 rounded-md bg-[#EE6E93] text-white font-sans text-xs font-semibold cursor-pointer hover:bg-[#D85A7F] disabled:opacity-60"
                  >
                    {isSubmittingForm ? 'Submitting...' : 'Confirm & Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSealModal(false)}
                    className="px-2.5 py-1.5 rounded-md border border-[#D5C7B8] bg-white text-[#57606A] font-sans text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
