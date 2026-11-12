import { StaffVerifyView } from '@/components/StaffVerifyView';

interface StaffVerifyPageProps {
  searchParams: Promise<{ id?: string; seats?: string }>;
}

export default async function StaffVerifyPage({
  searchParams,
}: StaffVerifyPageProps) {
  const params = await searchParams;
  const bookingId = typeof params.id === 'string' ? params.id : '';
  const parsedSeats =
    typeof params.seats === 'string' ? parseInt(params.seats, 10) : NaN;
  const expectedSeatCount =
    Number.isFinite(parsedSeats) && parsedSeats > 0 ? parsedSeats : null;

  return (
    <main className="min-h-dvh bg-[#F8FAFC] px-4 py-5 text-[#0F172A]">
      <StaffVerifyView
        initialBookingId={bookingId}
        expectedSeatCount={expectedSeatCount}
      />
    </main>
  );
}
