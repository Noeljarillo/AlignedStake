import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export async function GET() {
  try {
    // Get total stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT sender_address) as total_users,
        SUM(amount_staked::numeric) as total_staked
      FROM users;
    `;
    
    // Get recent delegations - most recent first, limit to 10
    const delegationsQuery = `
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
    
    const [statsResult, delegationsResult] = await Promise.all([
      sql(statsQuery),
      sql(delegationsQuery)
    ]);
    
    // Format the delegations to ensure consistent display
    const formattedDelegations = delegationsResult.map(record => ({
      txHash: record.tx_hash,
      senderAddress: record.sender_address,
      contractAddress: record.contract_address,
      // Convert amount_staked to a number to ensure consistent formatting
      amountStaked: parseFloat(record.amount_staked),
      timestamp: new Date(record.timestamp).getTime()
    }));
    
    return NextResponse.json({
      totalUsers: parseInt(statsResult[0].total_users) || 0,
      totalStaked: parseFloat(statsResult[0].total_staked) || 0,
      recentDelegations: formattedDelegations
    });
    
  } catch (error) {
    console.error('Error fetching delegation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delegation stats' },
      { status: 500 }
    );
  }
} 