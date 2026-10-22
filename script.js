'use strict';

/** AURA WEATHER — JavaScript puro, sem frameworks e sem chaves de API. */
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const STORE = 'aura-weather-v1';
const BRASILIA = { name: 'Brasília', admin1: 'Distrito Federal', country: 'Brasil', latitude: -15.7939, longitude: -47.8828 };

const $ = (id) => document.getElementById(id);
const storageRead = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch { return {}; }
};
const stored = storageRead();
const state = {
  place: validatePlace(stored.place) || BRASILIA,
  favorites: Array.isArray(stored.favorites) ? stored.favorites.map(validatePlace).filter(Boolean).slice(0, 6) : [],
  unit: stored.unit === 'F' ? 'F' : 'C',
  theme: stored.theme === 'light' ? 'light' : 'dark',
  forecast: null,
  requestId: 0,
  searchController: null,
};

function validatePlace(place) {
  if (!place || typeof place !== 'object') return null;
  const latitude = Number(place.latitude), longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (typeof place.name !== 'string' || !place.name.trim()) return null;
  return { name: place.name.slice(0, 90), admin1: String(place.admin1 || '').slice(0, 90), country: String(place.country || '').slice(0, 90), latitude, longitude };
}
function saveState() {
  try { localStorage.setItem(STORE, JSON.stringify({ place: state.place, favorites: state.favorites, unit: state.unit, theme: state.theme })); }
  catch { /* Aplicação continua funcionando se o armazenamento estiver indisponível. */ }
}
function placeKey(place) { return `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}`; }
function placeTitle(place) { return [place.name, place.admin1 || place.country].filter(Boolean).join(', '); }
function formatTemp(celsius) { return Number.isFinite(celsius) ? Math.round(state.unit === 'F' ? celsius * 9 / 5 + 32 : celsius) : '—'; }
function roundOrDash(n) { return Number.isFinite(n) ? Math.round(n) : '—'; }
function setStatus(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function weatherKind(code) {
  if (code === 0) return 'clear';
  if ([1, 2].includes(code)) return 'partly';
  if (code === 3) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'partly';
}
function conditionName(code) {
  const names = { clear: 'Céu limpo', partly: 'Parcialmente nublado', cloudy: 'Nublado', fog: 'Névoa', rain: 'Chuva', snow: 'Neve', storm: 'Tempestade' };
  return names[weatherKind(code)];
}
function weatherIcon(code, day = true) {
  const kind = weatherKind(code);
  const sun = day
    ? '<circle cx="73" cy="39" r="19" fill="#ffcb70"/><g stroke="#ffcb70" stroke-width="4" stroke-linecap="round"><path d="M73 8v8M73 62v8M42 39h9M95 39h9M51 17l7 7M88 55l7 7M95 17l-7 7M58 55l-7 7"/></g>'
    : '<path d="M95 12A24 24 0 1 0 106 51 27 27 0 0 1 95 12Z" fill="#dce8ff"/><circle cx="66" cy="15" r="2" fill="#dce8ff"/>';
  const cloud = '<path d="M33 94c-15 0-25-10-25-22s10-22 22-22h4c4-17 17-28 34-28 18 0 31 12 35 28h4c13 0 23 10 23 22S116 94 102 94H33Z" fill="#f1f6ff" stroke="#b8caf4" stroke-width="2"/>';
  const smallerCloud = '<path d="M36 98c-13 0-22-9-22-20s9-19 20-19h5c4-15 16-25 32-25 16 0 28 10 32 25h4c12 0 21 9 21 19s-9 20-21 20H36Z" fill="#ebf3ff" stroke="#bfcef6" stroke-width="2"/>';
  const rain = '<g stroke="#88d8f9" stroke-width="5" stroke-linecap="round"><path d="m43 103-5 11M67 103l-5 11M91 103l-5 11"/></g>';
  const snow = '<g fill="#afddff"><circle cx="43" cy="109" r="4"/><circle cx="69" cy="111" r="4"/><circle cx="95" cy="109" r="4"/></g>';
  const lightning = '<path d="M69 96H55l-6 18 16-9-5 18 26-27H69Z" fill="#ffd179"/>';
  let contents;
  if (kind === 'clear') contents = `${sun}<circle cx="71" cy="45" r="26" fill="none" stroke="#fff0b3" stroke-opacity=".20" stroke-width="2"/>`;
  else if (kind === 'partly') contents = `<g transform="translate(18,1)">${sun}</g>${smallerCloud}`;
  else if (kind === 'rain') contents = `${cloud}${rain}`;
  else if (kind === 'snow') contents = `${cloud}${snow}`;
  else if (kind === 'storm') contents = `${cloud}${lightning}`;
  else contents = cloud;
  return `<svg viewBox="0 0 136 136" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${contents}</svg>`;
}

async function fetchJSON(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Serviço indisponível. Tente novamente em instantes.');
  const data = await response.json();
  if (data.error) throw new Error(data.reason || 'Não foi possível obter os dados.');
  return data;
}

async function loadWeather(place) {
  state.place = validatePlace(place) || BRASILIA;
  saveState();
  const id = ++state.requestId;
  $('weatherContent').classList.add('is-loading');
  $('cityName').textContent = placeTitle(state.place);
  setStatus(`Atualizando previsão para ${state.place.name}...`);
  renderFavorites();
  updateFavoriteButton();
  const url = new URL(WEATHER_API);
  url.searchParams.set('latitude', state.place.latitude);
  url.searchParams.set('longitude', state.place.longitude);
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day');
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '6');
  try {
    const forecast = await fetchJSON(url);
    if (id !== state.requestId) return;
    if (!forecast.current || !forecast.hourly || !forecast.daily) throw new Error('Dados meteorológicos incompletos.');
    state.forecast = forecast;
    renderWeather();
    setStatus('');
  } catch (error) {
    if (id !== state.requestId) return;
    state.forecast = null;
    $('temperature').textContent = '—';
    $('weatherCondition').textContent = 'Previsão indisponível';
    $('chartWrap').textContent = 'Não foi possível carregar o gráfico.';
    $('forecastDays').textContent = 'Não foi possível carregar a previsão.';
    setStatus(`${error.message || 'Falha de conexão.'} Verifique a internet e tente pesquisar novamente.`, true);
  } finally {
    if (id === state.requestId) $('weatherContent').classList.remove('is-loading');
  }
}

