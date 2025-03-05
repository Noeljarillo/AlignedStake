import React from 'react';
import { metadata as pageMetadata } from './metadata';

export const metadata = pageMetadata;

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