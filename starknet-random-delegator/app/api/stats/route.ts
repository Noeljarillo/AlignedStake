import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'user',
  host: 'localhost',
  database: 'mydatabase',
  password: 'password',
  port: 5432,
});

export async function GET() {
  try {
    const client = await pool.connect();

    // Query for average delegated stake of top 10 validators
    const avgDelegatorsTopTenQuery = `
      SELECT AVG(delegatedStake::numeric) 
      FROM (
        SELECT delegatedStake 
        FROM validators 
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

    // Execute all queries
    const [avgDelegatorsResult, avgStakedResult, zeroStakeResult] = await Promise.all([
      client.query(avgDelegatorsTopTenQuery),
      client.query(avgStakedPerStakerQuery),
      client.query(validatorsWithZeroStakeQuery),
    ]);

    client.release();

    // Format the results
    const stats = {
      avgDelegatorsTopTen: Math.floor(Number(avgDelegatorsResult.rows[0].avg) / Math.pow(10, 18)) || 0,
      avgStakedPerStaker: Math.floor(Number(avgStakedResult.rows[0].avg) / Math.pow(10, 18)) || 0,
      validatorsWithZeroStake: Number(zeroStakeResult.rows[0].count) || 0,
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