const WOD = 'https://wod.belgingur.is';
const FORECAST_ID = 'schedule/island-8-2-da3d-noahmp/2';

exports.handler = async (event) => {
  const { lat, lon } = event.queryStringParameters || {};
  if (!lat || !lon) {
    return { statusCode: 400, body: 'lat and lon are required' };
  }
  try {
    const url = `${WOD}/api/v2/data/point/${FORECAST_ID}/latlon%2F${lat}%2C${lon}/meteogram.xml`;
    const res = await fetch(url);
    if (!res.ok) {
      return { statusCode: 502, body: `Forecast XML fetch failed: ${res.status}` };
    }
    const xml = await res.text();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',
      },
      body: xml,
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
