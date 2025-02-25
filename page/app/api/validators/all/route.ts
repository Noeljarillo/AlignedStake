import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a single neon connection
const sql = neon(process.env.DATABASE_URL || '');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || 'delegatedStake';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const verifiedOnly = searchParams.get('verified') === 'true';
    const search = searchParams.get('search') || '';
    const maxFee = searchParams.get('maxFee') ? parseInt(searchParams.get('maxFee') || '0') : null;
    
    // Calculate offset
    const offset = (page - 1) * pageSize;
    
    // Validate sort column to prevent SQL injection
    const validSortColumns = ['delegatedstake', 'totaldelegators', 'rank', 'name', 'revenueshare', 'starttime'];
    const sanitizedSortBy = validSortColumns.includes(sortBy.toLowerCase()) 
      ? sortBy.toLowerCase() 
      : 'delegatedstake';
    
    // Validate sort order
    const sanitizedSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase())
      ? sortOrder.toLowerCase()
      : 'desc';
    
    // Base query with filters
    let baseQuery = `
      SELECT 
        address,
        name,
        delegatedStake,
        totalDelegators,
        isVerified,
        imgSrc,
        poolAddress,
        rank,
        revenueShare,
        startTime
      FROM validators 
      WHERE 1=1
      ${verifiedOnly ? 'AND isVerified = true' : ''}
    `;
    
    // Add max fee filter if provided
    if (maxFee !== null) {
      baseQuery += ` AND (revenueShare::numeric <= ${maxFee} OR revenueShare IS NULL)`;
    }
    
    // Add search filter if provided
    const queryParams = [];
    if (search) {
      baseQuery += ` AND (LOWER(name) LIKE LOWER($1) OR LOWER(address) LIKE LOWER($1))`;
      queryParams.push(`%${search}%`);
    }
    
    // Count total validators matching the criteria
    const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS filtered_validators`;
    const countResult = await sql(countQuery, queryParams);
    const totalCount = parseInt(countResult[0].count);
    
    // Add sorting and pagination
    const query = `
      ${baseQuery}
      ORDER BY ${sanitizedSortBy === 'starttime' 
        ? `${sanitizedSortBy}::bigint ${sanitizedSortOrder === 'asc' ? 'ASC' : 'DESC'}`
        : `${sanitizedSortBy}::numeric ${sanitizedSortOrder === 'asc' ? 'ASC' : 'DESC'}`}
      LIMIT ${pageSize} OFFSET ${offset};
    `;
    
    const result = await sql(query, queryParams);
    
    // Format the results
    const validators = result.map(validator => ({
      address: validator.address,
      name: validator.name || validator.address.slice(0, 8) + '...',
      delegatedStake: Math.floor(Number(validator.delegatedstake) / Math.pow(10, 18)),
      totalDelegators: validator.totaldelegators,
      isVerified: validator.isverified,
      imgSrc: validator.imgsrc,
      poolAddress: validator.pooladdress,
      rank: validator.rank,
      revenueShare: validator.revenueshare,
      startTime: validator.starttime
    }));
    
    return NextResponse.json({
      validators,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validators' },
      { status: 500 }
    );
  }
} 