/**
 * 2C = Two of Clubs (Treboles)
 */

import _ from './underscore-min.js';

const configuracion = {
    crupierPideSoft17: false,
    perfilIaCrupier: 'normal',
    sonidosActivos: true,
    volumenSonido: 0.6,
    sonidoPack: 'clasico',
    saldoInicial: 1000,
    apuestaMinima: 10,
    pausaRepartoMs: 220
};

const STORAGE_KEY = 'blackjack_estado_v1';
const HISTORIAL_MAX = 8;

let baraja = [];
let manosJugador = [[]];
let manoCrupier = [];
let turnoTerminado = false;
let splitActivo = false;
let manoActiva = 0;
let manosPlantadas = [false];
let manosDobladas = [false];
let apuestasManos = [0];
let animando = false;
let saldo = configuracion.saldoInicial;
let apuestaBase = 50;

const marcador = {
    victorias: 0,
    derrotas: 0,
    empates: 0
};

let historialManos = [];
let audioContext = null;
let audioMasterGain = null;
let audioDesbloqueado = false;
const ultimoSonidoRepartoMs = {
    jugador: 0,
    crupier: 0
};

const divCartasJugador = document.getElementById('jugador-cartas');
const divCartasCrupier = document.getElementById('crupier-cartas');
const puntosJugadorElement = document.getElementById('jugador-puntos');
const puntosCrupierElement = document.getElementById('crupier-puntos');

const btnPedirCarta = document.getElementById('pedir-carta');
const btnPlantarse = document.getElementById('plantarse');
const btnDoblar = document.getElementById('doblar');
const btnDividir = document.getElementById('dividir');
const btnReiniciar = document.getElementById('reiniciar');

const marcadorVictorias = document.getElementById('marcador-victorias');
const marcadorDerrotas = document.getElementById('marcador-derrotas');
const marcadorEmpates = document.getElementById('marcador-empates');
const soft17Toggle = document.getElementById('soft17-toggle');
const soft17Estado = document.getElementById('soft17-estado');
const iaCrupierSelect = document.getElementById('ia-crupier');
const iaEstado = document.getElementById('ia-estado');
const historialManosElement = document.getElementById('historial-manos');
const btnResetEstadisticas = document.getElementById('reset-estadisticas');
const sonidoToggle = document.getElementById('sonido-toggle');
const sonidoEstado = document.getElementById('sonido-estado');
const volumenSonidoInput = document.getElementById('volumen-sonido');
const volumenEstado = document.getElementById('volumen-estado');
const packSonidoSelect = document.getElementById('pack-sonido');
const packEstado = document.getElementById('pack-estado');
const apuestaInput = document.getElementById('apuesta-input');
const saldoEstado = document.getElementById('saldo-estado');
const apuestaEstado = document.getElementById('apuesta-estado');
const btnApuestaPlus10 = document.getElementById('apuesta-plus-10');
const btnApuestaPlus50 = document.getElementById('apuesta-plus-50');
const btnApuestaAllIn = document.getElementById('apuesta-all-in');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor));
const normalizarPackSonido = (valor) => ['clasico', 'suave', 'retro'].includes(valor) ? valor : 'clasico';
const formatearDinero = (monto) => `$${Math.round(monto)}`;

const sincronizarVolumenMaster = () => {
    if (!audioContext || !audioMasterGain) {
        return;
    }
    const objetivo = configuracion.sonidosActivos ? limitar(configuracion.volumenSonido, 0, 1) : 0;
    const ahora = audioContext.currentTime;
    audioMasterGain.gain.cancelScheduledValues(ahora);
    audioMasterGain.gain.setValueAtTime(audioMasterGain.gain.value, ahora);
    audioMasterGain.gain.linearRampToValueAtTime(objetivo, ahora + 0.05);
};

const obtenerAudioContext = async () => {
    if (!configuracion.sonidosActivos || typeof window.AudioContext === 'undefined') {
        return null;
    }

    if (!audioContext) {
        audioContext = new window.AudioContext();
        audioMasterGain = audioContext.createGain();
        audioMasterGain.gain.setValueAtTime(limitar(configuracion.volumenSonido, 0, 1), audioContext.currentTime);
        audioMasterGain.connect(audioContext.destination);
    }

    if (audioContext.state === 'suspended' && audioDesbloqueado) {
        try {
            await audioContext.resume();
        } catch {
            return null;
        }
    }

    sincronizarVolumenMaster();
    return audioContext;
};

const desbloquearAudio = async () => {
    audioDesbloqueado = true;
    const contexto = await obtenerAudioContext();
    if (!contexto) {
        return;
    }

    if (contexto.state === 'suspended') {
        try {
            await contexto.resume();
        } catch {
            // Ignore: some browsers may block this until a different gesture.
        }
    }

    sincronizarVolumenMaster();
};

const reproducirTono = async ({ frecuencia, duracion = 0.08, tipo = 'sine', volumen = 0.03 }) => {
    const contexto = await obtenerAudioContext();
    if (!contexto) {
        return;
    }

    const volumenFinal = volumen;
    if (volumenFinal <= 0) {
        return;
    }

    const ahora = contexto.currentTime;
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();

    oscilador.type = tipo;
    oscilador.frequency.setValueAtTime(frecuencia, ahora);

    ganancia.gain.setValueAtTime(0.0001, ahora);
    ganancia.gain.exponentialRampToValueAtTime(volumenFinal, ahora + 0.01);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + duracion);

    oscilador.connect(ganancia);
    ganancia.connect(audioMasterGain || contexto.destination);

    oscilador.start(ahora);
    oscilador.stop(ahora + duracion + 0.02);
};

