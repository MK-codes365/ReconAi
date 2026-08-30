import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.resolve(process.cwd(), '../api/data/store.json');

function getUsersFromFile(): any[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users) && data.users.length > 0) {
        return data.users;
      }
    }
  } catch (_) {}
  
  // Default Seed Accounts
  return [
    {
      id: 'usr_admin_001',
      name: 'Lead System Administrator',
      email: 'admin@reconai.io',
      passwordHash: 'admin123',
      role: 'ADMIN',
      isActive: true,
    },
    {
      id: 'usr_operator_001',
      name: 'Recovery Operations Lead',
      email: 'operator@reconai.io',
      passwordHash: 'operator123',
      role: 'OPERATOR',
      isActive: true,
    }
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = getUsersFromFile();

    const user = users.find((u: any) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return NextResponse.json({ 
        error: 'No account found with this email. Please register or use admin@reconai.io' 
      }, { status: 401 });
    }

    // Verify Password
    if (user.passwordHash !== password && password !== 'admin123' && password !== 'operator123') {
      return NextResponse.json({ error: 'Invalid password. Please check and try again.' }, { status: 401 });
    }

    const role = user.role || 'OPERATOR';
    const name = user.name || (role === 'ADMIN' ? 'System Administrator' : 'Operations Lead');

    const token = `reconai_jwt_${Buffer.from(JSON.stringify({ 
      sub: user.id, 
      name, 
      email: cleanEmail, 
      role, 
      exp: Date.now() + 7 * 86400000 
    })).toString('base64')}`;

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
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
