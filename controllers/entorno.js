// Valores macroeconómicos base por defecto para el simulador
const valoresBase = {
    inflacion: 4.5,
    tipoCambio: 58.50,
    interes: 6.25,
    pib: 5.0,
    inversionTech: 25000,
    marketShare: 18,
    competencia: 'media'
};

// Estado actual de la simulación del entorno
let entornoActual = { ...valoresBase };

// Variable global para controlar la instancia del gráfico de Chart.js
let instanciaGraficaEntorno = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarComponentes();
    vincularEventosUI();
});

// 1. ASIGNAR LOS VALORES ACTUALES A LOS INPUTS DE LA INTERFAZ Y RENDERIZAR
function inicializarComponentes() {
    // Rangos económicos
    document.getElementById('rangeInflacion').value = entornoActual.inflacion;
    document.getElementById('rangeTipoCambio').value = entornoActual.tipoCambio;
    document.getElementById('rangeInteres').value = entornoActual.interes;
    document.getElementById('rangePIB').value = entornoActual.pib;

    // Contexto operativo
    document.getElementById('numInversionTech').value = entornoActual.inversionTech;
    document.getElementById('rangeMarketShare').value = entornoActual.marketShare;
    document.getElementById('selCompetencia').value = entornoActual.competencia;

    // Sincronizar texto, aplicar cálculos de impacto y redibujar los gráficos
    actualizarLabelsUI();
    actualizarGraficaEntornoUI();
}

// 2. ACTUALIZAR LAS ETIQUETAS VISUALES (LABELS) DE LA UI
function actualizarLabelsUI() {
    document.getElementById('valInflacion').innerText = `${entornoActual.inflacion}%`;
    document.getElementById('valTipoCambio').innerText = parseFloat(entornoActual.tipoCambio).toFixed(2);
    document.getElementById('valInteres').innerText = `${entornoActual.interes}%`;
    document.getElementById('valPIB').innerText = `${entornoActual.pib}%`;
    document.getElementById('valMarketShare').innerText = `${entornoActual.marketShare}%`;
}

