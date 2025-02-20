"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, Zap, ChevronDown, ChevronUp, Gift, Users, Landmark, Users2, Activity, Mail, MessageCircle, Twitter } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Contract, AccountInterface, RpcProvider } from "starknet"
import { cairo } from "starknet"

declare global {
  interface Window {
    starknet?: {
      enable: () => Promise<string[]>;
      isConnected: boolean;
      account: AccountInterface;
      provider: any;
    }
  }
}

const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
const STRK_DECIMALS = 18;
const RPC_URL = "https://free-rpc.nethermind.io/mainnet-juno/v0_7";
const ALLOWANCE_SELECTOR = "0x1e888a1026b19c8c0b57c72d63ed1737106aa10034105b980ba117bd0c29fe1";
const TEST_ADDRESS = "0x07ffdeec4142172c63deb3b59b2f2b3e8efab889fecc0314d19db34ba0780027";
const IS_TESTING = true; // Flag to easily disable test mode

// Create a shared RPC provider instance
const provider = new RpcProvider({ nodeUrl: RPC_URL });

// ERC20 ABI for token approval
const erc20Abi = [
  {
    members: [
      {
        name: "low",
        offset: 0,
        type: "felt",
      },
      {
        name: "high",
        offset: 1,
        type: "felt",
      },
    ],
    name: "Uint256",
    size: 2,
    type: "struct",
  },
  {
    inputs: [
      {
        name: "spender",
        type: "felt",
      },
      {
        name: "amount",
        type: "Uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "success",
        type: "felt",
      },
    ],
    type: "function",
  },
  {
    inputs: [
      {
        name: "owner",
        type: "felt",
      },
      {
        name: "spender",
        type: "felt",
      },
    ],
    name: "allowance",
    outputs: [
      {
        name: "remaining",
        type: "Uint256",
      },
    ],
    type: "function",
  },
]