function formatLocalDay(dateIso, options) {
  const dateOnly = dateIso.slice(0, 10);
  const d = new Date(`${dateOnly}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', options).format(d);
}
function renderWeather() {
  const { current, daily, hourly } = state.forecast;
  $('cityName').textContent = placeTitle(state.place);
  $('temperature').textContent = formatTemp(current.temperature_2m);
  $('degree').textContent = '°';
  $('weatherCondition').textContent = conditionName(current.weather_code);
  $('feelsLike').textContent = `Sensação térmica de ${formatTemp(current.apparent_temperature)}°${state.unit}`;
  $('heroWeatherIcon').innerHTML = weatherIcon(current.weather_code, current.is_day === 1);
  $('todayMax').textContent = `↑ Máx. ${formatTemp(daily.temperature_2m_max[0])}°`;
  $('todayMin').textContent = `↓ Mín. ${formatTemp(daily.temperature_2m_min[0])}°`;
  $('lastUpdate').textContent = `Atualizado às ${current.time.slice(11,16)}`;
  $('currentDate').textContent = formatLocalDay(current.time, { day: 'numeric', month: 'long', year: 'numeric' });
  $('currentClock').textContent = `Horário local: ${current.time.slice(11,16)}`;
  $('humidity').innerHTML = `${roundOrDash(current.relative_humidity_2m)}<span>%</span>`;
  $('humidityBar').style.width = `${Math.max(0, Math.min(100, current.relative_humidity_2m || 0))}%`;
  $('wind').innerHTML = `${roundOrDash(current.wind_speed_10m)}<span>km/h</span>`;
  const index = hourly.time.findIndex(t => t >= current.time.slice(0,13) + ':00');
  const nearest = Math.max(0, index);
  const probability = hourly.precipitation_probability[nearest];
  const p = Number.isFinite(probability) ? probability : daily.precipitation_probability_max[0];
  $('rainChance').innerHTML = `${roundOrDash(p)}<span>%</span>`;
  $('rainBar').style.width = `${Math.max(0, Math.min(100, p || 0))}%`;
  const uv = daily.uv_index_max[0];
  $('uv').textContent = Number.isFinite(uv) ? uv.toFixed(1) : '—';
  $('uvLabel').textContent = !Number.isFinite(uv) ? 'Radiação ultravioleta' : uv < 3 ? 'Baixo · máximo do dia' : uv < 6 ? 'Moderado · máximo do dia' : uv < 8 ? 'Alto · máximo do dia' : 'Muito alto · máximo do dia';
  $('uvBar').style.width = `${Math.max(0, Math.min(100, (uv || 0) / 12 * 100))}%`;
  renderChart(hourly, current.time);
  renderDays(daily);
  renderTip(current, daily, p);
  updateFavoriteButton();
}

function renderChart(hourly, currentTime) {
  const start = Math.max(0, hourly.time.findIndex(t => t >= currentTime.slice(0,13) + ':00'));
  const indices = Array.from({ length: 12 }, (_, i) => start + i * 2).filter(i => i < hourly.time.length && Number.isFinite(hourly.temperature_2m[i]));
  const wrap = $('chartWrap');
  if (indices.length < 2) { wrap.textContent = 'Dados insuficientes para o gráfico.'; return; }
  const temps = indices.map(i => hourly.temperature_2m[i]);
  const low = Math.floor(Math.min(...temps) - 2), high = Math.ceil(Math.max(...temps) + 2);
  const minX = 15, maxX = 465, top = 36, bottom = 134;
  const point = (value, i) => ({ x: minX + (i / (indices.length - 1)) * (maxX - minX), y: bottom - ((value - low) / (high - low || 1)) * (bottom - top) });
  const pts = temps.map(point);
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `M ${pts[0].x} ${bottom} L ${pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L ${pts.at(-1).x} ${bottom} Z`;
  const grid = [top, (top+bottom)/2, bottom].map(y => `<line class="graph-grid" x1="0" y1="${y}" x2="480" y2="${y}"/>`).join('');
  const labels = indices.map((index,i) => {
    if (i !== 0 && i !== indices.length - 1 && i % 3 !== 0) return '';
    const x = pts[i].x.toFixed(1);
    const label = hourly.time[index].slice(11,16);
    const anchor = i === 0 ? 'start' : i === indices.length - 1 ? 'end' : 'middle';
    return `<text class="chart-label" text-anchor="${anchor}" x="${x}" y="167">${label}</text>`;
  }).join('');
  const dots = pts.map((p,i) => {
    if (i !== 0 && i !== indices.length - 1 && i % 3 !== 0) return '';
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#a6bbff" stroke="var(--surface)" stroke-width="2"/><text class="chart-temp" text-anchor="middle" x="${p.x.toFixed(1)}" y="${(p.y-11).toFixed(1)}">${formatTemp(temps[i])}°</text>`;
  }).join('');
  wrap.innerHTML = `<svg viewBox="0 0 480 185" role="img" aria-label="Gráfico de temperatura prevista para as próximas 24 horas"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#90aeff" stop-opacity=".28"/><stop offset="100%" stop-color="#90aeff" stop-opacity=".01"/></linearGradient></defs>${grid}<path class="graph-area" d="${area}"/><polyline class="graph-line" points="${polyline}"/>${dots}${labels}</svg>`;
  $('chartRange').textContent = `Temperatura em °${state.unit}`;
}

