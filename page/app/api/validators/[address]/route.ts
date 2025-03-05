import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a single neon connection
const sql = neon(process.env.DATABASE_URL || '');

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const validatorAddress = params.address;

    // Get validator details
    const validatorQuery = `
      SELECT *
      FROM validators
      WHERE address = $1 OR poolAddress = $1;
    `;
    
    const validatorResult = await sql(validatorQuery, [validatorAddress]);
    
    if (validatorResult.length === 0) {
      return NextResponse.json(
        { error: 'Validator not found' },
        { status: 404 }
      );
    }
    
    const validator = validatorResult[0];

    // Get delegator statistics for this validator
    const delegatorsQuery = `
      SELECT 
        COUNT(*) as total_delegators,
        SUM(delegatedStake) as total_delegated,
        AVG(delegatedStake) as avg_stake,
        MAX(delegatedStake) as max_stake,
        MIN(delegatedStake) as min_stake,
        COUNT(CASE WHEN startTime > extract(epoch from now()) - 604800 THEN 1 END) as new_delegators_7d
      FROM delegators
      WHERE delegatedTo = $1;
    `;
    
    const delegatorStatsResult = await sql(delegatorsQuery, [validatorAddress]);
    const delegatorStats = delegatorStatsResult[0];

    // Get historical delegator data (grouped by day)
    const historicalDelegatorsQuery = `
      SELECT 
        DATE_TRUNC('day', to_timestamp(startTime)) as date,
        COUNT(*) as new_delegators,
        SUM(delegatedStake) as new_stake
      FROM delegators
      WHERE delegatedTo = $1
      GROUP BY DATE_TRUNC('day', to_timestamp(startTime))
      ORDER BY date ASC;
    `;
    
    const historicalDelegators = await sql(historicalDelegatorsQuery, [validatorAddress]);

    // Get top delegators for this validator
    const topDelegatorsQuery = `
      SELECT 
        address,
        delegatedStake,
        startTime
      FROM delegators
      WHERE delegatedTo = $1
      ORDER BY delegatedStake DESC
      LIMIT 10;
    `;
    
    const topDelegators = await sql(topDelegatorsQuery, [validatorAddress]);

    // Format validator data
    const formattedValidator = {
      address: validator.address,
      name: validator.name || validator.address.slice(0, 8) + '...',
      poolAddress: validator.pooladdress,
      delegatedStake: Number(validator.delegatedstake) / Math.pow(10, 18),
      totalDelegators: validator.totaldelegators,
      ownStake: Number(validator.ownstake) / Math.pow(10, 18),
      totalStake: Number(validator.totalstake) / Math.pow(10, 18),
      totalStakePercentage: Number(validator.totalstakepercentage),
      revenueShare: Number(validator.revenueshare),
      apr: Number(validator.apr),
      isVerified: validator.isverified,
      imgSrc: validator.imgsrc,
      startTime: validator.starttime,
      rank: validator.rank,
    };

    return NextResponse.json({
      validator: formattedValidator,
      stats: {
        totalDelegators: delegatorStats.total_delegators,
        totalDelegated: Number(delegatorStats.total_delegated) / Math.pow(10, 18),
        avgStake: Number(delegatorStats.avg_stake) / Math.pow(10, 18),
        maxStake: Number(delegatorStats.max_stake) / Math.pow(10, 18),
        minStake: Number(delegatorStats.min_stake) / Math.pow(10, 18),
        newDelegators7d: delegatorStats.new_delegators_7d,
      },
      historicalData: historicalDelegators.map((item) => ({
        date: item.date,
        newDelegators: item.new_delegators,
        newStake: Number(item.new_stake) / Math.pow(10, 18),
      })),
      topDelegators: topDelegators.map((delegator) => ({
        address: delegator.address,
        delegatedStake: Number(delegator.delegatedstake) / Math.pow(10, 18),
        startTime: delegator.starttime,
      })),
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validator details' },
      { status: 500 }
    );
  }
} 