import { ExploreClient } from "./ExploreClient";

async function getArticles() {
  try {
    const start = Date.now();
    const res = await fetch(
      "http://127.0.0.1:5000/api/articles?limit=10&offset=0&hasMedia=true",
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
