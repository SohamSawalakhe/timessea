import { PrismaClient } from '../src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
console.log(
  'Connecting to DB:',
  connectionString?.replace(/:[^:@]+@/, ':***@'),
);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create users
  const user1 = await prisma.user.upsert({
    where: { email: 'josh@blogify.com' },
    update: {},
    create: {
      email: 'josh@blogify.com',
      name: 'Josh Brian',
      picture: 'JB',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'alan@blogify.com' },
    update: {},
    create: {
      email: 'alan@blogify.com',
      name: 'Alan Muller',
      picture: 'AM',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'sarah@blogify.com' },
    update: {},
    create: {
      email: 'sarah@blogify.com',
      name: 'Sarah Chen',
      picture: 'SC',
    },
  });

  // Create articles
  const articles = [
    {
      title: 'Where Web 3 is Going to?',
      excerpt: 'Exploring the future of decentralized technology.',
      content: `The evolution of the internet has been nothing short of remarkable. From the static pages of Web 1.0 to the interactive platforms of Web 2.0, each iteration has fundamentally changed how we interact with digital technology.

Web 3.0 represents the next paradigm shift. Built on blockchain technology and decentralized protocols, it promises to return ownership and control to users.

**Decentralized Identity**

One of the most promising aspects of Web 3 is the concept of self-sovereign identity. Instead of relying on centralized platforms to verify who we are, blockchain-based identity systems allow individuals to control their own digital credentials.`,
      category: 'Tech',
      readTime: 5,
      image: '/images/reel-web3.jpg', // Note: Frontend uses local images array, but this field exists in DB now
      authorId: user1.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      likes: 142,
    },
    {
      title: 'Guiding Teams: The Power of Leadership',
      excerpt:
        "Leadership is not about authority, it's about empowering your team.",
      content: `Leadership is not about authority, it's about empowering your team to achieve shared goals. Great leaders inspire trust, cultivate collaboration, and lead by example.

**Building Trust Through Transparency**

The foundation of effective leadership lies in transparency. When team members understand the reasoning behind decisions, they're more likely to commit fully to shared goals.`,
      category: 'Business',
      readTime: 5,
      image: '/images/reel-leadership.jpg',
      authorId: user2.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      likes: 89,
    },
    {
      title: 'The Art of Minimalist Design',
      excerpt:
        'How stripping away the unnecessary reveals the essential beauty.',
      content: `Minimalism in design is more than an aesthetic choice -- it's a philosophy that puts function and clarity at the forefront of every decision.

**The Psychology of Simplicity**

Our brains are wired to prefer simplicity. When presented with too many choices or visual elements, cognitive overload sets in.`,
      category: 'Design',
      readTime: 4,
      image: '/images/reel-design.jpg',
      authorId: user3.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      likes: 215,
    },
    {
      title: 'Quantum Computing: A New Era',
      excerpt:
        'Understanding the revolutionary potential of quantum computing.',
      content: `Quantum computing stands at the frontier of computational science, promising to solve problems that classical computers find intractable.
    
    **Current State of the Field**
    
    Major tech companies and research institutions are racing to build practical quantum computers. While current machines are still limited by noise and error rates, significant progress is being made.`,
      category: 'Science',
      readTime: 6,
      image: '/images/reel-quantum.jpg',
      authorId: user1.id,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      likes: 178,
    },
    {
      title: 'Remote Work Revolution',
      excerpt: 'How distributed teams are redefining productivity.',
      content: `The shift to remote work has been one of the most significant workplace transformations in modern history. What began as a necessity has evolved into a preferred way of working for millions.
    
    **Redefining Productivity**
    
    Traditional metrics of productivity -- hours spent at a desk, visible busyness -- are giving way to outcome-based assessment.`,
      category: 'Business',
      readTime: 4,
      image: '/images/reel-remote.jpg',
      authorId: user2.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      likes: 96,
    },
    {
      title: 'The Rise of AI-Generated Art',
      excerpt:
        'Exploring the intersection of artificial intelligence and creative expression.',
      content: `AI-generated art has sparked one of the most heated debates in the creative world. As models become increasingly sophisticated, the line between human and machine creativity continues to blur.
    
    **A New Creative Tool**
    
    Rather than replacing artists, AI is emerging as a powerful creative tool. Artists who embrace AI find new ways to explore ideas, iterate faster, and push the boundaries of their imagination.`,
      category: 'Culture',
      readTime: 3,
      image: '/images/reel-ai-art.jpg',
      authorId: user3.id,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      likes: 334,
    },
  ];

  for (const article of articles) {
    await prisma.article.create({
      data: article,
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    const fs = require('fs');
    fs.writeFileSync('seed_error.txt', JSON.stringify(e, null, 2));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
