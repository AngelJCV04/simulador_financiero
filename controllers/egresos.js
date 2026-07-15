// ==========================================
// 1. ESTADO GLOBAL DE ACTIVOS (CAPEX & OPEX)
// ==========================================
let estadoEgresos = {
    montoBase: 0.00,         // Se lee de 'montoBaseProyeccion'
    porcentajeOpex: 0.00,    // Valor numérico real (ej: si dice 18.89%, se guarda 18.89)
    activos: []              // Listado de activos dinámicos
};

let instanciaGraficaCapex = null;

// ==========================================
// 2. HELPERS DE FORMATEO (MÁSCARA EN VIVO)
// ==========================================
const formatNumberWithCommas = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "0.00";
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
};

const parseFormattedNumber = (str) => {
    if (!str) return 0;
    const cleanStr = str.replace(/,/g, '');
    return parseFloat(cleanStr) || 0;
};

// Limpia caracteres del porcentaje (ej: "18.89%" -> 18.89)
const parsePercentValue = (str) => {
    if (!str) return 0;
    const cleanStr = str.replace(/[^0-9.]/g, '');
    return parseFloat(cleanStr) || 0;
};

// ==========================================
// 3. INICIALIZADOR DEL MÓDULO
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Capturar los valores que ya vengan predefinidos en tu HTML
    capturarMontoBaseInicial();
    capturarPorcentajeOpexInicial();
    
    // 2. Renderizar la estructura inicial de la tabla
    renderizarTablaActivos();
    
    // 3. Procesar cálculos iniciales y pintar la gráfica por primera vez
    ejecutarCalculosEgresos();
    
    // 4. Enlazar eventos de escucha dinámicos
    vincularEventosMontoBase();
    vincularEventosPorcentajeOpex();

    // Evento de actualización manual (Botón Actualizar Matriz)
    const btnRecalcular = document.getElementById('btnRecalcularEgresos');
    if (btnRecalcular) {
        btnRecalcular.addEventListener('click', ejecutarCalculosEgresos);
    }

    // Evento para añadir filas de activos
    const btnAgregar = document.getElementById('btnAgregarActivo');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', agregarFilaActivo);
    }
});

// ==========================================
// 4. MANEJO DINÁMICO DE ENTRADAS (MONTO & %)
// ==========================================

// --- MONTO BASE ---
function capturarMontoBaseInicial() {
    const inputMonto = document.getElementById('montoBaseProyeccion');
    if (inputMonto) {
        const valorEnInput = inputMonto.value.trim();
        if (valorEnInput !== "") {
            estadoEgresos.montoBase = parseFormattedNumber(valorEnInput);
            inputMonto.value = formatNumberWithCommas(estadoEgresos.montoBase);
        } else {
            estadoEgresos.montoBase = 0.00;
        }
    }
}

function vincularEventosMontoBase() {
    const inputMonto = document.getElementById('montoBaseProyeccion');
    if (!inputMonto) return;

    inputMonto.addEventListener('input', (e) => {
        let cursorPosition = e.target.selectionStart;
        let originalLength = e.target.value.length;

        let cleanValue = e.target.value.replace(/[^0-9.]/g, '');
        const parts = cleanValue.split('.');
        if (parts.length > 2) {
            cleanValue = parts[0] + '.' + parts.slice(1).join('');
        }

        const numericValue = cleanValue !== "" ? parseFloat(cleanValue) : 0;
        estadoEgresos.montoBase = numericValue;

        if (cleanValue !== "") {
            if (cleanValue.endsWith('.')) {
                e.target.value = formatNumberWithCommas(parseFloat(parts[0])).split('.')[0] + '.';
            } else if (parts.length === 2) {
                const decimals = parts[1].substring(0, 2);
                e.target.value = formatNumberWithCommas(parseFloat(parts[0])).split('.')[0] + '.' + decimals;
            } else {
                e.target.value = formatNumberWithCommas(numericValue).split('.')[0];
            }
        } else {
            e.target.value = "";
        }

        let newLength = e.target.value.length;
        e.target.setSelectionRange(cursorPosition + (newLength - originalLength), cursorPosition + (newLength - originalLength));
        
        ejecutarCalculosEgresos();
    });

    inputMonto.addEventListener('blur', (e) => {
        const numericValue = parseFormattedNumber(e.target.value);
        estadoEgresos.montoBase = numericValue;
        e.target.value = formatNumberWithCommas(numericValue);
        ejecutarCalculosEgresos();
    });
}

