'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, AlertCircle, KeyRound } from 'lucide-react';
import {
  useGameStore,
  DOMAIN_META,
  DomainId,
  isRegistrationComplete,
} from '@/store/useGameStore';
import {
  apiClient,
  getAuthToken,
  setAuthToken,
  mapBackendDomainToPortalId,
  normalizeBackendPhone,
  isValidBackendRegNumber,
  isValidMongoObjectId,
  ApiClientError,
} from '@/lib/apiClient';

export function SignUpModal() {
  const activeModal = useGameStore((s) => s.activeModal);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const userProfile = useGameStore((s) => s.userProfile);
  const completeSignUp = useGameStore((s) => s.completeSignUp);
  const showToast = useGameStore((s) => s.showToast);

  const [email, setEmail] = useState(userProfile.email || '');
  const [fullName, setFullName] = useState(userProfile.fullName || '');
  const [regNumber, setRegNumber] = useState(userProfile.regNumber || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [selectedDomains, setSelectedDomains] = useState<DomainId[]>(
    userProfile.selectedDomains.length > 0
      ? userProfile.selectedDomains
      : ['CoreML', 'WebDev']
  );
  const [oauthStepDone, setOauthStepDone] = useState(userProfile.oauthVerified);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendDomainMap, setBackendDomainMap] = useState<
    Partial<Record<DomainId, string>>
  >(userProfile.backendDomainMap || {});
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [jwtTokenInput, setJwtTokenInput] = useState('');

  useEffect(() => {
    if (activeModal === 'SIGNUP') {
      setEmail(userProfile.email || '');
      setFullName(userProfile.fullName || '');
      setRegNumber(userProfile.regNumber || '');
      setPhone(userProfile.phone || '');
      setSelectedDomains(
        userProfile.selectedDomains.length > 0
          ? userProfile.selectedDomains
          : ['CoreML', 'WebDev']
      );
      setOauthStepDone(userProfile.oauthVerified);
      setErrorMsg(null);
      setJwtTokenInput(getAuthToken() || '');

      // Fetch backend domains to map DomainId -> 24-char MongoDB ObjectId
      apiClient
        .getDomains()
        .then((res) => {
          const map: Partial<Record<DomainId, string>> = {};
          for (const d of res.domains || []) {
            const portalId = mapBackendDomainToPortalId(d);
            if (portalId && isValidMongoObjectId(d.id)) {
              map[portalId] = d.id;
            }
          }
          if (Object.keys(map).length > 0) {
            setBackendDomainMap(map);
          }
        })
        .catch(() => {
          // Offline mode: keep local domain IDs
        });
    }
  }, [activeModal, userProfile]);

  if (activeModal !== 'SIGNUP') return null;

  const handleSimulatedGoogleOAuth = () => {
    setErrorMsg(null);
    const trimmedEmail = email.trim().toLowerCase();
    const targetEmail =
      trimmedEmail && trimmedEmail.endsWith('@vitstudent.ac.in')
        ? trimmedEmail
        : 'aarav.sharma2026@vitstudent.ac.in';
    setEmail(targetEmail);
    if (!fullName.trim()) setFullName('Aarav Sharma');
    if (!regNumber.trim()) setRegNumber('23BCE1042');
    if (!phone.trim()) setPhone('9876543210');
    setOauthStepDone(true);
  };

  const toggleDomain = (domainId: DomainId) => {
    setSelectedDomains((prev) =>
      prev.includes(domainId)
        ? prev.filter((d) => d !== domainId)
        : [...prev, domainId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@vitstudent.ac.in')) {
      setErrorMsg(
        'Please sign in with your official @vitstudent.ac.in university email address.'
      );
      return;
    }

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
      setErrorMsg('Please enter your full name (2–100 characters).');
      return;
    }

    const regClean = regNumber.trim().toUpperCase();
    if (!isValidBackendRegNumber(regClean)) {
      setErrorMsg(
        'Please enter a valid VIT Registration Number (e.g., 23BCE1042 or 24BAI1108).'
      );
      return;
    }

    const normalizedPhone = normalizeBackendPhone(phone);
    if (!normalizedPhone) {
      setErrorMsg(
        'Please enter a valid 10-digit Indian mobile / WhatsApp number (starting with 6–9).'
      );
      return;
    }

    if (selectedDomains.length === 0) {
      setErrorMsg('Please select at least one domain to apply for.');
      return;
    }

    // Save optional JWT token if user pasted one
    if (jwtTokenInput.trim()) {
      setAuthToken(jwtTokenInput.trim());
    }

    let backendRegistered = Boolean(userProfile.backendRegistered);
    const activeToken = getAuthToken();

    // If a backend JWT token is present, synchronize with POST /api/signup or PUT /api/me
    if (activeToken && Object.keys(backendDomainMap).length > 0) {
      const preferredDomainIds = selectedDomains
        .map((d) => backendDomainMap[d])
        .filter((id): id is string => Boolean(id && isValidMongoObjectId(id)));

      if (preferredDomainIds.length > 0) {
        setIsSubmitting(true);
        try {
          const payload = {
            name: cleanName,
            phone: normalizedPhone,
            regNumber: regClean,
            preferredDomainIds,
          };

          if (backendRegistered || userProfile.oauthVerified) {
            try {
              await apiClient.updateMe(payload);
              backendRegistered = true;
            } catch (err) {
              if (err instanceof ApiClientError && err.status === 404) {
                await apiClient.signUp(payload);
                backendRegistered = true;
              } else {
                throw err;
              }
            }
          } else {
            try {
              await apiClient.signUp(payload);
              backendRegistered = true;
            } catch (err) {
              if (
                err instanceof ApiClientError &&
                (err.code === 'ALREADY_REGISTERED' || err.status === 409)
              ) {
                await apiClient.updateMe(payload);
                backendRegistered = true;
              } else {
                throw err;
              }
            }
          }
        } catch (err) {
          if (err instanceof ApiClientError && err.status > 0) {
            setIsSubmitting(false);
            setErrorMsg(err.message);
            return;
          }
          // Network error (status === 0): fall back seamlessly to local state
        }
        setIsSubmitting(false);
      }
    }

    completeSignUp({
      email: normalizedEmail,
      fullName: cleanName,
      regNumber: regClean,
      phone: normalizedPhone,
      selectedDomains,
      oauthVerified: true,
      backendRegistered,
      backendDomainMap,
    });
  };

  const isEmailValid =
    email.trim().toLowerCase().endsWith('@vitstudent.ac.in') &&
    email.trim().length >= 18;
  const isNameValid =
    fullName.trim().length >= 2 && fullName.trim().length <= 100;
  const isRegValid = isValidBackendRegNumber(regNumber);
  const isPhoneValid = normalizeBackendPhone(phone) !== null;
  const isDomainsValid = selectedDomains.length > 0;
  const isFormComplete =
    isEmailValid && isNameValid && isRegValid && isPhoneValid && isDomainsValid;

  const handleCloseAttempt = () => {
    if (!isRegistrationComplete(userProfile)) {
      showToast(
        'Further movement is locked until all registration details in this form are filled properly.',
        'gold'
      );
    }
    setActiveModal(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-teal-950/20 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
      onClick={() => {
        if (isRegistrationComplete(userProfile)) {
          setActiveModal(null);
        } else {
          setErrorMsg(
            'Please fill in all registration details properly to unlock the archway and move forward.'
          );
        }
      }}
    >
      <div
        className="mv-panel w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Subtle Circular (✕) Close Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DCD2] bg-[#FAF6F0]/85 shrink-0">
          <button
            type="button"
            onClick={handleCloseAttempt}
            aria-label="Close Registration Modal"
            className="w-8 h-8 rounded-full border border-[#E6DCD2] bg-white/80 flex items-center justify-center text-xs text-[#57606A] hover:text-[#2A2E33] hover:border-[#EE6E93] hover:bg-[#FCE4EC]/40 transition-all cursor-pointer"
          >
            ✕
          </button>

          <div className="text-center">
            <h2
              className="font-display text-xs md:text-sm font-semibold text-[#2A2E33] uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              CANDIDATE REGISTRATION
            </h2>
            <p className="font-sans text-xs text-[#7C7267] mt-0.5">
              Recruitment 2026 • The AI-ML Club
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#E0F2F1] border border-[#00897B]/30 flex items-center justify-center text-[#00695C]">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Form Wrapper */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Step 1: Google OAuth (@vitstudent.ac.in verification) */}
            <div className="p-4 rounded-xl bg-[#F4EFEA]/80 border border-[#E6DCD2] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#6E7781]">
                  Step 1 • University Email Verification
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTokenInput((prev) => !prev)}
                    className="font-sans text-[11px] text-[#7C7267] hover:text-[#2A2E33] flex items-center gap-1 cursor-pointer"
                    title="Optional: Paste a backend JWT token (from npm run token)"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{jwtTokenInput.trim() ? 'API Token Set' : 'API Token'}</span>
                  </button>
                  {oauthStepDone && (
                    <span className="font-sans text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#E0F2F1] text-[#00695C]">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name2026@vitstudent.ac.in"
                  className="flex-1 bg-white border border-[#E6DCD2] focus:border-[#EE6E93] rounded-lg px-3.5 py-2 font-sans text-xs text-[#1F2328] placeholder:text-[#8C827A] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSimulatedGoogleOAuth}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#FCE4EC]/30 border border-[#E6DCD2] hover:border-[#EE6E93] text-[#2A2E33] font-sans text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#EE6E93]" />
                  <span>Quick Fill VIT SSO</span>
                </button>
              </div>

              {showTokenInput && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={jwtTokenInput}
                    onChange={(e) => setJwtTokenInput(e.target.value)}
                    placeholder="Optional: Paste backend JWT (from backend/scripts/dev-token.ts)"
                    className="w-full bg-white border border-[#E6DCD2] focus:border-[#EE6E93] rounded-lg px-3 py-1.5 font-sans text-[11px] text-[#1F2328] placeholder:text-[#8C827A] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Step 2: Candidate Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="font-sans text-[11px] uppercase tracking-wider text-[#7C7267] block mb-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full bg-white border border-[#E6DCD2] focus:border-[#EE6E93] rounded-lg px-3 py-2 font-sans text-xs font-medium text-[#1F2328] placeholder:text-[#8C827A] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-sans text-[11px] uppercase tracking-wider text-[#7C7267] block mb-1">
                  Registration No.
                </label>
                <input
                  type="text"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                  placeholder="23BCE1042"
                  className="w-full bg-white border border-[#E6DCD2] focus:border-[#EE6E93] rounded-lg px-3 py-2 font-sans text-xs font-semibold text-[#1F2328] placeholder:text-[#8C827A] uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="font-sans text-[11px] uppercase tracking-wider text-[#7C7267] block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border border-[#E6DCD2] focus:border-[#EE6E93] rounded-lg px-3 py-2 font-sans text-xs font-medium text-[#1F2328] placeholder:text-[#8C827A] focus:outline-none"
                />
              </div>
            </div>

            {/* Step 3: Domain Selection Cards */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#6E7781]">
                  Step 2 • Selected Domains (Choose 1 to 4)
                </label>
                <span className="font-sans text-xs font-medium text-[#C2185B]">
                  {selectedDomains.length} Selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(DOMAIN_META) as DomainId[]).map((domainId) => {
                  const meta = DOMAIN_META[domainId];
                  const isSelected = selectedDomains.includes(domainId);
                  return (
                    <button
                      key={domainId}
                      type="button"
                      onClick={() => toggleDomain(domainId)}
                      className={`p-3.5 text-left transition-all cursor-pointer rounded-xl flex flex-col justify-between ${
                        isSelected
                          ? 'mv-runic-tile-selected'
                          : 'bg-[#F4EFEA] border border-[#E6DCD2] text-[#57606A] hover:border-[#D5C7B8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <p
                          className={`font-sans text-xs font-semibold ${
                            isSelected ? 'text-[#1F2328]' : 'text-[#57606A]'
                          }`}
                        >
                          {meta.label}
                        </p>
                        <span
                          className={`font-sans text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-[#FCE4EC] text-[#C2185B]'
                              : 'bg-[#E6DCD2]/70 text-[#6E7781]'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Not Selected'}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#7C7267] mt-1.5 leading-snug">
                        {meta.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-600 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Sticky Bottom Footer */}
          <div className="px-6 py-3.5 border-t border-[#E6DCD2] bg-[#FAF6F0]/95 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
              <span className="font-sans text-xs text-[#667085]">
                All changes saved locally
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isFormComplete}
              title={
                !isFormComplete
                  ? 'Fill in your @vitstudent.ac.in email, full name, VIT registration number, 10-digit phone number, and select at least 1 domain'
                  : 'Save & Unlock Courtyard'
              }
              className="px-5 py-2.5 rounded-lg bg-[#EE6E93] hover:bg-[#D85A7F] disabled:opacity-45 disabled:cursor-not-allowed text-white font-sans text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save & Unlock Courtyard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
