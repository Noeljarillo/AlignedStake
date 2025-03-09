"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, Zap, ChevronDown, ChevronUp, Gift, Users, Landmark, Users2, Activity, Mail, MessageCircle, Twitter, ChevronLeft, ChevronRight, Search, Filter, ArrowUpDown, Check, AlertCircle, CheckCircle, ShieldCheck, Shield, Coins } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Contract, AccountInterface, RpcProvider } from "starknet"
import { cairo } from "starknet"
import CountUp from "react-countup"
import { SpeedInsights } from "@vercel/speed-insights/next"
import StructuredData from "./components/StructuredData"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { formatTokenAmount } from "@/lib/utils"

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
const BALANCE_OF_SELECTOR = "0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e";
//const TEST_ADDRESS = "0x07ffdeec4142172c63deb3b59b2f2b3e8efab889fecc0314d19db34ba0780027";
//const IS_TESTING = true; // Flag to easily disable test mode

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
    name: "add_to_delegation_pool",
    type: "function",
    inputs: [
      {
        name: "pool_member",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "amount",
        type: "core::integer::u128"
      }
    ],
    outputs: [
      {
        type: "core::integer::u128"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "claim_rewards",
    type: "function",
    inputs: [
      {
        name: "pool_member",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ],
    outputs: [
      {
        type: "core::integer::u128"
      }
    ],
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
  revenueShare?: number;
  startTime?: number;
  rank?: number; // Add the rank property as optional
  ownStake?: number; // Add the validator's own stake
  totalStake?: number; // Add the total stake (own + delegated)
}

interface Stats {
  avgDelegatorsTopTen: number;
  avgStakedPerStaker: number;
  validatorsWithZeroStake: number;
  avgDelegatedRest: number;
  avgStakedRest: number;
  validatorsOver1M: number;
  avgNumDelegatorsTop10: number;
  avgNumDelegatorsRest: number;
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

// Add this new interface to include unpooltime
interface DelegationWithUnpoolTime {
  validatorName: string;
  poolAddress: string;
  delegatedStake: number;
  pendingRewards: number;
  unpoolTime?: number; // Optional field for unpooltime
}

interface UserStakeInfo {
  totalDelegated: number;
  availableRewards: number;
  lastClaimTime: string;
  delegations: DelegationWithUnpoolTime[]; // Updated type
  unstakeIntents: UnstakeIntent[];
}

interface StatMetric {
  title: string;
  value: number;
  tooltip: string;
  icon: React.ReactNode;
  color: string;
}

// Add this interface before the DelegationStats component
interface DelegationRecord {
  txHash: string;
  timestamp: number;
  senderAddress: string;
  amountStaked: number;
}

// Add these interfaces near other interface definitions
interface PriceData {
  usdPrice: number;
  circulatingSupply: number;
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

const normalizeAddress = (address: string): string => {
  if (!address) return address;
  
  // If address starts with 0x and the next character isn't 0, add the 0
  if (address.startsWith('0x') && address.length === 65) {
    return `0x0${address.slice(2)}`;
  }
  return address;
};

const CallToAction = () => {
  return (
    <div className="w-full bg-background/80 backdrop-blur-sm border-b border-border p-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-primary" 
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
            <h2 className="text-xl font-semibold">Shape Starknet's Future</h2>
            <p className="text-muted-foreground">
              Every delegation strengthens the network. Be part of Starknet's decentralized future.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/guide"
            className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-md"
          >
            <Info className="h-4 w-4" />
            <span>New to staking? Read the guide</span>
          </Link>
          
          <Link
            href="/mission"
            className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-md"
          >
            <Shield className="h-4 w-4" />
            <span>Learn about our mission</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const ContactInfo = () => {
  return (
    <div className="w-full bg-gray-800/80 backdrop-blur-sm border-t border-gray-700/50 py-3 mt-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-4 text-sm">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <Link href="/guide" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
            Guides
          </Link>
          <Link href="/validator" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
            Validators
          </Link>
          <Link href="/mission" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
            Our Mission
          </Link>
        </div>
        
        <div className="flex items-center justify-center gap-6 flex-wrap">
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
    </div>
  );
};


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


const DelegationStats = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStaked: 0,
    recentDelegations: [] as DelegationRecord[]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/delegation-stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching delegation stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="mt-12 w-full bg-background rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Aligned Delegation Stats</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Counters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-background p-6 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-muted-foreground">Aligned Delegators</h3>
                    <p className="text-3xl font-bold">
                      <CountUp 
                        end={stats.totalUsers} 
                        duration={2} 
                        separator="," 
                      />
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-background p-6 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Landmark className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-muted-foreground">Total STRK Delegated</h3>
                    <p className="text-3xl font-bold">
                      <CountUp 
                        end={stats.totalStaked} 
                        duration={2} 
                        decimals={2}
                        decimal="."
                        separator="," 
                        suffix=" STRK"
                      />
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Recent Delegations */}
            {stats.recentDelegations.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xl font-semibold mb-4">Recent Delegations</h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Time</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Delegator</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tx Hash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stats.recentDelegations.map((delegation, index) => (
                          <motion.tr 
                            key={delegation.txHash}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className="bg-background/50 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm">
                              {new Date(delegation.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <a 
                                href={`https://voyager.online/contract/${delegation.senderAddress}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                              >
                                {delegation.senderAddress.slice(0, 6)}...{delegation.senderAddress.slice(-4)}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {delegation.amountStaked.toLocaleString()} STRK
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <a 
                                href={`https://voyager.online/tx/${delegation.txHash}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                              >
                                {delegation.txHash.slice(0, 6)}...{delegation.txHash.slice(-4)}
                              </a>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                <Landmark className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-400">No delegations yet</h3>
                <p className="text-gray-500 mt-2">Be the first to delegate and support the network!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


interface ValidatorListProps {
  onSelectValidator: (validator: Validator) => void;
}


const ValidatorList = ({ onSelectValidator }: ValidatorListProps) => {
  const router = useRouter()
  const [validators, setValidators] = useState<Validator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10); 
  const [showBottom20, setShowBottom20] = useState(false);
  const [maxFee, setMaxFee] = useState<number | null>(null);
  

  const [isSorting, setIsSorting] = useState(false);
  
  const fetchValidators = async () => {
    try {
      setIsLoading(true);
      // For subsequent loads (sorting/filtering), use the sorting indicator instead of full loading
      if (validators.length > 0) {
        setIsSorting(true);
        setIsLoading(false);
      }
      
      let url = `/api/validators/all?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}&verified=${verifiedOnly}&search=${encodeURIComponent(searchTerm)}`;
      
      // If showing bottom 20, override page size but keep sort settings
      if (showBottom20) {
        url = `/api/validators/all?page=1&pageSize=20&sortBy=${sortBy}&sortOrder=${sortOrder}&verified=${verifiedOnly}&search=${encodeURIComponent(searchTerm)}`;
      }
      
      // Add max fee filter if set
      if (maxFee !== null) {
        url += `&maxFee=${maxFee}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch validators');
      }
      
      const data = await response.json();
      setValidators(data.validators);
      setTotalPages(data.pagination.totalPages);
      
      // If showing bottom 20, we only have 1 page
      if (showBottom20) {
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching validators:', error);
    } finally {
      setIsLoading(false);
      setIsSorting(false);
    }
  };
  
  useEffect(() => {
    fetchValidators();
  }, [page, sortBy, sortOrder, verifiedOnly, searchTerm, pageSize, showBottom20, maxFee]);
  
  const handleSort = (column: string) => {
    // Allow sorting even when showing bottom 20
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      
      // For numerical fields that are better when higher, default to descending
      // For fee, lower is better so default to ascending
      if (column === 'revenueShare') {
        setSortOrder('asc');
      } else if (column === 'rank') {
        setSortOrder('asc'); // Ranks should default to ascending (1, 2, 3...)
      } else {
        setSortOrder('desc');
      }
    }
    setPage(1);
    // No need to call fetchValidators here as the useEffect will handle it
  };
  
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchValidators();
  };
  
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };
  
  const toggleBottom20 = () => {
    setShowBottom20(!showBottom20);
    setPage(1);
  };
  
  const handleMaxFeeChange = (value: string | null) => {
    setMaxFee(value === "any" ? null : value ? parseInt(value) : null);
    setPage(1);
  };
  
  // Add a helper function to format the Unix timestamp to a readable date
  const formatStartTime = (unixTimestamp: number | string | undefined): string => {
    if (!unixTimestamp) return 'N/A';
    
    const timestamp = typeof unixTimestamp === 'string' ? parseInt(unixTimestamp) : unixTimestamp;
    
    // Check if timestamp is in seconds (Unix standard) or milliseconds
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'N/A';
    
    // Format date explicitly as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };
  
  const formatFeePercentage = (fee: string | number | undefined): string => {
    if (fee === undefined || fee === null) return '0%';
    
    // Convert to number if it's a string
    const feeNumber = typeof fee === 'string' ? parseFloat(fee) : fee;
    
    // The fee is in basis points (1/100 of a percent)
    // So 10 = 0.1%, 1000 = 10%
    return `${(feeNumber / 100).toFixed(2)}%`;
  };
  
  const navigateToValidatorDashboard = (validator: Validator, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/validator/${validator.address}`);
  };
  
  return (
    <div className="w-full bg-background rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-xl font-semibold text-foreground">
            {showBottom20 ? "Bottom 20 Validators" : "All Validators"}
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search validators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-input rounded-md py-2 pl-10 pr-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <button type="submit" className="sr-only">Search</button>
            </form>
            
            <div className="flex items-center gap-2">
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setPage(1);
                }}
                disabled={showBottom20}
              >
                <SelectTrigger className="w-[100px] bg-background border-input text-foreground">
                  <SelectValue placeholder="20 per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="p-4 space-y-4 w-64 bg-gray-900 border-gray-700">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setVerifiedOnly(!verifiedOnly)}>
                    <div className="w-4 h-4 flex items-center justify-center border border-input rounded">
                      {verifiedOnly && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <span>Verified Only</span>
                  </div>
                  
                  <div className="flex items-center gap-2 cursor-pointer" onClick={toggleBottom20}>
                    <div className="w-4 h-4 flex items-center justify-center border border-input rounded">
                      {showBottom20 && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <span>Show Bottom 20</span>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Max Fee (%)</label>
                    <Select
                      value={maxFee?.toString() || ""}
                      onValueChange={handleMaxFeeChange}
                    >
                      <SelectTrigger className="w-full bg-gray-900 border-input text-gray-200">
                        <SelectValue placeholder="Any fee" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="any">Any fee</SelectItem>
                        <SelectItem value="0">0% (No fee)</SelectItem>
                        <SelectItem value="5">Max 5%</SelectItem>
                        <SelectItem value="10">Max 10%</SelectItem>
                        <SelectItem value="15">Max 15%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      ) : validators.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium text-muted-foreground">No validators found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto relative">
            {/* Add overlay with spinner when sorting/filtering */}
            {isSorting && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button 
                      className={`flex items-center gap-1 hover:text-primary transition-colors`}
                      onClick={() => handleSort('rank')}
                    >
                      Rank
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Validator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button 
                      className={`flex items-center gap-1 hover:text-primary transition-colors`}
                      onClick={() => handleSort('totalStake')}
                    >
                      Total Stake
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button 
                      className={`flex items-center gap-1 hover:text-primary transition-colors`}
                      onClick={() => handleSort('delegatedStake')}
                    >
                      Delegated Stake
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button 
                      className={`flex items-center gap-1 hover:text-primary transition-colors`}
                      onClick={() => handleSort('ownStake')}
                    >
                      Own Stake
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button 
                      className={`flex items-center gap-1 hover:text-primary transition-colors`}
                      onClick={() => handleSort('totalDelegators')}
                    >
                      Delegators
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button 
                      className={`flex items-center gap-1 hover:text-primary transition-colors`}
                      onClick={() => handleSort('revenueShare')}
                    >
                      Fee
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button 
                      className={`flex items-center gap-1 hover:text-primary transition-colors`}
                      onClick={() => handleSort('startTime')}
                    >
                      Start Date
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background/30">
                {validators.map((validator) => (
                  <tr 
                    key={validator.address}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      onSelectValidator(validator);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {validator.rank || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          {validator.imgSrc ? (
                            <img 
                              src={validator.imgSrc} 
                              alt={validator.name} 
                              className="h-10 w-10 rounded-full object-contain bg-secondary"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary text-lg font-bold">
                                {validator.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          {validator.isVerified && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <div 
                            className="text-sm font-medium hover:text-primary cursor-pointer transition-colors"
                            onClick={(e) => navigateToValidatorDashboard(validator, e)}
                          >
                            {validator.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {validator.address.slice(0, 6)}...{validator.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatTokenAmount(validator.totalStake || 0)} STRK
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatTokenAmount(validator.delegatedStake)} STRK
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatTokenAmount(validator.ownStake || 0)} STRK
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {validator.totalDelegators.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatFeePercentage(validator.revenueShare)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatStartTime(validator.startTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 flex items-center justify-between border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{validators.length}</span> of{' '}
              <span className="font-medium">many</span> validators
            </div>
            {!showBottom20 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </span>
                <Button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default function Home() {
  const router = useRouter()
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
    avgDelegatedRest: 0,
    avgStakedRest: 0,
    validatorsOver1M: 0,
    avgNumDelegatorsTop10: 0,
    avgNumDelegatorsRest: 0,
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [priceData, setPriceData] = useState<PriceData | null>(null);

  // Add this new state for the split delegation feature
  const [isSplitDelegation, setIsSplitDelegation] = useState(false);
  const [randomBottomValidator, setRandomBottomValidator] = useState<Validator | null>(null);
  const [splitDelegationPreview, setSplitDelegationPreview] = useState({
    mainAmount: "0",
    bottomAmount: "0"
  });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const [tokenBalance, setTokenBalance] = useState<string>("0"); // Add state for token balance

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

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/starknet?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch price data');
        }
        
        const data = await response.json();
        
        setPriceData({
          usdPrice: data.market_data.current_price.usd,
          circulatingSupply: data.market_data.circulating_supply
        });
      } catch (error) {
        console.error('Error fetching price data:', error);
      }
    };
    
    fetchPriceData();
  }, []);

  // Add a function to get the user's token balance
  const getTokenBalance = async (): Promise<string> => {
    if (!account) return "0";
    
    try {
      // Make direct RPC call for balance
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
              entry_point_selector: BALANCE_OF_SELECTOR,
              calldata: [account.address]
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

      // Parse the balance result (low, high parts of uint256)
      const balanceLow = BigInt(result.result[0]);
      const balanceHigh = BigInt(result.result[1]);
      
      // Combine high and low to get the full balance
      const fullBalance = (balanceHigh * BigInt(2 ** 128)) + balanceLow;
      
      // Convert to human readable format
      const balanceStr = fullBalance.toString();
      const balanceLen = balanceStr.length;
      
      if (balanceLen <= STRK_DECIMALS) {
        // Less than 1 whole token
        const padded = balanceStr.padStart(STRK_DECIMALS, '0');
        return `0.${padded}`;
      } else {
        // More than 1 whole token
        const wholePart = balanceStr.slice(0, balanceLen - STRK_DECIMALS);
        const decimalPart = balanceStr.slice(balanceLen - STRK_DECIMALS);
        return `${wholePart}.${decimalPart}`;
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return "0";
    }
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      
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
      
      // Fetch token balance after connecting
      if (userAccount) {
        const balance = await getTokenBalance();
        setTokenBalance(balance);
      }
      
      return userAccount;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStakeResult('Failed to connect wallet');
      return null;
    } finally {
      setIsConnecting(false);
    }
  }

  const checkAllowance = async (poolAddress: string, amount: string): Promise<boolean> => {
    if (!account) return false;
    if (!poolAddress) {
      console.error('Invalid pool address provided to checkAllowance');
      return false;
    }

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
        console.error('Allowance check error:', result.error);
        return false;
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

  // Update the approveTokens function to return call objects instead of executing a transaction
  const approveTokensCall = async (poolAddress: string, amount: string): Promise<any> => {
    if (!account) return null;

    try {
      // Check if we already have sufficient allowance
      const hasAllowance = await checkAllowance(poolAddress, amount);
      if (hasAllowance) {
        console.log('Sufficient allowance already exists');
        return null; // No approval needed
      }

      const amountBn = cairo.uint256(parseTokenAmount(amount).toString());
      
      // Return the call object instead of executing it
      return {
        contractAddress: STRK_TOKEN_ADDRESS,
        entrypoint: 'approve',
        calldata: [poolAddress, amountBn.low, amountBn.high]
      };
    } catch (error) {
      console.error('Error creating approve call:', error);
      return null;
    }
  }

  // Update the stake function to return call objects instead of executing a transaction
  const stakeCall = async (poolAddress: string, amount: string): Promise<any> => {
    if (!account) return null;
    if (!poolAddress) {
      console.error('Invalid pool address provided to stakeCall');
      return null;
    }

    try {
      const amountBn = parseTokenAmount(amount);
      
      // Verify user has sufficient balance
      const currentBalance = await getTokenBalance();
      if (Number(amount) > Number(currentBalance)) {
        toast({
          title: "Insufficient balance",
          description: `You tried to stake ${amount} STRK but only have ${currentBalance} STRK available`,
          variant: "destructive"
        });
        return null;
      }
      
      // Check if user already has a delegation to this pool - handle null safely
      let hasExistingDelegation = false;
      if (userStakeInfo && userStakeInfo.delegations) {
        hasExistingDelegation = userStakeInfo.delegations.some(
          delegation => delegation.poolAddress && 
            delegation.poolAddress.toLowerCase() === poolAddress.toLowerCase()
        );
      }
      
      // Create the appropriate call object based on whether it's a new or existing delegation
      if (hasExistingDelegation) {
        // If already delegated, use add_to_delegation_pool with both parameters
        console.log('Using add_to_delegation_pool for existing delegation');
        return {
          contractAddress: poolAddress,
          entrypoint: 'add_to_delegation_pool',
          calldata: [account.address, amountBn.toString()]
        };
      } else {
        // For first-time delegation, use enter_delegation_pool
        console.log('Using enter_delegation_pool for new delegation');
        return {
          contractAddress: poolAddress,
          entrypoint: 'enter_delegation_pool',
          calldata: [account.address, amountBn.toString()]
        };
      }
    } catch (error) {
      console.error('Error creating stake call:', error);
      return null;
    }
  }

  // Update the handleStake function to batch transactions
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

      if (isSplitDelegation && !randomBottomValidator) {
        // Select a random bottom validator if not already selected
        selectRandomDelegator(true);
        setIsStaking(false);
        setStakeResult("Please try again - selecting a random bottom validator");
        return;
      }

      const { mainAmount, bottomAmount } = isSplitDelegation ? 
        calculateSplitAmounts(stakeAmount) : 
        { mainAmount: stakeAmount, bottomAmount: "0" };

      // Collect all transaction calls
      const calls = [];

      // For regular delegation
      if (!isSplitDelegation) {
        // Get approval call if needed
        const approveCall = await approveTokensCall(selectedDelegator.poolAddress, stakeAmount);
        if (approveCall) {
          calls.push(approveCall);
        }

        // Get stake call
        const mainStakeCall = await stakeCall(selectedDelegator.poolAddress, stakeAmount);
        if (mainStakeCall) {
          calls.push(mainStakeCall);
        }
      } 
      // For split delegation
      else if (randomBottomValidator) {
        // Get approval call for main validator if needed
        const approveMainCall = await approveTokensCall(selectedDelegator.poolAddress, mainAmount);
        if (approveMainCall) {
          calls.push(approveMainCall);
        }

        // Get stake call for main validator
        const mainStakeCall = await stakeCall(selectedDelegator.poolAddress, mainAmount);
        if (mainStakeCall) {
          calls.push(mainStakeCall);
        }

        // Get approval call for bottom validator if needed
        const approveBottomCall = await approveTokensCall(randomBottomValidator.poolAddress, bottomAmount);
        if (approveBottomCall) {
          calls.push(approveBottomCall);
        }

        // Get stake call for bottom validator
        const bottomStakeCall = await stakeCall(randomBottomValidator.poolAddress, bottomAmount);
        if (bottomStakeCall) {
          calls.push(bottomStakeCall);
        }
      }

      // If we have any calls to make, execute them as a batch
      if (calls.length > 0) {
        // Make sure account is not null before proceeding
        if (!account) {
          setIsStaking(false);
          setStakeResult("Wallet not connected. Please connect your wallet and try again.");
          return;
        }
        
        // Execute all calls in a single transaction
        const tx = await account.execute(calls);
        await account.waitForTransaction(tx.transaction_hash);

        // Record the transaction in the database - handle split delegations properly
        if (isSplitDelegation && randomBottomValidator) {
          // For split delegations, record two separate transactions
          try {
            // Record main validator delegation
            await fetch('/api/record-stake', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                txHash: tx.transaction_hash + "_main", // Append suffix to make hash unique 
                senderAddress: account.address,
                contractAddress: selectedDelegator.poolAddress,
                amountStaked: mainAmount,
              }),
            });
            
            // Record bottom validator delegation
            await fetch('/api/record-stake', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                txHash: tx.transaction_hash + "_bottom", // Append suffix to make hash unique
                senderAddress: account.address,
                contractAddress: randomBottomValidator.poolAddress,
                amountStaked: bottomAmount,
              }),
            });
          } catch (recordError) {
            console.error('Failed to record split delegation:', recordError);
            // Continue with success message even if recording fails
          }
        } else {
          // For regular delegations, record a single transaction
          try {
            await fetch('/api/record-stake', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                txHash: tx.transaction_hash,
                senderAddress: account.address,
                contractAddress: selectedDelegator.poolAddress,
                amountStaked: stakeAmount,
              }),
            });
          } catch (recordError) {
            console.error('Failed to record stake transaction:', recordError);
            // Continue with success message even if recording fails
          }
        }

        // Set success message
        if (isSplitDelegation && randomBottomValidator) {
          setStakeResult(
            `Successfully split staked: ${mainAmount} to ${selectedDelegator.name} and ${bottomAmount} to ${randomBottomValidator.name}`
          );
        } else {
          setStakeResult(`Successfully staked ${stakeAmount} tokens to ${selectedDelegator.name}`);
        }
        
        setStakeAmount("");
        
        // Refresh user stake info after successful staking
        await fetchUserStakeInfo();
      } else {
        setStakeResult("No transactions needed to be executed");
      }
    } catch (error) {
      console.error('Staking error:', error);
      
      // Extract the error message
      let errorMessage = 'An error occurred while staking';
      
      // Check for common errors
      if (error instanceof Error) {
        const errorStr = error.toString().toLowerCase();
        
        if (errorStr.includes('insufficient') || errorStr.includes('balance')) {
          errorMessage = 'Insufficient STRK balance for this transaction';
        } else if (errorStr.includes('user rejected')) {
          errorMessage = 'Transaction was rejected in your wallet';
        } else if (errorStr.includes('user abort')) {
          errorMessage = 'Transaction was aborted';
        } else if (errorStr.includes('deadline') || errorStr.includes('timeout')) {
          errorMessage = 'Transaction timed out. Please try again';
        } else if (errorStr.includes('nonce')) {
          errorMessage = 'Transaction nonce error. Please try again';
        } else if (errorStr.includes('error in the called contract')) {
          // Try to extract the specific error reason
          const reasonMatch = errorStr.match(/failure reason: "(.*?)"/i);
          if (reasonMatch && reasonMatch[1]) {
            errorMessage = `Contract error: ${reasonMatch[1]}`;
          } else {
            errorMessage = 'Contract execution failed';
          }
        }
      }
      
      setStakeResult(errorMessage);
    } finally {
      setIsStaking(false);
    }
  }

  // Add this function to select a random bottom validator for split delegation
  const selectRandomBottomValidatorForSplit = () => {
    if (bottomValidators.length === 0) return;
    
    // Filter out the currently selected main validator if it's in the bottom list
    const filteredBottomValidators = bottomValidators.filter(
      v => !selectedDelegator || v.address !== selectedDelegator.address
    );
    
    if (filteredBottomValidators.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * filteredBottomValidators.length);
    setRandomBottomValidator(filteredBottomValidators[randomIndex]);
  };

  // Update the stakeAmount change handler to calculate split preview
  const handleStakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    
    // Prevent setting amount higher than balance
    if (walletConnected && Number(newAmount) > Number(tokenBalance)) {
      // Format to 2 decimal places only, just like in setMaxBalance
      const formattedBalance = Number(tokenBalance).toFixed(2);
      setStakeAmount(formattedBalance);
      toast({
        title: "Amount exceeds balance",
        description: `Setting to maximum available: ${formattedBalance} STRK`,
        variant: "destructive"
      });
    } else {
      setStakeAmount(newAmount);
    }
    
    if (isSplitDelegation) {
      setSplitDelegationPreview(calculateSplitAmounts(newAmount));
    }
  };

  // Add this effect to select a random bottom validator when split delegation is enabled
  useEffect(() => {
    if (isSplitDelegation && !randomBottomValidator) {
      selectRandomBottomValidatorForSplit();
    }
    
    if (isSplitDelegation && stakeAmount) {
      setSplitDelegationPreview(calculateSplitAmounts(stakeAmount));
    }
  }, [isSplitDelegation, selectedDelegator]);

  // Update the existing selectRandomDelegator function
  const selectRandomDelegator = (fromBottom: boolean = false) => {
    const validatorList = fromBottom ? bottomValidators : validators;
    if (validatorList.length === 0) return;
    const randomIndex = Math.floor(Math.random() * validatorList.length);
    
    // Always update the main validator when clicking "Random Bottom 20"
    setSelectedDelegator(validatorList[randomIndex]);
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const validator = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl">
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
            <p>Delegated Stake: {formatTokenAmount(validator.delegatedStake)} STRK</p>
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
    if (!account) return;
    
    try {
      // Show loading state
      setProcessing(true);
      
      // Filter delegations that have rewards over the minimum threshold (0.001 STRK)
      const eligibleDelegations = userStakeInfo.delegations.filter(
        delegation => delegation.pendingRewards > 0.001
      );
      
      if (eligibleDelegations.length === 0) {
        alert("No delegations found with rewards greater than 0.001 STRK");
        return;
      }
      
      // Create a multicall for eligible delegations only
      const calls = eligibleDelegations.map(delegation => {
        // Return the call to claim rewards with the user's address as pool_member
        return {
          contractAddress: delegation.poolAddress,
          entrypoint: 'claim_rewards',
          calldata: [account.address]
        };
      });
      
      // Execute the multicall
      console.log(`Claiming rewards from ${eligibleDelegations.length} validators`);
      const tx = await account.execute(calls);
      await account.waitForTransaction(tx.transaction_hash);
      
      // Refresh user stake info to show updated rewards
      await fetchUserStakeInfo();
      
      // Show success message
      alert(`Successfully claimed rewards from ${eligibleDelegations.length} validators`);
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      // Show error message
      alert(`Failed to claim rewards: ${error?.message || 'Unknown error'}`);
    } finally {
      // Hide loading state
      setProcessing(false);
    }
  };

  const unstakeTokens = async () => {
    // TODO: Implement actual unstaking logic
    alert('Unstaking tokens... (mock)');
  };

  const signalUnstakeIntent = async (delegation: DelegationWithUnpoolTime, amount: string) => {
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
      <div className="w-full bg-background border border-border rounded-lg p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">Total Network Stake</h3>
            <p className="text-4xl font-bold mb-1">
              {formatTokenAmount(totalStake)} STRK
            </p>
            <p className="text-sm text-muted-foreground">
              Across all validators
            </p>
            {priceData && (
              <>
                <p className="text-lg font-medium text-green-600 dark:text-green-400 mt-2">
                  ${((totalStake * priceData.usdPrice) / 1000000).toFixed(2)}M
                </p>
                <p className="text-sm text-muted-foreground">
                  STRK Price: ${priceData.usdPrice.toFixed(2)}
                </p>
              </>
            )}
          </div>
          
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-muted-foreground">Stake Distribution</h3>
              <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {Math.round(topTenStake/totalStake * 100)}% Concentration
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Top 10 Validators</span>
                  <span>{formatTokenAmount(topTenStake)} STRK</span>
                </div>
                <div className="h-4 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                    style={{ width: `${(topTenStake/totalStake) * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Other Validators</span>
                  <span>{formatTokenAmount(restStake)} STRK</span>
                </div>
                <div className="h-4 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 dark:bg-purple-500 rounded-full"
                    style={{ width: `${(restStake/totalStake) * 100}%` }}
                  />
                </div>
              </div>
              
              {priceData && (
                <div className="mt-5">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Staked vs Circulating Supply</span>
                    <span>{((totalStake / priceData.circulatingSupply) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="h-4 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 dark:bg-green-500 rounded-full"
                      style={{ width: `${(totalStake / priceData.circulatingSupply) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Staked: {formatTokenAmount(totalStake)}</span>
                    <span>Total: {formatTokenAmount(priceData.circulatingSupply)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ComparisonMetrics = () => {
    return (
      <div className="mt-8 bg-background border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-6">Top 10 vs Rest</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border/50">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Average Delegated Stake</h4>
                <p className="text-2xl font-bold mt-1">
                  {formatTokenAmount(stats.avgDelegatorsTopTen)} STRK
                </p>
                <span className="text-blue-600 dark:text-blue-400 text-sm">Top 10</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatTokenAmount(stats.avgDelegatedRest)} STRK
                </p>
                <span className="text-purple-600 dark:text-purple-400 text-sm">Rest</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border/50">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Average Total Stake</h4>
                <p className="text-2xl font-bold mt-1">
                  {formatTokenAmount(stats.avgStakedPerStaker)} STRK
                </p>
                <span className="text-blue-600 dark:text-blue-400 text-sm">Top 10</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatTokenAmount(stats.avgStakedRest)} STRK
                </p>
                <span className="text-purple-600 dark:text-purple-400 text-sm">Rest</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border/50">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Average Delegators</h4>
                <p className="text-2xl font-bold mt-1">
                  {formatTokenAmount(stats.avgNumDelegatorsTop10)}
                </p>
                <span className="text-blue-600 dark:text-blue-400 text-sm">Top 10</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatTokenAmount(stats.avgNumDelegatorsRest)}
                </p>
                <span className="text-purple-600 dark:text-purple-400 text-sm">Rest</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg border border-border/50">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Stake Ratio (Top 10 : Rest)</h4>
              <p className="text-3xl font-bold">
                {(stats.avgDelegatorsTopTen / stats.avgDelegatedRest).toFixed(1)}x
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Top 10 validators have {(stats.avgDelegatorsTopTen / stats.avgDelegatedRest).toFixed(1)}x more stake
              </p>
            </div>

            <div className="p-4 bg-secondary/50 rounded-lg border border-border/50">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Delegator Ratio (Top 10 : Rest)</h4>
              <p className="text-3xl font-bold">
                {(stats.avgNumDelegatorsTop10 / stats.avgNumDelegatorsRest).toFixed(1)}x
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Top 10 validators have {(stats.avgNumDelegatorsTop10 / stats.avgNumDelegatorsRest).toFixed(1)}x more delegators
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MetricCard = ({ metric }: { metric: StatMetric }) => {
    return (
      <div 
        className="group relative bg-background p-4 rounded-lg border border-border/50 transition-all duration-300 hover:bg-secondary/50 hover:border-border"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${metric.color}`}>
              {metric.icon}
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">{metric.title}</h4>
              <p className="text-2xl font-bold mt-1">{metric.value.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Updated Tooltip to have solid background */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
          <div className="w-3 h-3 bg-gray-900 border-gray-700 border-l border-t rotate-45 absolute -top-1.5 left-1/2 -translate-x-1/2"></div>
          <div className="bg-gray-900 text-gray-200 px-4 py-2 rounded-lg shadow-md border border-gray-700 w-64">
            <p className="text-sm">{metric.tooltip}</p>
          </div>
        </div>
      </div>
    );
  };


  const UnstakeCountdownButton = ({ 
    delegation, 
    onUnstake 
  }: { 
    delegation: DelegationWithUnpoolTime, 
    onUnstake: (delegation: DelegationWithUnpoolTime, amount: string) => Promise<boolean | undefined> 
  }) => {
    const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
    const [progress, setProgress] = useState(0);
    const [isUnpooling, setIsUnpooling] = useState(false);
    
    useEffect(() => {
      // Check if there's an unpoolTime
      if (!delegation.unpoolTime) {
        setIsUnpooling(false);
        return;
      }
      
      setIsUnpooling(true);
      
      const calculateTimeLeft = () => {
        const now = Math.floor(Date.now() / 1000);
        // Use non-null assertion since we've already checked above
        const unpoolTime = delegation.unpoolTime!;
        
        // If unpoolTime has passed
        if (now >= unpoolTime) {
          setTimeLeft(null);
          setProgress(100);
          return;
        }
        
        // Calculate time difference
        const difference = unpoolTime - now;
        const totalDuration = 21 * 24 * 60 * 60; // 21 days in seconds
        const elapsed = totalDuration - difference;
        const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        
        setProgress(progressPercent);
        
        // Calculate days, hours, minutes, seconds
        const days = Math.floor(difference / (60 * 60 * 24));
        const hours = Math.floor((difference % (60 * 60 * 24)) / (60 * 60));
        const minutes = Math.floor((difference % (60 * 60)) / 60);
        const seconds = difference % 60;
        
        setTimeLeft({ days, hours, minutes, seconds });
      };
      
      // Calculate immediately
      calculateTimeLeft();
      
      // Update every second
      const timer = setInterval(calculateTimeLeft, 1000);
      
      return () => clearInterval(timer);
    }, [delegation.unpoolTime]);
    
    const handleClick = async () => {
      if (!isUnpooling) {
        // If not unpooling, start the unstake process
        const amount = prompt(`Enter amount to unstake from ${delegation.validatorName}:`);
        if (amount && !isNaN(Number(amount)) && Number(amount) <= delegation.delegatedStake) {
          await onUnstake(delegation, amount);
        }
      } else if (timeLeft === null) {
        // If countdown is complete, finalize unstake
        try {
          // Mock the unstake call
          alert(`Unstaking from ${delegation.validatorName} complete!`);
        } catch (error) {
          console.error('Error finalizing unstake:', error);
        }
      }
    };
    
    // Determine if button should be disabled
    const isButtonDisabled = delegation.delegatedStake <= 0 || (isUnpooling && timeLeft !== null);
    
    return (
      <Button
        onClick={handleClick}
        className={`w-full relative overflow-hidden ${
          isUnpooling 
            ? timeLeft === null 
              ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700' 
              : 'bg-primary hover:bg-primary/90'
            : 'bg-destructive hover:bg-destructive/90'
        } text-sm`}
        disabled={isButtonDisabled}
      >
        {/* Progress overlay */}
        {isUnpooling && (
          <div 
            className="absolute inset-0 bg-primary/50 z-0"
            style={{ width: `${progress}%` }}
          />
        )}
        
        {/* Content with higher z-index to appear above the progress bar */}
        <div className="relative z-10">
          {isUnpooling ? (
            timeLeft === null ? (
              <span>Claim Unstaked Tokens</span>
            ) : (
              <div className="flex items-center justify-center gap-1">
                <span>Unstaking:</span>
                <span>{timeLeft.days}d</span>
                <span>{timeLeft.hours}h</span>
                <span>{timeLeft.minutes}m</span>
                <span>{timeLeft.seconds}s</span>
              </div>
            )
          ) : (
            <span>Start Unstake</span>
          )}
        </div>
      </Button>
    );
  };

  // First, let's add a disconnectWallet function to the Home component

  const disconnectWallet = () => {
    // Reset wallet-related state
    setWalletConnected(false);
    setAccount(null);
    setUserStakeInfo({
      totalDelegated: 0,
      availableRewards: 0,
      lastClaimTime: '-',
      delegations: [],
      unstakeIntents: []
    });
    setIsStakeInfoOpen(false);
    

    console.log('Wallet disconnected (app state reset)');
  };

  // Add this helper function to strip trailing zeros from decimal numbers
  const formatAmount = (amount: string): string => {
    // Import the utility function from utils.ts
    const { formatTokenAmount } = require("@/lib/utils");
    return formatTokenAmount(amount);
  };

  // Update the calculateSplitAmounts function to use the helper
  const calculateSplitAmounts = (totalAmount: string) => {
    if (!totalAmount || isNaN(Number(totalAmount)) || Number(totalAmount) <= 0) {
      return { mainAmount: "0", bottomAmount: "0" };
    }
    
    const total = Number(totalAmount);
    const bottomAmount = (total * 0.1).toFixed(6); // 10% to bottom validator
    const mainAmount = (total - Number(bottomAmount)).toFixed(6); // 90% to main validator
    
    return { 
      mainAmount: formatAmount(mainAmount), 
      bottomAmount: formatAmount(bottomAmount)
    };
  };

  // Add this helper function to navigate to validator dashboard
  const navigateToValidatorDashboard = (validator: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (validator && validator.address) {
      router.push(`/validator/${validator.address}`);
    } else if (validator && validator.poolAddress) {
      router.push(`/validator/${validator.poolAddress}`);
    }
  };

  // Add a function to set maximum available balance
  const setMaxBalance = () => {
    if (walletConnected && Number(tokenBalance) > 0) {
      // Format to 2 decimal places only
      const formattedBalance = Number(tokenBalance).toFixed(2);
      setStakeAmount(formattedBalance);
      
      if (isSplitDelegation) {
        setSplitDelegationPreview(calculateSplitAmounts(formattedBalance));
      }
    }
  };

  // Add effect to refresh balance when needed
  useEffect(() => {
    if (walletConnected && account) {
      getTokenBalance().then(balance => setTokenBalance(balance));
    }
  }, [walletConnected, account, isStakeInfoOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center pt-0 px-0 pb-4">
      <meta name="google-site-verification" content="BioBqMAm54m_zMizQ_YtbyFCgVe_BY9KGhn8j6K9KWg" />
      <div className="w-full">
        <VoyagerBanner />
        <CallToAction />
      </div>
      <div className="w-full sticky top-0 z-50">
        <AnimatePresence>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: isStakeInfoOpen ? '480px' : '64px' }}  // Changed from 400px
            className="w-full bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 mb-8 overflow-hidden"
          >
            <div className="w-full flex items-center justify-between h-16 px-4">
              <div className="flex-1">
                {!isStakeInfoOpen && walletConnected && (
                  <div className="flex items-center">
                    <div className="bg-gray-800/60 border border-gray-700/40 rounded-lg px-4 py-2 flex items-center gap-8">
                      <div>
                        <span className="text-xs text-gray-400 block">Total Delegated</span>
                        <p className="text-sm font-medium text-white">{formatTokenAmount(userStakeInfo.totalDelegated)} STRK</p>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-400 block">Available Rewards</span>
                        <p className="text-sm font-medium text-white">{formatTokenAmount(userStakeInfo.availableRewards)} STRK</p>
                      </div>
                      
                      <Button
                        onClick={claimRewards}
                        size="sm"
                        variant="outline"
                        className="border-gray-700 hover:bg-gray-700/50 text-white text-xs h-8"
                        disabled={userStakeInfo.availableRewards <= 0 || processing}
                      >
                        {processing ? "Claiming..." : "Claim"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div 
                className="flex-1 flex justify-center cursor-pointer group"
                onClick={() => setIsStakeInfoOpen(!isStakeInfoOpen)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    Staking Dashboard
                  </span>
                  {/* Small indicator icon next to title */}
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    {isStakeInfoOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 flex justify-end items-center gap-3">
                {walletConnected && account ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                      {account.address.slice(0, 6)}...{account.address.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={disconnectWallet}
                      className="text-gray-400 hover:text-red-400 hover:bg-gray-800/50"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="mr-1"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Disconnect
                    </Button>
                    <div 
                      className="cursor-pointer hover:bg-gray-700/50 p-1 rounded-full transition-colors"
                      onClick={() => setIsStakeInfoOpen(!isStakeInfoOpen)}
                    >
                      {isStakeInfoOpen ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ) : (
                  <Button 
                    className="px-6"
                    onClick={connectWallet}
                    disabled={isConnecting}
                    variant="default"
                  >
                    {isConnecting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        <span>Connect Wallet</span>
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Make the content section scrollable */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isStakeInfoOpen ? 1 : 0 }}
              className="px-4 pb-6 pt-2 h-[calc(480px-64px)] overflow-y-auto"  // Changed from 400px
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-background p-6 rounded-lg border border-border shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Delegated</h4>
                    <p className="text-3xl font-bold">
                      {formatTokenAmount(userStakeInfo.totalDelegated)} STRK
                    </p>
                  </div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-background p-6 rounded-lg border border-border shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Available Rewards</h4>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatTokenAmount(userStakeInfo.availableRewards)} STRK
                    </p>
                  </div>
                  <Button
                    onClick={claimRewards}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white w-full"
                    disabled={userStakeInfo.availableRewards <= 0 || processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Gift className="mr-2 h-4 w-4" />
                        Claim Rewards
                      </>
                    )}
                  </Button>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="md:col-span-1 bg-background p-6 rounded-lg border border-border shadow-sm"
                >
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Delegations</h4>
                  <p className="text-3xl font-bold">
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
                          className="bg-background p-6 rounded-lg border border-border shadow-sm"
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
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                  <span className="text-primary text-lg font-bold">
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
                              <h3 
                                className="font-semibold cursor-pointer hover:text-primary hover:underline"
                                onClick={(e) => navigateToValidatorDashboard(validators, e)}
                              >
                                {delegation.validatorName}
                              </h3>
                              <a
                                href={`https://voyager.online/contract/${delegation.poolAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-primary"
                              >
                                {delegation.poolAddress.slice(0, 6)}...{delegation.poolAddress.slice(-4)}
                              </a>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Delegated</span>
                              <span className="font-medium">
                                {formatTokenAmount(delegation.delegatedStake)} STRK
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Pending Rewards</span>
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {formatTokenAmount(delegation.pendingRewards)} STRK
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            <UnstakeCountdownButton 
                              delegation={delegation}
                              onUnstake={signalUnstakeIntent}
                            />
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

      <div className="w-full max-w-[98%] grid grid-cols-1 lg:grid-cols-4 gap-8 relative">
        <Card className="lg:col-span-3 bg-background border-border">
          <CardHeader>
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    title: "Zero Delegators",
                    value: stats.validatorsWithZeroStake,
                    tooltip: "Number of validators that have not received any delegations yet. These validators are waiting for their first delegators to join.",
                    icon: <Users className="w-5 h-5 text-red-600 dark:text-red-400" />,
                    color: "bg-red-500/10"
                  },
                  {
                    title: ">1M STRK Delegated",
                    value: stats.validatorsOver1M,
                    tooltip: "Number of validators that have received more than 1 million STRK in delegations. These are the largest validators by stake.",
                    icon: <Landmark className="w-5 h-5 text-green-600 dark:text-green-400" />,
                    color: "bg-green-500/10"
                  },
                  {
                    title: "2+ Delegators",
                    value: stats.validatorsWithTwoPlus,
                    tooltip: "Number of validators that have two or more unique delegators. This indicates validators with a diverse delegation base.",
                    icon: <Users2 className="w-5 h-5 text-primary" />,
                    color: "bg-primary/10"
                  },
                  {
                    title: "Active Validators",
                    value: stats.totalActiveValidators,
                    tooltip: "Total number of active validators on the Starknet network. These validators help secure and operate the network.",
                    icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
                    color: "bg-emerald-500/10"
                  }
                ].map((metric, i) => (
                  <MetricCard key={i} metric={metric} />
                ))}
              </div>
              <NetworkStatsHeader />
              
        
              <ValidatorList onSelectValidator={setSelectedDelegator} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <ComparisonMetrics />
              
              <DelegationStats />

              <div className="bg-background rounded-lg border border-border p-6 shadow-sm mt-8">
                <h3 className="text-xl font-semibold mb-4">Top 20 Validators</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={validators}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const validator = data.activePayload[0].payload;
                          setSelectedDelegator(validator);
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

              <div className="bg-background rounded-lg border border-border p-6 shadow-sm mt-8">
                <h3 className="text-xl font-semibold mb-4">Bottom 20 Validators</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={bottomValidators}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const validator = data.activePayload[0].payload;
                          setSelectedDelegator(validator);
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
              
              {/* Remove the ValidatorList from here */}
              {/* <ValidatorList onSelectValidator={setSelectedDelegator} /> */}
              
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-background border-border lg:sticky lg:top-24 h-fit shadow-sm">
          <CardHeader className="text-center py-3" id="staking-component">
            <CardTitle className="text-2xl font-bold">Stake STRK</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="space-y-4">
              {/* Center the Random Bottom 20 button */}
              <div className="flex justify-center">
                <Button 
                  onClick={() => selectRandomDelegator(true)} 
                  className="text-sm py-1 h-8 w-full"
                  size="sm"
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Random Bottom 20
                </Button>
              </div>
              
              {selectedDelegator && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2 border border-border rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {selectedDelegator.imgSrc && (
                      <img 
                        src={selectedDelegator.imgSrc} 
                        alt={selectedDelegator.name} 
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div>
                      <p 
                        className="font-semibold text-primary text-sm cursor-pointer hover:underline"
                        onClick={() => router.push(`/validator/${selectedDelegator.address}`)}
                      >
                        {selectedDelegator.name}
                        {selectedDelegator.isVerified && (
                          <span className="ml-1 text-green-600 dark:text-green-400">✓</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stake: {formatTokenAmount(selectedDelegator.delegatedStake)} | 
                        Delegators: {selectedDelegator.totalDelegators?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <form onSubmit={handleStake} className="space-y-3">
                <div className="glass-panel p-3">
                  <div className="mb-2">
                    <Label htmlFor="stakeAmount" className="text-sm font-medium flex items-center gap-2">
                      <Coins className="h-4 w-4 text-blue-400" />
                      Stake Amount (STRK)
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="stakeAmount"
                        type="number"
                        step="0.000000000000000001"
                        min="0"
                        placeholder="Enter amount to stake"
                        value={stakeAmount}
                        onChange={handleStakeAmountChange}
                        required
                        variant="modern"
                        className="pr-16 h-10 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-sm text-gray-400">STRK</span>
                      </div>
                    </div>
                    {walletConnected && (
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>Balance: {formatTokenAmount(parseFloat(tokenBalance))} STRK</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 px-1.5 text-blue-400 hover:text-blue-300"
                          onClick={setMaxBalance}
                        >
                          MAX
                        </Button>
                      </div>
                    )}
                    {Number(stakeAmount) > 0 && (
                      <p className="text-xs text-blue-400 mt-0.5 animate-pulse-slow">
                        ≈ ${(Number(stakeAmount) * (priceData?.usdPrice || 0)).toFixed(2)} USD
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between bg-gray-800/70 backdrop-blur-sm p-2 rounded-md border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-500/30 p-1 rounded-full">
                        <Zap className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white">Split delegation (90/10)</span>
                        <p className="text-xs text-gray-400">Support smaller validators</p>
                      </div>
                    </div>
                    <div className="relative inline-block w-10 h-5">
                      <input
                        type="checkbox"
                        id="splitDelegation"
                        checked={isSplitDelegation}
                        onChange={(e) => {
                          setIsSplitDelegation(e.target.checked);
                          if (e.target.checked && !randomBottomValidator) {
                            selectRandomBottomValidatorForSplit();
                          }
                        }}
                        className="sr-only"
                      />
                      <label
                        htmlFor="splitDelegation"
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ${
                          isSplitDelegation ? 'bg-blue-600' : 'bg-gray-700'
                        }`}
                      >
                        <span 
                          className={`block absolute top-[2px] left-[2px] bottom-[2px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            isSplitDelegation ? 'transform translate-x-5' : ''
                          }`}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                
                {isSplitDelegation && stakeAmount && Number(stakeAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-2.5 rounded-lg bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-700/50 backdrop-blur-sm"
                  >
                    <h4 className="text-xs font-medium text-blue-300 mb-2">Your delegation will be split:</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-1.5 bg-gray-800/60 rounded-md border border-gray-700/50">
                        <div className="flex items-center gap-1.5">
                          {selectedDelegator && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center overflow-hidden">
                              {selectedDelegator.imgSrc ? (
                                <img 
                                  src={selectedDelegator.imgSrc} 
                                  alt={selectedDelegator.name} 
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                <span className="text-blue-400 text-xs font-bold">
                                  {selectedDelegator.name.charAt(0)}
                                </span>
                              )}
                            </div>
                          )}
                          <div>
                            <span 
                              className="text-white text-sm font-medium truncate max-w-[120px] cursor-pointer hover:text-blue-400 transition-colors"
                              onClick={() => selectedDelegator && router.push(`/validator/${selectedDelegator.address}`)}
                            >
                              {selectedDelegator?.name}
                            </span>
                            <p className="text-xs text-gray-400">Your selected validator</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-white text-sm font-semibold">{splitDelegationPreview.mainAmount} STRK</span>
                          <p className="text-xs text-gray-400">90% of stake</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-1.5 bg-gray-800/60 rounded-md border border-gray-700/50">
                        <div className="flex items-center gap-1.5">
                          {randomBottomValidator ? (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center overflow-hidden">
                              {randomBottomValidator.imgSrc ? (
                                <img 
                                  src={randomBottomValidator.imgSrc} 
                                  alt={randomBottomValidator.name} 
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                <span className="text-purple-400 text-xs font-bold">
                                  {randomBottomValidator.name.charAt(0)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-700 animate-pulse"></div>
                          )}
                          <div>
                            <span 
                              className="text-white text-sm font-medium truncate max-w-[120px] cursor-pointer hover:text-purple-400 transition-colors"
                              onClick={() => randomBottomValidator && router.push(`/validator/${randomBottomValidator.address}`)}
                            >
                              {randomBottomValidator?.name || 'Selecting...'}
                            </span>
                            <p className="text-xs text-gray-400">Smaller validator</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-white text-sm font-semibold">{splitDelegationPreview.bottomAmount} STRK</span>
                          <p className="text-xs text-gray-400">10% of stake</p>
                        </div>
                      </div>
                    </div>
                    
                    {randomBottomValidator && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          onClick={selectRandomBottomValidatorForSplit}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-7 py-0 flex items-center justify-center whitespace-nowrap"
                          size="sm"
                        >
                          <div className="flex items-center">
                            <RefreshCw className="mr-1.5 h-3 w-3 flex-shrink-0" />
                            <span>Change Bottom Validator</span>
                          </div>
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
                
                {stakeResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-2.5 rounded-md shadow-md ${
                      stakeResult.includes('successful') 
                        ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                        : 'bg-red-500/20 border border-red-500/50 text-red-400'
                    }`}
                  >
                    <div className="flex items-center">
                      {stakeResult.includes('successful') 
                        ? <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" /> 
                        : <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      }
                      <p className="text-xs font-medium">{stakeResult}</p>
                    </div>
                  </motion.div>
                )}
                
                {!walletConnected ? (
                  <Button 
                    type="button" 
                    onClick={connectWallet} 
                    disabled={isConnecting}
                    className="w-full h-10 text-base shadow-lg btn-gradient flex items-center justify-center whitespace-nowrap"
                    variant="gradient"
                  >
                    {isConnecting ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
                        <span>Connecting Wallet...</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Landmark className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Connect Wallet to Stake</span>
                      </div>
                    )}
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isStaking || !selectedDelegator || !stakeAmount || Number(stakeAmount) <= 0}
                    className="w-full h-10 text-base shadow-lg btn-gradient flex items-center justify-center whitespace-nowrap"
                    variant="gradient"
                  >
                    {isStaking ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
                        <span>Processing Stake...</span>
                      </div>
                    ) : (
                      <div className="flex items-center overflow-hidden">
                        <Zap className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{`Stake with ${selectedDelegator?.name || 'Validator'}`}</span>
                      </div>
                    )}
                  </Button>
                )}
                
                {/* Move "Show verified only" checkbox to the bottom */}
                <div className="flex items-center justify-center space-x-2 pt-2 mt-1 border-t border-gray-700/50">
                  <input
                    type="checkbox"
                    id="verifiedOnly"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="verifiedOnly" className="text-gray-300 text-xs">
                    Show verified validators only
                  </Label>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {userStakeInfo.unstakeIntents.length > 0 && (
        <div className="md:col-span-3 mt-6">
          <h3 className="text-xl font-semibold mb-4">Pending Unstakes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userStakeInfo.unstakeIntents.map((intent, index) => (
              <motion.div
                key={index}
                className="bg-background p-6 rounded-lg border border-border shadow-sm"
              >
                <h4 className="font-semibold mb-2">{intent.validatorName}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span>{formatTokenAmount(intent.amount)} STRK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available in</span>
                    <span>
                      {Math.max(0, Math.ceil((intent.canClaimAt - Date.now()) / (1000 * 60 * 60 * 24)))} days
                    </span>
                  </div>
                  <Button
                    onClick={() => finalizeUnstake(intent)}
                    className="w-full mt-2"
                    disabled={Date.now() < intent.canClaimAt}
                    variant={Date.now() < intent.canClaimAt ? "outline" : "default"}
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
      <SpeedInsights />
      <StructuredData />
    </div>
  )
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="bg-background p-4 rounded-lg border border-border shadow-sm">
      <h4 className="text-lg font-semibold text-muted-foreground mb-2">{title}</h4>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}


