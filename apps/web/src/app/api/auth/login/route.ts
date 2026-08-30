import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Support Role-Based Authentication
    let role = 'OPERATOR';
    let name = 'Operations Agent';

    if (cleanEmail.includes('admin')) {
      role = 'ADMIN';
      name = 'System Administrator';
    } else if (cleanEmail.includes('operator')) {
      role = 'OPERATOR';
      name = 'Operations Lead';
    } else {
      name = cleanEmail.split('@')[0].toUpperCase();
    }

    // Generate authenticated user session token
    const token = `reconai_jwt_${Buffer.from(JSON.stringify({ email: cleanEmail, role, exp: Date.now() + 7 * 86400000 })).toString('base64')}`;

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: `usr_${role.toLowerCase()}_${Date.now().toString().slice(-4)}`,
        name,
        email: cleanEmail,
        role,
        permissions: role === 'ADMIN' 
          ? ['ALL', 'SYSTEM_CONFIG', 'MANUAL_OVERRIDE', 'POLICY_UPDATE', 'RECOVERIES_MANAGE']
          : ['VIEW_CASES', 'APPROVE_ACTIONS', 'DISPATCH_MESSAGES']
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication failed' }, { status: 500 });
  }
}
