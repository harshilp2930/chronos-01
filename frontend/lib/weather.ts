import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchLiveWeather(siteId: string) {
  if (!API_URL) throw new Error("API URL not set");
  const url = `${API_URL}/api/v1/weather/live?site_id=${siteId}`;
  const res = await axios.get(url);
  return res.data;
}
