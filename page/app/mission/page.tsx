"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Shield, BarChart3, Users, Zap, Scale, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MissionPage() {
  const missionPoints = [
    {
      title: 'Real-Time Analytics',
      description: 'Provide transparency and detailed staking insights to users, validators, and stakeholders.',
      icon: <BarChart3 className="h-8 w-8 text-blue-400" />,
    },
    {
      title: 'Validator Dashboards',
      description: 'Enable validators, especially smaller ones, to effectively showcase their performance and attract delegations.',
      icon: <Users className="h-8 w-8 text-blue-400" />,
    },
    {
      title: 'Random Validator Selection',
      description: 'Introduce fair and transparent mechanisms to distribute delegations evenly across lower-staked validators, reducing centralization risk.',
      icon: <Shield className="h-8 w-8 text-blue-400" />,
    },
    {
      title: 'Comprehensive Stake Management',
      description: 'Allow effortless monitoring of rewards, simplified unstaking processes, and seamless claims.',
      icon: <Zap className="h-8 w-8 text-blue-400" />,
    },
    {
      title: 'Split Delegation Feature',
      description: 'Allow users to delegate stakes to multiple validators simultaneously, promoting decentralization and flexibility.',
      icon: <Scale className="h-8 w-8 text-blue-400" />,
    },
    {
      title: 'Impact Metrics',
      description: 'Track how much your actions impact the network decentralization and overall health.',
      icon: <Globe className="h-8 w-8 text-blue-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white">
      <header className="container mx-auto py-8">
        <Link href="/" className="flex items-center text-blue-400 mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Our Mission</h1>
        <p className="text-xl text-gray-300 max-w-3xl">Decentralizing Starknet Staking for a Healthier Ecosystem</p>
      </header>

      <main className="container mx-auto py-8 px-4 md:px-6">
        <section className="mb-16">
          <div className="prose prose-invert max-w-3xl">
            <h2 className="text-2xl font-semibold mb-6">The Challenge</h2>
            <p className="text-gray-300 mb-4">
              Starknet is positioned at the forefront of blockchain innovation as a leading Layer 2 solution, 
              undergoing significant changes with native staking now live and a shift towards Proof-of-Stake (POS) imminent. 
              Validators are becoming more important in the Starknet ecosystem, entrusted initially with critical attestation responsibilities.
            </p>
            <p className="text-gray-300 mb-4">
              Currently, staking is dominated by major entities such as Argent, Karnot, Avnu, and Braavos. 
              This concentration has led to a concerning imbalance, with the top 10 validators controlling approximately 
              91% of the total staked tokens—nearly 80 times more than the average validator.
            </p>
            <p className="text-gray-300 mb-4">
              This imbalance poses critical risks, threatening the decentralization, security, and long-term 
              sustainability of Starknet. Additionally, current price dynamics and future resource requirements 
              to run a validator node may limit participation to only the most dedicated Starknet users, making 
              it crucial to provide interfaces for validators to generate more rewards for Starknet's decentralized future.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Our Solution: AlignedStake</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {missionPoints.map((point, index) => (
              <Card key={index} className="border border-gray-800 bg-gray-900/50">
                <CardHeader className="flex flex-row items-center gap-4">
                  {point.icon}
                  <CardTitle className="text-xl">{point.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{point.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="prose prose-invert max-w-3xl">
            <h2 className="text-2xl font-semibold mb-6">Our Vision</h2>
            <p className="text-gray-300 mb-4">
              We believe decentralization is fundamental to Starknet's long-term success. Our mission extends 
              beyond simple stake redistribution—we aim to build a healthier, more resilient, and equitable 
              ecosystem by leveling the playing field for all validators.
            </p>
            <p className="text-gray-300 mb-4">
              By ensuring fair opportunities, increasing transparency, and empowering users, AlignedStake 
              seeks to foster a balanced and robust blockchain environment, driving innovation and 
              sustainability forward.
            </p>
            <div className="mt-8 p-6 bg-blue-900/20 border border-blue-800 rounded-lg">
              <h3 className="text-xl font-medium text-blue-400 mb-2">Join Our Mission</h3>
              <p className="text-gray-300 mb-4">
                Help us create a more decentralized Starknet by using AlignedStake to delegate your STRK tokens 
                to smaller validators, track your impact, and spread awareness about the importance of 
                decentralization in blockchain networks.
              </p>
              <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Start Staking Now
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto py-8 border-t border-gray-800 mt-16">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="text-xl font-bold">AlignedStake</Link>
            <p className="text-gray-400 mt-1">The easiest way to stake your STRK tokens</p>
          </div>
          <nav className="flex space-x-6">
            <Link href="/" className="text-gray-300 hover:text-white">Home</Link>
            <Link href="/guide" className="text-gray-300 hover:text-white">Guides</Link>
            <Link href="/validator" className="text-gray-300 hover:text-white">Validators</Link>
            <Link href="/mission" className="text-gray-300 hover:text-white">Our Mission</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
} 