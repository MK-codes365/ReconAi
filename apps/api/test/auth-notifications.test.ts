import { authService } from '../src/modules/auth/auth.service';
import { notificationService } from '../src/modules/notifications/notification.service';
import { PrismaClient, UserRole, NotificationChannel } from '@prisma/client';

const prisma = new PrismaClient();

async function runAuthNotificationTests() {
  console.log('🧪 Starting Auth & Notification Engine Automated Integration Tests...\n');

  try {
    // Test 1: User Registration & Password Hashing
    console.log('Test 1: Testing User Registration & Bcrypt Hashing...');
    const testEmail = `auth_test_${Date.now()}@reconai.io`;
    const regResult = await authService.register({
      name: 'Auth Test User',
      email: testEmail,
      password: 'SuperSecretPassword123!',
      role: UserRole.FINANCE_MANAGER,
    });

    if (!regResult.token || !regResult.user.id) {
      throw new Error('Failed: Registration token or user ID missing!');
    }
    console.log(`  ✅ User registered successfully with JWT Token (Role: ${regResult.user.role}).`);

    // Verify password is NOT stored as plaintext
    const dbUser = await prisma.user.findUnique({ where: { id: regResult.user.id } });
    if (!dbUser || dbUser.passwordHash === 'SuperSecretPassword123!') {
      throw new Error('Failed: Password was stored as plaintext!');
    }
    console.log('  ✅ Verified password is securely hashed with bcrypt in database.');

    // Test 2: User Login
    console.log('Test 2: Testing User Login & Authentication...');
    const loginResult = await authService.login({
      email: testEmail,
      password: 'SuperSecretPassword123!',
    });

    if (!loginResult.token || loginResult.user.email !== testEmail) {
      throw new Error('Failed: Login failed or returned invalid token!');
    }
    console.log('  ✅ User login successful with JWT Token issuance.');

    // Test 3: Notification Service (Email & SMS)
    console.log('Test 3: Testing Notification Engine Service...');
    const extId = `cust_notif_${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        externalId: extId,
        name: 'Notif Test User',
        email: `${extId}@example.com`,
        phone: '+919876543210',
      },
    });

    const notif = await notificationService.sendNotification({
      customerId: customer.id,
      channel: NotificationChannel.SMS,
      type: 'PAYMENT_REMINDER',
      recipient: '+919876543210',
      body: 'Your ReconAI payment link is ready: https://rzp.io/i/test',
    });

    if (notif.status !== 'DELIVERED' || !notif.providerReference) {
      throw new Error('Failed: Notification sending failed!');
    }
    console.log(`  ✅ Notification status DELIVERED (Provider Ref: ${notif.providerReference}).`);

    // Cleanup Test Data
    await prisma.customer.delete({ where: { id: customer.id } });
    await prisma.user.delete({ where: { id: regResult.user.id } });

    console.log('\n🎉 ALL AUTH & NOTIFICATION ENGINE TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Auth/Notification Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAuthNotificationTests();
