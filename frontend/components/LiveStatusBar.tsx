"use client";

export default function LiveStatusBar() {
  return (
    <section className="border-y border-[#122038] bg-[#070b14]">
      <div className="mx-auto max-w-7xl overflow-hidden">
        <div className="status-marquee px-4 py-3 text-sm text-slate-300 hover:[animation-play-state:paused] md:px-6">
          <span className="mr-8">🌬️ Wind: 12 km/h</span>
          <span className="mr-8">💧 Precip: 0.1 mm/h</span>
          <span className="mr-8">👁️ Visibility: 22 km</span>
          <span className="mr-8">☁️ Ceiling: 8000 ft</span>
          <span className="mr-8">⚡ Lightning: 99 km</span>
          <span className="mr-8">💧 Humidity: 70%</span>
          <span className="mr-8">🌡️ Temp: 28°C</span>
          <span className="mr-8">📍 Site: SDSC Sriharikota</span>
          <span className="mr-8">🌬️ Wind: 12 km/h</span>
          <span className="mr-8">💧 Precip: 0.1 mm/h</span>
          <span className="mr-8">👁️ Visibility: 22 km</span>
          <span className="mr-8">☁️ Ceiling: 8000 ft</span>
        </div>
      </div>
    </section>
  );
}
