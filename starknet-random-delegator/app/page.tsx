"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, Zap, ChevronDown, ChevronUp, Gift } from "lucide-react"
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
}

interface StatCardProps {
  title: string;
  value: string | number;
}

interface UserStakeInfo {
  totalDelegated: number;
  availableRewards: number;
  lastClaimTime: string;
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

export default function Home() {
  const [selectedDelegator, setSelectedDelegator] = useState<Validator | null>(null)
  const [stakeAmount, setStakeAmount] = useState("")
  const [isStaking, setIsStaking] = useState(false)
  const [stakeResult, setStakeResult] = useState("")
  const [validators, setValidators] = useState<Validator[]>([])
  const [bottomValidators, setBottomValidators] = useState<Validator[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(false)
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
  })
  const [isStakeInfoOpen, setIsStakeInfoOpen] = useState(false);
  const [userStakeInfo, setUserStakeInfo] = useState<UserStakeInfo>({
    totalDelegated: 0,
    availableRewards: 0,
    lastClaimTime: '-'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, topValidatorsResponse, bottomValidatorsResponse] = await Promise.all([
          fetch('/api/stats'),
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
      console.error('Error approving tokens:', error);
      setStakeResult('Failed to approve tokens');
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
      setStakeResult('Failed to stake tokens');
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

      // Approve tokens
      const approved = await approveTokens(selectedDelegator.poolAddress, stakeAmount);
      if (!approved) {
        setIsStaking(false);
        return;
      }

      // Stake tokens
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

  // Mock function to fetch user's staking info
  const fetchUserStakeInfo = async () => {
    // TODO: Replace with actual API call
    setUserStakeInfo({
      totalDelegated: 1000.5,
      availableRewards: 25.75,
      lastClaimTime: new Date().toLocaleDateString()
    });
  };

  // Mock function to claim rewards
  const claimRewards = async () => {
    // TODO: Implement actual claiming logic
    alert('Claiming rewards... (mock)');
  };

  // Mock function to unstake tokens
  const unstakeTokens = async () => {
    // TODO: Implement actual unstaking logic
    alert('Unstaking tokens... (mock)');
  };

  useEffect(() => {
    if (account) {
      fetchUserStakeInfo();
    }
  }, [account]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center pt-0 px-4 pb-4">
      <AnimatePresence>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: isStakeInfoOpen ? 'auto' : '64px' }}
          className="w-full bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10 mb-8"
        >
          <div 
            className="max-w-7xl mx-auto flex items-center justify-end h-16 cursor-pointer"
            onClick={() => setIsStakeInfoOpen(!isStakeInfoOpen)}
          >
            <div className="flex items-center gap-2">
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
                className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg"
              >
                <h4 className="text-sm font-medium text-gray-400 mb-2">Available Rewards</h4>
                <p className="text-3xl font-bold text-green-400">
                  {userStakeInfo.availableRewards.toLocaleString()} STRK
                </p>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Last Claim</h4>
                  <p className="text-gray-300">{userStakeInfo.lastClaimTime}</p>
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
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-3 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-blue-400">Network Statistics</CardTitle>
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-medium text-blue-400">Total Network Stake</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.totalNetworkStake.toLocaleString(undefined, {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3
                  })} STRK
                </p>
              </div>
              <div className="mt-2 flex justify-end">
                <span className="text-sm text-gray-400">(Delegated + Staked)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Avg. Delegated (Top 10)" value={stats.avgDelegatorsTopTen.toLocaleString()} />
                <StatCard
                  title="Avg. Staked per validator"
                  value={`${stats.avgStakedPerStaker.toLocaleString()} tokens`}
                />
                <StatCard title="Validators with 0 Delegators" value={stats.validatorsWithZeroStake} />
                <StatCard title="Avg. Delegators (Top 10)" value={stats.avgNumDelegatorsTop10.toLocaleString()} />
                <StatCard title="Avg. Delegated (Bottom 20)" value={`${stats.avgDelegatedBottom20.toLocaleString()} tokens`} />
                <StatCard title="Avg. Staked (Bottom 20)" value={`${stats.avgStakedBottom20.toLocaleString()} tokens`} />
                <StatCard title="Validators > 1M STARK" value={stats.validatorsOver1M} />
                <StatCard title="Avg. Delegators (Bottom 20)" value={stats.avgNumDelegatorsBottom20.toLocaleString()} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-blue-400 mb-4">Top 20 Validators by Delegated Stake</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={validators}>
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
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
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
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-400">Stake Tokens</CardTitle>
            <CardDescription className="text-gray-400">Choose a validator and stake your tokens</CardDescription>
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


