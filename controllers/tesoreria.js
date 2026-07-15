// ==========================================
// 1. ESTADO GLOBAL DE TESORERÍA
// ==========================================
let estadoTesoreria = {
    saldoInicial: 150000,
    montoPrestamo: 0,
    tasaPrestamo: 12, // Porcentaje simple
    montoInversion: 0
};

// Datos Simulados del Flujo Operativo (Ingresos por Ventas vs Egresos de Operación)
// Representan los movimientos naturales de caja del negocio antes de Financiamientos/Inversiones
const flujosOperativosBase = [
    { mes: "Mes 1", ingresos: 45000, egresos: 35000 },  // Neto: +10,000
    { mes: "Mes 2", ingresos: 55000, egresos: 38000 },  // Neto: +17,000
    { mes: "Mes 3", ingresos: 62000, egresos: 40000 },  // Neto: +22,000
    { mes: "Mes 4", ingresos: 58000, egresos: 42000 },  // Neto: +16,000
    { mes: "Mes 5", ingresos: 70000, egresos: 45000 },  // Neto: +25,000
    { mes: "Mes 6", ingresos: 85000, egresos: 50000 }   // Neto: +35,000
];

let instanciaGraficaCaja = null;

// Helper para dar formato visual: 150,000.00
const formatNumberWithCommas = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "";
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(val);
};

// Helper para revertir string con comas a float limpio
const parseFormattedNumber = (str) => {
    if (!str) return 0;
    const cleanStr = str.replace(/,/g, '');
    return parseFloat(cleanStr) || 0;
};

// ==========================================
// 2. INICIALIZACIÓN REACTIVA
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    sincronizarCamposUI();
    vincularEventosTesoreria();
    procesarFlujoCaja();
});

function sincronizarCamposUI() {
    if(document.getElementById('numSaldoInicial')) {
        document.getElementById('numSaldoInicial').value = formatNumberWithCommas(estadoTesoreria.saldoInicial);
    }
    if(document.getElementById('numPrestamo')) {
        document.getElementById('numPrestamo').value = formatNumberWithCommas(estadoTesoreria.montoPrestamo);
    }
    if(document.getElementById('numTasaPrestamo')) {
        document.getElementById('numTasaPrestamo').value = estadoTesoreria.tasaPrestamo;
    }
    if(document.getElementById('numInversion')) {
        document.getElementById('numInversion').value = formatNumberWithCommas(estadoTesoreria.montoInversion);
    }
}

// ==========================================
// 3. ENLAZADO DE MÁSCARAS Y EVENTOS
// ==========================================
function vincularEventosTesoreria() {
    // Mapeo de inputs que llevan formato monetario 150,000.00
    const inputsMonetarios = {
        'numSaldoInicial': 'saldoInicial',
        'numPrestamo': 'montoPrestamo',
        'numInversion': 'montoInversion'
    };

    Object.keys(inputsMonetarios).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                let cursorPosition = e.target.selectionStart;
                let originalLength = e.target.value.length;

                let cleanValue = e.target.value.replace(/[^0-9.]/g, '');
                const parts = cleanValue.split('.');
                if (parts.length > 2) {
                    cleanValue = parts[0] + '.' + parts.slice(1).join('');
                }

                const numericValue = parseFloat(cleanValue) || 0;
                estadoTesoreria[inputsMonetarios[id]] = numericValue;

                if (cleanValue !== "") {
                    if (cleanValue.endsWith('.')) {
                        e.target.value = formatNumberWithCommas(parseFloat(parts[0])) + '.';
                    } else if (parts.length === 2) {
                        const decimals = parts[1].substring(0, 2);
                        e.target.value = formatNumberWithCommas(parseFloat(parts[0])) + '.' + decimals;
                    } else {
                        e.target.value = formatNumberWithCommas(numericValue);
                    }
                } else {
                    e.target.value = "";
                }

                let newLength = e.target.value.length;
                e.target.setSelectionRange(cursorPosition + (newLength - originalLength), cursorPosition + (newLength - originalLength));

                procesarFlujoCaja();
            });

            el.addEventListener('blur', (e) => {
                const numericValue = parseFormattedNumber(e.target.value);
                e.target.value = formatNumberWithCommas(numericValue);
            });
        }
    });

    // Input numérico común para Tasa de Interés
    const inputTasa = document.getElementById('numTasaPrestamo');
    if (inputTasa) {
        inputTasa.addEventListener('input', (e) => {
            estadoTesoreria.tasaPrestamo = parseFloat(e.target.value) || 0;
            procesarFlujoCaja();
        });
    }

    // Botón de procesamiento manual
    const btnProcesar = document.getElementById('btnCorrerTesorería');
    if (btnProcesar) {
        btnProcesar.addEventListener('click', () => {
            procesarFlujoCaja();
        });
    }
}

