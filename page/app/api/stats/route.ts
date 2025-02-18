import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'user',
  host: 'localhost',
  database: 'mydatabase',
  password: 'password',
  port: 5432,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const verifiedOnly = searchParams.get('verified') === 'true';
  const verifiedFilter = verifiedOnly ? 'AND isVerified = true' : '';

  try {
    const client = await pool.connect();

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

    // Query for top 20 validators' stake
    const topTwentyStakeQuery = `
      SELECT 
        SUM(CAST(totalStake AS numeric)) / POWER(10, 18) as top_twenty_stake
      FROM (
        SELECT totalStake
        FROM validators
        WHERE totalStake > '0'
        ORDER BY totalStake::numeric DESC
        LIMIT 20
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
      topTwentyStakeResult,
      validatorsWithTwoPlusResult,
      totalActiveValidatorsResult
    ] = await Promise.all([
      client.query(avgDelegatorsTopTenQuery),
      client.query(avgStakedPerStakerQuery),
      client.query(validatorsWithZeroStakeQuery),
      client.query(avgDelegatedBottom20Query),
      client.query(avgStakedBottom20Query),
      client.query(validatorsOver1MQuery),
      client.query(avgDelegatorsTop10Query),
      client.query(avgDelegatorsBottom20Query),
      client.query(totalNetworkStakeQuery),
      client.query(topTwentyStakeQuery),
      client.query(validatorsWithTwoPlusQuery),
      client.query(totalActiveValidatorsQuery)
    ]);

    client.release();

    // Format the results
    const stats = {
      avgDelegatorsTopTen: Math.floor(Number(avgDelegatorsResult.rows[0].avg) / Math.pow(10, 18)) || 0,
      avgStakedPerStaker: Math.floor(Number(avgStakedResult.rows[0].avg) / Math.pow(10, 18)) || 0,
      validatorsWithZeroStake: Number(zeroStakeResult.rows[0].count) || 0,
      avgDelegatedBottom20: Math.floor(Number(avgDelegatedBottom20Result.rows[0].avg) / Math.pow(10, 18)) || 0,
      avgStakedBottom20: Math.floor(Number(avgStakedBottom20Result.rows[0].avg) / Math.pow(10, 18)) || 0,
      validatorsOver1M: Number(validatorsOver1MResult.rows[0].count) || 0,
      avgNumDelegatorsTop10: Math.floor(Number(avgDelegatorsTop10Result.rows[0].avg)) || 0,
      avgNumDelegatorsBottom20: Math.floor(Number(avgDelegatorsBottom20Result.rows[0].avg)) || 0,
      totalNetworkStake: Number(totalNetworkStakeResult.rows[0].total_stake) || 0,
      topTwentyStake: Number(topTwentyStakeResult.rows[0].top_twenty_stake) || 0,
      validatorsWithTwoPlus: Number(validatorsWithTwoPlusResult.rows[0].count) || 0,
      totalActiveValidators: Number(totalActiveValidatorsResult.rows[0].count) || 0
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