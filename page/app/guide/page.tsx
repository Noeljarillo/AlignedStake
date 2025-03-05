"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GuidesPage() {
  const guides = [
    {
      title: 'How to Stake STRK on Starknet',
      description: 'A comprehensive guide to staking your STRK tokens, earning rewards, and supporting the Starknet network',
      slug: 'how-to-stake-strk',
      date: 'June 1, 2023',
      readTime: '8 min read',
    },
    // Add more guides here as they become available
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white">
      <header className="container mx-auto py-8">
        <Link href="/" className="flex items-center text-blue-400 mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Starknet Staking Guides</h1>
        <p className="text-xl text-gray-300 max-w-3xl">Learn everything you need to know about staking STRK tokens on Starknet</p>
      </header>

      <main className="container mx-auto py-8 px-4 md:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link href={`/guide/${guide.slug}`} key={guide.slug}>
              <Card className="h-full border border-gray-800 bg-gray-900/50 hover:border-blue-600 transition-colors">
                <CardHeader>
                  <CardTitle className="text-xl">{guide.title}</CardTitle>
                  <CardDescription className="text-gray-400 flex items-center mt-2">
                    <span className="mr-3">{guide.date}</span>
                    <span>{guide.readTime}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{guide.description}</p>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="text-blue-400 flex items-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Read Guide
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <footer className="container mx-auto py-8 border-t border-gray-800 mt-16">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="text-xl font-bold">Starknet Staking Dashboard</Link>
            <p className="text-gray-400 mt-1">The easiest way to stake your STRK tokens</p>
          </div>
          <nav className="flex space-x-6">
            <Link href="/" className="text-gray-300 hover:text-white">Home</Link>
            <Link href="/guide" className="text-gray-300 hover:text-white">Guides</Link>
            <Link href="/validator" className="text-gray-300 hover:text-white">Validators</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
} 