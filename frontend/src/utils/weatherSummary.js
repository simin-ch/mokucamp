/**
 * Single-day Open-Meteo `daily` payload (one index per array).
 * @param {object | null | undefined} weather
 * @returns {{ maxTempC: number, rainMm: number, maxWindKmh: number, label: string } | null}
 */
export function summarizeForecast(weather) {
  if (!weather?.time?.length) return null
  const { precipitation_sum = [], temperature_2m_max = [], wind_speed_10m_max = [] } = weather
  const totalRain = Number(precipitation_sum[0]) || 0
  const maxTemp = Number(temperature_2m_max[0]) || 0
  const maxWind = Number(wind_speed_10m_max[0]) || 0
  return {
    maxTempC: Math.round(maxTemp * 10) / 10,
    rainMm: Math.round(totalRain * 10) / 10,
    maxWindKmh: Math.round(maxWind * 10) / 10,
    label: ratingLabel(totalRain, maxTemp, maxWind),
  }
}

function ratingLabel(totalRain, avgMax, maxWind) {
  if (totalRain < 5 && avgMax >= 12 && maxWind < 40) return 'Good'
  if (totalRain < 20 || avgMax >= 8) return 'Fair'
  return 'Poor'
}
