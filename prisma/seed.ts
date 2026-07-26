import { PrismaClient, RoleName } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// 1. Explicitly load environment variables for this standalone process
dotenv.config();

console.log('DATABASE_URL from env:', process.env.DATABASE_URL);
console.log('PRISMA_CLIENT_ENGINE_TYPE from env:', process.env.PRISMA_CLIENT_ENGINE_TYPE);
console.log('Resolved @prisma/client path:', require.resolve('@prisma/client'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: {
      name: RoleName.ADMIN,
    },
  });

  const passwordHash = await bcrypt.hash(
    'Admin123!',
    10,
  );

  await prisma.user.upsert({
    where: {
      email: 'admin@usikimye.org',
    },
    update: {},
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@usikimye.org',
      passwordHash,
      roleId: adminRole.id,
    },
  });

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());