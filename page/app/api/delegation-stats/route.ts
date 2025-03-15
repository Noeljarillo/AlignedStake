import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export async function GET(request: Request) {
  try {
    // Get URL parameters for pagination and sorting
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const sortBy = searchParams.get('sortBy') || 'amount';  // Default to amount instead of timestamp
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Calculate offset
    const offset = (page - 1) * pageSize;
    
    // Get total stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT sender_address) as total_users,
        SUM(amount_staked::numeric) as total_staked
      FROM users;
    `;
    
    // Get total delegations count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users;
    `;
    
    // Map frontend sort fields to database column names
    const sortFieldMap: Record<string, string> = {
      'time': 'timestamp',
      'timestamp': 'timestamp',
      'delegator': 'sender_address',
      'amount': 'amount_staked'
    };
    
    // Use the mapped field or default to amount_staked
    const dbSortField = sortFieldMap[sortBy] || 'amount_staked';
    
    // Get recent delegations with pagination and sorting
    const delegationsQuery = `
      SELECT 
        tx_hash,
        sender_address,
        contract_address,
        amount_staked,
        timestamp
      FROM users
      ORDER BY ${dbSortField} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
      LIMIT $1 OFFSET $2;
    `;
    
    const [statsResult, countResult, delegationsResult] = await Promise.all([
      sql(statsQuery),
      sql(countQuery),
      sql(delegationsQuery, [pageSize, offset])
    ]);
    
    // Calculate total pages
    const totalCount = parseInt(countResult[0].total);
    const totalPages = Math.ceil(totalCount / pageSize);
    
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
      recentDelegations: formattedDelegations,
      pagination: {
        currentPage: page,
        totalPages,
        pageSize,
        totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching delegation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delegation stats' },
      { status: 500 }
    );
  }
} 