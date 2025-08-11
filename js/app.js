import { debounce, fmtDistance } from './utils.js';
import { store } from './storage.js';
import { MapAPI } from './map.js';
import { PlacesAPI } from './places.js';

// hook לטעינת המפה אחרי ספריית גוגל
window.__NEARBYFUN_BOOT__ = () => init()

const els = {}
let state = {
    center: null, // google.maps.LatLng
    radius: 1500,
    keyword: '',
    type: '',
    results: [],
    markers: [],
    showFavs: false
}

async function init() {
    cacheEls()
    bindUI()
    const map = MapAPI.init()
    PlacesAPI.init(map)
    await useMyLocation()
    await doSearch()
}

function cacheEls() {
    els.q = document.getElementById('q')
    els.type = document.getElementById('type')
    els.radius = document.getElementById('radius')
    els.radiusLabel = document.getElementById('radiusLabel')
    els.useLocation = document.getElementById('useLocation')
    els.searchBtn = document.getElementById('searchBtn')
    els.results = document.getElementById('results')
    els.toggleFavs = document.getElementById('toggleFavs')
    els.placePanel = document.getElementById('placePanel')
    els.placeContent = document.getElementById('placeContent')
    els.closePanel = document.getElementById('closePanel')
}

function bindUI() {
    els.q.addEventListener('input', debounce(() => { state.keyword = els.q.value.trim(); doSearch(); }))
    els.type.addEventListener('change', () => { state.type = els.type.value; doSearch(); })
    els.radius.addEventListener('input', () => { state.radius = Number(els.radius.value); els.radiusLabel.textContent = state.radius; })
    els.radius.addEventListener('change', () => doSearch())
    els.searchBtn.addEventListener('click', () => doSearch())
    els.useLocation.addEventListener('click', () => useMyLocation(true))
    els.toggleFavs.addEventListener('click', () => { state.showFavs = !state.showFavs; els.toggleFavs.classList.toggle('active', state.showFavs); doSearch(); })
    els.closePanel.addEventListener('click', () => els.placePanel.classList.add('hidden'))
}

async function useMyLocation(recenter = false) {
    return new Promise(resolve => {
        if (!navigator.geolocation) return resolve()
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords
            const center = new google.maps.LatLng(latitude, longitude)
            state.center = center
            if (recenter) MapAPI.map().setCenter(center)
            resolve()
        }, () => resolve())
    })
}

async function doSearch() {
    clearMarkers()
    const map = MapAPI.map()
    const center = state.center || map.getCenter()

    let placeResults = []
    if (state.showFavs) {
        // טען פרטים למועדפים בלבד (ע"פ placeId)
        const ids = store.allFavIds()
        placeResults = await Promise.all(ids.map(id => PlacesAPI.details(id)))
    } else {
        placeResults = await PlacesAPI.nearby({
            location: center,
            radius: state.radius,
            keyword: state.keyword || undefined,
            type: state.type || undefined
        })
    }

    state.results = placeResults
    renderList()
    addMarkers(center)
}

function addMarkers(center) {
    const points = []
    state.markers = state.results.map(p => {
        points.push(p.geometry.location)
        return MapAPI.addMarker(p, (place, marker) => openPlace(place.place_id))
    });
    MapAPI.fitTo([center, ...points])
}

function clearMarkers() {
    state.markers.forEach(m => m.setMap(null))
    state.markers = []
}

function renderList() {
    els.results.innerHTML = ''
    const tpl = document.getElementById('resultItemTpl')
    const center = state.center || MapAPI.map().getCenter()

    const withDist = state.results.map(p => ({
        place: p,
        dist: MapAPI.distance(center, p.geometry.location)
    })).sort((a, b) => a.dist - b.dist)

    withDist.forEach(({ place, dist }) => {
        const li = tpl.content.firstElementChild.cloneNode(true)
        li.querySelector('.name').textContent = place.name
        li.querySelector('.address').textContent = place.vicinity || place.formatted_address || ''
        li.querySelector('.distance').textContent = fmtDistance(dist)
        li.querySelector('.rating').textContent = place.rating ? `★ ${place.rating} (${place.user_ratings_total || 0})` : 'ללא דירוג'

        const favBtn = li.querySelector('.favBtn')
        const fav = store.isFav(place.place_id)
        favBtn.textContent = fav ? '★' : '☆'

        favBtn.addEventListener('click', ev => {
            ev.stopPropagation()
            const v = store.toggleFav(place.place_id)
            favBtn.textContent = v ? '★' : '☆'
        })

        li.addEventListener('click', () => openPlace(place.place_id))
        els.results.appendChild(li)
    })
}

async function openPlace(placeId) {
    try {
        const details = await PlacesAPI.details(placeId)
        renderPlacePanel(details);
    } catch (e) {
        console.error('details failed', e)
    }
}

function renderPlacePanel(d) {
    els.placePanel.classList.remove('hidden')
    const fav = store.isFav(d.place_id)
    const userRating = store.getRating(d.place_id) ?? ''
    const comments = store.getComments(d.place_id)

    els.placeContent.innerHTML = `
    <h2>${d.name}</h2>
    <div class="panel-meta">
      <span>${d.rating ? `★ ${d.rating} (${d.user_ratings_total || 0})` : 'ללא דירוג'}</span>
      <span>${d.formatted_address || ''}</span>
    </div>
    <div class="panel-actions">
      <button id="favToggle">${fav ? 'הסר ממועדפים' : 'הוסף למועדפים'}</button>
      ${d.website ? `<a href="${d.website}" target="_blank" rel="noopener">אתר</a>` : ''}
      ${d.formatted_phone_number ? `<a href="tel:${d.formatted_phone_number}">התקשר</a>` : ''}
    </div>

    <div class="user-rating">
      <label>הדירוג שלי:
        <select id="myRating">
          <option value="">לא דרגתי</option>
          ${[1, 2, 3, 4, 5].map(v => `<option ${userRating === v ? 'selected' : ''} value="${v}">${v}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="user-comments">
      <h3>תגובות</h3>
      <textarea id="commentText" placeholder="הוסף תגובה..."></textarea>
      <button id="addComment">שלח</button>
      <div id="commentsList">
        ${comments.map(c => `<div class="comment"><small>${new Date(c.at).toLocaleString()}</small><div>${escapeHtml(c.text)}</div></div>`).join('')}
      </div>
    </div>
  `;

    document.getElementById('favToggle').addEventListener('click', () => {
        const v = store.toggleFav(d.place_id)
        document.getElementById('favToggle').textContent = v ? 'הסר ממועדפים' : 'הוסף למועדפים'
    });
    document.getElementById('myRating').addEventListener('change', (e) => {
        const val = Number(e.target.value)
        if (val) store.setRating(d.place_id, val)
    });
    document.getElementById('addComment').addEventListener('click', () => {
        const ta = document.getElementById('commentText')
        const text = ta.value.trim()
        if (!text) return;
        store.addComment(d.place_id, text)
        ta.value = ''
        openPlace(d.place_id) // רענון
    })
}

function escapeHtml(str) {
    return str.replace(/[&<>"]+/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]))
}