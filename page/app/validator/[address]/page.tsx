"use client"
import { track } from '@vercel/analytics';
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Loader2, ChevronLeft, Users, ArrowUpDown, Zap, TrendingUp, Clock, Landmark, Activity, AlertCircle, CheckCircle } from "lucide-react"
import CountUp from "react-countup"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { formatTokenAmount } from "@/lib/utils"

// Constants for blockchain interactions

const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
const STRK_DECIMALS = 18;
const RPC_URL = "https://free-rpc.nethermind.io/mainnet-juno/v0_7";
const ALLOWANCE_SELECTOR = "0x1e888a1026b19c8c0b57c72d63ed1737106aa10034105b980ba117bd0c29fe1";
const BALANCE_OF_SELECTOR = "0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e";

// Types
export type Validator = {
  id: string
  address: string
  poolAddress: string
  name: string
  website: string
  description: string
  imgSrc: string
  isVerified: boolean
  ownStake: number
  totalStake: number
  delegatorCount: number
  revenueShare: number
  growthFactor: number
  commission: number
}

interface ValidatorDetail {
  address: string
  name: string
  poolAddress: string
  delegatedStake: number
  totalDelegators: number
  ownStake: number
  totalStake: number
  totalStakePercentage: number
  revenueShare: number
  apr: number
  isVerified: boolean
  imgSrc: string | null
  startTime: number
  rank: string
}

interface DelegatorStats {
  totalDelegators: number
  totalDelegated: number
  avgStake: number
  maxStake: number
  minStake: number
  newDelegators7d: number
}

interface HistoricalDataPoint {
  date: string
  newDelegators: number
  newStake: number
  cumulativeDelegators?: number
  cumulativeStake?: number
}

interface TopDelegator {
  address: string
  delegatedStake: number
  startTime: number
}

interface DelegationWithUnpoolTime {
  validatorName: string;
  poolAddress: string;
  delegatedStake: number;
  pendingRewards: number;
  unpoolTime?: number; // Optional field for unpooltime
}

interface ValidatorDashboardData {
  validator: ValidatorDetail
  stats: DelegatorStats
  historicalData: HistoricalDataPoint[]
  topDelegators: TopDelegator[]
}

