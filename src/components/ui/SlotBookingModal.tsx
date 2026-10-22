'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Download,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useGameStore, DOMAIN_META, DomainId } from '@/store/useGameStore';
import {
  apiClient,
  getAuthToken,
  isValidMongoObjectId,
  ApiClientError,
  BackendSlotItem,
} from '@/lib/apiClient';

interface DateOption {
  id: string;
  dayName: string;
  dateNum: string;
  month: string;
  fullLabel: string;
  isoDate: string;
}

const INTERVIEW_DATES: DateOption[] = [
  {
    id: 'd1',
    dayName: 'FRI',
    dateNum: '23',
    month: 'OCT',
    fullLabel: 'Fri, 23 Oct 2026',
    isoDate: '2026-10-23',
  },
  {
    id: 'd2',
    dayName: 'SAT',
    dateNum: '24',
    month: 'OCT',
    fullLabel: 'Sat, 24 Oct 2026',
    isoDate: '2026-10-24',
  },
  {
    id: 'd3',
    dayName: 'SUN',
    dateNum: '25',
    month: 'OCT',
    fullLabel: 'Sun, 25 Oct 2026',
    isoDate: '2026-10-25',
  },
];

// 20-Minute Slot Matrix across evening & weekend windows
const TWENTY_MIN_SLOTS = [
  '17:00 - 17:20',
  '17:20 - 17:40',
  '17:40 - 18:00',
  '18:00 - 18:20',
  '18:20 - 18:40',
  '18:40 - 19:00',
  '19:00 - 19:20',
  '19:20 - 19:40',
  '19:40 - 20:00',
  '20:00 - 20:20',
  '20:20 - 20:40',
  '20:40 - 21:00',
];

function isSlotClaimedByPeers(
  domain: DomainId,
  dateId: string,
  idx: number
): boolean {
  const seed = domain.charCodeAt(0) + dateId.charCodeAt(1) * 7 + idx * 13;
  return seed % 5 === 0 || seed % 7 === 0;
}

