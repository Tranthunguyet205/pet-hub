import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const adminEmail = 'admin@pethub.com';
  const defaultPassword = 'AdminPassword123@';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isDelete: false,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'System Administrator',
      phoneNumber: '0988888888',
      role: Role.ADMIN,
      isDelete: false,
    },
  });

  console.log('✅ Default Admin User created/updated successfully:');
  console.log(`   - ID: ${adminUser.id}`);
  console.log(`   - Email: ${adminUser.email}`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log(`   - Default Password: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