// ==========================================
// 4. MOTOR FINANCIERO Y PROYECCIÓN
// ==========================================
function procesarFlujoCaja() {
    let saldoAcumulado = estadoTesoreria.saldoInicial;
    const historicoSaldos = [];
    const etiquetasMeses = [];
    
    let totalIngresos = 0;
    let totalEgresos = 0;

    // Constantes de simulación de préstamos (Amortización lineal simple en 6 meses)
    const cuotaMensualCapital = estadoTesoreria.montoPrestamo / 6;
    const tasaMensual = (estadoTesoreria.tasaPrestamo / 100) / 12;

    flujosOperativosBase.forEach((mesOp, index) => {
        etiquetasMeses.push(mesOp.mes);
        
        // 1. Sumar Flujo Operativo Neto
        let ingresosMes = mesOp.ingresos;
        let egresosMes = mesOp.egresos;

        // 2. Modificaciones financieras extraordinarias
        // Mes 1: Recibimos el monto del préstamo
        if (index === 0) {
            ingresosMes += estadoTesoreria.montoPrestamo;
        }

        // Mes 2: Salida de efectivo por colocación de inversión temporal
        if (index === 1) {
            egresosMes += estadoTesoreria.montoInversion;
        }

        // Si hay préstamo activo, pagar amortización e interés mes a mes
        if (estadoTesoreria.montoPrestamo > 0) {
            const capitalPendiente = estadoTesoreria.montoPrestamo - (cuotaMensualCapital * index);
            const interesMes = Math.max(0, capitalPendiente * tasaMensual);
            egresosMes += cuotaMensualCapital + interesMes;
        }

        // Cálculo neto mensual
        const netoMes = ingresosMes - egresosMes;
        saldoAcumulado += netoMes;
        historicoSaldos.push(Math.round(saldoAcumulado));

        totalIngresos += ingresosMes;
        totalEgresos += egresosMes;
    });

    const flujoNetoTotal = totalIngresos - totalEgresos;

    // Actualizar Tarjetas KPI
    const formatoMoneda = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    
    if (document.getElementById('txtFlujoNetoPeriodo')) {
        const elFlujo = document.getElementById('txtFlujoNetoPeriodo');
        elFlujo.innerText = (flujoNetoTotal >= 0 ? '+' : '') + formatoMoneda.format(flujoNetoTotal);
        elFlujo.className = `text-2xl font-bold mt-1 ${flujoNetoTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
    }

    if (document.getElementById('txtCajaFinalProyectada')) {
        document.getElementById('txtCajaFinalProyectada').innerText = formatoMoneda.format(saldoAcumulado);
    }

    // Actualizar icono de flujo según salud financiera
    const wrapperIcon = document.getElementById('wrapperFlujoIcon');
    if (wrapperIcon) {
        if (flujoNetoTotal >= 0) {
            wrapperIcon.className = "p-3 bg-emerald-50 text-emerald-600 rounded-lg";
            wrapperIcon.innerHTML = `<i data-lucide="trending-up" class="w-6 h-6"></i>`;
        } else {
            wrapperIcon.className = "p-3 bg-rose-50 text-rose-600 rounded-lg";
            wrapperIcon.innerHTML = `<i data-lucide="trending-down" class="w-6 h-6 animate-pulse"></i>`;
        }
        if(window.lucide) window.lucide.createIcons();
    }

    actualizarGraficoEvolucion(etiquetasMeses, historicoSaldos);
}

// ==========================================
// 5. RENDERIZACIÓN DEL GRÁFICO (CHART.JS)
// ==========================================
function actualizarGraficoEvolucion(meses, saldos) {
    const ctx = document.getElementById('graficaEvolucionCaja');
    if (!ctx) return;

    if (instanciaGraficaCaja) {
        instanciaGraficaCaja.destroy();
    }

    instanciaGraficaCaja = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Caja Disponible ($)',
                data: saldos,
                borderColor: 'rgba(59, 130, 246, 1)', // Azul Slate 500
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: 'rgba(29, 78, 216, 1)',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + new Intl.NumberFormat('en-US').format(value);
                        }
                    }
                }
            }
        }
    });
}