// Helper functions
const formatAddress = (address: string): string => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const getVoyagerUrl = (address: string): string => {
  return `https://voyager.online/contract/${address}`
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString()
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#8dd1e1']

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

// Calculate additional metrics
const calculateGrowthRate = (data: ValidatorDashboardData | null): string => {
  if (!data?.historicalData || data.historicalData.length < 2) return 'N/A'
  
  // Calculate 7-day growth rate if we have enough data
  const recentData = [...data.historicalData].slice(-7)
  if (recentData.length < 2) return 'N/A'
  
  const oldDelegators = recentData[0].newDelegators
  const newDelegators = recentData[recentData.length - 1].newDelegators
  const growthRate = ((newDelegators - oldDelegators) / oldDelegators) * 100
  
  return growthRate > 0 ? `+${growthRate.toFixed(2)}%` : `${growthRate.toFixed(2)}%`
}

const preparePieChartData = (data: ValidatorDashboardData | null) => {
  if (!data) return []
  
  // Calculate validator's own stake percentage
  const ownStakePercentage = (data.validator.ownStake / data.validator.totalStake) * 100
  const delegatedPercentage = 100 - ownStakePercentage
  
  return [
    { name: "Own Stake", value: ownStakePercentage },
    { name: "Delegated", value: delegatedPercentage }
  ]
}

export default function ValidatorDashboard() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<ValidatorDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  
  // Staking state
  const [walletConnected, setWalletConnected] = useState(false)
  const [account, setAccount] = useState<any>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [stakeAmount, setStakeAmount] = useState("")
  const [isStaking, setIsStaking] = useState(false)
  const [stakeResult, setStakeResult] = useState("")
  const [isSplitDelegation, setIsSplitDelegation] = useState(false)
  const [randomBottomValidator, setRandomBottomValidator] = useState<Validator | null>(null)
  const [splitDelegationPreview, setSplitDelegationPreview] = useState({ mainAmount: "0", bottomAmount: "0" })
  const [bottomValidators, setBottomValidators] = useState<Validator[]>([])
  const [stakeDialogOpen, setStakeDialogOpen] = useState(false)
  const [userDelegations, setUserDelegations] = useState<DelegationWithUnpoolTime[]>([])
  const [tokenBalance, setTokenBalance] = useState<string>("0")

  useEffect(() => {
    const fetchValidatorData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/validators/${params.address}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch validator data')
        }
        
        const validatorData = await response.json()
        setData(validatorData)
      } catch (err) {
        setError('Failed to load validator data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    if (params.address) {
      fetchValidatorData()
    }
  }, [params.address])

  // Fetch bottom validators for split delegation
  useEffect(() => {
    const fetchBottomValidators = async () => {
      try {
        const response = await fetch(`/api/validators?mode=bottom&limit=20&verified=true`);
        if (!response.ok) throw new Error('Failed to fetch bottom validators');
        
        const validators = await response.json();
        setBottomValidators(validators);
      } catch (error) {
        console.error('Error fetching bottom validators:', error);
      }
    };
    
    if (isSplitDelegation) {
      fetchBottomValidators();
    }
  }, [isSplitDelegation]);

  // Calculate split amounts when stakeAmount changes
  useEffect(() => {
    if (isSplitDelegation && stakeAmount) {
      setSplitDelegationPreview(calculateSplitAmounts(stakeAmount));
    }
  }, [isSplitDelegation, stakeAmount]);

  // Select a random bottom validator when split delegation is enabled
  useEffect(() => {
    if (isSplitDelegation && bottomValidators.length > 0 && !randomBottomValidator) {
      selectRandomBottomValidatorForSplit();
    }
  }, [isSplitDelegation, bottomValidators]);

  // After the wallet connection, fetch user delegations
  useEffect(() => {
    if (account) {
      fetchUserDelegations();
    }
  }, [account]);

  // Function to get token balance
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

  // Update connectWallet to fetch token balance
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
      
      track('Wallet Connected');
      return userAccount;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStakeResult('Failed to connect wallet');
      return null;
    } finally {
      setIsConnecting(false);
    }
  }

  const disconnectWallet = () => {
    track('Wallet Disconnected');
    setWalletConnected(false);
    setAccount(null);
  };

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

      // Return true if allowance is sufficient
      return allowanceBn >= amountBn;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  }

  const approveTokensCall = async (poolAddress: string, amount: string): Promise<any> => {
    try {
      const amountBn = parseTokenAmount(amount);
      
      // Check if approval is needed
      const hasAllowance = await checkAllowance(poolAddress, amount);
      if (hasAllowance) {
        console.log('Allowance already sufficient');
        return null; // No approval needed
      }

      // Create approval call
      console.log('Creating approval call for amount:', amountBn.toString());
      return {
        contractAddress: STRK_TOKEN_ADDRESS,
        entrypoint: 'approve',
        calldata: [poolAddress, amountBn.toString(), '0']
      };
    } catch (error) {
      console.error('Error creating approval call:', error);
      return null;
    }
  }

  const fetchUserDelegations = async () => {
    if (!account) return;
    
    try {
      const addressToUse = normalizeAddress(account.address);
      const response = await fetch(`/api/delegations?address=${addressToUse}`);
      if (!response.ok) throw new Error('Failed to fetch delegations');
      
      const data = await response.json();
      setUserDelegations(data.delegations || []);
    } catch (error) {
      console.error('Error fetching delegations:', error);
    }
  };

  const normalizeAddress = (address: string): string => {
    if (!address) return address;
    
    // If address starts with 0x and the next character isn't 0, add the 0
    if (address.startsWith('0x') && address.length === 65) {
      return `0x0${address.slice(2)}`;
    }
    return address;
  };

  const stakeCall = async (poolAddress: string, amount: string): Promise<any> => {
    try {
      if (!account) {
        console.error('No account available');
        return null;
      }
      
      if (!poolAddress) {
        console.error('Invalid pool address provided to stakeCall');
        return null;
      }
      
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
      if (userDelegations && userDelegations.length > 0) {
        hasExistingDelegation = userDelegations.some(
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

  // Calculate split amounts (90% to main validator, 10% to bottom validator)
  const calculateSplitAmounts = (totalAmount: string) => {
    if (!totalAmount || isNaN(Number(totalAmount)) || Number(totalAmount) <= 0) {
      return { mainAmount: "0", bottomAmount: "0" };
    }
    
    const total = Number(totalAmount);
    const bottomAmount = (total * 0.1).toFixed(6); // 10% to bottom validator
    const mainAmount = (total - Number(bottomAmount)).toFixed(6); // 90% to main validator
    
    return { 
      mainAmount: formatTokenAmount(mainAmount), 
      bottomAmount: formatTokenAmount(bottomAmount)
    };
  };

  // Select a random bottom validator for split delegation
  const selectRandomBottomValidatorForSplit = () => {
    if (bottomValidators.length === 0) return;
    
    // Filter out the current validator if it's in the bottom list
    const filteredBottomValidators = data 
      ? bottomValidators.filter(v => v.address !== data.validator.address)
      : bottomValidators;
    
    if (filteredBottomValidators.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * filteredBottomValidators.length);
    setRandomBottomValidator(filteredBottomValidators[randomIndex]);
  };

  // Update stakeAmount when input changes
  const handleStakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    
    // Prevent setting amount higher than balance
    if (walletConnected && Number(newAmount) > Number(tokenBalance)) {
      // Round down to 2 decimal places when setting max amount
      const truncatedValue = Math.floor(Number(tokenBalance) * 100) / 100;
      const formattedBalance = truncatedValue.toFixed(2);
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

  // Handle stake button click
  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !stakeAmount) return;
    track('Stake Initiated', { stakeAmount, validator: data.validator.name, isSplitDelegation });
    setIsStaking(true);
    setStakeResult("");
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
        selectRandomBottomValidatorForSplit();
        setIsStaking(false);
        toast({
          title: "Split delegation setup",
          description: "Please try again - selecting a random bottom validator",
          variant: "destructive"
        });
        return;
      }

      const { mainAmount, bottomAmount } = isSplitDelegation ? 
        calculateSplitAmounts(stakeAmount) : 
        { mainAmount: stakeAmount, bottomAmount: "0" };

      const calls = [];

      if (!isSplitDelegation) {
        const approveCall = await approveTokensCall(data.validator.poolAddress, stakeAmount);
        if (approveCall) {
          calls.push(approveCall);
        }
        const mainStakeCall = await stakeCall(data.validator.poolAddress, stakeAmount);
        if (mainStakeCall) {
          calls.push(mainStakeCall);
        }
      } else if (randomBottomValidator) {
        const approveMainCall = await approveTokensCall(data.validator.poolAddress, mainAmount);
        if (approveMainCall) {
          calls.push(approveMainCall);
        }
        const mainStakeCall = await stakeCall(data.validator.poolAddress, mainAmount);
        if (mainStakeCall) {
          calls.push(mainStakeCall);
        }
        const approveBottomCall = await approveTokensCall(randomBottomValidator.poolAddress, bottomAmount);
        if (approveBottomCall) {
          calls.push(approveBottomCall);
        }
        const bottomStakeCall = await stakeCall(randomBottomValidator.poolAddress, bottomAmount);
        if (bottomStakeCall) {
          calls.push(bottomStakeCall);
        }
      }

      if (calls.length > 0) {
        if (!account) {
          setIsStaking(false);
          toast({
            title: "Wallet not connected",
            description: "Please connect your wallet and try again",
            variant: "destructive"
          });
          return;
        }

        const tx = await account.execute(calls);
        await account.waitForTransaction(tx.transaction_hash);
        track('Staking Successful', { transactionHash: tx.transaction_hash, stakeAmount, validator: data.validator.name, isSplitDelegation, mainAmount, bottomAmount });

        if (isSplitDelegation && randomBottomValidator) {
          try {
            await fetch('/api/record-stake', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                txHash: tx.transaction_hash + "_main",
                senderAddress: account.address,
                contractAddress: data.validator.poolAddress,
                amountStaked: Number(mainAmount),
              }),
            });
            await fetch('/api/record-stake', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                txHash: tx.transaction_hash + "_bottom",
                senderAddress: account.address,
                contractAddress: randomBottomValidator.poolAddress,
                amountStaked: Number(bottomAmount),
              }),
            });
          } catch (recordError) {
            console.error('Error recording stake:', recordError);
          }
        } else {
          try {
            await fetch('/api/record-stake', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                txHash: tx.transaction_hash,
                senderAddress: account.address,
                contractAddress: data.validator.poolAddress,
                amountStaked: Number(stakeAmount),
              }),
            });
          } catch (recordError) {
            console.error('Error recording stake:', recordError);
          }
        }

        setStakeResult("Transaction successful!");
        toast({
          title: "Staking successful",
          description: isSplitDelegation && randomBottomValidator ? 
            `${mainAmount} STRK staked to ${data.validator.name} and ${bottomAmount} STRK to ${randomBottomValidator.name}` :
            `${stakeAmount} STRK staked to ${data.validator.name}`,
          variant: "default"
        });

        setStakeAmount("");
        setStakeDialogOpen(false);
        if (account) {
          await fetchUserDelegations();
        }
      }
    } catch (error: any) {
      track('Staking Failed', { error: error.message, stakeAmount, validator: data.validator.name, isSplitDelegation });
      console.error('Staking error:', error);
      let errorMessage = 'Transaction failed. Please try again.';
      if (error.message) {
        const errorStr = error.message.toLowerCase();
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
          const reasonMatch = errorStr.match(/failure reason: "(.*?)"/i);
          if (reasonMatch && reasonMatch[1]) {
            errorMessage = `Contract error: ${reasonMatch[1]}`;
          } else {
            errorMessage = 'Contract execution failed';
          }
        }
      }
      setStakeResult(errorMessage);
      toast({
        title: "Staking failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsStaking(false);
    }
  };

  // Set max balance function
  const setMaxBalance = () => {
    if (walletConnected && Number(tokenBalance) > 0) {
      // Round down to 2 decimal places
      const truncatedValue = Math.floor(Number(tokenBalance) * 100) / 100;
      const formattedBalance = truncatedValue.toFixed(2);
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
  }, [walletConnected, account, stakeDialogOpen]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading validator data...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-muted-foreground">{error || 'Failed to load validator data'}</p>
        <Button variant="outline" className="mt-6" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    )
  }

  const { validator, stats, historicalData, topDelegators } = data

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="outline" className="mb-6" onClick={() => router.back()}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Validators
      </Button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center">
          {validator.imgSrc ? (
            <img 
              src={validator.imgSrc} 
              alt={validator.name} 
              className="w-16 h-16 rounded-full mr-4"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-secondary mr-4 flex items-center justify-center">
              <span className="text-xl font-bold">{validator.name.charAt(0)}</span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{validator.name}</h1>
            <p className="text-muted-foreground">
              {formatAddress(validator.address)}
              {validator.isVerified && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Verified
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={stakeDialogOpen} onOpenChange={setStakeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center bg-primary">
                <Zap className="mr-2 h-4 w-4" /> STAKE with {validator.name}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-sm border-border shadow-lg">
              <DialogHeader>
                <DialogTitle>Delegate to {validator.name}</DialogTitle>
                <DialogDescription>
                  Stake your STRK tokens to earn rewards.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleStake} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="stake-amount">Amount (STRK)</Label>
                  <div className="relative">
                    <Input
                      id="stake-amount"
                      type="number"
                      step="0.000001"
                      min="0"
                      placeholder="0.0"
                      value={stakeAmount}
                      onChange={handleStakeAmountChange}
                      required
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  {walletConnected && (
                    <div className="flex justify-between mt-1 text-xs text-gray-400">
                      <span>Balance: {formatTokenAmount(parseFloat(tokenBalance))} STRK</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-blue-400 hover:text-blue-300"
                        onClick={setMaxBalance}
                        disabled={!walletConnected}
                      >
                        MAX
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="split-delegation"
                    checked={isSplitDelegation}
                    onCheckedChange={(checked) => { track('Split Delegation Toggled', { enabled: checked }); setIsSplitDelegation(checked); }}
                    className="data-[state=unchecked]:bg-gray-700 data-[state=checked]:bg-blue-600 border-2 border-gray-600 h-6 w-11 [&>span]:h-5 [&>span]:w-5 [&>span]:bg-white"
                  />
                  <Label htmlFor="split-delegation" className="font-medium text-white">
                    Split delegation (90/10)
                  </Label>
                </div>
                
                {isSplitDelegation && (
                  <Card className="bg-secondary/80">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {stakeAmount && Number(stakeAmount) > 0 ? (
                          <>
                            <p className="flex justify-between py-1">
                              <span className="flex items-center">
                                <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center mr-1">
                                  {validator.imgSrc ? (
                                    <img 
                                      src={validator.imgSrc} 
                                      alt={validator.name} 
                                      className="w-4 h-4 rounded-full"
                                    />
                                  ) : (
                                    <span className="text-green-400 text-xs font-bold">
                                      {validator.name.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                {validator.name} (90%):
                              </span>
                              <span className="font-semibold">{splitDelegationPreview.mainAmount} STRK</span>
                            </p>
                            <p className="flex justify-between py-1 border-t border-border/50">
                              <span className="flex items-center">
                                <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center mr-1">
                                  <span className="text-blue-400 text-xs font-bold">
                                    {randomBottomValidator?.name.charAt(0)}
                                  </span>
                                </div>
                                Random bottom validator (10%):
                              </span>
                              <span className="font-semibold">{splitDelegationPreview.bottomAmount} STRK</span>
                            </p>
                            {randomBottomValidator && (
                              <div className="mt-2 flex items-center text-xs">
                                <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center mr-1">
                                  {randomBottomValidator.imgSrc ? (
                                    <img 
                                      src={randomBottomValidator.imgSrc} 
                                      alt={randomBottomValidator.name} 
                                      className="w-4 h-4 rounded-full"
                                    />
                                  ) : (
                                    <span className="text-blue-400 text-xs font-bold">
                                      {randomBottomValidator.name.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                {randomBottomValidator.name}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-center py-2">Enter an amount to see split preview</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {stakeResult && (
                  <div className={`p-3 rounded-md ${
                    stakeResult.includes('successful') 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    <div className="flex items-center">
                      {stakeResult.includes('successful') 
                        ? <CheckCircle className="h-4 w-4 mr-2" /> 
                        : <AlertCircle className="h-4 w-4 mr-2" />
                      }
                      <p className="text-sm">{stakeResult}</p>
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  {!walletConnected ? (
                    <Button 
                      type="button" 
                      onClick={connectWallet} 
                      disabled={isConnecting}
                      className="w-full"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Connect Wallet"
                      )}
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={isStaking || !stakeAmount || Number(stakeAmount) <= 0}
                      className="w-full"
                    >
                      {isStaking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Staking...
                        </>
                      ) : (
                        "Stake Now"
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          {walletConnected && (
            <Button variant="outline" onClick={disconnectWallet}>
              Disconnect Wallet
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="delegators">Delegators</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delegated Stake
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CountUp 
                    end={validator.delegatedStake} 
                    duration={1.5} 
                    separator="," 
                    decimal="."
                    decimals={2}
                    suffix=" STRK"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {validator.totalStakePercentage.toFixed(2)}% of network
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Delegators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CountUp 
                    end={stats.totalDelegators} 
                    duration={1.5} 
                    separator="," 
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +{stats.newDelegators7d} in the last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Revenue Share
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {validator.revenueShare !== undefined ? 
                    `${(validator.revenueShare / 100).toFixed(2)}%` : 
                    'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Commission fee taken by validator
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stake Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePieChartData(data)}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(2)}%`}
                    >
                      {preparePieChartData(data).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New Delegators</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={historicalData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value) => [Number(value).toFixed(0), 'New Delegators']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="newDelegators" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      name="New Delegators"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Validator Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Pool Address</span>
                      <a 
                        href={getVoyagerUrl(validator.poolAddress)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-mono text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {formatAddress(validator.poolAddress)}
                      </a>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Validator Address</span>
                      <a 
                        href={getVoyagerUrl(validator.address)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-mono text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {formatAddress(validator.address)}
                      </a>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Start Time</span>
                      <span>{validator.startTime ? formatDate(validator.startTime) : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Own Stake</span>
                      <span>{formatTokenAmount(validator.ownStake)} STRK</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Avg. Stake per Delegator</span>
                      <span>{formatTokenAmount(stats.avgStake)} STRK</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Rank</span>
                      <span>{validator.rank || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Delegation Growth</CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={historicalData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value, name) => {
                        return [`${Number(value).toFixed(2)} STRK`, 'New Stake']
                      }}
                    />
                    <Bar dataKey="newStake" fill="#8884d8" name="New Stake (STRK)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="delegators" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Total Delegators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CountUp end={stats.totalDelegators} duration={1.5} separator="," />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Avg. Stake
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CountUp 
                    end={stats.avgStake} 
                    duration={1.5} 
                    separator="," 
                    decimal="."
                    decimals={2}
                    suffix=" STRK"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Growth Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {calculateGrowthRate(data)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on recent delegator trends
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Delegators</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Staked</TableHead>
                    <TableHead>Since</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDelegators.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No delegators found
                      </TableCell>
                    </TableRow>
                  ) : (
                    topDelegators.map((delegator, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">
                          <a 
                            href={getVoyagerUrl(delegator.address)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {formatAddress(delegator.address)}
                          </a>
                        </TableCell>
                        <TableCell>{formatTokenAmount(delegator.delegatedStake)} STRK</TableCell>
                        <TableCell>
                          {delegator.startTime ? formatDate(delegator.startTime) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {((delegator.delegatedStake / stats.totalDelegated) * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Validator Age
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {validator.startTime 
                    ? Math.floor((Date.now() / 1000 - validator.startTime) / 86400) + ' days' 
                    : 'N/A'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Landmark className="h-4 w-4 mr-2" />
                  Max Stake
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CountUp 
                    end={stats.maxStake} 
                    duration={1.5} 
                    separator="," 
                    decimal="."
                    decimals={2}
                    suffix=" STRK"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Growth Factor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(() => {
                    if (!historicalData || historicalData.length === 0) return 'N/A';
                    
                    // Calculate average new delegators per day safely
                    const totalDelegators = historicalData.reduce((sum, day) => {
                      // Ensure we're adding a valid number
                      const value = typeof day.newDelegators === 'number' ? day.newDelegators : 0;
                      return sum + value;
                    }, 0);
                    
                    // Avoid division by zero
                    const days = Math.max(1, historicalData.length);
                    return (totalDelegators / days).toFixed(2);
                  })()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg. new delegators per day
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stake Distribution Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={(() => {
                      // Calculate cumulative stake properly without chaining
                      const processed = [];
                      let runningTotal = 0;
                      
                      for (let i = 0; i < historicalData.length; i++) {
                        runningTotal += historicalData[i].newStake;
                        processed.push({
                          ...historicalData[i],
                          cumulativeStake: runningTotal
                        });
                      }
                      
                      return processed;
                    })()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value) => [`${(Number(value) / 1000000).toFixed(2)}M STRK`, 'Cumulative Stake']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeStake" 
                      stroke="#00C49F" 
                      activeDot={{ r: 8 }} 
                      name="Cumulative Stake (M STRK)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Delegations</CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={historicalData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value) => [Number(value).toFixed(0), 'Delegations']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="newDelegators" 
                      stroke="#FF8042" 
                      activeDot={{ r: 8 }} 
                      name="New Delegations"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stats Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Min Stake</span>
                    <span>{formatTokenAmount(stats.minStake)} STRK</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Max Stake</span>
                    <span>{formatTokenAmount(stats.maxStake)} STRK</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Avg. Stake</span>
                    <span>{formatTokenAmount(stats.avgStake)} STRK</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">New Delegators (7d)</span>
                    <span>{stats.newDelegators7d}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Delegator Growth</span>
                    <span>{calculateGrowthRate(data)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Total Delegators</span>
                    <span>{stats.totalDelegators}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Own Stake</span>
                    <span>{formatTokenAmount(validator.ownStake)} STRK</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Delegated Stake</span>
                    <span>{formatTokenAmount(validator.delegatedStake)} STRK</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Total Stake</span>
                    <span>{formatTokenAmount(validator.totalStake)} STRK</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 