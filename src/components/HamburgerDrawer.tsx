'use client';

import { useEffect } from 'react';
import {
  Bus,
  LogIn,
  LogOut,
  PhoneCall,
  Ticket,
  UserCircle2,
  X,
} from 'lucide-react';
import { BRAND_NAME, SUPPORT_CONTACT } from '@/config/busConfig';
import type { AppView, AuthUserProfile } from '@/types/booking';

interface HamburgerDrawerProps {
  isOpen: boolean;
  activeView: AppView;
  savedTicketCount: number;
  authUser: AuthUserProfile | null;
  onClose: () => void;
  onSelectBookTicket: () => void;
  onSelectMyTickets: () => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export function HamburgerDrawer({
  isOpen,
  activeView,
  savedTicketCount,
  authUser,
  onClose,
  onSelectBookTicket,
  onSelectMyTickets,
  onOpenAuthModal,
  onSignOut,
}: HamburgerDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      {/* Clickable Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="flex-1 cursor-default"
      />

      {/* Slide-Over Panel */}
      <aside className="flex h-full w-80 max-w-[85vw] flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* Top Drawer Brand Row */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#D84E55] text-white">
              <Bus className="size-5" aria-hidden="true" />
            </div>
            <span className="text-base font-extrabold text-[#0F172A]">
              {BRAND_NAME}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Menu navigation" className="flex-1 space-y-2 p-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectBookTicket();
            }}
            className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] ${
              activeView === 'book'
                ? 'bg-[#FFF1F2] text-[#B91C1C]'
                : 'text-[#0F172A] hover:bg-slate-100'
            }`}
          >
            <Bus className="size-5 shrink-0 text-[#D84E55]" aria-hidden="true" />
            <span>Book a Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectMyTickets();
            }}
            className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] ${
              activeView === 'tickets'
                ? 'bg-[#FFF1F2] text-[#B91C1C]'
                : 'text-[#0F172A] hover:bg-slate-100'
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Ticket className="size-5 shrink-0 text-[#D84E55]" aria-hidden="true" />
              <span className="truncate">
                My Tickets{' '}
                <span className="block text-xs font-medium text-slate-500">
                  Find / Download Ticket
                </span>
              </span>
            </span>

            {savedTicketCount > 0 ? (
              <span className="shrink-0 rounded-full bg-[#D84E55] px-2 py-0.5 text-xs font-extrabold text-white">
                {savedTicketCount}
              </span>
            ) : null}
          </button>

          <div className="my-2 border-t border-slate-100 pt-2">
            {authUser ? (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1F2] text-[#D84E55]">
                    <UserCircle2 className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#0F172A]">
                      {authUser.displayName || 'Signed In Passenger'}
                    </p>
                    {authUser.email ? (
                      <p className="truncate text-xs text-slate-500">
                        {authUser.email}
                      </p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
                >
                  <LogOut className="size-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#0F172A] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
              >
                <LogIn className="size-5 shrink-0 text-[#D84E55]" aria-hidden="true" />
                <span>
                  Sign In with Google / Email
                  <span className="block text-xs font-medium text-slate-500">
                    Optional • Sync tickets across devices
                  </span>
                </span>
              </button>
            )}
          </div>
        </nav>

        {/* Bottom Single Clean Call Support Button (No WhatsApp anywhere) */}
        <div className="border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <a
            href={SUPPORT_CONTACT.telHref}
            onClick={onClose}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#D84E55] bg-[#FFF1F2] px-4 py-3 text-sm font-extrabold text-[#B91C1C] transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
          >
            <PhoneCall className="size-4 shrink-0" aria-hidden="true" />
            <span>Call Bus Support ({SUPPORT_CONTACT.phoneDisplay})</span>
          </a>
        </div>
      </aside>
    </div>
  );
}