const sonidoReparto = (origen = 'jugador') => {
    const ahora = performance.now();
    const ultimaMarca = ultimoSonidoRepartoMs[origen] || 0;
    if (ahora - ultimaMarca < 85) {
        return;
    }
    ultimoSonidoRepartoMs[origen] = ahora;

    const pack = normalizarPackSonido(configuracion.sonidoPack);
    let frecuenciaBase = origen === 'crupier' ? 360 : 430;
    let tipo = origen === 'crupier' ? 'sine' : 'triangle';
    let volumen = 0.02;

    if (pack === 'suave') {
        frecuenciaBase = origen === 'crupier' ? 320 : 390;
        tipo = 'sine';
        volumen = 0.015;
    } else if (pack === 'retro') {
        frecuenciaBase = origen === 'crupier' ? 280 : 520;
        tipo = 'square';
        volumen = 0.018;
    }

    void reproducirTono({ frecuencia: frecuenciaBase, duracion: 0.05, tipo, volumen });
};

const sonidoVictoria = () => {
    const pack = normalizarPackSonido(configuracion.sonidoPack);
    if (pack === 'suave') {
        void reproducirTono({ frecuencia: 494, duracion: 0.1, tipo: 'sine', volumen: 0.024 });
        setTimeout(() => void reproducirTono({ frecuencia: 587, duracion: 0.1, tipo: 'sine', volumen: 0.024 }), 100);
        setTimeout(() => void reproducirTono({ frecuencia: 659, duracion: 0.12, tipo: 'sine', volumen: 0.024 }), 200);
        return;
    }
    if (pack === 'retro') {
        void reproducirTono({ frecuencia: 660, duracion: 0.06, tipo: 'square', volumen: 0.028 });
        setTimeout(() => void reproducirTono({ frecuencia: 880, duracion: 0.06, tipo: 'square', volumen: 0.028 }), 80);
        setTimeout(() => void reproducirTono({ frecuencia: 990, duracion: 0.08, tipo: 'square', volumen: 0.028 }), 160);
        return;
    }
    void reproducirTono({ frecuencia: 523, duracion: 0.08, tipo: 'sine', volumen: 0.03 });
    setTimeout(() => void reproducirTono({ frecuencia: 659, duracion: 0.08, tipo: 'sine', volumen: 0.03 }), 90);
    setTimeout(() => void reproducirTono({ frecuencia: 784, duracion: 0.1, tipo: 'sine', volumen: 0.03 }), 180);
};

const sonidoDerrota = () => {
    const pack = normalizarPackSonido(configuracion.sonidoPack);
    if (pack === 'suave') {
        void reproducirTono({ frecuencia: 370, duracion: 0.12, tipo: 'sine', volumen: 0.02 });
        setTimeout(() => void reproducirTono({ frecuencia: 311, duracion: 0.14, tipo: 'sine', volumen: 0.02 }), 110);
        return;
    }
    if (pack === 'retro') {
        void reproducirTono({ frecuencia: 300, duracion: 0.08, tipo: 'square', volumen: 0.024 });
        setTimeout(() => void reproducirTono({ frecuencia: 220, duracion: 0.1, tipo: 'square', volumen: 0.024 }), 90);
        return;
    }
    void reproducirTono({ frecuencia: 392, duracion: 0.1, tipo: 'sawtooth', volumen: 0.025 });
    setTimeout(() => void reproducirTono({ frecuencia: 330, duracion: 0.12, tipo: 'sawtooth', volumen: 0.025 }), 100);
};

const sonidoEmpate = () => {
    const pack = normalizarPackSonido(configuracion.sonidoPack);
    if (pack === 'suave') {
        void reproducirTono({ frecuencia: 460, duracion: 0.08, tipo: 'sine', volumen: 0.018 });
        setTimeout(() => void reproducirTono({ frecuencia: 460, duracion: 0.08, tipo: 'sine', volumen: 0.018 }), 100);
        return;
    }
    if (pack === 'retro') {
        void reproducirTono({ frecuencia: 510, duracion: 0.06, tipo: 'square', volumen: 0.02 });
        setTimeout(() => void reproducirTono({ frecuencia: 510, duracion: 0.06, tipo: 'square', volumen: 0.02 }), 85);
        return;
    }
    void reproducirTono({ frecuencia: 494, duracion: 0.08, tipo: 'triangle', volumen: 0.02 });
    setTimeout(() => void reproducirTono({ frecuencia: 494, duracion: 0.08, tipo: 'triangle', volumen: 0.02 }), 90);
};

