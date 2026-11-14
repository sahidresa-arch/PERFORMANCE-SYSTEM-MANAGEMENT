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

  const url = new URL(request.url);
  const query = String(url.searchParams.get('q') || '').trim();
  const apiKey =
    env?.VITE_GOOGLE_MAPS_API_KEY ||
    env?.GOOGLE_MAPS_API_KEY ||
    '';

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query parameter q' }), {
      status: 400,
      headers,
    });
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Maps API key not configured' }), {
      status: 503,
      headers,
    });
  }

  try {
    const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.googleMapsUri',
          'places.websiteUri',
          'places.nationalPhoneNumber',
          'places.primaryTypeDisplayName',
          'places.regularOpeningHours',
          'places.photos',
          'places.reviews',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'id',
        regionCode: 'ID',
        pageSize: 1,
      }),
    });

    const payload: any = await upstream.json();
    if (!upstream.ok) {
      const errStatus = payload?.error?.status || '';
      return new Response(
        JSON.stringify({
          error: payload?.error?.message || 'Places API request failed',
          status: errStatus,
          quotaExceeded: upstream.status === 429 || errStatus === 'RESOURCE_EXHAUSTED',
        }),
        { status: upstream.status, headers }
      );
    }

    const p = payload?.places?.[0];
    if (!p) {
      return new Response(JSON.stringify({ place: null }), {
        status: 200,
        headers,
      });
    }

    const photoName = p.photos?.[0]?.name || null;
    const reviews = Array.isArray(p.reviews)
      ? p.reviews.map((r: any) => ({
          authorName: r?.authorAttribution?.displayName || 'Pengguna Google',
          authorPhotoUrl: r?.authorAttribution?.photoUri || undefined,
          authorUri: r?.authorAttribution?.uri || undefined,
          rating: typeof r?.rating === 'number' ? r.rating : 0,
          relativeTime: r?.relativePublishTimeDescription || '',
          text: r?.text?.text || r?.originalText?.text || '',
        }))
      : [];

    return new Response(
      JSON.stringify({
        place: {
          id: p.id,
          displayName: p.displayName?.text || query,
          formattedAddress: p.formattedAddress || '',
          location: p.location
            ? { lat: Number(p.location.latitude), lng: Number(p.location.longitude) }
            : null,
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
          googleMapsURI: p.googleMapsUri || undefined,
          websiteURI: p.websiteUri || undefined,
          nationalPhoneNumber: p.nationalPhoneNumber || undefined,
          primaryTypeDisplayName: p.primaryTypeDisplayName?.text || undefined,
          weekdayDescriptions: Array.isArray(p.regularOpeningHours?.weekdayDescriptions)
            ? p.regularOpeningHours.weekdayDescriptions
            : undefined,
          openNow:
            typeof p.regularOpeningHours?.openNow === 'boolean'
              ? p.regularOpeningHours.openNow
              : undefined,
          photoUrl: photoName
            ? `/api/maps-place-photo?name=${encodeURIComponent(photoName)}`
            : undefined,
          reviews,
        },
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to query Places API' }),
      { status: 502, headers }
    );
  }
};
