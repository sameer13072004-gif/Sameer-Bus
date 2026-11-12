import { redirect } from 'next/navigation';

interface VerifyPageProps {
  searchParams: Promise<{ id?: string; seats?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (typeof params.id === 'string' && params.id) qs.set('id', params.id);
  if (typeof params.seats === 'string' && params.seats) qs.set('seats', params.seats);
  const query = qs.toString();
  redirect(query ? `/staff-verify?${query}` : '/staff-verify');
}
