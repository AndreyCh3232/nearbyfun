export const debounce = (fn, wait = 350) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

export const haversineMeters = (a, b) => {
    const toRad = d => (d * Math.PI) / 180
    const R = 6371e3; // מטרים
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s))
};

export const fmtDistance = m =>
    m < 950 ? `${Math.round(m)} מ׳` : `${(m / 1000).toFixed(1)} ק"מ`;