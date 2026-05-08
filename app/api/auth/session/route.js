import { NextResponse } from 'next/server'

export async function GET() {
    return NextResponse.json({
        authenticated: true,
        user: {
            username: 'ronalbis',
            role: 'ADMIN',
            name: 'Ronalbis'
        }
    })
}