const guardarEstadoSesion = () => {
    const estado = {
        marcador,
        banca: {
            saldo,
            apuestaBase
        },
        configuracion: {
            crupierPideSoft17: configuracion.crupierPideSoft17,
            perfilIaCrupier: configuracion.perfilIaCrupier,
            sonidosActivos: configuracion.sonidosActivos,
            volumenSonido: configuracion.volumenSonido,
            sonidoPack: configuracion.sonidoPack
        },
        historialManos
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
};

const cargarEstadoSesion = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return;
    }

    try {
        const estado = JSON.parse(raw);
        if (estado.marcador) {
            marcador.victorias = Number(estado.marcador.victorias || 0);
            marcador.derrotas = Number(estado.marcador.derrotas || 0);
            marcador.empates = Number(estado.marcador.empates || 0);
        }

        if (estado.banca) {
            saldo = Math.max(0, Number(estado.banca.saldo || configuracion.saldoInicial));
            apuestaBase = Math.max(configuracion.apuestaMinima, Number(estado.banca.apuestaBase || 50));
        }

        if (estado.configuracion) {
            configuracion.crupierPideSoft17 = Boolean(estado.configuracion.crupierPideSoft17);
            if (['facil', 'normal', 'dificil'].includes(estado.configuracion.perfilIaCrupier)) {
                configuracion.perfilIaCrupier = estado.configuracion.perfilIaCrupier;
            }
            if (typeof estado.configuracion.sonidosActivos === 'boolean') {
                configuracion.sonidosActivos = estado.configuracion.sonidosActivos;
            }
            if (typeof estado.configuracion.volumenSonido === 'number') {
                configuracion.volumenSonido = limitar(estado.configuracion.volumenSonido, 0, 1);
            }
            configuracion.sonidoPack = normalizarPackSonido(estado.configuracion.sonidoPack);
        }

        if (Array.isArray(estado.historialManos)) {
            historialManos = estado.historialManos.slice(0, HISTORIAL_MAX);
        }
    } catch {
        localStorage.removeItem(STORAGE_KEY);
    }
};

const crearBaraja = () => {
    const tipos = ['C', 'D', 'H', 'S'];
    const especiales = ['A', 'J', 'Q', 'K'];
    baraja = [];

    for (let i = 2; i <= 10; i++) {
        for (const tipo of tipos) {
            baraja.push(i + tipo);
        }
    }

    for (const tipo of tipos) {
        for (const esp of especiales) {
            baraja.push(esp + tipo);
        }
    }

    baraja = _.shuffle(baraja);
    return baraja;
};

const pedirCarta = () => {
    if (baraja.length === 0) {
        throw new Error('No hay cartas en la baraja');
    }
    return baraja.pop();
};

const valorCartaBase = (carta) => {
    const valor = carta.substring(0, carta.length - 1);
    if (isNaN(valor)) {
        return valor === 'A' ? 11 : 10;
    }
    return parseInt(valor, 10);
};

const puedeDividirMano = (mano) => {
    if (!mano || mano.length !== 2) {
        return false;
    }
    return valorCartaBase(mano[0]) === valorCartaBase(mano[1]);
};

const calcularDetalleMano = (mano) => {
    let total = 0;
    let ases = 0;

    for (const carta of mano) {
        const valor = carta.substring(0, carta.length - 1);
        if (valor === 'A') {
            ases += 1;
            total += 11;
        } else if (isNaN(valor)) {
            total += 10;
        } else {
            total += parseInt(valor, 10);
        }
    }

    let asesAjustados = 0;
    while (total > 21 && asesAjustados < ases) {
        total -= 10;
        asesAjustados += 1;
    }

    const esSoft = ases > asesAjustados && total <= 21;
    return { total, esSoft };
};

const calcularPuntosMano = (mano) => calcularDetalleMano(mano).total;

const crearCartaImg = (carta) => {
    const imgCarta = document.createElement('img');
    imgCarta.src = `assets/cartas/${carta}.png`;
    imgCarta.className = 'carta carta-reveal';
    imgCarta.alt = `Carta ${carta}`;
    return imgCarta;
};

const renderManoCrupier = () => {
    divCartasCrupier.innerHTML = '';

    const bloqueMano = document.createElement('div');
    bloqueMano.className = 'mano-bloque mano-bloque--crupier';

    const titulo = document.createElement('p');
    titulo.className = 'mano-etiqueta';
    titulo.textContent = 'Mano Crupier';
    bloqueMano.appendChild(titulo);

    const cartasContenedor = document.createElement('div');
    cartasContenedor.className = 'mano-cartas';
    for (const carta of manoCrupier) {
        cartasContenedor.appendChild(crearCartaImg(carta));
    }

    bloqueMano.appendChild(cartasContenedor);
    divCartasCrupier.appendChild(bloqueMano);
};

const renderManosJugador = () => {
    divCartasJugador.innerHTML = '';

    for (let i = 0; i < manosJugador.length; i++) {
        const bloqueMano = document.createElement('div');
        bloqueMano.className = `mano-bloque ${i === manoActiva && !turnoTerminado ? 'mano-activa' : ''}`.trim();

        const titulo = document.createElement('p');
        titulo.className = 'mano-etiqueta';
        titulo.textContent = splitActivo ? `Mano ${i + 1}` : 'Tu mano';
        bloqueMano.appendChild(titulo);

        const cartasContenedor = document.createElement('div');
        cartasContenedor.className = 'mano-cartas';
        for (const carta of manosJugador[i]) {
            cartasContenedor.appendChild(crearCartaImg(carta));
        }
        bloqueMano.appendChild(cartasContenedor);

        divCartasJugador.appendChild(bloqueMano);
    }
};