function renderDays(daily) {
  const box = $('forecastDays');
  box.replaceChildren();
  for (let i = 1; i <= 5 && i < daily.time.length; i++) {
    const date = daily.time[i], day = document.createElement('article');
    day.className = 'forecast-day';
    const dayName = document.createElement('div');
    dayName.className = 'day-label';
    dayName.textContent = formatLocalDay(date, { weekday: 'short' }).replace('.', '');
    const dateText = document.createElement('div');
    dateText.className = 'date-label';
    dateText.textContent = formatLocalDay(date, { day: '2-digit', month: 'short' }).replace('.', '');
    const ico = document.createElement('div');
    ico.className = 'day-weather';
    ico.innerHTML = weatherIcon(daily.weather_code[i]);
    const temp = document.createElement('div');
    temp.className = 'day-temp';
    temp.append(document.createTextNode(`${formatTemp(daily.temperature_2m_max[i])}°`));
    const min = document.createElement('span');
    min.textContent = ` / ${formatTemp(daily.temperature_2m_min[i])}°`;
    temp.append(min);
    const rain = document.createElement('div');
    rain.className = 'day-rain';
    rain.textContent = `☂ ${roundOrDash(daily.precipitation_probability_max[i])}%`;
    day.append(dayName, dateText, ico, temp, rain);
    box.append(day);
  }
}

