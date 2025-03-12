import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      );
    }

    // Convert string dates to timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    // Query to get delegation flows within date range
    const delegationFlowQuery = `
      SELECT 
        d.address as delegator_address,
        d.delegatedto as validator_address,
        v.name as validator_name,
        d.delegatedstake as stake_amount,
        d.starttime
      FROM delegators d
      LEFT JOIN validators v ON d.delegatedto = v.address
      WHERE d.starttime >= $1 AND d.starttime <= $2
      ORDER BY d.starttime ASC;
    `;
    
    const result = await sql(delegationFlowQuery, [startTimestamp, endTimestamp]);

    // Process and format the data for the Gantt chart
    const delegationFlowData = result.map(row => ({
      id: `${row.delegator_address}-${row.validator_address}-${row.starttime}`,
      delegator: row.delegator_address,
      validator: row.validator_name || row.validator_address.slice(0, 8) + '...',
      validatorAddress: row.validator_address,
      stakeAmount: Number(row.stake_amount) / Math.pow(10, 18),
      startTime: row.starttime,
      formattedDate: new Date(row.starttime * 1000).toISOString(),
      // For Gantt chart purposes, we'll set an end time that's 1 day later
      // This can be adjusted based on actual data if available
      endTime: row.starttime + 86400,
    }));

    // Get summary stats
    const totalDelegated = delegationFlowData.reduce((sum, item) => sum + item.stakeAmount, 0);
    const uniqueDelegators = new Set(delegationFlowData.map(item => item.delegator)).size;
    const uniqueValidators = new Set(delegationFlowData.map(item => item.validatorAddress)).size;

    return NextResponse.json({
      flowData: delegationFlowData,
      stats: {
        totalDelegated,
        uniqueDelegators,
        uniqueValidators,
        totalFlows: delegationFlowData.length
      }
    });
  } catch (error) {
    console.error('Error fetching delegation flow data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delegation flow data' },
      { status: 500 }
    );
  }
} 