const actualizarPuntos = () => {
    const puntosManos = manosJugador.map((mano) => calcularPuntosMano(mano));
    const puntosCrupier = calcularPuntosMano(manoCrupier);
    const apuestaActiva = apuestasManos.reduce((ac, monto) => ac + monto, 0);

    if (splitActivo) {
        puntosJugadorElement.textContent = `Mano 1: ${puntosManos[0]} | Mano 2: ${puntosManos[1]} | Activa: ${manoActiva + 1}`;
    } else {
        puntosJugadorElement.textContent = `Puntos: ${puntosManos[0]}`;
    }

    puntosCrupierElement.textContent = `Puntos: ${puntosCrupier}`;

    if (apuestaEstado) {
        apuestaEstado.textContent = `Apuesta activa: ${formatearDinero(apuestaActiva)}`;
    }
};

const actualizarEstadoBanca = () => {
    if (saldoEstado) {
        saldoEstado.textContent = `Saldo: ${formatearDinero(saldo)}`;
    }

    if (apuestaInput) {
        apuestaInput.min = String(configuracion.apuestaMinima);
        apuestaInput.step = '10';
        apuestaInput.value = String(Math.max(configuracion.apuestaMinima, Math.round(apuestaBase)));
    }

    const apuestaActiva = apuestasManos.reduce((ac, monto) => ac + monto, 0);
    if (apuestaEstado) {
        apuestaEstado.textContent = `Apuesta activa: ${formatearDinero(apuestaActiva)}`;
    }
};

const leerApuestaDeseada = () => {
    const valor = apuestaInput ? Number(apuestaInput.value) : apuestaBase;
    return Math.floor(valor);
};

const actualizarControlesApuestaRapida = () => {
    const saldoDisponible = Math.floor(saldo);
    const puedeApostar = saldoDisponible >= configuracion.apuestaMinima;

    if (btnApuestaPlus10) {
        btnApuestaPlus10.disabled = !puedeApostar;
    }
    if (btnApuestaPlus50) {
        btnApuestaPlus50.disabled = !puedeApostar;
    }
    if (btnApuestaAllIn) {
        btnApuestaAllIn.disabled = !puedeApostar;
    }
};

const fijarApuestaBase = (nuevaApuesta) => {
    const saldoDisponible = Math.floor(saldo);
    const tope = Math.max(configuracion.apuestaMinima, saldoDisponible);
    const limpia = Math.floor(nuevaApuesta / 10) * 10;
    const ajustada = limitar(limpia, configuracion.apuestaMinima, tope);
    apuestaBase = ajustada;
    if (apuestaInput) {
        apuestaInput.value = String(ajustada);
    }
    actualizarEstadoBanca();
    guardarEstadoSesion();
};

const validarApuesta = (monto) => {
    if (!Number.isFinite(monto)) {
        return 'Ingresa una apuesta valida.';
    }
    if (monto < configuracion.apuestaMinima) {
        return `La apuesta minima es ${formatearDinero(configuracion.apuestaMinima)}.`;
    }
    if (monto > saldo) {
        return 'No tienes saldo suficiente para esa apuesta.';
    }
    return null;
};

const calcularRetornoApuesta = (resultado, monto, blackjackNatural = false) => {
    if (resultado.startsWith('Perdio')) {
        return 0;
    }
    if (resultado === 'Empate') {
        return monto;
    }
    if (blackjackNatural) {
        return monto * 2.5;
    }
    return monto * 2;
};

const actualizarMarcador = () => {
    if (!marcadorVictorias || !marcadorDerrotas || !marcadorEmpates) {
        return;
    }
    marcadorVictorias.textContent = String(marcador.victorias);
    marcadorDerrotas.textContent = String(marcador.derrotas);
    marcadorEmpates.textContent = String(marcador.empates);
};

const actualizarHistorial = () => {
    if (!historialManosElement) {
        return;
    }

    historialManosElement.innerHTML = '';

    if (historialManos.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Sin rondas registradas aun.';
        historialManosElement.appendChild(li);
        return;
    }

    for (const item of historialManos) {
        const li = document.createElement('li');
        li.textContent = item;
        historialManosElement.appendChild(li);
    }
};

const actualizarEstadoSoft17 = () => {
    if (!soft17Estado) {
        return;
    }
    soft17Estado.textContent = configuracion.crupierPideSoft17
        ? 'Modo actual: Crupier pide carta en soft 17.'
        : 'Modo actual: Crupier se planta en soft 17.';
};

const actualizarEstadoIa = () => {
    if (iaEstado) {
        const nombres = {
            facil: 'Facil',
            normal: 'Normal',
            dificil: 'Dificil'
        };
        iaEstado.textContent = `IA actual: ${nombres[configuracion.perfilIaCrupier]}.`;
    }

    if (iaCrupierSelect) {
        iaCrupierSelect.value = configuracion.perfilIaCrupier;
    }
};

