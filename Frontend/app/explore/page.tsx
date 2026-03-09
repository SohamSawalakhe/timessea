import { ExploreClient } from "./ExploreClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

async function getArticles() {
  try {
    const start = Date.now();
    const res = await fetch(
      `${API_URL}/api/articles?limit=15&offset=0&hasMedia=true`,
      {
        next: { revalidate: 0 },
      },
    );
    console.log(`Frontend fetch took ${Date.now() - start}ms`);

    if (!res.ok) {
      return [];
    }

    return res.json();
  } catch (e) {
    return [];
  }
}

export default async function ExplorePage() {
  const articles = await getArticles();

  return <ExploreClient initialArticles={articles} />;
}