// --- PORCENTAJE OPEX ---
function capturarPorcentajeOpexInicial() {
    const inputPorcentaje = document.getElementById('porcentajeOpex');
    if (inputPorcentaje) {
        const valorEnInput = inputPorcentaje.value.trim();
        if (valorEnInput !== "") {
            estadoEgresos.porcentajeOpex = parsePercentValue(valorEnInput);
        } else {
            estadoEgresos.porcentajeOpex = 0.00;
        }
    }
}

function vincularEventosPorcentajeOpex() {
    const inputPorcentaje = document.getElementById('porcentajeOpex');
    if (!inputPorcentaje) return;

    inputPorcentaje.addEventListener('input', (e) => {
        let cleanValue = e.target.value.replace(/[^0-9.]/g, '');
        const parts = cleanValue.split('.');
        if (parts.length > 2) {
            cleanValue = parts[0] + '.' + parts.slice(1).join('');
        }

        // Guarda el flotante limpio (ej: 18.89) en el estado
        estadoEgresos.porcentajeOpex = cleanValue !== "" ? parseFloat(cleanValue) : 0;
        ejecutarCalculosEgresos();
    });

    inputPorcentaje.addEventListener('blur', (e) => {
        const valorNumerico = parsePercentValue(e.target.value);
        estadoEgresos.porcentajeOpex = valorNumerico;
        
        // Estética visual de salida
        if (valorNumerico > 0) {
            e.target.value = valorNumerico.toFixed(2) + '%';
        } else {
            e.target.value = '0.00%';
        }
        ejecutarCalculosEgresos();
    });
}

