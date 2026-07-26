const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
  // ensure role exists
  let role = await prisma.role.findUnique({ where: { name: 'CASE_WORKER' } });
  if (!role) {
    role = await prisma.role.create({ data: { name: 'CASE_WORKER' } });
  }

  let user = await prisma.user.findUnique({ where: { email: 'jameskamiano28@gmail.com' } });
  if (!user) {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    user = await prisma.user.create({
      data: {
        firstName: 'James',
        lastName: 'Kamiano',
        email: 'jameskamiano28@gmail.com',
        passwordHash,
        roleId: role.id,
        isActive: true,
      }
    });
    console.log('Created user:', user.email);
  } else {
    console.log('User exists:', user.email);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
