export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;
  const url = new URL(request.url);
  const name = String(url.searchParams.get('name') || '').trim();
  const apiKey =
    env?.VITE_GOOGLE_MAPS_API_KEY ||
    env?.GOOGLE_MAPS_API_KEY ||
    '';

  if (!name || !name.startsWith('places/') || !apiKey) {
    return new Response(null, { status: 400 });
  }

  try {
    const mediaUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${encodeURIComponent(
      apiKey
    )}`;
    const upstream = await fetch(mediaUrl);
    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
};
