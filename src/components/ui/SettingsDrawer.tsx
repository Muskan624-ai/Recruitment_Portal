'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Compass,
  Users,
  CheckCircle2,
  Circle,
  Sparkles,
} from 'lucide-react';
import { useGameStore, DOMAIN_META, DomainId } from '@/store/useGameStore';
import { apiClient, getAuthToken, setAuthToken } from '@/lib/apiClient';

type DrawerTab = 'PROFILE' | 'STATUS' | 'TEAM';

export function SettingsDrawer() {
  const activeModal = useGameStore((s) => s.activeModal);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const userProfile = useGameStore((s) => s.userProfile);
  const applicationSealed = useGameStore((s) => s.applicationSealed);
  const isShortlisted = useGameStore((s) => s.isShortlisted);
  const setShortlistedRole = useGameStore((s) => s.setShortlistedRole);
  const bookedSlot = useGameStore((s) => s.bookedSlot);
  const isDomainComplete = useGameStore((s) => s.isDomainComplete);
  const resetSession = useGameStore((s) => s.resetSession);
  const navigateToAnchor = useGameStore((s) => s.navigateToAnchor);

  const [activeTab, setActiveTab] = useState<DrawerTab>('PROFILE');
  const [confirmReset, setConfirmReset] = useState(false);

  // Sync stage & shortlist status from GET /api/status when backend JWT is active
  useEffect(() => {
    if (activeModal !== 'SETTINGS' || !getAuthToken()) return;

    let cancelled = false;
    apiClient
      .getStatus()
      .then((res) => {
        if (cancelled) return;
        const backendShortlisted =
          res.canChooseSlots ||
          res.currentStage === 'SHORTLISTED' ||
          res.currentStage === 'SLOT_CHOOSING' ||
          res.currentStage === 'INTERVIEW' ||
          res.currentStage === 'SELECTED';
        if (backendShortlisted && !isShortlisted) {
          setShortlistedRole(true);
        }
      })
      .catch(() => {
        // Offline mode: keep local stage state
      });

    return () => {
      cancelled = true;
    };
  }, [activeModal, isShortlisted, setShortlistedRole]);

  if (activeModal !== 'SETTINGS') return null;

  const anyDomainComplete = userProfile.selectedDomains.some((d) =>
    isDomainComplete(d)
  );

  // Clean 5-Stage Recruitment Progress Stepper
  const journeyStages = [
    {
      step: 1,
      title: 'Stage 1: Application Form',
      subtitle: 'Profile Verification & Domain Questionnaires',
      status:
        applicationSealed || anyDomainComplete
          ? 'Completed'
          : userProfile.oauthVerified
          ? 'In Progress'
          : 'Pending',
      detail: userProfile.oauthVerified
        ? `${
            userProfile.selectedDomains.filter((d) => isDomainComplete(d))
              .length
          } of ${
            userProfile.selectedDomains.length
          } selected domain questionnaires completed`
        : 'Verify your VIT email at the entrance archway to begin.',
    },
    {
      step: 2,
      title: 'Stage 2: Shortlisted',
      subtitle: 'Board Review & Interview Qualification',
      status: isShortlisted
        ? 'Completed'
        : applicationSealed
        ? 'Under Review'
        : 'Upcoming',
      detail: isShortlisted
        ? 'Congratulations! You have been shortlisted for interviews.'
        : applicationSealed
        ? 'Your responses have been submitted and are under review by the board.'
        : 'Complete and submit your domain responses first.',
    },
    {
      step: 3,
      title: 'Stage 3: Slot Booking',
      subtitle: 'Select Your Preferred 20-Minute Interview Window',
      status: bookedSlot
        ? 'Completed'
        : isShortlisted
        ? 'Available'
        : 'Locked',
      detail: bookedSlot
        ? `Confirmed for ${bookedSlot.dateLabel} at ${bookedSlot.timeSlot}`
        : isShortlisted
        ? 'Ascend to the upper pavilion to reserve your 20-minute interview slot.'
        : 'Unlocks once your application is shortlisted.',
    },
    {
      step: 4,
      title: 'Stage 4: Personal Interview',
      subtitle: '1-on-1 Discussion with Domain Leads',
      status: bookedSlot ? 'Scheduled' : 'Locked',
      detail: bookedSlot
        ? `Panel ${bookedSlot.panelCode} • Google Meet & Club Room`
        : 'Unlocks after confirming an interview slot.',
    },
    {
      step: 5,
      title: 'Stage 5: Final Selection',
      subtitle: 'Welcome to The AI-ML Club Cohort 2026',
      status: 'Upcoming',
      detail: 'Final cohort results will be announced after all interviews conclude.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-teal-950/20 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="mv-panel w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Subtle Circular (✕) Close Button on Top-Left */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DCD2] bg-[#FAF6F0]/80">
          <button
            onClick={() => setActiveModal(null)}
            aria-label="Close Candidate Dashboard"
            className="w-8 h-8 rounded-full border border-[#E6DCD2] bg-white/80 flex items-center justify-center text-xs text-[#57606A] hover:text-[#2A2E33] hover:border-[#EE6E93] hover:bg-[#FCE4EC]/40 transition-all cursor-pointer"
          >
            ✕
          </button>

          <div className="text-center">
            <h2
              className="font-display text-xs md:text-sm font-semibold text-[#2A2E33] uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              CANDIDATE DASHBOARD
            </h2>
            <p className="font-sans text-xs text-[#7C7267] mt-0.5">
              Recruitment 2026 • The AI-ML Club
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#FCE4EC] border border-[#EE6E93]/30 flex items-center justify-center font-sans text-[10px] font-semibold text-[#C2185B]">
            TAM
          </div>
        </div>

        {/* Clean Horizontal Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-[#E6DCD2] bg-[#F4EFEA]/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-3 px-2 flex items-center justify-center gap-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'PROFILE'
                ? 'border-b-[#EE6E93] text-[#2A2E33] font-semibold bg-white/60'
                : 'border-b-transparent text-[#8C827A] hover:text-[#2A2E33]'
            }`}
          >
            <User className="w-3.5 h-3.5 text-[#EE6E93]" />
            <span>My Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('STATUS')}
            className={`py-3 px-2 flex items-center justify-center gap-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'STATUS'
                ? 'border-b-[#EE6E93] text-[#2A2E33] font-semibold bg-white/60'
                : 'border-b-transparent text-[#8C827A] hover:text-[#2A2E33]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#EE6E93]" />
            <span>Application Status</span>
          </button>

          <button
            onClick={() => setActiveTab('TEAM')}
            className={`py-3 px-2 flex items-center justify-center gap-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'TEAM'
                ? 'border-b-[#EE6E93] text-[#2A2E33] font-semibold bg-white/60'
                : 'border-b-transparent text-[#8C827A] hover:text-[#2A2E33]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#EE6E93]" />
            <span>About The Team</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              {!userProfile.oauthVerified ? (
                <div className="p-6 rounded-xl border border-[#E6DCD2] bg-[#F4EFEA]/70 text-center space-y-3">
                  <p className="font-display text-sm font-semibold text-[#2A2E33]">
                    Verify Your VIT Email to Begin
                  </p>
                  <p className="text-xs text-[#6E7781] max-w-md mx-auto leading-relaxed">
                    Guide the mascot to the front entrance archway or click below to verify your{' '}
                    <span className="font-medium text-[#1F2328]">@vitstudent.ac.in</span> profile and select your domains.
                  </p>
                  <button
                    onClick={() => {
                      setActiveModal('SIGNUP');
                      navigateToAnchor('Anchor_Gate_SignUp');
                    }}
                    className="px-5 py-2.5 rounded-lg bg-[#EE6E93] text-white text-xs font-semibold tracking-wide hover:bg-[#D85A7F] transition-all cursor-pointer shadow-sm"
                  >
                    Verify VIT Email
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl bg-[#F4EFEA]/80 border border-[#E6DCD2]">
                      <span className="font-sans text-[11px] uppercase tracking-wider text-[#7C7267] block">
                        Candidate Name
                      </span>
                      <span className="font-sans text-sm font-semibold text-[#1F2328] mt-1 block">
                        {userProfile.fullName}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F4EFEA]/80 border border-[#E6DCD2]">
                      <span className="font-sans text-[11px] uppercase tracking-wider text-[#7C7267] block">
                        Registration No.
                      </span>
                      <span className="font-sans text-sm font-semibold text-[#1F2328] mt-1 block">
                        {userProfile.regNumber}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F4EFEA]/80 border border-[#E6DCD2]">
                      <span className="font-sans text-[11px] uppercase tracking-wider text-[#7C7267] block">
                        University Email
                      </span>
                      <span className="font-sans text-sm font-semibold text-[#1F2328] mt-1 block truncate">
                        {userProfile.email}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F4EFEA]/80 border border-[#E6DCD2]">
                      <span className="font-sans text-[11px] uppercase tracking-wider text-[#7C7267] block">
                        Phone Number
                      </span>
                      <span className="font-sans text-sm font-semibold text-[#1F2328] mt-1 block">
                        {userProfile.phone}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#6E7781]">
                        Selected Domains ({userProfile.selectedDomains.length})
                      </span>
                      <button
                        onClick={() => setActiveModal('SIGNUP')}
                        className="font-sans text-xs font-medium text-[#C2185B] hover:text-[#EE6E93] hover:underline cursor-pointer transition-colors"
                      >
                        Edit Preferences
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(Object.keys(DOMAIN_META) as DomainId[]).map((d) => {
                        const meta = DOMAIN_META[d];
                        const isSelected = userProfile.selectedDomains.includes(d);
                        const completed = isDomainComplete(d);
                        return (
                          <div
                            key={d}
                            className={`p-3.5 rounded-xl flex items-center justify-between transition-all ${
                              isSelected
                                ? 'mv-runic-tile-selected'
                                : 'bg-[#F4EFEA] border border-[#E6DCD2] text-[#57606A]'
                            }`}
                          >
                            <div>
                              <p
                                className={`font-sans text-xs font-semibold ${
                                  isSelected ? 'text-[#1F2328]' : 'text-[#57606A]'
                                }`}
                              >
                                {meta.label}
                              </p>
                              <p className="font-sans text-[11px] text-[#7C7267] mt-0.5">
                                {meta.subtitle.split(',')[0]}
                              </p>
                            </div>
                            <span
                              className={`font-sans text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                                completed
                                  ? 'bg-[#E0F2F1] text-[#00695C]'
                                  : isSelected
                                  ? 'bg-[#FCE4EC] text-[#C2185B]'
                                  : 'bg-[#E6DCD2]/70 text-[#6E7781]'
                              }`}
                            >
                              {completed
                                ? 'Applied'
                                : isSelected
                                ? 'Selected'
                                : 'Not Selected'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'STATUS' && (
            <div className="space-y-5">
              {/* Vertical 5-Stage Recruitment Stepper */}
              <div className="relative pl-4 border-l-2 border-[#E6DCD2] space-y-5">
                {journeyStages.map((st) => {
                  const isCompleted = st.status === 'Completed';
                  const isActive =
                    st.status === 'In Progress' ||
                    st.status === 'Under Review' ||
                    st.status === 'Available' ||
                    st.status === 'Scheduled';
                  return (
                    <div key={st.step} className="relative pl-4">
                      <span
                        className={`absolute -left-[25px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-[#00897B] text-white'
                            : isActive
                            ? 'bg-[#EE6E93] text-white'
                            : 'bg-[#F4EFEA] border border-[#D5C7B8] text-[#8C827A]'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Circle className="w-2.5 h-2.5" />
                        )}
                      </span>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3
                          className={`font-sans text-xs font-semibold ${
                            isCompleted
                              ? 'text-[#00695C]'
                              : isActive
                              ? 'text-[#1F2328]'
                              : 'text-[#7C7267]'
                          }`}
                        >
                          {st.title}
                        </h3>
                        <span
                          className={`font-sans text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-[#E0F2F1] text-[#00695C]'
                              : isActive
                              ? 'bg-[#FCE4EC] text-[#C2185B]'
                              : 'bg-[#F4EFEA] text-[#7C7267]'
                          }`}
                        >
                          {st.status}
                        </span>
                      </div>

                      <p className="text-xs text-[#6E7781] mt-0.5">{st.subtitle}</p>
                      <p className="font-sans text-xs text-[#2A2E33] mt-1.5 bg-[#F4EFEA]/80 px-3 py-2 rounded-lg border border-[#E6DCD2]">
                        {st.detail}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Preview Shortlist Stage Toggle (Only available after initial Sign-Up is completed) */}
              {userProfile.oauthVerified && (
                <div className="p-4 rounded-xl bg-[#FCE4EC]/40 border border-[#EE6E93]/35 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#C2185B] shrink-0" />
                    <div>
                      <p className="font-sans text-xs font-semibold text-[#2A2E33]">
                        Preview Interview Slot Booking
                      </p>
                      <p className="text-xs text-[#6E7781]">
                        Simulate shortlisting to unlock the upper terrace and test interview slot scheduling.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !isShortlisted;
                      setShortlistedRole(next);
                      if (next) {
                        setActiveModal(null);
                      }
                    }}
                    className="px-3.5 py-2 rounded-lg font-sans text-xs font-semibold bg-[#EE6E93] text-white hover:bg-[#D85A7F] transition-all cursor-pointer shadow-sm"
                  >
                    {isShortlisted ? 'Reset to In Review' : 'Preview Shortlist'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'TEAM' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F4EFEA]/80 border border-[#E6DCD2] space-y-1.5">
                <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#2A2E33]">
                  The AI-ML Club • VIT Vellore
                </h3>
                <p className="text-xs text-[#57606A] leading-relaxed">
                  We are a student-driven research and engineering community at VIT exploring
                  machine learning, full-stack systems, product design, and technical leadership.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#F4EFEA]/70 border border-[#E6DCD2]">
                  <span className="text-[11px] font-medium text-[#00897B] uppercase tracking-wider block">
                    Core Machine Learning
                  </span>
                  <span className="font-sans text-xs font-semibold text-[#1F2328] block mt-1">
                    Deep Learning, Computer Vision, NLP &amp; Applied Research
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F4EFEA]/70 border border-[#E6DCD2]">
                  <span className="text-[11px] font-medium text-[#C2185B] uppercase tracking-wider block">
                    Web &amp; App Development
                  </span>
                  <span className="font-sans text-xs font-semibold text-[#1F2328] block mt-1">
                    Full-Stack Engineering, Cloud Architecture &amp; Interactive WebGL
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F4EFEA]/70 border border-[#E6DCD2]">
                  <span className="text-[11px] font-medium text-[#C2185B] uppercase tracking-wider block">
                    Design &amp; Media
                  </span>
                  <span className="font-sans text-xs font-semibold text-[#1F2328] block mt-1">
                    UI/UX Systems, 3D Environments, Branding &amp; Motion Graphics
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#F4EFEA]/70 border border-[#E6DCD2]">
                  <span className="text-[11px] font-medium text-[#00897B] uppercase tracking-wider block">
                    Management &amp; Operations
                  </span>
                  <span className="font-sans text-xs font-semibold text-[#1F2328] block mt-1">
                    Hackathons, Partnerships, Events &amp; Community Outreach
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Local Save Indicator + Subtle Sign Out Link */}
        <div className="px-6 py-3.5 border-t border-[#E6DCD2] bg-[#FAF6F0]/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            <span className="font-sans text-xs text-[#667085]">
              All changes saved locally
            </span>
          </div>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="font-sans text-xs font-medium text-[#667085] hover:text-red-500 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="font-sans text-xs text-[#57606A]">
                Clear local profile &amp; sign out?
              </span>
              <button
                onClick={() => {
                  setAuthToken(null);
                  resetSession();
                  setConfirmReset(false);
                }}
                className="px-3 py-1 rounded-md bg-red-500 text-white font-sans text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer"
              >
                Confirm Sign Out
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 rounded-md border border-[#D5C7B8] text-[#57606A] font-sans text-xs hover:bg-[#F4EFEA] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
