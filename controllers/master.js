// Memoria maestra unificada del simulador
const basePresupuestoMaestro = {
    meses: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    // Matrices de datos base proporcionales (actúan como pesos relativos basados en un estándar de 150,000)
    planificado: {
        ventas: [150000, 160000, 155000, 170000, 185000, 210000],
        costosDirectos: [60000, 64000, 62000, 68000, 74000, 84000],
        gastosFijos: 45000
    },
    // Estado de la línea de tiempo (false = Proyectado, true = Datos Reales confirmados de contabilidad)
    rollingStatus: [false, false, false, false, false, false],
    // Valores reales de referencia capturados en el cierre de mes
    reales: {
        ventas: [165000, 140000, 0, 0, 0, 0], 
        costosDirectos: [61000, 59000, 0, 0, 0, 0]
    }
};

let masterChartInstance;

document.addEventListener("DOMContentLoaded", () => {
    inicializarRollingForecastUI();
    vincularControlesSensibilidad();
    ejecutarSimulacionMaestra();
});

function inicializarRollingForecastUI() {
    const contenedor = document.getElementById('wrapperRollingForecast');
    contenedor.innerHTML = '';

    basePresupuestoMaestro.meses.forEach((mes, idx) => {
        const div = document.createElement('div');
        const estaConfirmadoReal = basePresupuestoMaestro.rollingStatus[idx];
        
        div.id = `card-rf-${idx}`;
        div.className = `p-3.5 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
            estaConfirmadoReal 
            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' 
            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
        }`;
        
        div.innerHTML = `
            <span class="text-xs font-bold uppercase tracking-wider block">${mes}</span>
            <span id="lbl-status-${idx}" class="text-[10px] font-medium block mt-1 uppercase ${estaConfirmadoReal ? 'text-indigo-200' : 'text-slate-400'}">
                ${estaConfirmadoReal ? '✓ Real' : '⏳ Proyectado'}
            </span>
        `;
        
        div.addEventListener('click', () => {
            basePresupuestoMaestro.rollingStatus[idx] = !basePresupuestoMaestro.rollingStatus[idx];
            inicializarRollingForecastUI();
            ejecutarSimulacionMaestra();
        });

        contenedor.appendChild(div);
    });
}

function vincularControlesSensibilidad() {
    const inputs = ['montoBaseProyeccion', 'stressVentas', 'stressCostos', 'stressInflacion'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            if (id === 'montoBaseProyeccion') {
                formatearMontoEnTiempoReal(e.target);
            } else {
                document.getElementById('lblStressVentas').innerText = `${document.getElementById('stressVentas').value}%`;
                document.getElementById('lblStressCostos').innerText = `${document.getElementById('stressCostos').value}%`;
                document.getElementById('lblStressInflacion').innerText = `+${document.getElementById('stressInflacion').value}%`;
            }
            ejecutarSimulacionMaestra();
        });
    });

    // MÁSCARA ESTRICTA AL PERDER EL FOCO (Asegura los .00 finales si el usuario no los digitó)
    const inputMonto = document.getElementById('montoBaseProyeccion');
    inputMonto.addEventListener('blur', () => {
        let valorNum = parseFloat(inputMonto.value.replace(/,/g, ''));
        if (!isNaN(valorNum)) {
            inputMonto.value = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(valorNum);
        } else {
            inputMonto.value = "0.00";
        }
        ejecutarSimulacionMaestra();
    });
}

// Formatea con comas dinámicamente mientras se escribe sin romper la posición del cursor del teclado
function formatearMontoEnTiempoReal(input) {
    let cursorPosition = input.selectionStart;
    let originalValue = input.value;

    let cleanValue = originalValue.replace(/[^0-9.]/g, '');

    let parts = cleanValue.split('.');
    if (parts.length > 2) {
        cleanValue = parts[0] + '.' + parts.slice(1).join('');
        parts = cleanValue.split('.');
    }

    if (!cleanValue) {
        input.value = '';
        return;
    }

    let integerPart = parts[0];
    let formattedInteger = new Intl.NumberFormat('en-US').format(parseFloat(integerPart) || 0);
    
    if (integerPart === '0') formattedInteger = '0';
    if (integerPart === '') formattedInteger = '';

    let newValue = formattedInteger;
    if (parts.length === 2) {
        newValue += '.' + parts[1].substring(0, 2);
    }

    input.value = newValue;

    let commasOriginal = (originalValue.substring(0, cursorPosition).match(/,/g) || []).length;
    let commasNew = (newValue.substring(0, cursorPosition).match(/,/g) || []).length;
    let delta = commasNew - commasOriginal;

    input.setSelectionRange(cursorPosition + delta, cursorPosition + delta);
}

