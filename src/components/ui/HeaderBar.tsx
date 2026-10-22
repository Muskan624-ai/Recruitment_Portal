'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { apiClient } from '@/lib/apiClient';

export function HeaderBar() {
  const activeModal = useGameStore((s) => s.activeModal);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const isCameraZoomedOut = useGameStore((s) => s.isCameraZoomedOut);
  const toggleCameraZoomOut = useGameStore((s) => s.toggleCameraZoomOut);
  const userProfile = useGameStore((s) => s.userProfile);
  const applicationSealed = useGameStore((s) => s.applicationSealed);
  const isShortlisted = useGameStore((s) => s.isShortlisted);
  const bookedSlot = useGameStore((s) => s.bookedSlot);

  // Target application deadline countdown (syncs with GET /api/config when backend is online)
  const [timeLeft, setTimeLeft] = useState({
    days: '02',
    hours: '14',
    minutes: '10',
    seconds: '24',
  });
  const [portalClosed, setPortalClosed] = useState(false);
  const targetTimestampRef = useRef<number>(
    Date.now() + (2 * 86400 + 14 * 3600 + 10 * 60 + 24) * 1000
  );

  useEffect(() => {
    let cancelled = false;

    // Fetch live deadline from backend /api/config (seamless fallback if backend is offline)
    apiClient
      .getConfig()
      .then((cfg) => {
        if (cancelled) return;
        if (typeof cfg.msRemaining === 'number' && cfg.msRemaining >= 0) {
          targetTimestampRef.current = Date.now() + cfg.msRemaining;
        } else if (cfg.formDeadline) {
          const parsed = new Date(cfg.formDeadline).getTime();
          if (!Number.isNaN(parsed)) {
            targetTimestampRef.current = parsed;
          }
        }
        if (cfg.isOpen === false) {
          setPortalClosed(true);
        }
      })
      .catch(() => {
        // Offline / local trial mode: keep default local targetTimestampRef
      });

    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor((targetTimestampRef.current - Date.now()) / 1000)
      );
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;

      setTimeLeft({
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0'),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const firstName = userProfile.oauthVerified
    ? userProfile.fullName.trim().split(' ')[0]
    : '';

  const statusLabel = bookedSlot
    ? 'Slot Confirmed'
    : isShortlisted
    ? 'Shortlisted'
    : applicationSealed
    ? 'Submitted'
    : userProfile.oauthVerified
    ? 'Applied'
    : 'Verify VIT Email';

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none px-4 py-3.5 md:px-7 md:py-5 flex items-center justify-between gap-3">
      {/* Left: Club Identity & Dashboard Trigger */}
      <button
        onClick={() =>
          setActiveModal(activeModal === 'SETTINGS' ? null : 'SETTINGS')
        }
        className="pointer-events-auto flex items-center gap-3 mv-hud-pill px-3.5 py-2 hover:border-[#EE6E93] transition-colors cursor-pointer text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[#FCE4EC] border border-[#EE6E93]/40 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 32 32"
            className="w-4 h-4 text-[#C2185B]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
          >
            <polygon
              points="16,3 28,10 16,17 4,10"
              fill="rgba(238,110,147,0.22)"
            />
            <polyline points="4,10 4,22 16,29 28,22 28,10" />
            <line x1="16" y1="17" x2="16" y2="29" />
            <circle cx="16" cy="10" r="2" fill="#EE6E93" stroke="none" />
          </svg>
        </div>
        <div>
          <span className="font-display font-semibold text-xs md:text-sm mv-header-track text-[#2A2E33] block">
            THE AI-ML CLUB
          </span>
          <span className="font-sans text-[11px] text-[#7C7267] block">
            Recruitment 2026
          </span>
        </div>
      </button>

      {/* Center: Clean Application Deadline Countdown */}
      <div className="pointer-events-auto hidden lg:flex items-center gap-3 mv-hud-pill px-4 py-2">
        <span className="font-sans text-xs font-medium text-[#7C7267]">
          {portalClosed ? 'Recruitment Status:' : 'Applications Close In:'}
        </span>
        <span className="font-sans text-xs font-semibold tracking-wider text-[#00897B] tabular-nums">
          {portalClosed
            ? 'Applications Closed'
            : `${timeLeft.days}d : ${timeLeft.hours}h : ${timeLeft.minutes}m : ${timeLeft.seconds}s`}
        </span>
      </div>

      {/* Right: Camera Zoom Toggle + Candidate Profile Pill + Audio Toggle */}
      <div className="pointer-events-auto flex items-center gap-2.5">
        <button
          onClick={toggleCameraZoomOut}
          title={
            isCameraZoomedOut
              ? 'Zoom camera into Mascot'
              : 'Zoom out completely to view full scene'
          }
          className="mv-hud-pill px-3.5 py-2 flex items-center gap-1.5 text-[#2A2E33] hover:border-[#EE6E93] transition-colors cursor-pointer text-xs font-medium"
        >
          {isCameraZoomedOut ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-[#00897B]" />
              <span className="hidden sm:inline">Follow Mascot</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-[#EE6E93]" />
              <span className="hidden sm:inline">Zoom Out</span>
            </>
          )}
        </button>

        <button
          onClick={() =>
            setActiveModal(
              !userProfile.oauthVerified
                ? 'SIGNUP'
                : activeModal === 'SETTINGS'
                ? null
                : 'SETTINGS'
            )
          }
          title="Open Candidate Dashboard"
          className="mv-hud-pill px-3.5 py-2 flex items-center gap-2.5 hover:border-[#EE6E93] transition-colors cursor-pointer"
        >
          {userProfile.oauthVerified && (
            <>
              <span className="font-sans text-xs font-semibold text-[#1F2328]">
                {firstName}
              </span>
              <span className="h-3.5 w-[1px] bg-[#E6DCD2]" />
            </>
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isShortlisted || bookedSlot
                ? 'bg-[#FFF3E0] text-[#E65100]'
                : userProfile.oauthVerified
                ? 'bg-[#FCE4EC] text-[#C2185B]'
                : 'bg-[#E0F2F1] text-[#00695C]'
            }`}
          >
            {statusLabel}
          </span>
        </button>

        <button
          onClick={toggleSound}
          aria-label={
            soundEnabled ? 'Mute ambient soundscape' : 'Unmute ambient soundscape'
          }
          className="mv-hud-pill p-2.5 text-[#57606A] hover:text-[#EE6E93] hover:border-[#EE6E93] transition-colors cursor-pointer"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-[#00897B]" />
          ) : (
            <VolumeX className="w-4 h-4 text-[#8C827A]" />
          )}
        </button>
      </div>
    </header>
  );
}
