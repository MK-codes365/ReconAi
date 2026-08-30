import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.resolve(process.cwd(), '../api/data/store.json');

function getUsersFromFile(): any[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.users) ? data.users : [];
    }
  } catch (_) {}
  return [];
}

function saveUserToFile(user: any) {
  try {
    let data: any = { cases: [], auditLogs: [], journeyEvents: [], notifications: [], users: [] };
    if (fs.existsSync(STORE_PATH)) {
      data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    }
    if (!Array.isArray(data.users)) data.users = [];
    const idx = data.users.findIndex((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      data.users[idx] = user;
    } else {
      data.users.push(user);
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields (Name, Email, Password) are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role === 'ADMIN' ? 'ADMIN' : 'OPERATOR';

    // Check if user already exists
    const users = getUsersFromFile();
    const existing = users.find((u: any) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'A user with this work email already exists. Please sign in.' }, { status: 409 });
    }

    const newUser = {
      id: `usr_${cleanRole.toLowerCase()}_${Date.now().toString().slice(-5)}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash: password, // in production hash with bcrypt
      role: cleanRole,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    saveUserToFile(newUser);

    const token = `reconai_jwt_${Buffer.from(JSON.stringify({ 
      sub: newUser.id, 
      name: newUser.name, 
      email: cleanEmail, 
      role: cleanRole, 
      exp: Date.now() + 7 * 86400000 
    })).toString('base64')}`;

    return NextResponse.json({
      success: true,
      message: `Registered successfully as ${cleanRole}`,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: cleanEmail,
        role: cleanRole,
        permissions: cleanRole === 'ADMIN' 
          ? ['ALL', 'SYSTEM_CONFIG', 'MANUAL_OVERRIDE', 'POLICY_UPDATE', 'RECOVERIES_MANAGE']
          : ['VIEW_CASES', 'APPROVE_ACTIONS', 'DISPATCH_MESSAGES']
      }
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