export function SlotBookingModal() {
  const activeModal = useGameStore((s) => s.activeModal);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const userProfile = useGameStore((s) => s.userProfile);
  const isShortlisted = useGameStore((s) => s.isShortlisted);
  const holdingSlotKey = useGameStore((s) => s.holdingSlotKey);
  const holdingExpiresAt = useGameStore((s) => s.holdingExpiresAt);
  const holdSlot = useGameStore((s) => s.holdSlot);
  const bookedSlot = useGameStore((s) => s.bookedSlot);
  const confirmSlotBooking = useGameStore((s) => s.confirmSlotBooking);
  const showToast = useGameStore((s) => s.showToast);

  const availableDomains: DomainId[] =
    userProfile.selectedDomains.length > 0
      ? userProfile.selectedDomains
      : ['CoreML', 'WebDev'];

  const [selectedDomain, setSelectedDomain] = useState<DomainId>(
    bookedSlot?.domain || availableDomains[0]
  );
  const [selectedDate, setSelectedDate] = useState<DateOption>(
    INTERVIEW_DATES[0]
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(
    bookedSlot?.timeSlot || null
  );
  const [selectedBackendSlotId, setSelectedBackendSlotId] = useState<
    string | null
  >(null);
  const [backendSlotsByDomain, setBackendSlotsByDomain] = useState<
    Partial<Record<DomainId, BackendSlotItem[]>>
  >({});
  const [isBooking, setIsBooking] = useState(false);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(0);

  // Fetch live interview slots from GET /api/slots when backend JWT is active
  useEffect(() => {
    if (activeModal !== 'SLOT_PICKER' || !getAuthToken()) return;
    const backendDomainId = userProfile.backendDomainMap?.[selectedDomain];
    if (!backendDomainId || !isValidMongoObjectId(backendDomainId)) return;

    let cancelled = false;
    apiClient
      .getSlotsForDate({
        domainId: backendDomainId,
        date: selectedDate.isoDate,
      })
      .then((res) => {
        if (cancelled) return;
        if (res.slots && res.slots.length > 0) {
          setBackendSlotsByDomain((prev) => ({
            ...prev,
            [selectedDomain]: res.slots,
          }));
        }
      })
      .catch(() => {
        // Offline / preview mode: use simulated 20-minute slot matrix
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeModal,
    selectedDomain,
    selectedDate.isoDate,
    userProfile.backendDomainMap,
  ]);

  // Tick the 2-minute reservation hold timer
  useEffect(() => {
    if (!holdingExpiresAt) {
      setHoldSecondsLeft(0);
      return;
    }
    const updateHold = () => {
      const rem = Math.max(
        0,
        Math.ceil((holdingExpiresAt - Date.now()) / 1000)
      );
      setHoldSecondsLeft(rem);
    };
    updateHold();
    const timer = setInterval(updateHold, 1000);
    return () => clearInterval(timer);
  }, [holdingExpiresAt]);

  if (activeModal !== 'SLOT_PICKER') return null;

  const handleSelectSlot = (slotStr: string, idx?: number) => {
    if (bookedSlot) return;
    const key = `${selectedDomain}_${selectedDate.id}_${slotStr}`;
    setSelectedTimeSlot(slotStr);
    const domainBackendSlots = backendSlotsByDomain[selectedDomain];
    if (domainBackendSlots && typeof idx === 'number' && domainBackendSlots[idx]) {
      setSelectedBackendSlotId(domainBackendSlots[idx].id);
    } else if (domainBackendSlots && domainBackendSlots.length > 0) {
      const openSlot =
        domainBackendSlots.find((s) => s.remaining > 0) || domainBackendSlots[0];
      setSelectedBackendSlotId(openSlot.id);
    } else {
      setSelectedBackendSlotId(null);
    }
    holdSlot(key);
  };

  const handleConfirmBooking = async () => {
    if (!selectedTimeSlot) return;

    if (
      getAuthToken() &&
      selectedBackendSlotId &&
      isValidMongoObjectId(selectedBackendSlotId)
    ) {
      setIsBooking(true);
      try {
        await apiClient.bookSlot(selectedBackendSlotId);
      } catch (err) {
        if (err instanceof ApiClientError && err.status > 0) {
          setIsBooking(false);
          showToast(err.message, 'gold');
          return;
        }
        // Network error: proceed with local confirmation
      }
      setIsBooking(false);
    }

    const panelCode = `TAM-${selectedDomain.toUpperCase()}-P0${
      (selectedTimeSlot.charCodeAt(1) % 4) + 1
    }`;
    confirmSlotBooking({
      domain: selectedDomain,
      date: selectedDate.isoDate,
      dateLabel: selectedDate.fullLabel,
      timeSlot: selectedTimeSlot,
      panelCode,
      bookedAt: new Date().toISOString(),
    });
  };

  const handleDownloadICS = () => {
    const slotToExport = bookedSlot || {
      domain: selectedDomain,
      date: selectedDate.isoDate,
      dateLabel: selectedDate.fullLabel,
      timeSlot: selectedTimeSlot || '18:00 - 18:20',
      panelCode: 'TAM-PANEL-01',
    };

    const [startStr, endStr] = slotToExport.timeSlot
      .split('-')
      .map((s) => s.trim());
    const dateCompact = slotToExport.date.replace(/-/g, '');
    const startCompact = `${dateCompact}T${startStr.replace(':', '')}00`;
    const endCompact = `${dateCompact}T${endStr.replace(':', '')}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The AI-ML Club VIT//Recruitment 2026//EN',
      'BEGIN:VEVENT',
      `UID:tam-interview-${Date.now()}@vitstudent.ac.in`,
      `DTSTAMP:${dateCompact}T120000Z`,
      `DTSTART:${startCompact}`,
      `DTEND:${endCompact}`,
      `SUMMARY:The AI-ML Club Interview (${DOMAIN_META[slotToExport.domain].label})`,
      `DESCRIPTION:Candidate: ${userProfile.fullName} (${userProfile.regNumber})\\nPanel: ${slotToExport.panelCode}\\nDomain: ${DOMAIN_META[slotToExport.domain].label}`,
      'LOCATION:The AI-ML Club Interview Room / Google Meet',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], {
      type: 'text/calendar;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TAM_Interview_${userProfile.regNumber || 'Slot'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatHoldTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-teal-950/20 backdrop-blur-md flex items-center justify-center p-3 md:p-5 pointer-events-auto"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="mv-panel-gold w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Subtle Circular (✕) Close Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DCD2] bg-[#FAF6F0]/85">
          <button
            onClick={() => setActiveModal(null)}
            aria-label="Close Interview Slot Booking"
            className="w-8 h-8 rounded-full border border-[#E6DCD2] bg-white/80 flex items-center justify-center text-xs text-[#57606A] hover:text-[#2A2E33] hover:border-[#EE6E93] hover:bg-[#FCE4EC]/40 transition-all cursor-pointer"
          >
            ✕
          </button>

          <div className="text-center">
            <h2
              className="font-display text-xs md:text-sm font-semibold text-[#2A2E33] uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              INTERVIEW SLOT BOOKING
            </h2>
            <p className="font-sans text-xs text-[#7C7267] mt-0.5">
              Recruitment 2026 • The AI-ML Club
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#FCE4EC] border border-[#EE6E93]/30 flex items-center justify-center text-[#C2185B]">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-5">
          {!isShortlisted ? (
            <div className="p-6 rounded-xl bg-[#F4EFEA] border border-[#E6DCD2] text-center space-y-3">
              <ShieldAlert className="w-7 h-7 text-[#C2185B] mx-auto" />
              <p className="font-display text-sm font-semibold text-[#2A2E33]">
                Application Under Review
              </p>
              <p className="text-xs text-[#6E7781] max-w-md mx-auto">
                Interview slot booking will unlock automatically once your domain responses have been reviewed and shortlisted.
              </p>
            </div>
          ) : bookedSlot ? (
            /* Confirmed Interview Pass */
            <div className="p-6 rounded-xl bg-[#F4EFEA]/80 border border-[#E6DCD2] space-y-5">
              <div className="flex items-center justify-between border-b border-[#E6DCD2] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E0F2F1] border border-[#00897B]/30 flex items-center justify-center text-[#00695C]">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-sans text-[11px] font-medium text-[#00695C] uppercase tracking-wider block">
                      Interview Confirmed
                    </span>
                    <h3 className="font-display text-sm md:text-base font-semibold text-[#1F2328]">
                      {DOMAIN_META[bookedSlot.domain].label}
                    </h3>
                  </div>
                </div>

                <span className="font-sans text-xs font-semibold px-3 py-1 rounded-full bg-[#FCE4EC] text-[#C2185B]">
                  {bookedSlot.panelCode}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-[#E6DCD2]">
                  <span className="font-sans text-[11px] text-[#7C7267] uppercase block">
                    Candidate
                  </span>
                  <span className="font-sans text-xs font-semibold text-[#1F2328] mt-1 block">
                    {userProfile.fullName || 'Candidate'} ({userProfile.regNumber || 'VIT'})
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E6DCD2]">
                  <span className="font-sans text-[11px] text-[#7C7267] uppercase block">
                    Date
                  </span>
                  <span className="font-sans text-xs font-semibold text-[#1F2328] mt-1 block">
                    {bookedSlot.dateLabel}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E6DCD2]">
                  <span className="font-sans text-[11px] text-[#7C7267] uppercase block">
                    20-Min Window
                  </span>
                  <span className="font-sans text-xs font-semibold text-[#00695C] mt-1 block">
                    {bookedSlot.timeSlot} IST
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-[#6E7781]">
                  Please join the meeting link 5 minutes prior to your scheduled window.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadICS}
                  className="px-4 py-2.5 rounded-lg bg-[#EE6E93] hover:bg-[#D85A7F] text-white font-sans text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Calendar Invite (.ics)</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Select Domain */}
              <div>
                <label className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#6E7781] block mb-2">
                  1. Select Domain Track
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableDomains.map((d) => {
                    const meta = DOMAIN_META[d];
                    const active = selectedDomain === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setSelectedDomain(d);
                          setSelectedTimeSlot(null);
                        }}
                        className={`px-3.5 py-2 rounded-lg font-sans text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'mv-runic-tile-selected text-[#1F2328] font-semibold'
                            : 'bg-[#F4EFEA] border border-[#E6DCD2] text-[#57606A] hover:text-[#1F2328]'
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Date */}
              <div>
                <label className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#6E7781] block mb-2">
                  2. Choose Interview Date
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {INTERVIEW_DATES.map((dt) => {
                    const isSelected = selectedDate.id === dt.id;
                    return (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dt);
                          setSelectedTimeSlot(null);
                        }}
                        className={`p-3 rounded-xl text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'mv-runic-tile-selected'
                            : 'bg-[#F4EFEA] border border-[#E6DCD2] hover:border-[#D5C7B8]'
                        }`}
                      >
                        <span className="font-sans text-[11px] text-[#7C7267] block">
                          {dt.dayName} • {dt.month}
                        </span>
                        <span className="font-display text-lg font-semibold text-[#1F2328] block mt-0.5">
                          {dt.dateNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: 20-Minute Time Slot Matrix */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#6E7781]">
                    3. Select 20-Minute Time Window (IST)
                  </label>

                  {selectedTimeSlot && holdSecondsLeft > 0 && (
                    <span className="font-sans text-xs font-medium text-[#C2185B] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Slot held for {formatHoldTime(holdSecondsLeft)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TWENTY_MIN_SLOTS.map((slotStr, idx) => {
                    const claimed = isSlotClaimedByPeers(
                      selectedDomain,
                      selectedDate.id,
                      idx
                    );
                    const isSelected = selectedTimeSlot === slotStr;
                    return (
                      <button
                        key={slotStr}
                        type="button"
                        disabled={claimed}
                        onClick={() => handleSelectSlot(slotStr, idx)}
                        className={`px-3 py-2.5 rounded-xl font-sans text-xs transition-all flex items-center justify-between ${
                          claimed
                            ? 'bg-[#F4EFEA]/50 border border-[#E6DCD2] text-[#8C827A] line-through cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'mv-runic-tile-selected font-semibold text-[#1F2328] cursor-pointer'
                            : 'bg-white border border-[#E6DCD2] text-[#2A2E33] hover:border-[#EE6E93] cursor-pointer'
                        }`}
                      >
                        <span>{slotStr}</span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            claimed
                              ? 'bg-[#E6DCD2]/60 text-[#7C7267]'
                              : isSelected
                              ? 'bg-[#FCE4EC] text-[#C2185B]'
                              : 'bg-[#E0F2F1] text-[#00695C]'
                          }`}
                        >
                          {claimed ? 'Booked' : isSelected ? 'Selected' : 'Open'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E6DCD2] bg-[#FAF6F0]/95 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            <span className="font-sans text-xs text-[#667085]">
              All changes saved locally
            </span>
          </div>

          {!bookedSlot && isShortlisted && (
            <button
              type="button"
              disabled={!selectedTimeSlot || isBooking}
              onClick={handleConfirmBooking}
              className="px-5 py-2.5 rounded-lg bg-[#EE6E93] hover:bg-[#D85A7F] disabled:opacity-40 disabled:cursor-not-allowed text-white font-sans text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm"
            >
              {isBooking ? 'Booking Slot...' : 'Confirm Interview Slot'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