// ==========================================
// 5. RENDERIZADO Y CONTROL DE TABLA DINÁMICA
// ==========================================
function renderizarTablaActivos() {
    const tbody = document.getElementById('tablaActivos');
    if (!tbody) return;

    tbody.innerHTML = "";

    estadoEgresos.activos.forEach((activo) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition duration-150";
        tr.dataset.id = activo.id;

        tr.innerHTML = `
            <td class="py-3">
                <input type="text" value="${activo.nombre}" class="nombre-activo w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-md text-slate-800 text-sm font-semibold transition focus:outline-hidden">
            </td>
            <td class="py-3">
                <div class="relative w-36">
                    <span class="absolute left-1.5 top-1.5 text-slate-400 text-xs">$</span>
                    <input type="text" value="${formatNumberWithCommas(activo.costo)}" class="costo-activo w-full pl-4 pr-1 py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-md text-sm font-bold text-slate-800 transition focus:outline-hidden">
                </div>
            </td>
            <td class="py-3 text-center">
                <input type="number" min="1" max="100" value="${activo.vidaUtil}" class="vida-activo w-16 text-center py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-md text-sm font-semibold text-slate-700 transition focus:outline-hidden">
            </td>
            <td class="py-3">
                <div class="relative w-28 mx-auto">
                    <span class="absolute left-1.5 top-1.5 text-slate-400 text-xs">$</span>
                    <input type="text" value="${formatNumberWithCommas(activo.residual)}" class="residual-activo w-full pl-4 pr-1 py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-md text-sm font-bold text-slate-600 text-center transition focus:outline-hidden">
                </div>
            </td>
            <td class="py-3 text-right font-bold text-slate-900 pr-2 flex items-center justify-end gap-2">
                <span class="depr-mensual-fila">$0.00</span>
                <button class="btn-eliminar text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-md transition" title="Eliminar Activo">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
    vincularEventosTabla();
}

function vincularEventosTabla() {
    const filas = document.querySelectorAll('#tablaActivos tr');

    filas.forEach(fila => {
        const idActivo = parseInt(fila.dataset.id);
        const activoObj = estadoEgresos.activos.find(a => a.id === idActivo);

        if (!activoObj) return;

        // Nombre
        const inputNombre = fila.querySelector('.nombre-activo');
        inputNombre.addEventListener('change', (e) => {
            activoObj.nombre = e.target.value;
            ejecutarCalculosEgresos();
        });

        // Costo Compra
        const inputCosto = fila.querySelector('.costo-activo');
        inputCosto.addEventListener('input', (e) => {
            let cursorPosition = e.target.selectionStart;
            let originalLength = e.target.value.length;

            let cleanValue = e.target.value.replace(/[^0-9.]/g, '');
            const parts = cleanValue.split('.');
            if (parts.length > 2) {
                cleanValue = parts[0] + '.' + parts.slice(1).join('');
            }

            const numericValue = cleanValue !== "" ? parseFloat(cleanValue) : 0;
            activoObj.costo = numericValue;

            if (cleanValue !== "") {
                if (cleanValue.endsWith('.')) {
                    e.target.value = formatNumberWithCommas(parseFloat(parts[0])).split('.')[0] + '.';
                } else if (parts.length === 2) {
                    const decimals = parts[1].substring(0, 2);
                    e.target.value = formatNumberWithCommas(parseFloat(parts[0])).split('.')[0] + '.' + decimals;
                } else {
                    e.target.value = formatNumberWithCommas(numericValue).split('.')[0];
                }
            } else {
                e.target.value = "";
            }

            let newLength = e.target.value.length;
            e.target.setSelectionRange(cursorPosition + (newLength - originalLength), cursorPosition + (newLength - originalLength));
            
            ejecutarCalculosEgresos();
        });

        inputCosto.addEventListener('blur', (e) => {
            const val = parseFormattedNumber(e.target.value);
            activoObj.costo = val;
            e.target.value = formatNumberWithCommas(val);
            ejecutarCalculosEgresos();
        });

        // Vida Útil
        const inputVida = fila.querySelector('.vida-activo');
        inputVida.addEventListener('input', (e) => {
            const val = Math.max(1, parseInt(e.target.value) || 1);
            activoObj.vidaUtil = val;
            ejecutarCalculosEgresos();
        });

        // Valor Residual
        const inputResidual = fila.querySelector('.residual-activo');
        inputResidual.addEventListener('input', (e) => {
            let cursorPosition = e.target.selectionStart;
            let originalLength = e.target.value.length;

            let cleanValue = e.target.value.replace(/[^0-9.]/g, '');
            const parts = cleanValue.split('.');
            if (parts.length > 2) {
                cleanValue = parts[0] + '.' + parts.slice(1).join('');
            }

            const numericValue = cleanValue !== "" ? parseFloat(cleanValue) : 0;
            activoObj.residual = numericValue;

            if (cleanValue !== "") {
                if (cleanValue.endsWith('.')) {
                    e.target.value = formatNumberWithCommas(parseFloat(parts[0])).split('.')[0] + '.';
                } else if (parts.length === 2) {
                    const decimals = parts[1].substring(0, 2);
                    e.target.value = formatNumberWithCommas(parseFloat(parts[0])).split('.')[0] + '.' + decimals;
                } else {
                    e.target.value = formatNumberWithCommas(numericValue).split('.')[0];
                }
            } else {
                e.target.value = "";
            }

            let newLength = e.target.value.length;
            e.target.setSelectionRange(cursorPosition + (newLength - originalLength), cursorPosition + (newLength - originalLength));

            ejecutarCalculosEgresos();
        });

        inputResidual.addEventListener('blur', (e) => {
            const val = parseFormattedNumber(e.target.value);
            activoObj.residual = val;
            e.target.value = formatNumberWithCommas(val);
            ejecutarCalculosEgresos();
        });

        // Eliminar fila
        const btnEliminar = fila.querySelector('.btn-eliminar');
        btnEliminar.addEventListener('click', () => {
            estadoEgresos.activos = estadoEgresos.activos.filter(a => a.id !== idActivo);
            renderizarTablaActivos();
            ejecutarCalculosEgresos();
        });
    });
}

function agregarFilaActivo() {
    const nuevoId = estadoEgresos.activos.length > 0 ? Math.max(...estadoEgresos.activos.map(a => a.id)) + 1 : 1;
    estadoEgresos.activos.push({
        id: nuevoId,
        nombre: "Nuevo Activo",
        costo: 0.00,
        vidaUtil: 5,
        residual: 0.00
    });
    renderizarTablaActivos();
    ejecutarCalculosEgresos();
}

// ==========================================
// 6. MATEMÁTICA Y LOGÍSTICA DE CÁLCULO
// ==========================================
function ejecutarCalculosEgresos() {
    let acumuladoCapex = 0;
    let acumuladoDepreciacionMensual = 0;

    const montoBaseSeguro = Number(estadoEgresos.montoBase) || 0;
    
    // Convertimos el porcentaje dinámico (ej: 18.89) a su correspondiente decimal (0.1889)
    const factorOpexSeguro = (Number(estadoEgresos.porcentajeOpex) || 0) / 100;

    // 1. CÁLCULO DE CAPEX Y DEPRECIACIÓN LINEAL
    estadoEgresos.activos.forEach(activo => {
        acumuladoCapex += (Number(activo.costo) || 0);

        const vidaUtilMeses = (Number(activo.vidaUtil) || 0) * 12;
        let depreciacionMensual = 0;

        if (vidaUtilMeses > 0 && activo.costo > activo.residual) {
            depreciacionMensual = (activo.costo - activo.residual) / vidaUtilMeses;
        }

        acumuladoDepreciacionMensual += depreciacionMensual;

        // Renderizar la depreciación por fila
        const fila = document.querySelector(`#tablaActivos tr[data-id="${activo.id}"]`);
        if (fila) {
            const txtDeprFila = fila.querySelector('.depr-mensual-fila');
            if (txtDeprFila) {
                txtDeprFila.innerText = '$' + formatNumberWithCommas(depreciacionMensual);
            }
        }
    });

    // 2. CÁLCULO ESTRICTO DE OPEX CONSOLIDADO
    // OPEX Consolidado = (Monto Base * Factor Opex) + Depreciación Mensual Total
    const opexBaseCalculado = montoBaseSeguro * factorOpexSeguro;
    const opexConsolidado = opexBaseCalculado + acumuladoDepreciacionMensual;

    // 3. ACTUALIZACIÓN EN LA INTERFAZ
    const formatterUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    if (document.getElementById('txtTotalCapex')) {
        document.getElementById('txtTotalCapex').innerText = formatterUSD.format(acumuladoCapex);
    }
    if (document.getElementById('txtTotalDepreciacion')) {
        document.getElementById('txtTotalDepreciacion').innerText = formatterUSD.format(acumuladoDepreciacionMensual);
    }
    if (document.getElementById('txtTotalOpex')) {
        document.getElementById('txtTotalOpex').innerText = formatterUSD.format(opexConsolidado);
    }

    // 4. Actualizar visualizaciones del gráfico
    actualizarGraficaCapex();
}

