import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

const RPC_URL = "https://free-rpc.nethermind.io/mainnet-juno/v0_7";
const REWARDS_SELECTOR = "0xcf37a862e5bf34bd0e858865ea02d4ba6db9cc722f3424eb452c94d4ea567f";

async function getRewards(poolAddress: string, userAddress: string): Promise<number> {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "starknet_call",
        params: [
          {
            contract_address: poolAddress,
            entry_point_selector: REWARDS_SELECTOR,
            calldata: [userAddress]
          },
          "latest"
        ],
        id: 1
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);
    
    // Get the fourth element (index 3) and convert from hex to number
    return result.result && result.result[3] ? 
      parseInt(result.result[3], 16) / Math.pow(10, 18) : 0;
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return 0;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Get all delegations for the address, including unpooltime
    const query = `
      SELECT 
        d.address,
        d.delegatedstake,
        d.unpooltime,
        v.pooladdress,
        v.name as validator_name
      FROM delegators d
      LEFT JOIN validators v ON d.delegatedto = v.address
      WHERE d.address = $1
    `;

    const result = await sql(query, [address]);

    // Fetch rewards for each delegation
    const delegationsWithRewards = await Promise.all(
      result.map(async (row) => {
        const rewards = await getRewards(row.pooladdress, address);
        return {
          validatorName: row.validator_name || row.pooladdress.slice(0, 8) + '...',
          poolAddress: row.pooladdress,
          delegatedStake: Number(row.delegatedstake) / Math.pow(10, 18),
          pendingRewards: rewards,
          unpoolTime: row.unpooltime ? Number(row.unpooltime) : undefined
        };
      })
    );

    return NextResponse.json({
      delegations: delegationsWithRewards,
      totalDelegated: delegationsWithRewards.reduce((sum, d) => sum + d.delegatedStake, 0),
      totalPendingRewards: delegationsWithRewards.reduce((sum, d) => sum + d.pendingRewards, 0)
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delegations' },
      { status: 500 }
    );
  }
} 