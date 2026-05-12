const WOD = 'https://wod.belgingur.is';

exports.handler = async () => {
  try {
    const configRes = await fetch(`${WOD}/api/v2/widget/meteo/config/golf`);
    if (!configRes.ok) {
      return { statusCode: 502, body: `Config fetch failed: ${configRes.status}` };
    }
    const config = await configRes.json();
    const forecastUrl = config.forecasts[0].url
      .replace('wod-odinn.belgingur.is', 'wod.belgingur.is');

    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) {
      return { statusCode: 502, body: `Forecast fetch failed: ${forecastRes.status}` };
    }
    const forecastData = await forecastRes.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify(forecastData.stations),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