// Staking Pool ABI for delegation
const stakingPoolAbi = [
  {
    name: "enter_delegation_pool",
    type: "function",
    inputs: [
      {
        name: "reward_address",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "amount",
        type: "core::integer::u128"
      }
    ],
    outputs: [],
    state_mutability: "external"
  },
  {
    name: "exit_delegation_pool_intent",
    type: "function",
    inputs: [
      {
        name: "amount",
        type: "core::integer::u128"
      }
    ],
    outputs: [],
    state_mutability: "external"
  },
  {
    name: "exit_delegation_pool_action",
    type: "function",
    inputs: [
      {
        name: "pool_member",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ],
    outputs: [],
    state_mutability: "external"
  }
]

interface Validator {
  address: string;
  name: string;
  delegatedStake: number;
  totalDelegators: number;
  isVerified: boolean;
  imgSrc: string | null;
  poolAddress: string;
}

interface Stats {
  avgDelegatorsTopTen: number;
  avgStakedPerStaker: number;
  validatorsWithZeroStake: number;
  avgDelegatedBottom20: number;
  avgStakedBottom20: number;
  validatorsOver1M: number;
  avgNumDelegatorsTop10: number;
  avgNumDelegatorsBottom20: number;
  totalNetworkStake: number;
  topTenStake: number;
  validatorsWithTwoPlus: number;
  totalActiveValidators: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
}

interface UnstakeIntent {
  amount: number;
  poolAddress: string;
  validatorName: string;
  intentTimestamp: number;
  canClaimAt: number;
}

interface UserStakeInfo {
  totalDelegated: number;
  availableRewards: number;
  lastClaimTime: string;
  delegations: {
    validatorName: string;
    poolAddress: string;
    delegatedStake: number;
    pendingRewards: number;
  }[];
  unstakeIntents: UnstakeIntent[];
}

// Add this interface near your other interfaces
interface StatMetric {
  title: string;
  value: number;
  tooltip: string;
  icon: React.ReactNode;
  color: string;
}

// Helper function to convert human readable amount to token amount with decimals
const parseTokenAmount = (amount: string): bigint => {
  try {
    // Split on decimal point
    const [whole, decimal = ""] = amount.split(".");
    
    // Pad or truncate decimal part to STRK_DECIMALS
    const paddedDecimal = decimal.padEnd(STRK_DECIMALS, "0").slice(0, STRK_DECIMALS);
    
    // Combine whole and decimal parts
    const combinedStr = whole + paddedDecimal;
    
    // Remove leading zeros and convert to BigInt
    return BigInt(combinedStr.replace(/^0+/, "") || "0");
  } catch (error) {
    console.error('Error parsing amount:', error);
    return BigInt(0);
  }
}

const UNSTAKING_PERIOD = 21 * 24 * 60 * 60 * 1000; // 21 days in milliseconds

// Add this helper function near the top of the file with other utility functions
const normalizeAddress = (address: string): string => {
  if (!address) return address;
  
  // If address starts with 0x and the next character isn't 0, add the 0
  if (address.startsWith('0x') && address.length === 65) {
    return `0x0${address.slice(2)}`;
  }
  return address;
};

// Add this new component near your other component definitions
const CallToAction = () => {
  return (
    <div className="w-full bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm border-b border-blue-500/20 p-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <svg 
              className="w-6 h-6 text-blue-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Shape Starknet's Future</h2>
            <p className="text-gray-400">
              Every delegation strengthens the network. Be part of Starknet's decentralized future.
            </p>
          </div>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
        >
          Start Delegating
        </Button>
      </div>
    </div>
  );
};

const ContactInfo = () => {
  return (
    <div className="w-full bg-gray-800/80 backdrop-blur-sm border-t border-gray-700/50 py-3 mt-8">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-6 text-sm">
        <span className="text-blue-400 font-semibold">Talk with the Dev:</span>
        <a
          href="mailto:noel.jarillo@gmail.com"
          className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors duration-200"
          title="Email"
        >
          <Mail className="h-4 w-4" />
          <span>noel.jarillo@gmail.com</span>
        </a>
        
        <a
          href="https://t.me/satoshinakamoto420"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors duration-200"
          title="Telegram"
        >
          <MessageCircle className="h-4 w-4" />
          <span>@satoshinakamoto420</span>
        </a>
        
        <a
          href="https://twitter.com/0xN0el"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors duration-200"
          title="X (Twitter)"
        >
          <Twitter className="h-4 w-4" />
          <span>@0xN0el</span>
        </a>
      </div>
    </div>
  );
};

// Add this new component near your other component definitions
const VoyagerBanner = () => {
  return (
    <a 
      href="https://voyager.online/"
      target="_blank"
      rel="noopener noreferrer"
      className="w-full bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 py-2 block hover:bg-gray-800/80 transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3">
        <img 
          src="/default.png" 
          alt="Voyager Logo" 
          className="w-6 h-6 rounded"
        />
        <span className="text-sm text-gray-300">
          Data powered by <span className="text-blue-400 font-semibold">Voyager</span>
        </span>
      </div>
    </a>
  );
};

export default function Home() {
  const [selectedDelegator, setSelectedDelegator] = useState<Validator | null>(null)
  const [stakeAmount, setStakeAmount] = useState("")
  const [isStaking, setIsStaking] = useState(false)
  const [stakeResult, setStakeResult] = useState("")
  const [validators, setValidators] = useState<Validator[]>([])
  const [bottomValidators, setBottomValidators] = useState<Validator[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [walletConnected, setWalletConnected] = useState(false)
  const [account, setAccount] = useState<AccountInterface | null>(null)
  const [stats, setStats] = useState<Stats>({
    avgDelegatorsTopTen: 0,
    avgStakedPerStaker: 0,
    validatorsWithZeroStake: 0,
    avgDelegatedBottom20: 0,
    avgStakedBottom20: 0,
    validatorsOver1M: 0,
    avgNumDelegatorsTop10: 0,
    avgNumDelegatorsBottom20: 0,
    totalNetworkStake: 0,
    topTenStake: 0,
    validatorsWithTwoPlus: 0,
    totalActiveValidators: 0
  })
  const [isStakeInfoOpen, setIsStakeInfoOpen] = useState(false);
  const [userStakeInfo, setUserStakeInfo] = useState<UserStakeInfo>({
    totalDelegated: 0,
    availableRewards: 0,
    lastClaimTime: '-',
    delegations: [],
    unstakeIntents: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, topValidatorsResponse, bottomValidatorsResponse] = await Promise.all([
          fetch(`/api/stats?verified=${verifiedOnly}`),
          fetch('/api/validators?mode=top&limit=20'),
          fetch(`/api/validators?mode=bottom&limit=20${verifiedOnly ? '&verified=true' : ''}`)
        ]);
        
        if (!statsResponse.ok) throw new Error('Failed to fetch stats');
        if (!topValidatorsResponse.ok) throw new Error('Failed to fetch top validators');
        if (!bottomValidatorsResponse.ok) throw new Error('Failed to fetch bottom validators');
        
        const statsData = await statsResponse.json();
        const topValidatorsData = await topValidatorsResponse.json();
        const bottomValidatorsData = await bottomValidatorsResponse.json();
        
        setStats(statsData);
        setValidators(topValidatorsData);
        setBottomValidators(bottomValidatorsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, [verifiedOnly])

  const connectWallet = async () => {
    try {
      if (!window.starknet) {
        throw new Error("Please install ArgentX, Braavos, or another Starknet wallet");
      }

      await window.starknet.enable();
      
      if (!window.starknet.isConnected) {
        throw new Error("Failed to connect to wallet");
      }
      
      const userAccount = window.starknet.account;
      setAccount(userAccount);
      setWalletConnected(true);
      return userAccount;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStakeResult('Failed to connect wallet');
      return null;
    }
  }

  const checkAllowance = async (poolAddress: string, amount: string): Promise<boolean> => {
    if (!account) return false;

    try {
      const amountBn = parseTokenAmount(amount);
      
      // Make direct RPC call for allowance
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'starknet_call',
          params: [
            {
              contract_address: STRK_TOKEN_ADDRESS,
              entry_point_selector: ALLOWANCE_SELECTOR,
              calldata: [account.address, poolAddress]
            },
            'latest'
          ],
          id: 1
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Parse the allowance result
      const allowanceHex = result.result[0];
      const allowanceBn = BigInt(allowanceHex);
      
      console.log('Current allowance:', allowanceBn.toString());
      console.log('Required amount:', amountBn.toString());
      
      return allowanceBn >= amountBn;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  }

  const approveTokens = async (poolAddress: string, amount: string) => {
    if (!account) return false;

    try {
      // Check if we already have sufficient allowance
      const hasAllowance = await checkAllowance(poolAddress, amount);
      if (hasAllowance) {
        console.log('Sufficient allowance already exists');
        return true;
      }

      const amountBn = cairo.uint256(parseTokenAmount(amount).toString());
      const tokenContract = new Contract(erc20Abi, STRK_TOKEN_ADDRESS, account);
      
      const approveTx = await tokenContract.approve(poolAddress, amountBn);
      await account.waitForTransaction(approveTx.transaction_hash);
      return true;
    } catch (error) {
      console.error('Error approving   strk:', error);
      setStakeResult('Failed to approve   strk');
      return false;
    }
  }

  const stake = async (poolAddress: string, amount: string) => {
    if (!account) return false;

    try {
      const amountBn = parseTokenAmount(amount);
      const poolContract = new Contract(stakingPoolAbi, poolAddress, account);
      
      const stakeTx = await poolContract.enter_delegation_pool(
        account.address,
        amountBn
      );
      
      await account.waitForTransaction(stakeTx.transaction_hash);
      return true;
    } catch (error) {
      console.error('Error staking:', error);
      setStakeResult('Failed to stake   strk');
      return false;
    }
  }

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDelegator || !stakeAmount) return

    setIsStaking(true)
    setStakeResult("")

    try {
      // Connect wallet if not connected
      if (!walletConnected) {
        const userAccount = await connectWallet();
        if (!userAccount) {
          setIsStaking(false);
          return;
        }
      }

      // Approve   strk
      const approved = await approveTokens(selectedDelegator.poolAddress, stakeAmount);
      if (!approved) {
        setIsStaking(false);
        return;
      }

      // Stake   strk
      const staked = await stake(selectedDelegator.poolAddress, stakeAmount);
      if (staked) {
        setStakeResult(`Successfully staked ${stakeAmount} tokens to ${selectedDelegator.name}`);
        setStakeAmount("");
      }
    } catch (error) {
      console.error('Staking error:', error);
      setStakeResult('An error occurred while staking');
    } finally {
      setIsStaking(false);
    }
  }

  const selectRandomDelegator = (fromBottom: boolean = false) => {
    const validatorList = fromBottom ? bottomValidators : validators;
    if (validatorList.length === 0) return;
    const randomIndex = Math.floor(Math.random() * validatorList.length);
    setSelectedDelegator(validatorList[randomIndex]);
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const validator = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            {validator.imgSrc && (
              <img 
                src={validator.imgSrc} 
                alt={validator.name} 
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="font-semibold text-blue-400">
              {validator.name}
              {validator.isVerified && (
                <span className="ml-1 text-green-400">✓</span>
              )}
            </span>
          </div>
          <div className="text-sm text-gray-300">
            <p>Address: <a href={`https://voyager.online/validator/${validator.address}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{validator.address.slice(0, 8)}...{validator.address.slice(-6)}</a></p>
            <p>Delegated Stake: {validator.delegatedStake.toLocaleString()} STRK</p>
            <p>Total Delegators: {validator.totalDelegators?.toLocaleString() || 'N/A'}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const fetchUserStakeInfo = async () => {
    if (!account) return;
    
    try {
      const addressToUse = normalizeAddress(account.address);
      const response = await fetch(`/api/delegations?address=${addressToUse}`);
      if (!response.ok) throw new Error('Failed to fetch delegations');
      
      const data = await response.json();
      
      // Get stored intents from localStorage
      const storedIntents = JSON.parse(localStorage.getItem(`unstakeIntents_${addressToUse}`) || '[]');
      
      setUserStakeInfo({
        totalDelegated: data.totalDelegated,
        availableRewards: data.totalPendingRewards,
        lastClaimTime: new Date().toLocaleDateString(),
        delegations: data.delegations,
        unstakeIntents: storedIntents
      });
    } catch (error) {
      console.error('Error fetching stake info:', error);
    }
  };

  const claimRewards = async () => {
    // TODO: Implement actual claiming logic
    alert('Claiming rewards... (mock)');
  };

  const unstakeTokens = async () => {
    // TODO: Implement actual unstaking logic
    alert('Unstaking tokens... (mock)');
  };

  const signalUnstakeIntent = async (delegation: UserStakeInfo['delegations'][0], amount: string) => {
    if (!account) return;
    
    try {
      const normalizedAddress = normalizeAddress(account.address);
      const amountBn = parseTokenAmount(amount);
      const poolContract = new Contract(stakingPoolAbi, delegation.poolAddress, account);
      
      const tx = await poolContract.exit_delegation_pool_intent(amountBn);
      await account.waitForTransaction(tx.transaction_hash);
      
      // Add to unstake intents
      const now = Date.now();
      const newIntent: UnstakeIntent = {
        amount: Number(amount),
        poolAddress: delegation.poolAddress,
        validatorName: delegation.validatorName,
        intentTimestamp: now,
        canClaimAt: now + UNSTAKING_PERIOD
      };
      
      // Store intent in localStorage
      const storedIntents = JSON.parse(localStorage.getItem(`unstakeIntents_${normalizedAddress}`) || '[]');
      localStorage.setItem(
        `unstakeIntents_${normalizedAddress}`,
        JSON.stringify([...storedIntents, newIntent])
      );
      
      // Update UI
      setUserStakeInfo(prev => ({
        ...prev,
        unstakeIntents: [...prev.unstakeIntents, newIntent]
      }));
      
      return true;
    } catch (error) {
      console.error('Error signaling unstake:', error);
      return false;
    }
  };

  const finalizeUnstake = async (intent: UnstakeIntent) => {
    if (!account) return;
    
    try {
      const normalizedAddress = normalizeAddress(account.address);
      const now = Date.now();
      if (now < intent.canClaimAt) {
        throw new Error(`Cannot unstake yet. Available in ${Math.ceil((intent.canClaimAt - now) / (1000 * 60 * 60 * 24))} days`);
      }
      
      const poolContract = new Contract(stakingPoolAbi, intent.poolAddress, account);
      const tx = await poolContract.exit_delegation_pool_action(account.address);
      await account.waitForTransaction(tx.transaction_hash);
      
      // Remove from localStorage
      const storedIntents = JSON.parse(localStorage.getItem(`unstakeIntents_${normalizedAddress}`) || '[]');
      const updatedIntents = storedIntents.filter((i: UnstakeIntent) => 
        i.intentTimestamp !== intent.intentTimestamp
      );
      localStorage.setItem(`unstakeIntents_${normalizedAddress}`, JSON.stringify(updatedIntents));
      
      // Update UI
      setUserStakeInfo(prev => ({
        ...prev,
        unstakeIntents: prev.unstakeIntents.filter(i => i.intentTimestamp !== intent.intentTimestamp)
      }));
      
      return true;
    } catch (error) {
      console.error('Error finalizing unstake:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (account) {
      fetchUserStakeInfo();
    }
  }, [account]);

  const NetworkStatsHeader = () => {
    const totalStake = stats.totalNetworkStake;
    const topTenStake = stats.topTenStake;
    const restStake = totalStake - topTenStake;
    
    return (
      <div className="w-full bg-gray-900 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Total Network Stake</h3>
            <p className="text-4xl font-bold text-white mb-1">
              {Math.round(totalStake).toLocaleString()} STRK
            </p>
            <p className="text-sm text-gray-500">
              Across all validators
            </p>
          </div>
          
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-400">Stake Distribution</h3>
              <span className="text-lg font-semibold text-blue-400">
                {Math.round(topTenStake/totalStake * 100)}% Concentration
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Top 10 Validators</span>
                  <span>{Math.round(topTenStake).toLocaleString()} STRK</span>
                </div>
                <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    style={{ width: `${(topTenStake/totalStake) * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Other Validators</span>
                  <span>{Math.round(restStake).toLocaleString()} STRK</span>
                </div>
                <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                    style={{ width: `${(restStake/totalStake) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update the ComparisonMetrics component
  const ComparisonMetrics = () => {
    return (
      <div className="mt-8 bg-gray-900 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-blue-400 mb-6">Top 10 vs Bottom 20 Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-400">Average Delegated Stake</h4>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.avgDelegatorsTopTen.toLocaleString()} STRK
                </p>
                <span className="text-blue-400 text-sm">Top 10</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {stats.avgDelegatedBottom20.toLocaleString()} STRK
                </p>
                <span className="text-purple-400 text-sm">Bottom 20</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-400">Average Total Stake</h4>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.avgStakedPerStaker.toLocaleString()} STRK
                </p>
                <span className="text-blue-400 text-sm">Top 10</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {stats.avgStakedBottom20.toLocaleString()} STRK
                </p>
                <span className="text-purple-400 text-sm">Bottom 20</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-400">Average Delegators</h4>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.avgNumDelegatorsTop10.toLocaleString()}
                </p>
                <span className="text-blue-400 text-sm">Top 10</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {stats.avgNumDelegatorsBottom20.toLocaleString()}
                </p>
                <span className="text-purple-400 text-sm">Bottom 20</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Stake Ratio (Top 10 : Bottom 20)</h4>
              <p className="text-3xl font-bold text-white">
                {(stats.avgDelegatorsTopTen / stats.avgDelegatedBottom20).toFixed(1)}x
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Top 10 validators have {(stats.avgDelegatorsTopTen / stats.avgDelegatedBottom20).toFixed(1)}x more stake
              </p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Delegator Ratio (Top 10 : Bottom 20)</h4>
              <p className="text-3xl font-bold text-white">
                {(stats.avgNumDelegatorsTop10 / stats.avgNumDelegatorsBottom20).toFixed(1)}x
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Top 10 validators have {(stats.avgNumDelegatorsTop10 / stats.avgNumDelegatorsBottom20).toFixed(1)}x more delegators
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update the MetricCard component
  const MetricCard = ({ metric }: { metric: StatMetric }) => {
    return (
      <div 
        className="group relative bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700/50 transition-all duration-300 hover:bg-gray-700/50 hover:border-gray-600"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${metric.color}`}>
              {metric.icon}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-400">{metric.title}</h4>
              <p className="text-2xl font-bold text-white mt-1">{metric.value.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Updated Tooltip to appear below */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
          <div className="w-3 h-3 bg-gray-900 border-gray-700 border-l border-t rotate-45 absolute -top-1.5 left-1/2 -translate-x-1/2"></div>
          <div className="bg-gray-900 text-gray-300 px-4 py-2 rounded-lg shadow-xl border border-gray-700 w-64">
            <p className="text-sm">{metric.tooltip}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center pt-0 px-4 pb-4">
      <VoyagerBanner />
      <CallToAction />
      <div className="w-full sticky top-0 z-50">
        <AnimatePresence>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: isStakeInfoOpen ? 'auto' : '64px' }}
            className="w-full bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 mb-8 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-end h-16">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setIsStakeInfoOpen(!isStakeInfoOpen)}
              >
                <span className="text-xl font-semibold text-blue-400">Staking Dashboard</span>
                {isStakeInfoOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
              {account && (
                <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700 ml-4">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
              )}
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isStakeInfoOpen ? 1 : 0 }}
              className="px-4 pb-6 pt-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Total Delegated</h4>
                    <p className="text-3xl font-bold text-white">
                      {userStakeInfo.totalDelegated.toLocaleString()} STRK
                    </p>
                  </div>
                  <Button
                    onClick={unstakeTokens}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white w-full"
                    disabled={userStakeInfo.totalDelegated <= 0}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Unstake Tokens
                  </Button>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Available Rewards</h4>
                    <p className="text-3xl font-bold text-green-400">
                      {userStakeInfo.availableRewards.toLocaleString()} STRK
                    </p>
                  </div>
                  <Button
                    onClick={claimRewards}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white w-full"
                    disabled={userStakeInfo.availableRewards <= 0}
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Claim Rewards
                  </Button>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="md:col-span-1 bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg"
                >
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Your Delegations</h4>
                  <p className="text-3xl font-bold text-white">
                    {userStakeInfo.delegations.length} Validators
                  </p>
                </motion.div>

                {userStakeInfo.delegations.length > 0 && (
                  <div className="md:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userStakeInfo.delegations.map((delegation, index) => (
                        <motion.div
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg"
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className="relative w-12 h-12">
                              {validators.find(v => v.poolAddress === delegation.poolAddress)?.imgSrc ? (
                                <img
                                  src={validators.find(v => v.poolAddress === delegation.poolAddress)?.imgSrc || ''}
                                  alt={delegation.validatorName}
                                  className="w-12 h-12 rounded-full"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <span className="text-blue-400 text-lg font-bold">
                                    {delegation.validatorName.charAt(0)}
                                  </span>
                                </div>
                              )}
                              {validators.find(v => v.poolAddress === delegation.poolAddress)?.isVerified && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{delegation.validatorName}</h3>
                              <a
                                href={`https://voyager.online/contract/${delegation.poolAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-400 hover:text-blue-400"
                              >
                                {delegation.poolAddress.slice(0, 6)}...{delegation.poolAddress.slice(-4)}
                              </a>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Delegated</span>
                              <span className="text-white font-medium">
                                {delegation.delegatedStake.toLocaleString()} STRK
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Pending Rewards</span>
                              <span className="text-green-400 font-medium">
                                {delegation.pendingRewards.toLocaleString()} STRK
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            <Button
                              onClick={() => {
                                const amount = prompt(`Enter amount to unstake from ${delegation.validatorName}:`);
                                if (amount && !isNaN(Number(amount)) && Number(amount) <= delegation.delegatedStake) {
                                  signalUnstakeIntent(delegation, amount);
                                }
                              }}
                              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
                              disabled={delegation.delegatedStake <= 0}
                            >
                              Start Unstake
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-8 relative">
        <Card className="lg:col-span-3 bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    title: "Zero Delegators",
                    value: stats.validatorsWithZeroStake,
                    tooltip: "Number of validators that have not received any delegations yet. These validators are waiting for their first delegators to join.",
                    icon: <Users className="w-5 h-5 text-red-400" />,
                    color: "bg-red-500/20"
                  },
                  {
                    title: ">1M STRK Delegated",
                    value: stats.validatorsOver1M,
                    tooltip: "Number of validators that have received more than 1 million STRK in delegations. These are the largest validators by stake.",
                    icon: <Landmark className="w-5 h-5 text-green-400" />,
                    color: "bg-green-500/20"
                  },
                  {
                    title: "2+ Delegators",
                    value: stats.validatorsWithTwoPlus,
                    tooltip: "Number of validators that have two or more unique delegators. This indicates validators with a diverse delegation base.",
                    icon: <Users2 className="w-5 h-5 text-blue-400" />,
                    color: "bg-blue-500/20"
                  },
                  {
                    title: "Active Validators",
                    value: stats.totalActiveValidators,
                    tooltip: "Total number of validators currently active in the network with non-zero stake. This represents the size of the validator network.",
                    icon: <Activity className="w-5 h-5 text-purple-400" />,
                    color: "bg-purple-500/20"
                  }
                ].map((metric, index) => (
                  <MetricCard key={index} metric={metric} />
                ))}
              </div>
              <NetworkStatsHeader />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <ComparisonMetrics />

              <div>
                <h3 className="text-xl font-semibold text-blue-400 mb-4">Top 20 Validators by Delegated Stake</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={validators}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const validator = data.activePayload[0].payload;
                          setSelectedDelegator(validator);
                          const stakingElement = document.getElementById('staking-component');
                          if (stakingElement) {
                            stakingElement.scrollIntoView({ behavior: 'smooth' });
                          }
                        }
                      }}
                    >
                      <XAxis 
                        dataKey={(data) => {
                          const words = data.name.split(' ');
                          if (words.length === 1) {
                            return data.name;  // Return single word names as is
                          }
                          // For multi-word names, keep first word and abbreviate rest
                          return `${words[0]} ${words.slice(1).map((word: string) => word[0]).join('')}`;
                        }}
                        tick={{ fill: "#9CA3AF" }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fill: "#9CA3AF" }}
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="delegatedStake" 
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      >
                        {validators.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.isVerified ? "#3B82F6" : "#6B7280"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-blue-400 mb-4">Bottom 20 Validators by Delegated Stake</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={bottomValidators}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const validator = data.activePayload[0].payload;
                          setSelectedDelegator(validator);
                          const stakingElement = document.getElementById('staking-component');
                          if (stakingElement) {
                            stakingElement.scrollIntoView({ behavior: 'smooth' });
                          }
                        }
                      }}
                    >
                      <XAxis 
                        dataKey={(data) => {
                          const words = data.name.split(' ');
                          if (words.length === 1) {
                            return data.name;
                          }
                          return `${words[0]} ${words.slice(1).map((word: string) => word[0]).join('')}`;
                        }}
                        tick={{ fill: "#9CA3AF" }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fill: "#9CA3AF" }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `${(value / 1000000).toFixed(1)}M`;
                          } else if (value >= 1000) {
                            return `${(value / 1000).toFixed(1)}K`;
                          }
                          return value.toFixed(0);
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="delegatedStake" 
                        fill="#9333EA"
                      >
                        {bottomValidators.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.isVerified ? "#9333EA" : "#6B7280"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-gray-800 border-gray-700 lg:sticky lg:top-24 h-fit">
          <CardHeader className="text-center" id="staking-component">
            <CardTitle className="text-2xl font-bold text-blue-400">Stake STRK</CardTitle>
            <CardDescription className="text-gray-400">Choose a validator and stake your STRK</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="verifiedOnly"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="verifiedOnly" className="text-gray-300">
                    Show only verified validators
                  </Label>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => selectRandomDelegator(false)} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-2"
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Random from Top 20
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={() => selectRandomDelegator(true)} 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Random from Bottom 20
                  </Button>
                </motion.div>
              </div>
              {selectedDelegator && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-gray-700 rounded-md bg-gray-900"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {selectedDelegator.imgSrc && (
                      <img 
                        src={selectedDelegator.imgSrc} 
                        alt={selectedDelegator.name} 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-blue-400">
                        {selectedDelegator.name}
                        {selectedDelegator.isVerified && (
                          <span className="ml-1 text-green-400">✓</span>
                        )}
                      </p>
                      <a 
                        href={`https://voyager.online/validator/${selectedDelegator.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 hover:text-blue-400"
                      >
                        {selectedDelegator.address.slice(0, 8)}...{selectedDelegator.address.slice(-6)}
                      </a>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-400">Delegated Stake: {selectedDelegator.delegatedStake.toLocaleString()} STRK</p>
                    <p className="text-sm text-gray-400">Total Delegators: {selectedDelegator.totalDelegators?.toLocaleString() || 'N/A'}</p>
                  </div>
                </motion.div>
              )}
              <form onSubmit={handleStake} className="space-y-4">
                <div>
                  <Label htmlFor="stakeAmount" className="text-gray-300">
                    Stake Amount (STRK)
                  </Label>
                  <Input
                    id="stakeAmount"
                    type="number"
                    step="0.000000000000000001"
                    min="0"
                    placeholder="Enter amount to stake (e.g. 0.1)"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={!selectedDelegator || isStaking}
                  >
                    {isStaking ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Staking...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        Stake Now
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </div>
          </CardContent>
          <CardFooter>
            {stakeResult && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-green-400 w-full text-center"
              >
                {stakeResult}
              </motion.p>
            )}
          </CardFooter>
        </Card>
      </div>

      {userStakeInfo.unstakeIntents.length > 0 && (
        <div className="md:col-span-3 mt-6">
          <h3 className="text-xl font-semibold text-blue-400 mb-4">Pending Unstakes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userStakeInfo.unstakeIntents.map((intent, index) => (
              <motion.div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg"
              >
                <h4 className="font-semibold text-white mb-2">{intent.validatorName}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount</span>
                    <span className="text-white">{intent.amount.toLocaleString()} STRK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Available in</span>
                    <span className="text-white">
                      {Math.max(0, Math.ceil((intent.canClaimAt - Date.now()) / (1000 * 60 * 60 * 24)))} days
                    </span>
                  </div>
                  <Button
                    onClick={() => finalizeUnstake(intent)}
                    className="w-full mt-2"
                    disabled={Date.now() < intent.canClaimAt}
                  >
                    {Date.now() < intent.canClaimAt ? 'Waiting Period' : 'Claim Unstaked Tokens'}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      <ContactInfo />
    </div>
  )
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
      <h4 className="text-lg font-semibold text-blue-400 mb-2">{title}</h4>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}


