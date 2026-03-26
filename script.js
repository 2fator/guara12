// --- 1. Navegação SPA (Menu) ---

let map; // Variável global para o mapa
let envChartInstance; // Variável global para o gráfico

function switchScreen(screenId, btnElement) {
    console.log(`[Navegação] Solicitado: ${screenId}`);
    
    // Esconde todas as telas
    const screens = document.querySelectorAll('.screen');
    screens.forEach(el => el.classList.remove('active'));
    
    // Mostra a tela alvo
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        // Se for para a tela de configurações, não precisa de lógica extra
        if (screenId === 'settings') {
            console.log("Acessando informações do sistema.");
        }
        // Corrige o bug do Leaflet quando a tela muda
        if (screenId === 'home' && map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
        // Atualiza o gráfico ao entrar na tela de relatórios
        if (screenId === 'reports') {
            refreshChartData();
        }
        window.scrollTo(0, 0); // Volta para o topo da página
    } else {
        console.error("Erro: Tela não encontrada ->", screenId);
        return;
    }

    // Atualiza botões do menu
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(el => el.classList.remove('active'));
    
    if (btnElement) btnElement.classList.add('active');
}

// --- 2. Configuração do Supabase ---
// Removido para funcionar sem banco de dados externo.

// --- 3. Funções de Autenticação ---

// Verificar sessão existente ao carregar
// Não há funções de autenticação em modo offline
window.addEventListener('load', () => {
    // Garante que a tela inicial seja sempre a home
    switchScreen('home', document.getElementById('nav-home'));
});

// --- 4. Relógio e Data ---
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    
    if (clockEl) clockEl.innerText = now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    
    if (dateEl) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        dateEl.innerText = now.toLocaleDateString('pt-BR', options);
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- 5. Animações e Sensores ---

// Animação do Contador
function animateCounter(id, endValue, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;

    const startValue = 0;
    const isFloat = endValue.toString().includes('.');
    const finalVal = parseFloat(endValue);
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        
        const current = startValue + (finalVal - startValue) * ease;
        
        obj.innerText = isFloat ? current.toFixed(1) : Math.floor(current);
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerText = endValue;
        }
    };
    window.requestAnimationFrame(step);
}

// --- Busca de Dados Reais do Supabase ---
async function fetchRealData() {
    // Agora busca sempre o clima real de São Luís, já que não temos banco local
    fetchSaoLuisWeather();
}

// --- Busca Clima Real de São Luís (Open-Meteo API) ---
async function fetchSaoLuisWeather() {
    console.log("Buscando clima real de São Luís...");
    try {
        // Inicializa o switch de chuva
        const rainSwitch = document.getElementById('rain-switch');
        
        if (rainSwitch) {
            rainSwitch.addEventListener('change', function() {
                localStorage.setItem('rainOverride', this.checked);
                updateRainEffect(this.checked);
            });
            
            const savedState = localStorage.getItem('rainOverride') === 'true';
            rainSwitch.checked = savedState;
            updateRainEffect(savedState);
        } else {
            console.warn("Switch de chuva não encontrado.");
        }
    
        // Coordenadas de São Luís, MA
        const url = `https://api.open-meteo.com/v1/forecast?latitude=-2.5715&longitude=-44.3114281&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,is_day&hourly=precipitation_probability&timezone=America%2FFortaleza&forecast_days=1`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.current) {
            const temp = data.current.temperature_2m;
            const hum = data.current.relative_humidity_2m;
            const wind = data.current.wind_speed_10m;
            
            // Obtém a probabilidade de chuva para a hora atual
            const currentHour = new Date().getHours();
            const rainProb = data.hourly.precipitation_probability[currentHour];

            // Estimativa de lux baseada na cobertura de nuvens e se é dia
            const lux = data.current.is_day ? Math.floor(1200 - (data.current.cloud_cover * 8)) : 10;
            
            // Cálculo da maré sincronizado (Ciclo de ~12.4h)
            const tide = (4.6 + Math.sin((Date.now() / 7108000) + 3.5) * 0.4).toFixed(1);
            
            updateUI(temp, hum, lux, tide, wind, rainProb);
            console.log("Dados reais de São Luís carregados via satélite.");
        }
    } catch (error) {
        console.warn("Falha ao buscar clima real, iniciando simulação.");
        updateSensorsSimulation();
    }
}

