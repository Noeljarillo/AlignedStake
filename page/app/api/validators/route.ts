import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a single neon connection
const sql = neon(process.env.DATABASE_URL || '');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'top'; // 'top' or 'bottom'
    const verifiedOnly = searchParams.get('verified') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Base query with verification filter
    const baseQuery = `
      SELECT 
        address,
        name,
        delegatedStake,
        totalDelegators,
        isVerified,
        imgSrc,
        poolAddress
      FROM validators 
      WHERE 1=1
      ${verifiedOnly ? 'AND isVerified = true' : ''}
    `;

    // Add ordering based on mode
    const query = `
      ${baseQuery}
      ORDER BY delegatedStake::numeric ${mode === 'top' ? 'DESC' : 'ASC'}
      LIMIT $1;
    `;

    const result = await sql(query, [limit]);

    // Format the results
    const validators = result.map(validator => ({
      address: validator.address,
      name: validator.name || validator.address.slice(0, 8) + '...',
      delegatedStake: Math.floor(Number(validator.delegatedstake) / Math.pow(10, 18)),
      totalDelegators: validator.totaldelegators,
      isVerified: validator.isverified,
      imgSrc: validator.imgsrc,
      poolAddress: validator.pooladdress
    }));

    return NextResponse.json(validators);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validators' },
      { status: 500 }
    );
  }
} 