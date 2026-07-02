import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dealpam.com' },
    update: {},
    create: {
      email: 'admin@dealpam.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Admin créé :', admin.email);
  console.log('📧 Email    : admin@dealpam.com');
  console.log('🔑 Password : Admin@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