// --- Log Automático no Banco de Dados (A cada 10 min) ---
function logSensorData() {
    console.log("Modo offline: Logs não estão sendo enviados para servidor externo.");
}
// Logs desativados ou redirecionados para o console

// --- Simulação de Dados dos Sensores ---
function updateSensorsSimulation() {
    // Só simula se não houver dados reais sendo buscados agora
    const temp = (27 + Math.random() * 3).toFixed(1);
    const hum = Math.floor(65 + Math.random() * 25);
    const lux = Math.floor(900 + Math.random() * 300);
    const wind = (5 + Math.random() * 15).toFixed(1);
    const rainProb = Math.floor(Math.random() * 100);
    
    // Simulação da maré de São Luís (Variação de 0.5m a 6.5m)
    // O ciclo completo dura aprox. 12.4 horas
    const tide = (4.6 + Math.sin((Date.now() / 7108000) + 3.5) * 0.4).toFixed(1);
    
    updateUI(temp, hum, lux, tide, wind, rainProb);
}

// --- Função para Baixar Relatório ---
function downloadReport() {
    const temp = document.getElementById('temp-val')?.innerText || '0';
    const hum = document.getElementById('hum-val')?.innerText || '0';
    const rainProb = document.getElementById('rain-prob-val')?.innerText || '0';
    const tide = document.getElementById('tide-val')?.innerText || '0.0';
    const wind = document.getElementById('wind-val')?.innerText || '0';
    const date = document.getElementById('date')?.innerText || '';
    const time = document.getElementById('clock')?.innerText || '';

    const content = `RELATÓRIO DE MONITORAMENTO - GUARÁ 12\n` +
                    `Data: ${date} ${time}\n` +
                    `----------------------------------\n` +
                    `Temperatura: ${temp}°C\n` +
                    `Umidade: ${hum}%\n` +
                    `Chance de Chuva: ${rainProb}%\n` +
                    `Nível da Maré: ${tide}m\n` +
                    `Velocidade do Vento: ${wind} km/h\n` +
                    `----------------------------------\n` +
                    `Localização: Estação Tamancão, São Luís - MA`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guara12_relatorio_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function updateUI(temp, hum, lux, tide, wind, rainProb) {
    const rainContainer = document.getElementById('rain-effect');
    const thunderSound = document.getElementById('thunder-sound');

    // Lógica da Chuva
    if (hum > 90 && rainContainer) {
        if (!rainContainer.classList.contains('active')) {
            if (thunderSound) {
                thunderSound.volume = 0.3;
                thunderSound.play().catch(e => console.log("Áudio requer interação"));
            }
        }
        if (rainContainer.children.length === 0) {
            for (let i = 0; i < 100; i++) {
                const drop = document.createElement('div');
                drop.classList.add('rain-drop');
                drop.style.left = Math.random() * 100 + 'vw';
                drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
                drop.style.animationDelay = Math.random() * 2 + 's';
                rainContainer.appendChild(drop);
            }
        }
        rainContainer.classList.add('active');
    } else if (rainContainer) {
        rainContainer.classList.remove('active');
    }

    animateCounter('temp-val', temp, 1500);
    animateCounter('hum-val', hum, 1500);
    animateCounter('lux-val', lux, 1500);
    
    if (tide) {
        animateCounter('tide-val', tide, 1500);
    }
    
    if (wind) {
        animateCounter('wind-val', wind, 1500);
    }

    if (rainProb !== undefined) {
        animateCounter('rain-prob-val', rainProb, 1500);
    }

    // Barras de progresso com verificação
    const tempBar = document.getElementById('temp-bar');
    if (tempBar) tempBar.style.width = Math.min((temp / 50) * 100, 100) + '%';
    
    const humBar = document.getElementById('hum-bar');
    if (humBar) humBar.style.width = hum + '%';
    
    const luxBar = document.getElementById('lux-bar');
    if (luxBar) luxBar.style.width = Math.min((lux / 2000) * 100, 100) + '%';

    const tideBar = document.getElementById('tide-bar');
    if (tideBar) tideBar.style.width = Math.min((tide / 7) * 100, 100) + '%';

    const windBar = document.getElementById('wind-bar');
    if (windBar) windBar.style.width = Math.min((wind / 60) * 100, 100) + '%';

    const rainBar = document.getElementById('rain-prob-bar');
    if (rainBar) rainBar.style.width = rainProb + '%';

    document.querySelectorAll('.card-icon').forEach(icon => {
        icon.classList.remove('pulse-animation');
        void icon.offsetWidth;
        icon.classList.add('pulse-animation');
    });
}

setInterval(fetchRealData, 10000); // Atualiza a cada 10 segundos
fetchRealData();

// --- Função Painel Lateral ---
function togglePanel() {
    const panel = document.getElementById('location-panel');
    if (panel) panel.classList.toggle('open');
}

// --- 6. Integrações Externas (Mapa e Gráfico) ---

function getUserLocation() {
    if (navigator.geolocation && map) {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 15);
            L.marker([latitude, longitude]).addTo(map)
                .bindPopup("Sua Localização").openPopup();
        }, () => alert("Não foi possível acessar sua localização."));
    }
}

