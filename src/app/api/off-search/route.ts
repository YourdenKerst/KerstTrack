// Server-side proxy voor Open Food Facts' search-a-licious API.
// search.openfoodfacts.org stuurt geen Access-Control-Allow-Origin voor
// externe domeinen, dus een rechtstreekse browser-fetch wordt door CORS
// geblokkeerd (bevestigd: wel access-control-allow-credentials, geen
// access-control-allow-origin in de response). Een server-naar-server fetch
// (hier, of eerder via curl) is niet aan CORS gebonden — vandaar deze proxy.

const USER_AGENT = "PersoonlijkeTrackerPWA/1.0 (single-user, niet-commercieel)";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  const limit = Number(params.get("limit")) || 15;
  if (!query) {
    return Response.json({ hits: [] });
  }

  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=${limit}&fields=code,product_name,product_name_nl,generic_name,nutriments,image_front_small_url,image_front_url,image_url`;

  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) {
      return Response.json({ hits: [] });
    }
    const data = await response.json();
    return Response.json({ hits: data.hits ?? [] });
  } catch {
    return Response.json({ hits: [] });
  }
}
