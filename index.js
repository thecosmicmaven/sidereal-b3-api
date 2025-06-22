// api/calculate.js (for Vercel serverless)

import swisseph from 'swisseph';

const SE_SIDEREAL = swisseph.SE_SIDEREAL;
const SIDEREAL_MODE = swisseph.SE_SIDM_LAHIRI;
const HOUSE_SYSTEM = 'P';

swisseph.setSiderealMode(SIDEREAL_MODE);

const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

function getSign(deg) {
  return signs[Math.floor(deg / 30)];
}

const chartRulers = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter'
};

// Helper to promisify swisseph callbacks
function swe_calc_ut_promise(jd, planet, flag) {
  return new Promise((resolve, reject) => {
    swisseph.swe_calc_ut(jd, planet, flag, (result) => {
      if (result.error) reject(result.error);
      else resolve(result);
    });
  });
}

function swe_houses_promise(jd, lat, lon, hs) {
  return new Promise((resolve, reject) => {
    swisseph.swe_houses(jd, lat, lon, hs, (result) => {
      if (result.error) reject(result.error);
      else resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // Allow CORS from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Handle preflight CORS request
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { year, month, day, hour, minute, longitude, latitude } = req.body;

  if ([year, month, day, hour, minute, longitude, latitude].some(v => v === undefined)) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const jd = swisseph.swe_julday(year, month, day, hour + minute / 60, swisseph.SE_GREG_CAL);
    swisseph.swe_set_sid_mode(SIDEREAL_MODE, 0, 0);

    const sunRes = await swe_calc_ut_promise(jd, swisseph.SE_SUN, SE_SIDEREAL);
    const moonRes = await swe_calc_ut_promise(jd, swisseph.SE_MOON, SE_SIDEREAL);
    const houseRes = await swe_houses_promise(jd, latitude, longitude, HOUSE_SYSTEM);

    const ascDeg = houseRes.ascendant;
    const sunDeg = sunRes.longitude;
    const moonDeg = moonRes.longitude;

    const ascSign = getSign(ascDeg);
    const sunSign = getSign(sunDeg);
    const moonSign = getSign(moonDeg);
    const chartRuler = chartRulers[ascSign];

    return res.status(200).json({
      ascendant: ascSign,
      sun: sunSign,
      moon: moonSign,
      chartRuler
    });
  } catch (error) {
    return res.status(500).json({ error: error.toString() });
  }
}
