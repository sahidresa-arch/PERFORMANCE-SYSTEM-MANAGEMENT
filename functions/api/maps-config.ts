export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const apiKey =
    env?.VITE_GOOGLE_MAPS_API_KEY ||
    env?.GOOGLE_MAPS_API_KEY ||
    '';

  return new Response(JSON.stringify({ apiKey }), {
    status: 200,
    headers,
  });
};