// ==========================================
// 7. CONTROL DE GRÁFICA DINÁMICA (CHART.JS)
// ==========================================
function actualizarGraficaCapex() {
    const canvas = document.getElementById('graficaCapex');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (instanciaGraficaCapex) {
        instanciaGraficaCapex.destroy();
    }

    const activosValidos = estadoEgresos.activos.filter(a => a.costo > 0);
    
    let etiquetas = [];
    let valoresCosto = [];
    let coloresFondo = [];

    if (activosValidos.length === 0) {
        etiquetas = ["Sin activos con valor"];
        valoresCosto = [1]; // Valor por defecto
        coloresFondo = ['rgba(226, 232, 240, 0.85)']; // Gris neutral
    } else {
        etiquetas = activosValidos.map(a => a.nombre || 'Sin nombre');
        valoresCosto = activosValidos.map(a => a.costo);
        coloresFondo = [
            'rgba(37, 99, 235, 0.85)',  // Blue 600
            'rgba(245, 158, 11, 0.85)',  // Amber 500
            'rgba(16, 185, 129, 0.85)',  // Emerald 500
            'rgba(139, 92, 246, 0.85)',  // Violet 500
            'rgba(236, 72, 153, 0.85)',  // Pink 500
            'rgba(100, 116, 139, 0.85)'  // Slate 500
        ].slice(0, etiquetas.length);
    }

    instanciaGraficaCapex = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: etiquetas,
            datasets: [{
                data: valoresCosto,
                backgroundColor: coloresFondo,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        font: { size: 10, family: 'sans-serif' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (activosValidos.length === 0) return " Ingrese costos de activos";
                            const val = context.raw || 0;
                            return ' ' + context.label + ': $' + formatNumberWithCommas(val);
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}