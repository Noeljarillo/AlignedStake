import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const verifiedOnly = searchParams.get('verified') === 'true';
  const verifiedFilter = verifiedOnly ? 'AND isVerified = true' : '';

  try {
    // Query for average delegated stake of top 10 validators
    const avgDelegatorsTopTenQuery = `
      SELECT AVG(delegatedStake::numeric) 
      FROM (
        SELECT delegatedStake 
        FROM validators 
        WHERE 1=1 ${verifiedFilter}
        ORDER BY delegatedStake DESC
        LIMIT 10
      ) subquery;
    `;

    // Query for average stake per staker
    const avgStakedPerStakerQuery = `
      SELECT AVG(totalStake::numeric)
      FROM validators
      WHERE totalStake > 0;
    `;

    // Query for validators with zero stake
    const validatorsWithZeroStakeQuery = `
      SELECT COUNT(*)
      FROM validators
      WHERE delegatedstake = '0' OR totaldelegators IS NULL;
    `;

    // Query for total network stake (sum of delegated and staked)
    const totalNetworkStakeQuery = `
      SELECT 
        SUM(CAST(totalStake AS numeric)) / POWER(10, 18) as total_stake
      FROM validators
      WHERE totalStake > '0';
    `;

    // Query for average delegated stake of bottom 20 validators
    const avgDelegatedBottom20Query = `
      SELECT AVG(delegatedStake::numeric)
      FROM (
        SELECT delegatedStake
        FROM validators
        WHERE delegatedStake > '0'
        ORDER BY delegatedStake::numeric ASC
        LIMIT 20
      ) subquery;
    `;

    // Query for average staked of bottom 20 validators
    const avgStakedBottom20Query = `
      SELECT AVG(totalStake::numeric)
      FROM (
        SELECT totalStake
        FROM validators
        WHERE totalStake > '0'
        ORDER BY totalStake::numeric ASC
        LIMIT 20
      ) subquery;
    `;

    // Query for validators with more than 1M STARK staked
    const validatorsOver1MQuery = `
      SELECT COUNT(*)
      FROM validators
      WHERE totalStake::numeric > 1000000 * POWER(10, 18);
    `;

    // Query for average number of delegators for top 10 validators
    const avgDelegatorsTop10Query = `
      SELECT AVG(totalDelegators::numeric)
      FROM (
        SELECT totalDelegators
        FROM validators
        WHERE totalDelegators IS NOT NULL
        ORDER BY delegatedStake::numeric DESC
        LIMIT 10
      ) subquery;
    `;

    // Query for average number of delegators for bottom 20 validators
    const avgDelegatorsBottom20Query = `
      SELECT AVG(totalDelegators::numeric)
      FROM (
        SELECT totalDelegators
        FROM validators
        WHERE totalDelegators IS NOT NULL
        ORDER BY delegatedStake::numeric ASC
        LIMIT 20
      ) subquery;
    `;

    // Query for top 10 validators' stake
    const topTenStakeQuery = `
      SELECT 
        SUM(CAST(totalStake AS numeric)) / POWER(10, 18) as top_ten_stake
      FROM (
        SELECT totalStake
        FROM validators
        WHERE totalStake > '0'
        ORDER BY totalStake::numeric DESC
        LIMIT 10
      ) subquery;
    `;

    // Add these new queries
    const validatorsWithTwoPlusQuery = `
      SELECT COUNT(*)
      FROM validators
      WHERE totalDelegators >= 2;
    `;

    const totalActiveValidatorsQuery = `
      SELECT COUNT(*)
      FROM validators
      WHERE totalStake > '0';
    `;

    // Execute all queries
    const [
      avgDelegatorsResult,
      avgStakedResult,
      zeroStakeResult,
      avgDelegatedBottom20Result,
      avgStakedBottom20Result,
      validatorsOver1MResult,
      avgDelegatorsTop10Result,
      avgDelegatorsBottom20Result,
      totalNetworkStakeResult,
      topTenStakeResult,
      validatorsWithTwoPlusResult,
      totalActiveValidatorsResult
    ] = await Promise.all([
      sql(avgDelegatorsTopTenQuery),
      sql(avgStakedPerStakerQuery),
      sql(validatorsWithZeroStakeQuery),
      sql(avgDelegatedBottom20Query),
      sql(avgStakedBottom20Query),
      sql(validatorsOver1MQuery),
      sql(avgDelegatorsTop10Query),
      sql(avgDelegatorsBottom20Query),
      sql(totalNetworkStakeQuery),
      sql(topTenStakeQuery),
      sql(validatorsWithTwoPlusQuery),
      sql(totalActiveValidatorsQuery)
    ]);

    // Format the results
    const stats = {
      avgDelegatorsTopTen: Math.floor(Number(avgDelegatorsResult[0]?.avg) / Math.pow(10, 18)) || 0,
      avgStakedPerStaker: Math.floor(Number(avgStakedResult[0]?.avg) / Math.pow(10, 18)) || 0,
      validatorsWithZeroStake: Number(zeroStakeResult[0]?.count) || 0,
      avgDelegatedBottom20: Math.floor(Number(avgDelegatedBottom20Result[0]?.avg) / Math.pow(10, 18)) || 0,
      avgStakedBottom20: Math.floor(Number(avgStakedBottom20Result[0]?.avg) / Math.pow(10, 18)) || 0,
      validatorsOver1M: Number(validatorsOver1MResult[0]?.count) || 0,
      avgNumDelegatorsTop10: Math.floor(Number(avgDelegatorsTop10Result[0]?.avg)) || 0,
      avgNumDelegatorsBottom20: Math.floor(Number(avgDelegatorsBottom20Result[0]?.avg)) || 0,
      totalNetworkStake: Number(totalNetworkStakeResult[0]?.total_stake) || 0,
      topTenStake: Number(topTenStakeResult[0]?.top_ten_stake) || 0,
      validatorsWithTwoPlus: Number(validatorsWithTwoPlusResult[0]?.count) || 0,
      totalActiveValidators: Number(totalActiveValidatorsResult[0]?.count) || 0
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
} 