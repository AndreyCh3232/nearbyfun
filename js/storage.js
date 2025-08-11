const KEY = 'nearbyfun.v1';

function _load() { try { return JSON.parse(localStorage.getItem(KEY)) || { favs: {}, ratings: {}, comments: {} }; } catch { return { favs: {}, ratings: {}, comments: {} }; } }
function _save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

export const store = {
    toggleFav(placeId) {
        const s = _load()
        s.favs[placeId] = !s.favs[placeId]
        _save(s)
        return !!s.favs[placeId]
    },
    isFav(placeId) {
        const s = _load()
        return !!s.favs[placeId]
    },
    setRating(placeId, value) {
        const s = _load()
        s.ratings[placeId] = Number(value)
        _save(s)
    },
    getRating(placeId) {
        const s = _load()
        return s.ratings[placeId] ?? null
    },
    addComment(placeId, text) {
        const s = _load()
        s.comments[placeId] ||= []
        s.comments[placeId].push({ id: crypto.randomUUID(), text, at: Date.now() });
        _save(s)
    },
    getComments(placeId) {
        const s = _load()
        return s.comments[placeId] || []
    },
    allFavIds() { return Object.entries(_load().favs).filter(([, v]) => v).map(([id]) => id); }
}