/**
 * Super Admin Promotion Script
 * =============================================================
 * This script promotes an existing user to the SUPERADMIN role.
 *
 * Usage:
 *   npx ts-node scripts/promote-superadmin.ts <user-email>
 *
 * Example:
 *   npx ts-node scripts/promote-superadmin.ts admin@timessea.com
 * =============================================================
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('\n❌ Usage: npx ts-node scripts/promote-superadmin.ts <user-email>\n');
    console.error('   Example: npx ts-node scripts/promote-superadmin.ts admin@timessea.com\n');
    process.exit(1);
  }

  console.log(`\n🔍 Looking up user with email: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    console.error(`\n❌ No user found with email: ${email}`);
    console.error('   Make sure the user has logged in at least once.\n');
    process.exit(1);
  }

  console.log(`   Found: ${user.name || 'Unnamed'} (${user.email})`);
  console.log(`   Current role: ${user.role}`);

  if (user.role === 'SUPERADMIN') {
    console.log('\n✅ User is already a SUPERADMIN. No changes needed.\n');
    process.exit(0);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'SUPERADMIN' },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`\n✅ Successfully promoted to SUPERADMIN!`);
  console.log(`   Name:  ${updated.name}`);
  console.log(`   Email: ${updated.email}`);
  console.log(`   Role:  ${updated.role}`);
  console.log(`\n   The user needs to log out and log back in for the new role to take effect.\n`);
}

main()
  .catch((e) => {
    console.error('\n❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