const actualizarEstadoSonido = () => {
    if (sonidoEstado) {
        sonidoEstado.textContent = configuracion.sonidosActivos
            ? 'Sonido: Activado.'
            : 'Sonido: Desactivado.';
    }

    if (sonidoToggle) {
        sonidoToggle.checked = configuracion.sonidosActivos;
    }

    const porcentaje = Math.round(configuracion.volumenSonido * 100);
    if (volumenEstado) {
        volumenEstado.textContent = `Volumen: ${porcentaje}%.`;
    }

    actualizarControlesApuestaRapida();

    if (volumenSonidoInput) {
        volumenSonidoInput.value = String(porcentaje);
        volumenSonidoInput.disabled = !configuracion.sonidosActivos;
    }

    const nombresPack = {
        clasico: 'Clasico',
        suave: 'Suave',
        retro: 'Retro'
    };

    if (packEstado) {
        packEstado.textContent = `Pack: ${nombresPack[normalizarPackSonido(configuracion.sonidoPack)]}.`;
    }

    if (packSonidoSelect) {
        packSonidoSelect.value = normalizarPackSonido(configuracion.sonidoPack);
        packSonidoSelect.disabled = !configuracion.sonidosActivos;
    }

    sincronizarVolumenMaster();
};

const asegurarModal = () => {
    let overlay = document.getElementById('resultado-overlay');
    if (overlay) {
        return overlay;
    }

    overlay = document.createElement('div');
    overlay.id = 'resultado-overlay';
    overlay.className = 'resultado-overlay oculto';
    overlay.innerHTML = `
        <div class="resultado-modal" role="dialog" aria-modal="true" aria-labelledby="resultado-titulo">
            <p id="resultado-etiqueta" class="resultado-etiqueta"></p>
            <h3 id="resultado-titulo" class="resultado-titulo"></h3>
            <p id="resultado-texto" class="resultado-texto"></p>
            <div class="resultado-marcador">
                <span id="resultado-jugador"></span>
                <span id="resultado-crupier"></span>
            </div>
            <button id="resultado-cerrar" class="btn btn-primary" type="button">Jugar otra mano</button>
        </div>
    `;

    document.body.appendChild(overlay);

    const btnCerrar = document.getElementById('resultado-cerrar');
    btnCerrar.addEventListener('click', () => {
        overlay.classList.add('oculto');
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            overlay.classList.add('oculto');
        }
    });

    return overlay;
};

const mostrarResultadoBonito = ({ etiqueta, titulo, texto }) => {
    const overlay = asegurarModal();
    const puntosJugador = manosJugador.map((mano) => calcularPuntosMano(mano));
    const puntosCrupier = calcularPuntosMano(manoCrupier);

    document.getElementById('resultado-etiqueta').textContent = etiqueta;
    document.getElementById('resultado-titulo').textContent = titulo;
    document.getElementById('resultado-texto').textContent = texto;

    if (splitActivo) {
        document.getElementById('resultado-jugador').textContent = `Jugador: Mano 1 (${puntosJugador[0]}) / Mano 2 (${puntosJugador[1]})`;
    } else {
        document.getElementById('resultado-jugador').textContent = `Jugador: ${puntosJugador[0]}`;
    }

    document.getElementById('resultado-crupier').textContent = `Crupier: ${puntosCrupier}`;
    overlay.classList.remove('oculto');
};

const establecerControlesDeshabilitados = (deshabilitado) => {
    btnPedirCarta.disabled = deshabilitado;
    btnPlantarse.disabled = deshabilitado;
    if (btnDoblar) {
        btnDoblar.disabled = deshabilitado;
    }
    if (btnDividir) {
        btnDividir.disabled = deshabilitado;
    }
};

const deshabilitarBotones = () => {
    establecerControlesDeshabilitados(true);
};

const refrescarBotonesAccion = () => {
    if (animando || turnoTerminado) {
        deshabilitarBotones();
        btnReiniciar.disabled = animando;
        return;
    }

    btnPedirCarta.disabled = false;
    btnPlantarse.disabled = false;

    const manoActual = manosJugador[manoActiva];
    const puntosActuales = calcularPuntosMano(manoActual);
    const puedeDoblarActual = !manosPlantadas[manoActiva] && manoActual.length === 2 && puntosActuales <= 21;
    btnDoblar.disabled = !puedeDoblarActual;

    if (btnDividir) {
        const habilitarDividir = !splitActivo && manoActiva === 0 && puedeDividirMano(manoActual);
        btnDividir.disabled = !habilitarDividir;
    }

    btnReiniciar.disabled = false;
};

const registrarResultado = (resultado) => {
    if (resultado.startsWith('Gano')) {
        marcador.victorias += 1;
    } else if (resultado === 'Empate') {
        marcador.empates += 1;
    } else {
        marcador.derrotas += 1;
    }
    actualizarMarcador();
    guardarEstadoSesion();
};

const agregarAHistorial = (texto) => {
    const marcaTiempo = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    historialManos.unshift(`${marcaTiempo} - ${texto}`);
    historialManos = historialManos.slice(0, HISTORIAL_MAX);
    actualizarHistorial();
    guardarEstadoSesion();
};

const repartirCartaJugador = async (indiceMano) => {
    manosJugador[indiceMano].push(pedirCarta());
    renderManosJugador();
    actualizarPuntos();
    sonidoReparto('jugador');
    await esperar(configuracion.pausaRepartoMs);
};

const repartirCartaCrupier = async () => {
    manoCrupier.push(pedirCarta());
    renderManoCrupier();
    actualizarPuntos();
    sonidoReparto('crupier');
    await esperar(configuracion.pausaRepartoMs);
};

