import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Starknet Staking Guides | Learn How to Stake STRK',
  description: 'Comprehensive guides on staking STRK tokens on Starknet. Learn how to stake, delegate, and earn rewards safely and effectively.',
  keywords: 'starknet guides, strk staking guides, how to stake strk, starknet staking tutorials',
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
} 