function ejecutarSimulacionMaestra() {
    const montoRaw = document.getElementById('montoBaseProyeccion').value;
    
    // Extracción limpia del valor numérico ingresado por el usuario
    const montoLimpio = montoRaw.replace(/,/g, '');
    const montoBaseInput = parseFloat(montoLimpio) || 0;
    
    // Factor de escala dinámico acoplado al valor del usuario (Base de referencia: 150,000)
    const factorEscalaMonto = montoBaseInput / 150000;

    // Captura de factores de estrés de los sliders
    const fVentas = parseFloat(document.getElementById('stressVentas').value) / 100;
    const fCostos = parseFloat(document.getElementById('stressCostos').value) / 100;
    const fInflacion = parseFloat(document.getElementById('stressInflacion').value) / 100;

    let datasetUtilidadesNetas = [];
    let datasetFlujoCajaAcumulado = [];
    
    // La trayectoria de liquidez inicial inicia con el monto dinámico del usuario
    let efectivoCorrienteAcumulado = montoBaseInput; 

    let sumEbitdaPeriodo = 0;
    let sumVentasPeriodo = 0; 

    // Procesamiento del horizonte temporal unificando el Rolling Forecast + Escala del usuario
    for (let i = 0; i < 6; i++) {
        let vMes = 0;
        let cMes = 0;
        const esMesContableReal = basePresupuestoMaestro.rollingStatus[i];

        if (esMesContableReal) {
            // Los meses REALES también se escalan proporcionalmente al monto base para mantener coherencia en escenarios alternativos
            vMes = basePresupuestoMaestro.reales.ventas[i] * factorEscalaMonto;
            cMes = basePresupuestoMaestro.reales.costosDirectos[i] * factorEscalaMonto;
        } else {
            // Los meses PROYECTADOS se calculan usando la escala y los multiplicadores de estrés de los sliders
            vMes = (basePresupuestoMaestro.planificado.ventas[i] * factorEscalaMonto) * fVentas;
            cMes = (basePresupuestoMaestro.planificado.costosDirectos[i] * factorEscalaMonto) * fCostos * (1 + fInflacion);
        }

        // Los gastos fijos se adaptan proporcionalmente al tamaño del volumen presupuestado
        const gFijosMes = esMesContableReal 
            ? basePresupuestoMaestro.planificado.gastosFijos * factorEscalaMonto
            : (basePresupuestoMaestro.planificado.gastosFijos * factorEscalaMonto) * (1 + fInflacion);

        // Algoritmo del Estado de Resultados (Utilidad Operativa)
        const utilidadOperativa = vMes - cMes - gFijosMes;
        
        sumEbitdaPeriodo += utilidadOperativa;
        sumVentasPeriodo += vMes;

        // Construcción acumulativa de la curva de caja para la gráfica
        efectivoCorrienteAcumulado += utilidadOperativa;
        
        datasetUtilidadesNetas.push(Math.round(utilidadOperativa));
        datasetFlujoCajaAcumulado.push(Math.round(efectivoCorrienteAcumulado));
    }

    // INYECCIÓN DE DATOS EN LA INTERFAZ DE USUARIO (KPIs)
    document.getElementById('txtEbitdaMaster').innerText = formatearMoneda(sumEbitdaPeriodo);
    document.getElementById('txtCajaMaster').innerText = formatearMoneda(efectivoCorrienteAcumulado);

    // Cómputo correcto del Margen Operativo en base a las ventas simuladas totales
    const ratioMargenCalculado = sumVentasPeriodo > 0 ? (sumEbitdaPeriodo / sumVentasPeriodo) * 100 : 0;
    document.getElementById('ratioMargen').innerText = `${ratioMargenCalculado.toFixed(1)}%`;
    
    // Cobertura de Liquidez frente a la estructura fija escalada
    const gastosFijosReferencia = (basePresupuestoMaestro.planificado.gastosFijos * factorEscalaMonto);
    const ratioLiquidezSimulado = gastosFijosReferencia > 0 ? (efectivoCorrienteAcumulado / gastosFijosReferencia) : 0;
    document.getElementById('ratioLiquidez').innerText = `${ratioLiquidezSimulado.toFixed(2)}x`;

    // Renderizado instantáneo de la gráfica mixta (Barras + Línea)
    renderizarGraficoMaster(datasetUtilidadesNetas, datasetFlujoCajaAcumulado);
}

function renderizarGraficoMaster(utilidades, cajas) {
    const ctx = document.getElementById('chartMasterConsolidado').getContext('2d');

    if (masterChartInstance) {
        masterChartInstance.destroy();
    }

    masterChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: basePresupuestoMaestro.meses,
            datasets: [
                {
                    label: 'Utilidad Operativa (Mensual)',
                    data: utilidades,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)', // Emerald 500
                    borderColor: '#10b981',
                    borderWidth: 1
                },
                {
                    type: 'line',
                    label: 'Trayectoria de Caja Disponibilidad',
                    data: cajas,
                    borderColor: '#2563eb', // Blue 600
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0.1,
                    yAxisID: 'yCaja'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, position: 'left' },
                yCaja: { beginAtZero: false, position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(valor);
}