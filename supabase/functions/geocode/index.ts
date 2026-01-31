import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Mapbox access token not configured');
    }

    const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
    url.searchParams.set('q', query);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('types', 'place,locality,region');
    url.searchParams.set('limit', '5');
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mapbox API error:', errorText);
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    
    const suggestions = data.features?.map((feature: any) => ({
      id: feature.id,
      name: feature.properties?.name || '',
      fullName: feature.properties?.full_address || feature.properties?.place_formatted || '',
      city: feature.properties?.name || '',
      country: feature.properties?.context?.country?.name || '',
      countryCode: feature.properties?.context?.country?.country_code?.toUpperCase() || '',
    })) || [];

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geocode error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
