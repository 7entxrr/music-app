// Optimized fetch with connection pooling and keep-alive
const fetchCache = new Map<string, any>();

export async function optimizedFetch(url: string, options: RequestInit = {}) {
  const cached = fetchCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < 60000) {
    return cached.response;
  }

  const response = await fetch(url, {
    ...options,
    // Enable keep-alive for connection reuse
    // @ts-ignore
    agent: undefined, // Let Node.js handle connection pooling
  });

  // Cache successful GET requests for 1 minute
  if (response.ok && (!options.method || options.method === 'GET')) {
    const clonedResponse = response.clone();
    fetchCache.set(url, {
      response: clonedResponse,
      fetchedAt: Date.now(),
    });

    // Clean up old cache entries
    if (fetchCache.size > 100) {
      const oldestKey = [...fetchCache.keys()].sort((a, b) => {
        return fetchCache.get(a).fetchedAt - fetchCache.get(b).fetchedAt;
      })[0];
      fetchCache.delete(oldestKey);
    }
  }

  return response;
}