const debePedirCrupier = () => {
    const detalleCrupier = calcularDetalleMano(manoCrupier);

    if (configuracion.perfilIaCrupier === 'facil') {
        return detalleCrupier.total < 16;
    }

    const puntosJugadoresActivos = manosJugador
        .map((mano) => calcularPuntosMano(mano))
        .filter((puntos) => puntos <= 21);

    const mejorJugador = puntosJugadoresActivos.length > 0 ? Math.max(...puntosJugadoresActivos) : 0;

    if (configuracion.perfilIaCrupier === 'dificil') {
        if (detalleCrupier.total < 17) {
            return true;
        }
        if (detalleCrupier.total < 18 && detalleCrupier.total < mejorJugador) {
            return true;
        }
        if (detalleCrupier.total === 17 && detalleCrupier.esSoft) {
            return true;
        }
        return false;
    }

    if (detalleCrupier.total < 17) {
        return true;
    }

    if (detalleCrupier.total === 17 && detalleCrupier.esSoft) {
        return configuracion.crupierPideSoft17;
    }

    return false;
};

const turnoCrupier = async () => {
    animando = true;
    refrescarBotonesAccion();

    while (debePedirCrupier()) {
        await repartirCartaCrupier();
    }

    animando = false;
    actualizarPuntos();
    refrescarBotonesAccion();
};

const resolverResultadoMano = (puntosJugador, puntosCrupier, doblada = false) => {
    if (puntosJugador > 21) {
        return doblada ? 'Perdio (doblada y bust)' : 'Perdio (bust)';
    }
    if (puntosCrupier > 21) {
        return doblada ? 'Gano (doblada)' : 'Gano';
    }
    if (puntosJugador > puntosCrupier) {
        return doblada ? 'Gano (doblada)' : 'Gano';
    }
    if (puntosJugador < puntosCrupier) {
        return doblada ? 'Perdio (doblada)' : 'Perdio';
    }
    return 'Empate';
};

const determinarGanador = () => {
    const puntosManos = manosJugador.map((mano) => calcularPuntosMano(mano));
    const puntosCrupier = calcularPuntosMano(manoCrupier);

    let etiqueta = 'RESULTADO';
    let titulo = 'Ronda cerrada';
    let texto = '';

    if (!splitActivo) {
        const resultado = resolverResultadoMano(puntosManos[0], puntosCrupier, manosDobladas[0]);
        registrarResultado(resultado);
        const blackjackNatural = manosJugador[0].length === 2 && puntosManos[0] === 21 && resultado.startsWith('Gano');
        const retorno = calcularRetornoApuesta(resultado, apuestasManos[0], blackjackNatural);
        saldo += retorno;
        guardarEstadoSesion();
        actualizarEstadoBanca();

        if (resultado.startsWith('Gano')) {
            etiqueta = 'VICTORIA';
            titulo = resultado.includes('doblada') ? 'Doblada ganadora' : 'Mejor mano';
            texto = 'Tu total supera al del crupier en esta ronda.';
        } else if (resultado.startsWith('Perdio')) {
            etiqueta = 'DERROTA';
            titulo = resultado.includes('bust') ? 'Te pasaste' : 'Crupier por encima';
            texto = 'Esta ronda fue para el crupier. Vamos por la siguiente.';
        } else {
            etiqueta = 'EMPATE';
            titulo = 'Push';
            texto = 'Misma puntuacion para ambos. Nadie pierde esta mano.';
        }

        agregarAHistorial(`Ronda simple: ${resultado}. Jugador ${puntosManos[0]} vs Crupier ${puntosCrupier}. Retorno ${formatearDinero(retorno)}.`);

        if (resultado.startsWith('Gano')) {
            sonidoVictoria();
        } else if (resultado.startsWith('Perdio')) {
            sonidoDerrota();
        } else {
            sonidoEmpate();
        }
    } else {
        const r1 = resolverResultadoMano(puntosManos[0], puntosCrupier, manosDobladas[0]);
        const r2 = resolverResultadoMano(puntosManos[1], puntosCrupier, manosDobladas[1]);

        registrarResultado(r1);
        registrarResultado(r2);

        if (r1.startsWith('Gano') && r2.startsWith('Gano')) {
            etiqueta = 'VICTORIA TOTAL';
            titulo = 'Split perfecto';
        } else if (r1.startsWith('Perdio') && r2.startsWith('Perdio')) {
            etiqueta = 'DERROTA TOTAL';
            titulo = 'Split complicado';
        } else {
            etiqueta = 'MIXTO';
            titulo = 'Split dividido';
        }

        texto = `Mano 1: ${r1}. Mano 2: ${r2}.`;

        const retorno1 = calcularRetornoApuesta(r1, apuestasManos[0], false);
        const retorno2 = calcularRetornoApuesta(r2, apuestasManos[1], false);
        const retornoTotal = retorno1 + retorno2;
        saldo += retornoTotal;
        guardarEstadoSesion();
        actualizarEstadoBanca();
        agregarAHistorial(`Split: M1 ${r1} (${puntosManos[0]}), M2 ${r2} (${puntosManos[1]}), Crupier ${puntosCrupier}. Retorno ${formatearDinero(retornoTotal)}.`);

        const ganadas = [r1, r2].filter((r) => r.startsWith('Gano')).length;
        const perdidas = [r1, r2].filter((r) => r.startsWith('Perdio')).length;
        if (ganadas > perdidas) {
            sonidoVictoria();
        } else if (perdidas > ganadas) {
            sonidoDerrota();
        } else {
            sonidoEmpate();
        }
    }

    mostrarResultadoBonito({ etiqueta, titulo, texto });
};

