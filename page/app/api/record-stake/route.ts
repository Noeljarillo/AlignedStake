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

    // Convert amount to numeric value with 18 decimals
    const amountInWei = BigInt(parseFloat(amountStaked) * Math.pow(10, 18)).toString();

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
      amountInWei
    ]);

    return NextResponse.json({
      success: true,
      id: result[0].id
    });

  } catch (error) {
    console.error('Error recording stake:', error);
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Transaction hash already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to record stake transaction' },
      { status: 500 }
    );
  }
} 