if (typeof L !== 'undefined') {
    const lat = -2.5715; 
    const lng = -44.3114281;
    
    // Verifica se o container do mapa existe
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        map = L.map('map', { center: [lat, lng], zoom: 15, zoomControl: false, dragging: true });
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { attribution: '© Google', maxZoom: 19 }).addTo(map);
        
        const radarIcon = L.divIcon({
            className: 'custom-radar',
            html: '<div class="radar-container"><div class="radar-ring" style="animation-delay: 0s;"></div><div class="radar-ring" style="animation-delay: 0.6s;"></div><div class="radar-ring" style="animation-delay: 1.2s;"></div></div>',
            iconSize: [40, 40], iconAnchor: [20, 20]
        });
        L.marker([lat, lng], { icon: radarIcon, zIndexOffset: -1000 }).addTo(map);
        L.marker([lat, lng]).addTo(map).on('click', togglePanel);
    }
} else {
    console.warn("Leaflet (Mapas) não foi carregado.");
}

// --- 7. Gerenciamento do Gráfico Histórico ---

function refreshChartData() {
    if (typeof Chart === 'undefined') return;

    // Gerar dados simulados de histórico já que não temos banco de dados
    const labels = [];
    const temps = [];
    const hums = [];
    const now = new Date();

    for (let i = 19; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 3600000); // últimas 20 horas
        labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        temps.push((25 + Math.random() * 5).toFixed(1));
        hums.push(Math.floor(60 + Math.random() * 30));
    }

    if (envChartInstance) {
        envChartInstance.data.labels = labels;
        envChartInstance.data.datasets[0].data = temps;
        envChartInstance.data.datasets[1].data = hums;
        envChartInstance.update();
    } else {
        initChart(labels, temps, hums);
    }
}

function initChart(labels, temps, hums) {
    const ctxEl = document.getElementById('envChart');
    if (!ctxEl) return;

    const ctx = ctxEl.getContext('2d');
    const gradTemp = ctx.createLinearGradient(0, 0, 0, 400);
    gradTemp.addColorStop(0, 'rgba(239, 108, 0, 0.4)');
    gradTemp.addColorStop(1, 'rgba(239, 108, 0, 0)');

    const gradHum = ctx.createLinearGradient(0, 0, 0, 400);
    gradHum.addColorStop(0, 'rgba(2, 136, 209, 0.4)');
    gradHum.addColorStop(1, 'rgba(2, 136, 209, 0)');

    envChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Temp (°C)', data: temps, borderColor: '#EF6C00', backgroundColor: gradTemp, fill: true, tension: 0.4 },
                { label: 'Umidade (%)', data: hums, borderColor: '#0288D1', backgroundColor: gradHum, fill: true, tension: 0.4 }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false }, 
            plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } },
            scales: { y: { ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa' } } }
        }
    });
}

// Inicializa o gráfico com dados vazios ou carregando
window.addEventListener('load', () => {
    if (typeof Chart !== 'undefined') refreshChartData();
});
