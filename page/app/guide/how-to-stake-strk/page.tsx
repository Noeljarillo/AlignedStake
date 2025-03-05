"use client"

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Info, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  image?: string | null;
}

const StepCard = ({ number, title, description, image = null }: StepCardProps) => (
  <Card className="mb-8 border border-gray-800 bg-gray-900/50">
    <CardHeader className="pb-2">
      <div className="flex items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 mr-3">
          <span className="text-white font-bold">{number}</span>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <p className="text-gray-300">{description}</p>
        {image && (
          <div className="relative h-64 w-full rounded-lg overflow-hidden">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border-b border-gray-800 py-4">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-medium">{question}</h3>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isOpen && <p className="mt-2 text-gray-300">{answer}</p>}
    </div>
  );
};

export default function HowToStakeStrk() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white">
      <header className="container mx-auto py-8">
        <Link href="/" className="flex items-center text-blue-400 mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">How to Stake STRK on Starknet</h1>
        <p className="text-xl text-gray-300 max-w-3xl">A comprehensive guide to staking your STRK tokens, earning rewards, and supporting the Starknet network</p>
      </header>

      <main className="container mx-auto py-8 px-4 md:px-6">
        <div className="prose prose-invert max-w-3xl mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">What is STRK Staking?</h2>
            <p>
              Staking STRK tokens on Starknet allows you to earn rewards while supporting the security and decentralization of the network. By delegating your tokens to validators, you contribute to the consensus mechanism without having to run validator infrastructure yourself.
            </p>
            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mt-6">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  <strong>Key Benefits:</strong> Earn STRK rewards, support network security, no technical expertise required, and maintain full control of your tokens.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-6">Step-by-Step Guide to Staking STRK</h2>
          
          <StepCard
            number="1"
            title="Set Up a Starknet Wallet"
            description="First, you'll need a Starknet-compatible wallet. The most popular options are ArgentX and Braavos. Download the browser extension, create a new wallet, and securely store your recovery phrase."
            image="/wallet-setup.png"
          />
          
          <StepCard
            number="2"
            title="Get STRK Tokens"
            description="If you don't already have STRK tokens, you'll need to acquire some. You can purchase STRK on various exchanges that support Starknet assets and transfer them to your Starknet wallet."
          />
          
          <StepCard
            number="3"
            title="Connect Your Wallet to Our Dashboard"
            description="Visit our Starknet Staking Dashboard and click the 'Connect Wallet' button in the top right corner. Select your wallet provider (ArgentX or Braavos) and approve the connection request in your wallet."
          />
          
          <StepCard
            number="4"
            title="Browse Available Validators"
            description="Our dashboard displays all active validators on the network. You can sort them by total stake, number of delegators, fees, and more to find the right validator for your needs."
          />
          
          <StepCard
            number="5"
            title="Choose a Validator"
            description="When selecting a validator, consider factors like their performance history, fee structure, total stake, and number of delegators. A diversified approach can help manage risk."
          />
          
          <StepCard
            number="6"
            title="Enter Staking Amount"
            description="After selecting a validator, enter the amount of STRK you wish to stake. Make sure to keep some tokens for transaction fees. Our interface will show you estimated rewards based on your stake amount."
          />
          
          <StepCard
            number="7"
            title="Approve and Confirm"
            description="Review your staking details, then approve the transaction in your wallet. Once confirmed on the network, your tokens will be staked and start earning rewards."
          />
          
          <StepCard
            number="8"
            title="Monitor and Manage Your Stake"
            description="Use our dashboard to track your staked tokens, accrued rewards, and validator performance. You can claim rewards or adjust your delegations at any time."
          />

          <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 my-8">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Congratulations!</strong> You're now staking your STRK tokens and contributing to the Starknet network while earning rewards.
              </p>
            </div>
          </div>

          <div className="bg-amber-900/30 border border-amber-800 rounded-lg p-4 my-8">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Important Considerations:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Staking involves risks, including potential slashing if your chosen validator misbehaves</li>
                  <li>There may be an unbonding period when you decide to unstake your tokens</li>
                  <li>Rewards may fluctuate based on network participation and validator performance</li>
                </ul>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mt-12 mb-6">Frequently Asked Questions</h2>
          
          <FAQItem 
            question="What is the minimum amount required to stake STRK?"
            answer="There is no technical minimum amount required to stake STRK on Starknet. However, you should consider transaction fees when deciding on a staking amount, as very small stakes might not be profitable after accounting for fees."
          />
          
          <FAQItem 
            question="How often are staking rewards distributed?"
            answer="STRK staking rewards accrue in real-time but are typically distributed on a per-epoch basis. You can claim your rewards at any time through our dashboard interface."
          />
          
          <FAQItem 
            question="Can I unstake my STRK tokens at any time?"
            answer="Yes, you can signal your intent to unstake at any time. However, there is typically an unbonding period during which your tokens remain locked before they become available for withdrawal."
          />
          
          <FAQItem 
            question="What fees do validators charge?"
            answer="Validators set their own commission rates, typically ranging from 1% to 10% of the rewards generated. These fees are automatically deducted from your rewards."
          />
          
          <FAQItem 
            question="Is staking STRK secure?"
            answer="Staking STRK is generally secure, but like all blockchain activities, it carries some risks. Your principal is safe unless your chosen validator gets slashed for misbehavior. Using our dashboard helps you select reliable validators to minimize risks."
          />
          
          <FAQItem 
            question="Do I need technical knowledge to stake STRK?"
            answer="No, our staking dashboard makes the process simple and accessible to everyone. You don't need any technical expertise to delegate your tokens to validators."
          />

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-semibold mb-4">Ready to Start Staking?</h2>
            <p className="mb-6">Join thousands of STRK holders who are already earning rewards and supporting the Starknet network.</p>
            <Link href="/">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Go to Staking Dashboard
              </Button>
            </Link>
          </div>
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