const express = require('express');
const cors = require('cors');
const swisseph = require('swisseph');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

app.post('/calculate', (req, res) => {
  const { year, month, day, hour, minute, longitude, latitude } = req.body;

  if ([year, month, day, hour, minute, longitude, latitude].some(v => v === undefined)) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const jd = swisseph.swe_julday(year, month, day, hour + minute / 60, swisseph.SE_GREG_CAL);

  swisseph.swe_set_sid_mode(SIDEREAL_MODE, 0, 0);

  swisseph.swe_calc_ut(jd, swisseph.SE_SUN, SE_SIDEREAL, (sunRes) => {
    if (sunRes.error) return res.status(500).json({ error: sunRes.error });

    swisseph.swe_calc_ut(jd, swisseph.SE_MOON, SE_SIDEREAL, (moonRes) => {
      if (moonRes.error) return res.status(500).json({ error: moonRes.error });

      swisseph.swe_houses(jd, latitude, longitude, HOUSE_SYSTEM, (houseRes) => {
        if (houseRes.error) return res.status(500).json({ error: houseRes.error });

        const ascDeg = houseRes.ascendant;
        const sunDeg = sunRes.longitude;
        const moonDeg = moonRes.longitude;

        const ascSign = getSign(ascDeg);
        const sunSign = getSign(sunDeg);
        const moonSign = getSign(moonDeg);
        const chartRuler = chartRulers[ascSign];

        res.json({
          ascendant: ascSign,
          sun: sunSign,
          moon: moonSign,
          chartRuler
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