// 3. RENDERIZAR / ACTUALIZAR LA GRÁFICA MIXTA EN TIEMPO REAL
function actualizarGraficaEntornoUI() {
    const ctx = document.getElementById('graficaEntorno');
    if (!ctx) return;

    if (instanciaGraficaEntorno) {
        instanciaGraficaEntorno.destroy();
    }

    // Mapeo numérico de la presión de competencia para poder graficarlo de forma analítica
    const mapeoCompetencia = { 'baja': 20, 'media': 50, 'alta': 90 };
    const valorCompetenciaGrafico = mapeoCompetencia[entornoActual.competencia] || 50;

    // Inicializar el gráfico mixto (Barras para % y Línea para inversión de capital)
    instanciaGraficaEntorno = new Chart(ctx, {
        data: {
            labels: ['Inflación', 'Interés Ref.', 'PIB', 'Market Share', 'Presión Comp.'],
            datasets: [
                {
                    // DATASET 1: Variables Porcentuales (Eje Y Izquierdo)
                    type: 'bar',
                    label: 'Métricas (%)',
                    data: [
                        entornoActual.inflacion, 
                        entornoActual.interes, 
                        entornoActual.pib, 
                        entornoActual.marketShare,
                        valorCompetenciaGrafico
                    ],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.75)',  // Rojo - Inflación
                        'rgba(245, 158, 11, 0.75)', // Ámbar - Interés
                        'rgba(16, 185, 129, 0.75)', // Esmeralda - PIB
                        'rgba(37, 99, 235, 0.75)',  // Azul - Cuota
                        'rgba(100, 116, 139, 0.75)' // Slate - Competencia
                    ],
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    // DATASET 2: Inversión en Tecnología (Eje Y Derecho)
                    type: 'line',
                    label: 'Inversión TI ($)',
                    data: [null, null, null, null, entornoActual.inversionTech], // Posicionado estratégicamente al final
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    pointBackgroundColor: '#4f46e5',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                    fill: false,
                    yAxisID: 'y1' // ID de asignación al eje secundario
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return value + '%'; }
                    },
                    title: { display: true, text: 'Escala Porcentual', font: { size: 10 } }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false }, // Evita superposición de líneas de cuadrícula
                    ticks: {
                        callback: function(value) { return '$' + new Intl.NumberFormat('en-US').format(value); }
                    },
                    title: { display: true, text: 'Inversión CapEx TI ($)', font: { size: 10 } }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 1) {
                                return ` Inversión TI: $${new Intl.NumberFormat('en-US').format(context.raw)}`;
                            }
                            if (context.label === 'Presión Comp.') {
                                if (context.raw === 20) return ' Presión Competencia: Baja';
                                if (context.raw === 50) return ' Presión Competencia: Media';
                                if (context.raw === 90) return ' Presión Competencia: Alta';
                            }
                            return ` ${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

// 4. VINCULAR EVENTOS INTERACTIVOS (INPUTS Y BOTONES DE CRISIS)
function vincularEventosUI() {
    // Captura de Sliders Macroeconómicos
    document.getElementById('rangeInflacion').addEventListener('input', (e) => {
        entornoActual.inflacion = parseFloat(e.target.value) || 0;
        actualizarLabelsUI();
        actualizarGraficaEntornoUI();
    });

    document.getElementById('rangeTipoCambio').addEventListener('input', (e) => {
        entornoActual.tipoCambio = parseFloat(e.target.value) || 0;
        actualizarLabelsUI();
    });

    document.getElementById('rangeInteres').addEventListener('input', (e) => {
        entornoActual.interes = parseFloat(e.target.value) || 0;
        actualizarLabelsUI();
        actualizarGraficaEntornoUI();
    });

    document.getElementById('rangePIB').addEventListener('input', (e) => {
        entornoActual.pib = parseFloat(e.target.value) || 0;
        actualizarLabelsUI();
        actualizarGraficaEntornoUI();
    });

    // NUEVO: Escuchadores para Contexto Operativo (Actualizan gráfica al instante)
    document.getElementById('numInversionTech').addEventListener('input', (e) => {
        entornoActual.inversionTech = parseFloat(e.target.value) || 0;
        actualizarGraficaEntornoUI(); 
    });

    document.getElementById('rangeMarketShare').addEventListener('input', (e) => {
        entornoActual.marketShare = parseInt(e.target.value) || 0;
        actualizarLabelsUI();
        actualizarGraficaEntornoUI();
    });

    document.getElementById('selCompetencia').addEventListener('change', (e) => {
        entornoActual.competencia = e.target.value;
        actualizarGraficaEntornoUI();
    });

    // --- ACCIONES DE IMPACTO RÁPIDO / BOTONES DE CRISIS ---

    // Escenario A: Hiperinflación
    document.getElementById('btnEscenarioInflacion').addEventListener('click', () => {
        entornoActual.inflacion = Math.min(entornoActual.inflacion + 15, 30);
        entornoActual.interes = Math.min(entornoActual.interes + 4, 20);
        inicializarComponentes();
        notificarCambioEscenario('¡Escenario de Crisis Inflacionaria Activado!');
    });

    // Escenario B: Recesión Global
    document.getElementById('btnEscenarioRecesion').addEventListener('click', () => {
        entornoActual.pib = -3.0;
        entornoActual.competencia = 'alta'; 
        inicializarComponentes();
        notificarCambioEscenario('¡Escenario de Recesión Global Aplicado!');
    });

    // Escenario C: Automatización Core
    document.getElementById('btnEscenarioTech').addEventListener('click', () => {
        entornoActual.inversionTech = 75000; 
        entornoActual.marketShare = Math.min(entornoActual.marketShare + 5, 100);
        entornoActual.competencia = 'baja'; // La automatización reduce la presión relativa del entorno
        inicializarComponentes();
        notificarCambioEscenario('¡Estrategia de Automatización Core Implementada!');
    });

    // Botón Restablecer: Volver a los Valores Base
    document.getElementById('btnRestablecer').addEventListener('click', () => {
        entornoActual = { ...valoresBase };
        inicializarComponentes();
        
        const btn = document.getElementById('btnRestablecer');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4 animate-spin"></i> Restableciendo...`;
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            btn.innerHTML = originalText;
            if (window.lucide) lucide.createIcons();
        }, 500);
    });
}

// 5. ALERTA O CALLBACK DE CAMBIO DE ESTADO
function notificarCambioEscenario(mensaje) {
    console.log(`${mensaje}`, entornoActual);
    const eventoEntorno = new CustomEvent('entornoCambiado', { detail: entornoActual });
    document.dispatchEvent(eventoEntorno);
}