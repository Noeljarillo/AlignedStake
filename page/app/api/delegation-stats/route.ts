import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export async function GET(request: Request) {
  try {
    // Query total users, total amount staked, and recent delegations
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT sender_address) as total_users,
        SUM(amount_staked) as total_staked
      FROM users;
    `;

    const recentDelegationsQuery = `
      SELECT 
        tx_hash,
        sender_address,
        contract_address,
        amount_staked,
        timestamp
      FROM users
      ORDER BY timestamp DESC
      LIMIT 10;
    `;

    // Execute both queries in parallel
    const [statsResult, delegationsResult] = await Promise.all([
      sql(statsQuery),
      sql(recentDelegationsQuery)
    ]);

    // Format recent delegations
    const recentDelegations = delegationsResult.map(row => ({
      txHash: row.tx_hash,
      senderAddress: row.sender_address,
      contractAddress: row.contract_address,
      amountStaked: Number(row.amount_staked) / Math.pow(10, 18),
      timestamp: row.timestamp
    }));

    // Return stats and recent delegations
    return NextResponse.json({
      totalUsers: Number(statsResult[0]?.total_users || 0),
      totalStaked: Number(statsResult[0]?.total_staked || 0) / Math.pow(10, 18),
      recentDelegations
    });
  } catch (error) {
    console.error('Error fetching delegation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delegation statistics' },
      { status: 500 }
    );
  }
} 