import { PrismaClient, Role } from './src/generated/prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Explicitly load .env from the backend directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx tsx promote-user.ts <email> <ROLE>');
    process.exit(1);
  }

  const email = args[0];
  const role = args[1].toUpperCase() as Role;

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role },
    });
    console.log(`✅ User ${user.email} successfully promoted to ${user.role}!`);
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error(`❌ Error: User with email ${email} not found.`);
    } else {
      console.error('❌ Error promoting user:', error.message || error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
