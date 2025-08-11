import { haversineMeters } from './utils.js';

let map, info

export const MapAPI = {
    map() { return map; },
    init(center = { lat: 32.0853, lng: 34.7818 }) { // תל אביב ברירת מחדל
        map = new google.maps.Map(document.getElementById('map'), {
            center, zoom: 14, mapId: 'DEMO_MAP_ID'
        })
        info = new google.maps.InfoWindow()
        return map
    },
    addMarker(place, onClick) {
        const m = new google.maps.Marker({
            map,
            position: place.geometry.location,
            title: place.name
        });
        m.addListener('click', () => onClick?.(place, m))
        return m
    },
    fitTo(points) {
        if (!points.length) return;
        const b = new google.maps.LatLngBounds()
        points.forEach(p => b.extend(p))
        map.fitBounds(b)
    },
    distance(fromLatLng, toLatLng) {
        const a = { lat: fromLatLng.lat(), lng: fromLatLng.lng() }
        const b = { lat: toLatLng.lat(), lng: toLatLng.lng() }
        return haversineMeters(a, b)
    }
}