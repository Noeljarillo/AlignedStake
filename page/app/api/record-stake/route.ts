import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export async function POST(request: Request) {
  try {
    const { txHash, senderAddress, contractAddress, amountStaked } = await request.json();

    // Validate required fields
    if (!txHash || !senderAddress || !contractAddress || !amountStaked) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store the amount as is, without multiplying by 10^18
    // We'll handle the conversion in the frontend when displaying
    const amount = parseFloat(amountStaked).toString();

    // Insert the stake record
    const query = `
      INSERT INTO users (
        tx_hash,
        sender_address,
        contract_address,
        amount_staked
      ) VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;

    const result = await sql(query, [
      txHash,
      senderAddress,
      contractAddress,
      amount
    ]);

    return NextResponse.json({
      success: true,
      id: result[0].id
    });

  } catch (error) {
    console.error('Error recording stake:', error);
    
    // Check for unique constraint violation - properly type check the error
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: 'Transaction hash already exists' },
        { status: 409 }
      );
    }

    // Add more specific error handling for numeric overflow
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '22003') {
      return NextResponse.json(
        { error: 'Amount too large for storage format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to record stake transaction' },
      { status: 500 }
    );
  }
} 