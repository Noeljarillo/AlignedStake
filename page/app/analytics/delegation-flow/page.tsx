'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
  Sector
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveSankey, SankeyLinkDatum } from '@nivo/sankey';

interface DelegationFlow {
  id: string;
  delegator: string;
  validator: string;
  validatorAddress: string;
  stakeAmount: number;
  startTime: number;
  formattedDate: string;
  endTime: number;
}

interface DelegationFlowStats {
  totalDelegated: number;
  uniqueDelegators: number;
  uniqueValidators: number;
  totalFlows: number;
}

interface DelegationFlowResponse {
  flowData: DelegationFlow[];
  stats: DelegationFlowStats;
}

// Sankey chart interfaces
interface SankeyNode {
  id: string;
  nodeColor?: string;
  value?: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color?: string;
  originalValue?: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Add these stake size buckets for grouping
const stakeSizeBuckets = [
  { min: 1000000, label: "> 1M STRK" },
  { min: 10000, label: "> 10K STRK" },
  { min: 1000, label: "> 1K STRK" },
  { min: 100, label: "> 100 STRK" },
  { min: 0, label: "< 100 STRK" }
];

// Function to get the appropriate bucket for a given stake amount
function getStakeSizeBucket(amount: number): string {
  for (const bucket of stakeSizeBuckets) {
    if (amount >= bucket.min) {
      return bucket.label;
    }
  }
  return stakeSizeBuckets[stakeSizeBuckets.length - 1].label;
}

// Generate a consistent color for stake size buckets
function getBucketColor(bucketLabel: string): string {
  switch (bucketLabel) {
    case "> 1M STRK":
      return "hsl(340, 80%, 45%)"; // Rich red/pink
    case "> 10K STRK":
      return "hsl(280, 80%, 50%)"; // Purple
    case "> 1K STRK":
      return "hsl(220, 80%, 50%)"; // Blue
    case "> 100 STRK":
      return "hsl(160, 80%, 45%)"; // Teal
    case "< 100 STRK":
      return "hsl(100, 70%, 45%)"; // Green
    default:
      return "hsl(200, 70%, 50%)";
  }
}

function formatAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTokenAmount(amount: number) {
  const absValue = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `${sign}${(absValue / 1000).toFixed(2)}K`;
  }
  return `${sign}${absValue.toFixed(2)}`;
}

const predefinedDateRanges = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

// Function to generate a good-looking color based on string hash
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate HSL color with good saturation and lightness for visibility
  const h = hash % 360;
  return `hsl(${h}, 70%, 60%)`;
}

// Add a constant for max nodes to display for performance
const MAX_NODES_FOR_PERFORMANCE = 50;

// Add this interface for the bucket stats
interface BucketStat {
  label: string;
  count: number;
  totalStake: number;
  percentage: number;
  color: string;
}

interface ChartDataPoint {
  date: string;
  [validator: string]: string | number;
}

