import Link from 'next/link';
import { ArrowLeft, Bus, PhoneCall } from 'lucide-react';
import { BRAND_NAME, SUPPORT_CONTACT } from '@/config/busConfig';
import { VerifyTicketView } from '@/components/VerifyTicketView';

interface VerifyPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const bookingId = typeof params.id === 'string' ? params.id : '';

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-extrabold text-[#0F172A] transition-colors hover:text-[#D84E55]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="flex items-center gap-1.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#D84E55] text-white">
                <Bus className="size-4" aria-hidden="true" />
              </span>
              <span>{BRAND_NAME}</span>
            </span>
          </Link>

          <a
            href={SUPPORT_CONTACT.telHref}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-[#0F172A]"
          >
            <PhoneCall className="size-3.5 text-[#D84E55]" aria-hidden="true" />
            <span className="font-mono">{SUPPORT_CONTACT.phoneDisplay}</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <VerifyTicketView initialBookingId={bookingId} />
      </main>
    </div>
  );
}
