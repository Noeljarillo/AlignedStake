"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, ExternalLink, Info } from "lucide-react";

export default function GuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Link 
          href="/" 
          className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold mt-6 mb-4 text-white">Starknet Staking Guide</h1>
        <p className="text-xl text-gray-300">
          Learn how to stake your STRK tokens and contribute to Starknet's security
        </p>
      </motion.div>

      <div className="space-y-12">
        {/* What is Staking */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700"
        >
          <h2 className="text-2xl font-bold mb-4 text-blue-400">What is STRK Staking?</h2>
          <p className="text-gray-300 mb-4">
            Staking is the process of actively participating in the Starknet network by delegating your STRK tokens to validators who help secure and operate the network.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-gray-700/50 p-5 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-white">Benefits of Staking</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
                  <span>Earn rewards for supporting the network</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
                  <span>Participate in network security and decentralization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
                  <span>Support Starknet's long-term success and growth</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-700/50 p-5 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-white">Important Terms</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                  <span><strong>Validators:</strong> Operators who run nodes to secure the network</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                  <span><strong>Delegation:</strong> Assigning your tokens to validators</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                  <span><strong>Revenue Share:</strong> Percentage of rewards validators keep</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* How to Stake */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700"
        >
          <h2 className="text-2xl font-bold mb-4 text-blue-400">How to Stake Your STRK</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium mb-3 text-white">Step 1: Connect Your Wallet</h3>
              <p className="text-gray-300 mb-4">
                To start staking, you need to connect a compatible Starknet wallet containing STRK tokens.
              </p>
              <div className="flex items-center space-x-6 mt-4">
                <div className="flex flex-col items-center">
                  <div className="bg-gray-700 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                    <Image 
                      src="/argentx-logo.svg" 
                      alt="ArgentX" 
                      width={40} 
                      height={40} 
                    />
                  </div>
                  <span className="text-sm text-gray-300">ArgentX</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-gray-700 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                    <Image 
                      src="/braavos-logo.svg" 
                      alt="Braavos" 
                      width={40} 
                      height={40} 
                    />
                  </div>
                  <span className="text-sm text-gray-300">Braavos</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3 text-white">Step 2: Choose a Validator</h3>
              <p className="text-gray-300 mb-4">
                Select a validator to delegate your tokens to. You can choose based on:
              </p>
              <ul className="space-y-2 text-gray-300 ml-6">
                <li className="list-disc">Reputation (verified status)</li>
                <li className="list-disc">Revenue share (lower percentage means more rewards for you)</li>
                <li className="list-disc">Total delegated stake (consider supporting smaller validators for network decentralization)</li>
              </ul>
              <div className="bg-blue-900/30 border border-blue-700/30 p-4 rounded-lg mt-4 flex">
                <Info className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-100">
                  Our dashboard includes a "Random from Bottom 20" feature to help promote network decentralization by supporting smaller validators.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3 text-white">Step 3: Enter Stake Amount</h3>
              <p className="text-gray-300 mb-4">
                Decide how many STRK tokens you want to delegate to the selected validator.
              </p>
              <div className="bg-yellow-900/30 border border-yellow-700/30 p-4 rounded-lg mt-4 flex">
                <Info className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-100">
                  Make sure to keep some STRK or ETH in your wallet for transaction fees.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3 text-white">Step 4: Confirm Transactions</h3>
              <p className="text-gray-300 mb-4">
                The staking process requires two transactions:
              </p>
              <ol className="space-y-3 text-gray-300 ml-6">
                <li className="list-decimal">
                  <strong>Approve</strong> - Authorize the staking pool to use your STRK tokens
                </li>
                <li className="list-decimal">
                  <strong>Stake</strong> - Actually delegate your tokens to the chosen validator pool
                </li>
              </ol>
            </div>
          </div>
        </motion.section>

        {/* Managing Your Stake */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700"
        >
          <h2 className="text-2xl font-bold mb-4 text-blue-400">Managing Your Stake</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium mb-3 text-white">Viewing Your Delegations</h3>
              <p className="text-gray-300">
                Once connected, you can view all your delegations, including:
              </p>
              <ul className="space-y-2 text-gray-300 ml-6 mt-2">
                <li className="list-disc">Total amount delegated</li>
                <li className="list-disc">Validators you've delegated to</li>
                <li className="list-disc">Pending rewards available to claim</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3 text-white">Claiming Rewards</h3>
              <p className="text-gray-300">
                As a delegator, you earn rewards over time. You can claim these rewards by:
              </p>
              <ol className="space-y-2 text-gray-300 ml-6 mt-2">
                <li className="list-decimal">Connecting your wallet to the dashboard</li>
                <li className="list-decimal">Viewing your available rewards</li>
                <li className="list-decimal">Clicking the "Claim Rewards" button</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3 text-white">Unstaking Process</h3>
              <p className="text-gray-300 mb-2">
                If you want to withdraw your staked tokens:
              </p>
              <ol className="space-y-2 text-gray-300 ml-6">
                <li className="list-decimal">Initiate an unstake request by clicking "Unstake Tokens"</li>
                <li className="list-decimal">Wait for the unlock period (21 days)</li>
                <li className="list-decimal">After the waiting period, claim your unstaked tokens</li>
              </ol>
              <div className="bg-red-900/30 border border-red-700/30 p-4 rounded-lg mt-4 flex">
                <Info className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-100">
                  During the unlock period, your tokens will not earn staking rewards. Plan your unstaking carefully.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700"
        >
          <h2 className="text-2xl font-bold mb-6 text-blue-400">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium mb-2 text-white">Is there a minimum delegation amount?</h3>
              <p className="text-gray-300">
                No, there is no minimum amount required to delegate STRK. However, you should consider transaction fees when delegating very small amounts.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2 text-white">How are rewards calculated?</h3>
              <p className="text-gray-300">
                Rewards are proportional to your stake amount, the total amount of STRK staked, by the rest of users, and the validator's performance(on v2). The validator takes a percentage (shown as "Revenue Share") of the rewards, and you receive the rest.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2 text-white">Can I stake to multiple validators?</h3>
              <p className="text-gray-300">
                Yes, you can delegate your STRK tokens to multiple validators to diversify your staking portfolio.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2 text-white">What happens if a validator misbehaves?</h3>
              <p className="text-gray-300">
               Now the only bad action will be just remove their stake, which will stop generating rewards for you. When V2 staking gets implemented If a validator behaves maliciously or fails to perform their duties, they may be penalized. This is why it's important to choose reputable validators.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2 text-white">How often are rewards distributed?</h3>
              <p className="text-gray-300">
                Rewards accumulate continuously and can be claimed at any time. However, claiming requires a transaction fee, so it may be cost-effective to claim less frequently.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Resources */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700"
        >
          <h2 className="text-2xl font-bold mb-4 text-blue-400">Additional Resources</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a 
              href="https://www.starknet.io/staking/a-guide-to-delegate-your-stake/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-700/50 p-5 rounded-lg hover:bg-gray-700 transition-colors flex items-start"
            >
              <div>
                <h3 className="text-lg font-medium mb-2 text-white flex items-center">
                  Starknet Delegation Documentation
                  <ExternalLink className="h-4 w-4 ml-2" />
                </h3>
                <p className="text-gray-300">
                  Official documentation for learning all about how to delegations works.
                </p>
              </div>
            </a>
            
            <a 
              href="https://community.starknet.io/t/snip-28-staking-v2-proposal/115250" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-700/50 p-5 rounded-lg hover:bg-gray-700 transition-colors flex items-start"
            >
              <div>
                <h3 className="text-lg font-medium mb-2 text-white flex items-center">
                SNIP 28: Staking V2 proposal
                  <ExternalLink className="h-4 w-4 ml-2" />
                </h3>
                <p className="text-gray-300">
                  Learn more about the upcoming Staking V2 proposal.
                </p>
              </div>
            </a>
            
            <a 
              href="https://voyager.online" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-700/50 p-5 rounded-lg hover:bg-gray-700 transition-colors flex items-start"
            >
              <div>
                <h3 className="text-lg font-medium mb-2 text-white flex items-center">
                  Voyager Explorer
                  <ExternalLink className="h-4 w-4 ml-2" />
                </h3>
                <p className="text-gray-300">
                  Block explorer for Starknet - track transactions and verify staking activities.
                </p>
              </div>
            </a>
            
            <a 
              href="https://www.argent.xyz/argent-x/"
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-700/50 p-5 rounded-lg hover:bg-gray-700 transition-colors flex items-start"
            >
              <div>
                <h3 className="text-lg font-medium mb-2 text-white flex items-center">
                 Get your Starknet wallet 
                  <ExternalLink className="h-4 w-4 ml-2" />
                </h3>
                <p className="text-gray-300">
                  Set up your wallet to start delegating.
                </p>
              </div>
            </a>
          </div>
        </motion.section>
      </div>

      <div className="mt-12 text-center">
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-6 py-3 border border-blue-500 text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
} 