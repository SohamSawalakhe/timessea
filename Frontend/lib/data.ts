export type Article = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    email: string;
    picture?: string;
  };
  category: string;
  readTime: number;
  publishedAt: string;
  image: string;
  liked: boolean;
  bookmarked: boolean;
  likes: number;
};

export const categories = [
  "Trending",
  "Design",
  "Tech",
  "Business",
  "Science",
  "Culture",
];

export const articles: Article[] = [
  {
    id: "1",
    title: "Where Web 3 is Going to?",
    excerpt:
      "Exploring the future of decentralized technology and its impact on the digital landscape.",
    content: `The evolution of the internet has been nothing short of remarkable. From the static pages of Web 1.0 to the interactive platforms of Web 2.0, each iteration has fundamentally changed how we interact with digital technology.

Web 3.0 represents the next paradigm shift. Built on blockchain technology and decentralized protocols, it promises to return ownership and control to users. But where exactly is it heading?

**Decentralized Identity**

One of the most promising aspects of Web 3 is the concept of self-sovereign identity. Instead of relying on centralized platforms to verify who we are, blockchain-based identity systems allow individuals to control their own digital credentials.

**The Creator Economy**

Web 3 is reshaping how creators monetize their work. Through NFTs, smart contracts, and decentralized autonomous organizations (DAOs), artists, writers, and developers can connect directly with their audiences without intermediaries.

**Challenges Ahead**

Despite its promise, Web 3 faces significant challenges. Scalability remains a concern, with many blockchain networks struggling to handle high transaction volumes. User experience needs dramatic improvement -- most Web 3 applications are still too complex for mainstream adoption.

The regulatory landscape is also evolving. Governments worldwide are grappling with how to regulate decentralized systems while fostering innovation.

**Looking Forward**

The future of Web 3 likely lies not in replacing existing systems entirely, but in complementing them. Hybrid approaches that combine the best of centralized and decentralized technologies will probably define the next decade of internet evolution.`,
    author: {
      name: "Josh Brian",
      avatar: "JB",
      email: "josh@blogify.com",
    },
    category: "Tech",
    readTime: 5,
    publishedAt: "2 days ago",
    image: "/placeholder-web3.jpg",
    liked: false,
    bookmarked: false,
    likes: 142,
  },
  {
    id: "2",
    title: "Guiding Teams: The Power of Leadership",
    excerpt:
      "Leadership is not about authority, it's about empowering your team to achieve shared goals.",
    content: `Leadership is not about authority, it's about empowering your team to achieve shared goals. Great leaders inspire trust, cultivate collaboration, and lead by example.

Leadership begins with empathy. Understanding your team's strengths, challenges, and aspirations builds trust and creates an environment where everyone thrives. Active listening and clear communication are crucial for aligning your team's vision with organizational objectives.

**Building Trust Through Transparency**

The foundation of effective leadership lies in transparency. When team members understand the reasoning behind decisions, they're more likely to commit fully to shared goals. This doesn't mean sharing every detail, but rather creating an environment where information flows freely and people feel informed.

**Empowering Through Delegation**

Great leaders know when to step back. Delegation isn't just about distributing workload -- it's about showing trust in your team's capabilities. When people feel empowered to make decisions, they develop confidence and ownership that drives innovation.

**Collaboration is the cornerstone of effective teamwork.** Embrace diverse perspectives, encourage open dialogue, and create spaces where every voice matters. Remember, disagreements are natural -- what matters is how the team manages them constructively.

**Leading Through Change**

In today's rapidly evolving landscape, adaptability is perhaps the most crucial leadership trait. Leaders who embrace change, remain curious, and continuously learn set the tone for their entire organization.`,
    author: {
      name: "Alan Muller",
      avatar: "AM",
      email: "alan@blogify.com",
    },
    category: "Business",
    readTime: 5,
    publishedAt: "2 days ago",
    image: "/placeholder-leadership.jpg",
    liked: true,
    bookmarked: true,
    likes: 89,
  },
  {
    id: "3",
    title: "The Art of Minimalist Design",
    excerpt:
      "How stripping away the unnecessary reveals the essential beauty in design.",
    content: `Minimalism in design is more than an aesthetic choice -- it's a philosophy that puts function and clarity at the forefront of every decision.

The principle of "less is more" has guided designers for decades, but its relevance has never been greater than in today's information-saturated world.

**The Psychology of Simplicity**

Our brains are wired to prefer simplicity. When presented with too many choices or visual elements, cognitive overload sets in. Minimalist design respects the user's attention by presenting only what matters.

**White Space as a Design Element**

Perhaps the most misunderstood aspect of minimalism is white space. Far from being empty, white space is an active design element that creates hierarchy, improves readability, and guides the user's eye through content.

**Color with Purpose**

In minimalist design, every color choice carries weight. A limited palette forces designers to be intentional about each hue, creating more cohesive and memorable visual experiences.

**Typography Takes Center Stage**

When you strip away decorative elements, typography becomes the primary vehicle for visual interest. The choice of typeface, weight, spacing, and size becomes critical in establishing mood and hierarchy.`,
    author: {
      name: "Sarah Chen",
      avatar: "SC",
      email: "sarah@blogify.com",
    },
    category: "Design",
    readTime: 4,
    publishedAt: "3 days ago",
    image: "/placeholder-design.jpg",
    liked: false,
    bookmarked: false,
    likes: 215,
  },
  {
    id: "4",
    title: "Quantum Computing: A New Era",
    excerpt:
      "Understanding the revolutionary potential of quantum computing and its real-world applications.",
    content: `Quantum computing stands at the frontier of computational science, promising to solve problems that classical computers find intractable.

Unlike traditional bits that exist as either 0 or 1, quantum bits (qubits) can exist in multiple states simultaneously through a phenomenon called superposition. This fundamental difference gives quantum computers their extraordinary potential.

**Current State of the Field**

Major tech companies and research institutions are racing to build practical quantum computers. While current machines are still limited by noise and error rates, significant progress is being made in error correction and qubit stability.

**Real-World Applications**

The applications of quantum computing extend far beyond academic curiosity. Drug discovery, materials science, financial modeling, and cryptography are just a few areas where quantum advantage could transform industries.

**The Road Ahead**

While fully fault-tolerant quantum computers may still be years away, hybrid quantum-classical approaches are already delivering results. The next decade will likely see quantum computing move from laboratory curiosity to practical business tool.`,
    author: {
      name: "Dr. Elena Voss",
      avatar: "EV",
      email: "elena@blogify.com",
    },
    category: "Science",
    readTime: 6,
    publishedAt: "4 days ago",
    image: "/placeholder-quantum.jpg",
    liked: false,
    bookmarked: true,
    likes: 178,
  },
  {
    id: "5",
    title: "Remote Work Revolution",
    excerpt:
      "How distributed teams are redefining productivity and workplace culture.",
    content: `The shift to remote work has been one of the most significant workplace transformations in modern history. What began as a necessity has evolved into a preferred way of working for millions.

**Redefining Productivity**

Traditional metrics of productivity -- hours spent at a desk, visible busyness -- are giving way to outcome-based assessment. Remote work has forced organizations to focus on what truly matters: the quality and impact of work produced.

**Building Culture Remotely**

One of the biggest challenges of distributed work is maintaining company culture. Successful remote-first companies have discovered that culture isn't built through ping pong tables and free snacks, but through shared values, clear communication, and intentional connection.

**The Hybrid Future**

Most organizations are landing on a hybrid model that combines the flexibility of remote work with the benefits of in-person collaboration. The key is finding the right balance for each team and context.`,
    author: {
      name: "Marcus Johnson",
      avatar: "MJ",
      email: "marcus@blogify.com",
    },
    category: "Business",
    readTime: 4,
    publishedAt: "5 days ago",
    image: "/placeholder-remote.jpg",
    liked: true,
    bookmarked: false,
    likes: 96,
  },
  {
    id: "6",
    title: "The Rise of AI-Generated Art",
    excerpt:
      "Exploring the intersection of artificial intelligence and creative expression.",
    content: `AI-generated art has sparked one of the most heated debates in the creative world. As models become increasingly sophisticated, the line between human and machine creativity continues to blur.

**A New Creative Tool**

Rather than replacing artists, AI is emerging as a powerful creative tool. Artists who embrace AI find new ways to explore ideas, iterate faster, and push the boundaries of their imagination.

**Ethical Considerations**

The rise of AI art raises important questions about copyright, attribution, and the nature of creativity itself. As the technology matures, the industry must grapple with how to fairly compensate the human creators whose work trained these models.

**The Future of Creativity**

The most exciting possibilities lie not in AI replacing human creativity, but in augmenting it. The collaboration between human intuition and machine capability promises to unlock entirely new forms of artistic expression.`,
    author: {
      name: "Nina Patel",
      avatar: "NP",
      email: "nina@blogify.com",
    },
    category: "Culture",
    readTime: 3,
    publishedAt: "1 week ago",
    image: "/placeholder-ai-art.jpg",
    liked: false,
    bookmarked: false,
    likes: 334,
  },
];
