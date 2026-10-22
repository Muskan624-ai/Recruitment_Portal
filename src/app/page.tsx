'use client';

import React from 'react';
import { HeaderBar } from '@/components/ui/HeaderBar';
import { SettingsDrawer } from '@/components/ui/SettingsDrawer';
import { SignUpModal } from '@/components/ui/SignUpModal';
import { QuestionModal } from '@/components/ui/QuestionModal';
import { SlotBookingModal } from '@/components/ui/SlotBookingModal';
import { SpatialHudDock } from '@/components/ui/SpatialHudDock';
import { AmbientAudioEngine } from '@/components/ui/AmbientAudioEngine';

export default function HomePage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden pointer-events-none">
      {/* Persistent Top Monument Header Bar */}
      <HeaderBar />

      {/* Accessible DOM Overlay Modals & Drawers */}
      <SettingsDrawer />
      <SignUpModal />
      <QuestionModal />
      <SlotBookingModal />

      {/* Bottom Spatial Waypoint Dock & Camera Controls */}
      <SpatialHudDock />

      {/* Web Audio Synthesizer for Monument Valley Harmonic Chimes */}
      <AmbientAudioEngine />
    </div>
  );
}
