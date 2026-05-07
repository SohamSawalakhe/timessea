import type { Metadata, ResolvingMetadata } from 'next';
import React from 'react';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Read route params
  const { id } = await params;

  try {
    // Fetch data
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles/${id}`);
    
    if (!res.ok) {
      return {
        title: 'Article Not Found - The Aandolan',
      };
    }
    
    const article = await res.json();
    
    return {
      title: `${article.title} - The Aandolan`,
      description: article.excerpt || "Read this article on The Aandolan",
      openGraph: {
        title: article.title,
        description: article.excerpt || "Read this article on The Aandolan",
        images: article.coverImage ? [article.coverImage] : [],
        type: 'article',
        authors: article.author?.name ? [article.author.name] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: article.excerpt || "Read this article on The Aandolan",
        images: article.coverImage ? [article.coverImage] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Article - The Aandolan',
    };
  }
}

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