function renderTip(current, daily, rainChance) {
  const uv = daily.uv_index_max[0];
  let tip;
  if (rainChance >= 60) tip = 'Há boa possibilidade de chuva nas próximas horas. Um guarda-chuva pode ser útil para seus deslocamentos.';
  else if (Number.isFinite(uv) && uv >= 6) tip = 'O índice UV máximo previsto está elevado. Para sair durante o dia, considere protetor solar e busque áreas de sombra.';
  else if (current.wind_speed_10m >= 35) tip = 'O vento pode estar forte. Fique atento a objetos soltos e às condições para atividades ao ar livre.';
  else if (current.temperature_2m >= 31) tip = 'Dia de calor! Beba água com frequência e, se possível, programe atividades externas para horários mais amenos.';
  else if (current.temperature_2m <= 14) tip = 'O tempo está fresquinho. Levar um casaco pode deixar o passeio mais confortável.';
  else tip = 'As condições estão relativamente tranquilas. Confira a previsão horária antes de planejar compromissos ao ar livre.';
  $('dailyTip').textContent = tip;
}

function updateFavoriteButton() {
  const isFavorite = state.favorites.some(p => placeKey(p) === placeKey(state.place));
  $('favoriteBtn').setAttribute('aria-pressed', String(isFavorite));
  $('favoriteBtn').setAttribute('aria-label', isFavorite ? 'Remover cidade dos favoritos' : 'Adicionar cidade aos favoritos');
  $('favoriteBtn').title = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
}
function renderFavorites() {
  const chips = $('favoriteChips');
  chips.replaceChildren();
  if (!state.favorites.length) {
    const empty = document.createElement('span'); empty.className = 'favorites-empty';
    empty.textContent = 'Toque no coração para salvar suas cidades favoritas.';
    chips.append(empty); return;
  }
  state.favorites.forEach(place => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'favorite-chip';
    btn.textContent = `⌖ ${place.name}`;
    btn.title = placeTitle(place);
    btn.addEventListener('click', () => loadWeather(place));
    chips.append(btn);
  });
}
function toggleFavorite() {
  const i = state.favorites.findIndex(p => placeKey(p) === placeKey(state.place));
  if (i >= 0) state.favorites.splice(i, 1);
  else { if (state.favorites.length >= 6) state.favorites.shift(); state.favorites.push({ ...state.place }); }
  saveState(); renderFavorites(); updateFavoriteButton();
}
function closeResults() { $('searchResults').hidden = true; $('searchResults').replaceChildren(); }
function displaySearchResults(results) {
  const container = $('searchResults'); container.replaceChildren();
  if (!results.length) {
    const empty = document.createElement('div'); empty.className = 'no-results';
    empty.textContent = 'Nenhuma cidade encontrada. Tente pesquisar por outro nome.';
    container.append(empty);
  } else {
    results.slice(0, 6).forEach(raw => {
      const place = validatePlace(raw); if (!place) return;
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'search-result';
      const name = document.createElement('span'); name.textContent = place.name;
      const location = document.createElement('small'); location.textContent = [place.admin1, place.country].filter(Boolean).join(' · ');
      btn.append(name, location);
      btn.addEventListener('click', () => { $('cityInput').value = ''; closeResults(); loadWeather(place); });
      container.append(btn);
    });
  }
  container.hidden = false;
}
async function searchCity(event) {
  if (event) event.preventDefault();
  const query = $('cityInput').value.trim();
  if (query.length < 2) { setStatus('Digite ao menos duas letras para pesquisar.', true); return; }
  if (state.searchController) state.searchController.abort();
  const controller = new AbortController(); state.searchController = controller;
  $('searchForm').querySelector('button').disabled = true;
  setStatus('Buscando cidades...');
  const url = new URL(GEOCODING_API);
  url.searchParams.set('name', query); url.searchParams.set('count', '8'); url.searchParams.set('language', 'pt'); url.searchParams.set('format', 'json');
  try {
    const response = await fetchJSON(url, controller.signal);
    if (controller.signal.aborted) return;
    displaySearchResults(response.results || []);
    setStatus('');
  } catch (error) {
    if (controller.signal.aborted) return;
    closeResults(); setStatus(`Erro ao buscar cidades: ${error.message}`, true);
  } finally {
    if (state.searchController === controller) $('searchForm').querySelector('button').disabled = false;
  }
}
function locateMe() {
  if (!navigator.geolocation) { setStatus('Seu navegador não oferece acesso à localização.', true); return; }
  setStatus('Solicitando permissão de localização...');
  $('locateBtn').disabled = true;
  navigator.geolocation.getCurrentPosition(
    position => {
      $('locateBtn').disabled = false;
      const { latitude, longitude } = position.coords;
      // Evita persistir coordenadas exatas de GPS: arredonda para ~1 km.
      loadWeather({ name: 'Minha localização', admin1: 'Local aproximado', country: '', latitude: +latitude.toFixed(2), longitude: +longitude.toFixed(2) });
    },
    () => { $('locateBtn').disabled = false; setStatus('Não foi possível acessar sua localização. Você pode pesquisar uma cidade.', true); },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
  );
}
function toggleUnit() {
  state.unit = state.unit === 'C' ? 'F' : 'C';
  $('unitLabel').textContent = `°${state.unit}`;
  $('unitAlt').textContent = `°${state.unit === 'C' ? 'F' : 'C'}`;
  saveState(); if (state.forecast) renderWeather();
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.classList.toggle('light', state.theme === 'light');
  saveState();
}

$('year').textContent = new Date().getFullYear();
$('searchForm').addEventListener('submit', searchCity);
$('favoriteBtn').addEventListener('click', toggleFavorite);
$('locateBtn').addEventListener('click', locateMe);
$('themeToggle').addEventListener('click', toggleTheme);
$('unitToggle').addEventListener('click', toggleUnit);
$('cityInput').addEventListener('keydown', event => { if (event.key === 'Escape') closeResults(); });
document.addEventListener('click', event => { if (!$('searchWrap').contains(event.target)) closeResults(); });
document.documentElement.classList.toggle('light', state.theme === 'light');
$('unitLabel').textContent = `°${state.unit}`;
$('unitAlt').textContent = `°${state.unit === 'C' ? 'F' : 'C'}`;
renderFavorites();
loadWeather(state.place);