const avanzarManoOSeguir = async () => {
    if (!splitActivo) {
        turnoTerminado = true;
        deshabilitarBotones();
        await esperar(220);
        await turnoCrupier();
        determinarGanador();
        return;
    }

    if (manoActiva === 0 && !manosPlantadas[1]) {
        manoActiva = 1;
        actualizarPuntos();
        renderManosJugador();
        refrescarBotonesAccion();
        return;
    }

    turnoTerminado = true;
    deshabilitarBotones();
    await esperar(220);
    await turnoCrupier();
    determinarGanador();
};

const iniciarJuego = async () => {
    if (animando) {
        return;
    }

    baraja = [];
    manosJugador = [[]];
    manoCrupier = [];
    turnoTerminado = false;
    splitActivo = false;
    manoActiva = 0;
    manosPlantadas = [false];
    manosDobladas = [false];
    apuestasManos = [0];

    divCartasJugador.innerHTML = '';
    divCartasCrupier.innerHTML = '';

    const apuestaSolicitada = leerApuestaDeseada();
    const errorApuesta = validarApuesta(apuestaSolicitada);
    if (errorApuesta) {
        turnoTerminado = true;
        actualizarEstadoBanca();
        mostrarResultadoBonito({
            etiqueta: 'APUESTA INVALIDA',
            titulo: 'No se pudo iniciar la mano',
            texto: errorApuesta
        });
        refrescarBotonesAccion();
        return;
    }

    apuestaBase = apuestaSolicitada;
    saldo -= apuestaBase;
    apuestasManos = [apuestaBase];
    guardarEstadoSesion();
    actualizarEstadoBanca();

    crearBaraja();

    animando = true;
    deshabilitarBotones();
    btnReiniciar.disabled = true;

    await repartirCartaJugador(0);
    await repartirCartaCrupier();
    await repartirCartaJugador(0);

    animando = false;
    btnReiniciar.disabled = false;
    refrescarBotonesAccion();

    if (calcularPuntosMano(manosJugador[0]) === 21) {
        turnoTerminado = true;
        deshabilitarBotones();
        await esperar(250);
        registrarResultado('Gano');
        const retornoBlackjack = calcularRetornoApuesta('Gano', apuestasManos[0], true);
        saldo += retornoBlackjack;
        guardarEstadoSesion();
        actualizarEstadoBanca();
        agregarAHistorial(`Blackjack natural. Retorno ${formatearDinero(retornoBlackjack)}.`);
        sonidoVictoria();
        mostrarResultadoBonito({
            etiqueta: 'BLACKJACK',
            titulo: 'Entrada perfecta',
            texto: 'Abriste con 21 exactos. Esta mano es tuya con pago 3:2.'
        });
    }
};

const pedirCartaJugador = async () => {
    if (turnoTerminado || animando) {
        return;
    }

    animando = true;
    refrescarBotonesAccion();
    await repartirCartaJugador(manoActiva);
    animando = false;
    refrescarBotonesAccion();

    const puntosJugador = calcularPuntosMano(manosJugador[manoActiva]);
    if (puntosJugador > 21) {
        manosPlantadas[manoActiva] = true;
        await avanzarManoOSeguir();
    }
};

const plantarse = async () => {
    if (turnoTerminado || animando) {
        return;
    }

    manosPlantadas[manoActiva] = true;
    await avanzarManoOSeguir();
};

const doblar = async () => {
    if (turnoTerminado || animando) {
        return;
    }

    const manoActual = manosJugador[manoActiva];
    if (!manoActual || manoActual.length !== 2 || manosPlantadas[manoActiva]) {
        return;
    }

    const costoDoble = apuestasManos[manoActiva];
    if (saldo < costoDoble) {
        mostrarResultadoBonito({
            etiqueta: 'SALDO INSUFICIENTE',
            titulo: 'No puedes doblar',
            texto: `Necesitas ${formatearDinero(costoDoble)} para doblar esta mano.`
        });
        return;
    }

    saldo -= costoDoble;
    apuestasManos[manoActiva] += costoDoble;
    guardarEstadoSesion();
    actualizarEstadoBanca();

    manosDobladas[manoActiva] = true;
    animando = true;
    refrescarBotonesAccion();
    await repartirCartaJugador(manoActiva);
    animando = false;

    manosPlantadas[manoActiva] = true;
    await avanzarManoOSeguir();
};

const dividir = async () => {
    if (turnoTerminado || splitActivo || animando) {
        return;
    }

    const manoInicial = manosJugador[0];
    if (!puedeDividirMano(manoInicial)) {
        return;
    }

    if (saldo < apuestaBase) {
        mostrarResultadoBonito({
            etiqueta: 'SALDO INSUFICIENTE',
            titulo: 'No puedes dividir',
            texto: `Necesitas ${formatearDinero(apuestaBase)} adicional para crear la segunda mano.`
        });
        return;
    }

    saldo -= apuestaBase;
    guardarEstadoSesion();

    splitActivo = true;
    manosJugador = [[manoInicial[0]], [manoInicial[1]]];
    manosPlantadas = [false, false];
    manosDobladas = [false, false];
    apuestasManos = [apuestaBase, apuestaBase];
    manoActiva = 0;

    renderManosJugador();
    actualizarPuntos();
    actualizarEstadoBanca();

    animando = true;
    refrescarBotonesAccion();
    await repartirCartaJugador(0);
    await repartirCartaJugador(1);
    animando = false;

    refrescarBotonesAccion();
};

