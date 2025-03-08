import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Mission | AlignedStake - Decentralizing Starknet Staking',
  description: 'Learn about AlignedStake\'s mission to promote decentralization in Starknet staking, reduce validator concentration, and create a more equitable blockchain ecosystem.',
  keywords: 'starknet mission, aligned stake mission, starknet decentralization, strk staking decentralization',
};

export default function MissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {children}
    </section>
  );
} 