let service
export const PlacesAPI = {
    init(mapInstance) {
        service = new google.maps.places.PlacesService(mapInstance);
    },
    nearby({ location, radius, keyword, type }) {
        return new Promise((resolve, reject) => {
            service.nearbySearch({ location, radius, keyword, type: type || undefined }, (results, status) => {
                if (status !== google.maps.places.PlacesServiceStatus.OK) return reject(status)
                resolve(results || [])
            })
        })
    },
    details(placeId) {
        return new Promise((resolve, reject) => {
            service.getDetails({ placeId, fields: ['place_id', 'name', 'rating', 'user_ratings_total', 'formatted_address', 'geometry', 'opening_hours', 'formatted_phone_number', 'website', 'photos'] }, (res, status) => {
                if (status !== google.maps.places.PlacesServiceStatus.OK) return reject(status)
                resolve(res)
            })
        })
    }
}