export default function DelegationFlowAnalytics() {
  const router = useRouter();
  const [flowData, setFlowData] = useState<DelegationFlow[]>([]);
  const [stats, setStats] = useState<DelegationFlowStats>({
    totalDelegated: 0,
    uniqueDelegators: 0,
    uniqueValidators: 0,
    totalFlows: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('sankey');
  const [sankeyData, setSankeyData] = useState<SankeyData>({ nodes: [], links: [] });
  const [bucketStats, setBucketStats] = useState<BucketStat[]>([]);
  const [topValidatorCount, setTopValidatorCount] = useState<number>(5);
  const [activeValidators, setActiveValidators] = useState<Record<string, boolean>>({});

  // Process data for Gantt chart
  const processGanttData = (data: DelegationFlow[]) => {
    const validators = Array.from(new Set(data.map(item => item.validator)));
    
    return validators.map((validator, index) => {
      const validatorFlows = data.filter(item => item.validator === validator);
      return {
        validator,
        index,
        flows: validatorFlows.map(flow => ({
          delegator: formatAddress(flow.delegator),
          stakeAmount: flow.stakeAmount,
          startDate: new Date(flow.startTime * 1000),
          endDate: new Date(flow.endTime * 1000),
        }))
      };
    });
  };

  // Format data for the recharts bar chart
  const formatGanttChartData = (data: DelegationFlow[]) => {
    if (!data.length) return [];
    
    // Group by day and validator
    const groupedByDayAndValidator = data.reduce((acc, flow) => {
      const day = format(new Date(flow.startTime * 1000), 'yyyy-MM-dd');
      if (!acc[day]) {
        acc[day] = {};
      }
      if (!acc[day][flow.validator]) {
        acc[day][flow.validator] = 0;
      }
      acc[day][flow.validator] += flow.stakeAmount;
      return acc;
    }, {} as Record<string, Record<string, number>>);
    
    // Convert to array format for recharts
    const chartData = Object.entries(groupedByDayAndValidator).map(([date, validators]) => {
      return {
        date,
        ...validators,
      };
    });
    
    // Sort by date
    return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) as ChartDataPoint[];
  };

  // Format data for Sankey chart with size bucketing and performance optimizations
  const formatSankeyData = (data: DelegationFlow[]) => {
    if (!data.length) {
      return { nodes: [], links: [] };
    }
    
    // Create a map to track total delegation values by stake size bucket and validator
    const flowMap: Record<string, Record<string, number>> = {};
    const validators = new Set<string>();
    
    // For statistics
    const bucketStatsMap: Record<string, { count: number; totalStake: number }> = {};
    stakeSizeBuckets.forEach(bucket => {
      bucketStatsMap[bucket.label] = { count: 0, totalStake: 0 };
    });
    
    // FIRST: Process ALL delegations and validators without any filtering
    // Group flows by stake size bucket and validator
    data.forEach(flow => {
      const bucketLabel = getStakeSizeBucket(flow.stakeAmount);
      validators.add(flow.validator);
      
      // Update stats
      bucketStatsMap[bucketLabel].count++;
      bucketStatsMap[bucketLabel].totalStake += flow.stakeAmount;
      
      if (!flowMap[bucketLabel]) {
        flowMap[bucketLabel] = {};
      }
      
      if (!flowMap[bucketLabel][flow.validator]) {
        flowMap[bucketLabel][flow.validator] = 0;
      }
      
      flowMap[bucketLabel][flow.validator] += flow.stakeAmount;
    });
    
    // Calculate total stake
    const totalStake = Object.values(bucketStatsMap).reduce(
      (sum, { totalStake }) => sum + totalStake, 
      0
    );
    
    // Create bucket stats with percentages
    const bucketStatsArray = stakeSizeBuckets
      .map(bucket => ({
        label: bucket.label,
        count: bucketStatsMap[bucket.label].count,
        totalStake: bucketStatsMap[bucket.label].totalStake,
        percentage: (bucketStatsMap[bucket.label].totalStake / totalStake) * 100,
        color: getBucketColor(bucket.label)
      }))
      .filter(stat => stat.count > 0);
    
    // Update the stats state
    setBucketStats(bucketStatsArray);
    
    // Get all stake size buckets that have delegations
    const activeBuckets = Object.keys(flowMap)
      .sort((a, b) => {
        const aIndex = stakeSizeBuckets.findIndex(bucket => bucket.label === a);
        const bIndex = stakeSizeBuckets.findIndex(bucket => bucket.label === b);
        return aIndex - bIndex; // Sort by bucket size (largest first)
      });
    
    // Calculate total stake per validator for proper sorting
    const validatorTotals: Record<string, number> = {};
    Object.values(flowMap).forEach(validatorMap => {
      Object.entries(validatorMap).forEach(([validator, value]) => {
        if (!validatorTotals[validator]) {
          validatorTotals[validator] = 0;
        }
        validatorTotals[validator] += value;
      });
    });
    
    // SECOND: After processing ALL data, now sort validators by total stake (descending)
    const sortedValidators = Array.from(validators)
      .sort((a, b) => validatorTotals[b] - validatorTotals[a]);
    
    // ONLY NOW: Group validators for display purposes - use the dynamic topValidatorCount
    const currentTopValidatorCount = Math.min(topValidatorCount, sortedValidators.length);
    
    // Top validators for individual display
    const topValidators = sortedValidators.slice(0, currentTopValidatorCount);
    
    // All other validators will be grouped
    const otherValidators = sortedValidators.slice(currentTopValidatorCount);
    
    const OTHER_VALIDATORS_ID = "Other Validators";
    
    // Calculate group totals for labeling
    const otherCount = otherValidators.length;
    
    // Create validator group label with count
    const makeGroupLabel = (name: string, count: number) => `${name} (${count})`;
    
    // Prepare nodes with buckets, top validators and the other validators group
    let nodes: SankeyNode[] = [
      ...activeBuckets.map(bucket => ({
        id: bucket,
        nodeColor: getBucketColor(bucket)
      })),
      ...topValidators.map(validator => ({
        id: validator,
        nodeColor: stringToColor(validator)
      }))
    ];
    
    // Add other validators group if there are any
    if (otherValidators.length > 0) {
      nodes.push({
        id: makeGroupLabel(OTHER_VALIDATORS_ID, otherCount),
        nodeColor: "#8d99ae" // Grey for other validators
      });
    }
    
    // Create links with properly scaled values
    const links: SankeyLink[] = [];
    
    // Helper function to scale values for thickness - keep this aggressive scaling
    const scaleValue = (value: number): number => {
      return Math.pow(value, 0.25) * 100;
    };
    
    // Add a minimum value to ensure all links are visible
    const ensureMinimumValue = (value: number): number => {
      const MIN_LINK_VALUE = 50;
      return Math.max(value, MIN_LINK_VALUE);
    };
    
    // Add links from buckets to top validators
    activeBuckets.forEach(bucket => {
      // Links to top validators (individual)
      topValidators.forEach(validator => {
        const value = flowMap[bucket][validator] || 0;
        if (value > 0) {
          links.push({
            source: bucket,
            target: validator,
            value: ensureMinimumValue(scaleValue(value)),
            color: getBucketColor(bucket),
            originalValue: value
          });
        }
      });
      
      // Aggregate links to other validators
      let otherValue = 0;
      otherValidators.forEach(validator => {
        if (flowMap[bucket][validator]) {
          otherValue += flowMap[bucket][validator];
        }
      });
      
      if (otherValue > 0 && otherValidators.length > 0) {
        links.push({
          source: bucket,
          target: makeGroupLabel(OTHER_VALIDATORS_ID, otherCount),
          value: ensureMinimumValue(scaleValue(otherValue)),
          color: getBucketColor(bucket),
          originalValue: otherValue
        });
      }
    });
    
    return { nodes, links };
  };

  // Use memoization for the Sankey data to prevent unnecessary recalculations
  const memoizedSankeyData = useMemo(() => {
    return formatSankeyData(flowData);
  }, [flowData, topValidatorCount]);

  const fetchDelegationFlowData = async () => {
    if (!startDate || !endDate) return;
    
    setIsLoading(true);
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await fetch(`/api/delegation-flow?startDate=${startDateStr}&endDate=${endDateStr}`);
      if (!response.ok) {
        throw new Error('Failed to fetch delegation flow data');
      }
      
      const data: DelegationFlowResponse = await response.json();
      setFlowData(data.flowData);
      setStats(data.stats);
      
      // We don't need this anymore since we're using the memoized version
      // setSankeyData(formatSankeyData(data.flowData));
    } catch (error) {
      console.error('Error fetching delegation flow data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDelegationFlowData();
  }, [startDate, endDate]);

  // Set the Sankey data using the memoized version
  useEffect(() => {
    setSankeyData(memoizedSankeyData);
  }, [memoizedSankeyData]);

  const handleDateRangeSelect = (days: number) => {
    setStartDate(subDays(new Date(), days));
    setEndDate(new Date());
  };

  const ganttData = processGanttData(flowData);
  const chartData = formatGanttChartData(flowData);
  const uniqueValidators = Array.from(new Set(flowData.map(flow => flow.validator)));
  
  // Create a mapping of validator names to their addresses
  const validatorAddressMap = useMemo(() => {
    const map: Record<string, string> = {};
    flowData.forEach(flow => {
      if (flow.validator && flow.validatorAddress) {
        map[flow.validator] = flow.validatorAddress;
      }
    });
    return map;
  }, [flowData]);

  // Updated function to navigate to a validator's page by address
  const navigateToValidator = (validatorNameOrAddress: string, e?: React.MouseEvent) => {
    // Stop propagation if event is provided
    if (e) {
      e.stopPropagation();
    }
    
    // Check if we have the address in our map
    const address = validatorAddressMap[validatorNameOrAddress] || validatorNameOrAddress;
    
    // Use Next.js router with the address, not the name
    router.push(`/validator/${address}`);
  };

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Staking Analytics: Delegation Flow</h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive staking metrics and charts to visualize delegation flows between delegators and validators.
          Track staking patterns, analyze validator performance, and identify key staking trends.
        </p>
      </div>
      
      <div className="mb-8 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Date Range</h2>
            <p className="text-muted-foreground">Select a date range to view delegation flows</p>
          </div>
          
          <div className="flex gap-2">
            {predefinedDateRanges.map((range) => (
              <Button 
                key={range.label}
                variant="outline"
                onClick={() => handleDateRangeSelect(range.days)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant="ghost"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal hover:bg-muted/50",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border shadow-md" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                  className="bg-background text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant="ghost"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal hover:bg-muted/50",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border shadow-md" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  initialFocus
                  className="bg-background text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Delegated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokenAmount(stats.totalDelegated)} STRK</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Delegators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueDelegators}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Validators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueValidators}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Delegations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFlows}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="chart">Delegation Stats</TabsTrigger>
          <TabsTrigger value="sankey">Delegations Flows</TabsTrigger>
          <TabsTrigger value="sizeDistribution">Size Distribution</TabsTrigger>
          <TabsTrigger value="table">Data Table</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delegation Flow by Validator</CardTitle>
              <CardDescription>
                Stacked bar chart showing daily delegation flows to validators
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p>Loading chart data...</p>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="date" 
                      label={{ value: 'Date', position: 'insideBottomRight', offset: -5 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
                    />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [`${formatTokenAmount(value)} STRK`, name]}
                    />
                    <Legend 
                      onClick={(data) => {
                        const validator = data.dataKey as string;
                        setActiveValidators(prev => {
                          // Check if any validators are active
                          const hasActive = Object.values(prev).some(isActive => isActive);
                          // Check if this validator is not already active and others are
                          const isNewValidatorActive = hasActive && !prev[validator];
                          
                          if (hasActive && !isNewValidatorActive) {
                            // If some validators are active and this one is already active,
                            // toggle it off
                            const newActiveValidators = { ...prev };
                            newActiveValidators[validator] = !prev[validator];
                            
                            // If all validators are now inactive, reset to show all
                            if (!Object.values(newActiveValidators).some(isActive => isActive)) {
                              return {};
                            }
                            
                            return newActiveValidators;
                          } else {
                            // If no validators are active or this is a new active validator,
                            // make only this one active
                            const newActiveValidators: Record<string, boolean> = {};
                            uniqueValidators.forEach(v => {
                              newActiveValidators[v] = v === validator;
                            });
                            return newActiveValidators;
                          }
                        });
                      }}
                      wrapperStyle={{ cursor: 'pointer' }}
                    />
                    {uniqueValidators
                      .filter(validator => {
                        // If no validators are active (empty object), show all
                        if (Object.keys(activeValidators).length === 0) return true;
                        // Otherwise show only active validators
                        return activeValidators[validator];
                      })
                      .map((validator, index) => (
                      <Bar 
                        key={validator}
                        dataKey={validator}
                        stackId="a"
                        fill={`hsl(${index * 30 % 360}, 70%, 50%)`}
                        onClick={(data, index, e) => {
                          // Use the validator address for navigation
                          navigateToValidator(validator, e);
                        }}
                        cursor="pointer"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p>No data available for the selected date range</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* New interesting visualization under Delegation Flow by Validator */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Validator Market Share Dynamics</CardTitle>
              <CardDescription>
                Showing delegation growth rates and market share changes for top validators
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[450px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p>Loading visualization...</p>
                </div>
              ) : chartData.length > 0 && chartData.length >= 2 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                  {/* Market Share Pie Chart */}
                  <div className="h-full">
                    <h3 className="text-sm font-medium mb-2 text-center">Validator Market Share</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart
                        layout="vertical"
                        data={[...uniqueValidators].slice(0, 5).map(validator => {
                          // Calculate total stake for this validator across all dates
                          const totalStake = chartData.reduce((sum, day) => 
                            sum + ((day[validator] as number) || 0), 0
                          );
                          return {
                            validator,
                            stake: totalStake,
                            percentage: (totalStake / stats.totalDelegated * 100).toFixed(1),
                            color: stringToColor(validator)
                          };
                        }).sort((a, b) => b.stake - a.stake)}
                        margin={{ top: 20, right: 25, left: 5, bottom: 5 }}
                      >
                        <XAxis type="number" 
                          tickFormatter={(value) => `${value.toFixed(1)}%`}
                          domain={[0, 100]}
                        />
                        <YAxis type="category" dataKey="validator" width={100} />
                        <RechartsTooltip 
                          formatter={(value: number, name: string, props: any) => {
                            const entry = props.payload;
                            return [`${entry.percentage}% (${formatTokenAmount(entry.stake)} STRK)`, 'Market Share'];
                          }}
                        />
                        <Bar 
                          dataKey="percentage" 
                          radius={[0, 4, 4, 0]}
                          onClick={(data, index, e) => {
                            if (data && data.validator) {
                              // Use the validator address for navigation
                              navigateToValidator(data.validator, e);
                            }
                          }}
                          cursor="pointer"
                        >
                          {uniqueValidators.slice(0, 5).map((validator, index) => (
                            <Cell key={`cell-${index}`} fill={stringToColor(validator)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Delegation Received Chart */}
                  <div className="h-full">
                    <h3 className="text-sm font-medium mb-2 text-center">Delegation Received</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      {chartData.length > 0 ? (
                        <PieChart>
                          <Pie
                            data={(() => {
                              // Sort validators by total received stake
                              const validatorTotalStake = uniqueValidators.map(validator => {
                                // Calculate total stake for this validator across all dates
                                const totalStake = chartData.reduce((sum, day) => 
                                  sum + ((day[validator] as number) || 0), 0
                                );
                                return {
                                  validator,
                                  name: validator, // For nameKey compatibility
                                  value: totalStake,
                                  percentage: (totalStake / stats.totalDelegated * 100).toFixed(1),
                                  fill: stringToColor(validator) // Use fill instead of color
                                };
                              }).sort((a, b) => b.value - a.value);
                              
                              // Get top 5 validators
                              const top5 = validatorTotalStake.slice(0, 5);
                              
                              // Calculate the "rest" as sum of all others
                              const restTotalStake = validatorTotalStake.slice(5).reduce(
                                (sum, item) => sum + item.value, 0
                              );
                              
                              // Add the "rest" category if there are more than 5 validators
                              const result = [...top5];
                              if (validatorTotalStake.length > 5) {
                                result.push({
                                  validator: "Rest",
                                  name: "Rest", // For nameKey compatibility
                                  value: restTotalStake,
                                  percentage: (restTotalStake / stats.totalDelegated * 100).toFixed(1),
                                  fill: "#888888" // Gray color for "rest"
                                });
                              }
                              
                              return result;
                            })()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={120}
                            innerRadius={60}
                            dataKey="value"
                            nameKey="name"
                            paddingAngle={2}
                            label={false}
                            isAnimationActive={false}
                            onClick={(data) => {
                              if (data && data.validator && data.validator !== "Rest") {
                                // Use the validator address for navigation
                                navigateToValidator(data.validator);
                              }
                            }}
                          />
                          <RechartsTooltip 
                            formatter={(value: number, name: string, props: any) => {
                              const entry = props.payload;
                              return [
                                `${entry.percentage}% (${formatTokenAmount(value)} STRK)`,
                                entry.name
                              ];
                            }}
                          />
                          <Legend />
                        </PieChart>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground text-sm">Not enough data available</p>
                        </div>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p>Not enough data available for the selected date range</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sankey" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delegations Flows</CardTitle>
              <div className="flex items-center justify-end mt-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="topValidatorCount" className="text-sm whitespace-nowrap">
                    Top Validators:
                  </Label>
                  <select
                    id="topValidatorCount"
                    className="bg-background border border-input rounded-md h-9 pl-3 pr-6 text-sm"
                    value={topValidatorCount}
                    onChange={(e) => setTopValidatorCount(Number(e.target.value))}
                  >
                    <option value="3">Top 3</option>
                    <option value="5">Top 5</option>
                    <option value="10">Top 10</option>
                    <option value="15">Top 15</option>
                    <option value="20">Top 20</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative" style={{ 
              // Calculate height dynamically based on number of validators - use a larger multiplier for more validators
              height: sankeyData.nodes.length > 0 
                ? `${Math.max(750, 500 + (Math.min(topValidatorCount, stats.uniqueValidators) * (topValidatorCount > 10 ? 80 : 50)))}px` 
                : '750px'
            }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-2" />
                    <p>Loading Sankey diagram...</p>
                  </div>
                </div>
              ) : sankeyData.nodes.length > 0 ? (
                <ResponsiveSankey
                  data={sankeyData}
                  margin={{ top: 50, right: 200, bottom: 50, left: 200 }}
                  align="justify"
                  colors={(node) => node.nodeColor || "grey"}
                  nodeOpacity={0.9}
                  nodeHoverOpacity={1}
                  nodeHoverOthersOpacity={0.15}
                  nodeThickness={40}
                  // Increase node spacing to avoid overlap when displaying more validators
                  nodeSpacing={70}
                  nodeBorderWidth={0}
                  nodeBorderRadius={6}
                  linkOpacity={0.85}
                  linkHoverOpacity={0.95}
                  linkHoverOthersOpacity={0.1}
                  linkBlendMode="normal"
                  enableLinkGradient={false}
                  motionConfig="gentle"
                  animate={true}
                  labelPosition="outside"
                  labelOrientation="horizontal"
                  labelPadding={20}
                  nodeTooltip={({ node }: { node: SankeyNode & { value: number, originalValue?: number } }) => {
                    // Check if this is a stake size bucket
                    const isBucket = stakeSizeBuckets.some(bucket => bucket.label === node.id);
                    const displayValue = node.originalValue !== undefined ? node.originalValue : node.value;
                    const isGroupedValidators = node.id.includes('Validators');
                    const validatorCount = isGroupedValidators ? 
                      parseInt(node.id.match(/\((\d+)\)$/)?.[1] || "0") : 1;
                    
                    return (
                      <div style={{ 
                        background: 'white', 
                        padding: '12px 16px', 
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        color: '#333',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                        minWidth: '240px'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '15px' }}>
                          {node.id}
                        </div>
                        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Total Stake:</span>
                          <span style={{ fontWeight: 'bold' }}>{formatTokenAmount(displayValue)} STRK</span>
                        </div>
                        {isBucket && (
                          <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Delegator Type:</span>
                            <span style={{ fontWeight: 'bold' }}>{node.id.includes('1M') ? 'Whale' : node.id.includes('10K') ? 'Large' : node.id.includes('1K') ? 'Medium' : 'Small'}</span>
                          </div>
                        )}
                        {isGroupedValidators && (
                          <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Validators in Group:</span>
                            <span style={{ fontWeight: 'bold' }}>{validatorCount}</span>
                          </div>
                        )}
                        {!isBucket && (
                          <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Entity Type:</span>
                            <span style={{ fontWeight: 'bold' }}>
                              {isGroupedValidators ? "Validator Group" : "Validator"}
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>% of Total:</span>
                          <span style={{ fontWeight: 'bold' }}>{((displayValue / stats.totalDelegated) * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                    );
                  }}
                  linkTooltip={({ link }) => {
                    // Extract the source and target ids
                    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                    
                    // Extract the flow value
                    const flowValue = 'originalValue' in link ? 
                      (link as any).originalValue : 
                      link.value;
                    
                    // Check if this is a grouped validators target
                    const isGroupedValidators = targetId.includes('Validators');
                    const validatorCount = isGroupedValidators ? 
                      parseInt(targetId.match(/\((\d+)\)$/)?.[1] || "0") : 1;

                    return (
                      <div style={{ 
                        background: 'white', 
                        padding: '12px 16px', 
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        color: '#333',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                        minWidth: '240px'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '15px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Flow Detail</span>
                        </div>
                        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>From:</span>
                          <span style={{ fontWeight: 'bold' }}>{sourceId}</span>
                        </div>
                        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>To:</span>
                          <span style={{ fontWeight: 'bold' }}>{targetId}</span>
                        </div>
                        {isGroupedValidators && (
                          <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Number of Validators:</span>
                            <span style={{ fontWeight: 'bold' }}>{validatorCount}</span>
                          </div>
                        )}
                        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#0074d9' }}>
                          <span>Amount:</span>
                          <span style={{ fontWeight: 'bold' }}>{formatTokenAmount(flowValue)} STRK</span>
                        </div>
                        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>% of Total:</span>
                          <span style={{ fontWeight: 'bold' }}>{((flowValue / stats.totalDelegated) * 100).toFixed(2)}%</span>
                        </div>
                        {isGroupedValidators && (
                          <div style={{ fontSize: '13px', marginTop: '6px', fontStyle: 'italic' }}>
                            This represents the combined flow to {validatorCount} validators in this group
                          </div>
                        )}
                      </div>
                    );
                  }}
                  legends={[]}
                  theme={{
                    tooltip: {
                      container: {
                        background: '#333',
                        color: '#fff',
                        fontSize: '12px',
                        borderRadius: '4px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                        padding: '8px 12px',
                      }
                    },
                    labels: {
                      text: {
                        fontSize: 14,
                        fontWeight: 600,
                        fill: '#fff',
                        outlineWidth: 2,
                        outlineColor: 'rgba(0, 0, 0, 0.7)'
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p>No data available for the selected date range</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Delegation Size Summary returned to delegation flows tab */}
          {bucketStats.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Delegation Size Summary</CardTitle>
                <CardDescription>
                  Distribution of delegations across different stake size categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Visual distribution bar */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-2">Stake Distribution</h3>
                  <div className="w-full h-8 rounded-md flex overflow-hidden">
                    {bucketStats.map((stat, index) => (
                      <div 
                        key={stat.label}
                        style={{ 
                          width: `${stat.percentage}%`, 
                          backgroundColor: stat.color,
                          transition: 'width 0.5s ease'
                        }}
                        className="h-full relative group"
                      >
                        {stat.percentage > 5 && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                            {stat.percentage.toFixed(1)}%
                          </span>
                        )}
                        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-background border border-border p-2 rounded-md text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 min-w-[120px] text-center">
                          {stat.label}: {formatTokenAmount(stat.totalStake)} STRK
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>Smaller Delegations</span>
                    <span>Larger Delegations</span>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Size Category</TableHead>
                      <TableHead>Delegator Count</TableHead>
                      <TableHead>Total Stake</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bucketStats.map((stat) => (
                      <TableRow key={stat.label}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: stat.color }}
                            />
                            <span>{stat.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>{stat.count.toLocaleString()}</TableCell>
                        <TableCell>{formatTokenAmount(stat.totalStake)} STRK</TableCell>
                        <TableCell className="text-right font-medium">
                          {stat.percentage.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell>
                        {formatTokenAmount(bucketStats.reduce((sum, stat) => sum + stat.totalStake, 0))} STRK
                      </TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="sizeDistribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stake Size Distribution</CardTitle>
              <CardDescription>
                Distribution of delegations across different stake size categories
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-2" />
                    <p>Loading chart data...</p>
                  </div>
                </div>
              ) : bucketStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bucketStats}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="label" 
                      label={{ value: 'Stake Size Category', position: 'insideBottomRight', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Delegator Count', angle: -90, position: 'insideLeft' }}
                      orientation="left"
                    />
                    <YAxis 
                      yAxisId="right"
                      label={{ value: 'Total Stake (STRK)', angle: 90, position: 'insideRight' }}
                      orientation="right"
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <RechartsTooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'Total Stake') return [`${formatTokenAmount(value)} STRK`, name];
                        if (name === 'Delegator Count') return [value.toLocaleString(), name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="count" 
                      name="Delegator Count" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="totalStake" 
                      name="Total Stake" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p>No data available for the selected date range</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="table" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delegation Flow Data</CardTitle>
              <CardDescription>
                Detailed view of all delegation flows in the selected date range
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <p>Loading table data...</p>
                </div>
              ) : flowData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delegator</TableHead>
                      <TableHead>Validator</TableHead>
                      <TableHead>Delegated Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flowData.map((flow) => (
                      <TableRow key={flow.id}>
                        <TableCell className="font-mono">{formatAddress(flow.delegator)}</TableCell>
                        <TableCell>{flow.validator}</TableCell>
                        <TableCell>{formatTokenAmount(flow.stakeAmount)} STRK</TableCell>
                        <TableCell>{format(new Date(flow.startTime * 1000), 'yyyy-MM-dd')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p>No data available for the selected date range</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 