btnPedirCarta.addEventListener('click', () => {
    void pedirCartaJugador();
});

btnPlantarse.addEventListener('click', () => {
    void plantarse();
});

if (btnDoblar) {
    btnDoblar.addEventListener('click', () => {
        void doblar();
    });
}

if (btnDividir) {
    btnDividir.addEventListener('click', () => {
        void dividir();
    });
}

btnReiniciar.addEventListener('click', () => {
    void iniciarJuego();
});

if (soft17Toggle) {
    soft17Toggle.checked = configuracion.crupierPideSoft17;
    soft17Toggle.addEventListener('change', () => {
        void obtenerAudioContext();
        configuracion.crupierPideSoft17 = soft17Toggle.checked;
        actualizarEstadoSoft17();
        guardarEstadoSesion();
    });
}

if (iaCrupierSelect) {
    iaCrupierSelect.addEventListener('change', () => {
        void obtenerAudioContext();
        const nuevoPerfil = iaCrupierSelect.value;
        if (!['facil', 'normal', 'dificil'].includes(nuevoPerfil)) {
            return;
        }
        configuracion.perfilIaCrupier = nuevoPerfil;
        actualizarEstadoIa();
        guardarEstadoSesion();
    });
}

if (sonidoToggle) {
    sonidoToggle.addEventListener('change', () => {
        configuracion.sonidosActivos = sonidoToggle.checked;
        actualizarEstadoSonido();
        if (configuracion.sonidosActivos) {
            void obtenerAudioContext();
            sonidoEmpate();
        }
        guardarEstadoSesion();
    });
}

if (volumenSonidoInput) {
    volumenSonidoInput.addEventListener('input', () => {
        const valor = Number(volumenSonidoInput.value);
        configuracion.volumenSonido = limitar(valor / 100, 0, 1);
        actualizarEstadoSonido();
    });

    volumenSonidoInput.addEventListener('change', () => {
        void obtenerAudioContext();
        guardarEstadoSesion();
        if (configuracion.sonidosActivos) {
            sonidoEmpate();
        }
    });
}

if (packSonidoSelect) {
    packSonidoSelect.addEventListener('change', () => {
        const nuevoPack = normalizarPackSonido(packSonidoSelect.value);
        configuracion.sonidoPack = nuevoPack;
        actualizarEstadoSonido();
        guardarEstadoSesion();
        if (configuracion.sonidosActivos) {
            sonidoEmpate();
        }
    });
}

if (btnResetEstadisticas) {
    btnResetEstadisticas.addEventListener('click', () => {
        void obtenerAudioContext();
        marcador.victorias = 0;
        marcador.derrotas = 0;
        marcador.empates = 0;
        historialManos = [];
        actualizarMarcador();
        actualizarHistorial();
        actualizarEstadoBanca();
        guardarEstadoSesion();
        sonidoEmpate();
    });
}

if (apuestaInput) {
    apuestaInput.addEventListener('change', () => {
        const valor = leerApuestaDeseada();
        if (!Number.isFinite(valor) || valor < configuracion.apuestaMinima) {
            apuestaInput.value = String(Math.max(configuracion.apuestaMinima, apuestaBase));
            return;
        }
        fijarApuestaBase(valor);
    });
}

if (btnApuestaPlus10) {
    btnApuestaPlus10.addEventListener('click', () => {
        fijarApuestaBase(apuestaBase + 10);
    });
}

if (btnApuestaPlus50) {
    btnApuestaPlus50.addEventListener('click', () => {
        fijarApuestaBase(apuestaBase + 50);
    });
}

if (btnApuestaAllIn) {
    btnApuestaAllIn.addEventListener('click', () => {
        const saldoDisponible = Math.floor(saldo / 10) * 10;
        if (saldoDisponible >= configuracion.apuestaMinima) {
            fijarApuestaBase(saldoDisponible);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarEstadoSesion();

    if (soft17Toggle) {
        soft17Toggle.checked = configuracion.crupierPideSoft17;
    }

    if (iaCrupierSelect) {
        iaCrupierSelect.value = configuracion.perfilIaCrupier;
    }

    if (sonidoToggle) {
        sonidoToggle.checked = configuracion.sonidosActivos;
    }

    if (volumenSonidoInput) {
        volumenSonidoInput.value = String(Math.round(configuracion.volumenSonido * 100));
    }

    if (packSonidoSelect) {
        packSonidoSelect.value = normalizarPackSonido(configuracion.sonidoPack);
    }

    actualizarMarcador();
    actualizarHistorial();
    actualizarEstadoBanca();
    actualizarEstadoSoft17();
    actualizarEstadoIa();
    actualizarEstadoSonido();

    const eventosDesbloqueo = ['pointerdown', 'keydown', 'touchstart'];
    const handlerDesbloqueo = () => {
        void desbloquearAudio();
    };
    for (const evento of eventosDesbloqueo) {
        document.addEventListener(evento, handlerDesbloqueo, { once: true, passive: true });
    }

    void iniciarJuego();
});

window.crearBaraja = crearBaraja;
window.pedirCarta = pedirCarta;
window.valorCarta = valorCartaBase;
window.iniciarJuego = iniciarJuego;
