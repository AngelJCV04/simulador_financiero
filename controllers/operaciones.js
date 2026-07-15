// ==========================================
// 1. ESTADO GLOBAL DE OPERACIONES (VALORES BASE)
// ==========================================
let simulacionPlanta = {
    demandaBase: 6500,           
    estresDemanda: 0,            
    capacidadMaxima: 10000,      
    costoMateriaPrima: 150,      
    inventarioInicial: 1200,     
    tarifaHoraMOD: 250,          
    operariosActivos: 15         
};

let instanciaGraficaOperaciones = null;

// Helper para dar formato numérico 150,000.00
const formatNumberWithCommas = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "";
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(val);
};

// Helper para revertir "150,000.00" a un float limpio (150000)
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
    vincularEventos();
    calcularPlanOperaciones(); 
});

function sincronizarCamposUI() {
    if(document.getElementById('rangeStressDemanda')) document.getElementById('rangeStressDemanda').value = simulacionPlanta.estresDemanda;
    if(document.getElementById('txtStressDemanda')) document.getElementById('txtStressDemanda').innerText = `+${simulacionPlanta.estresDemanda}%`;
    
    // Sincronizar inputs usando el formato visual "150,000.00"
    if(document.getElementById('numCapacidadMaxima')) document.getElementById('numCapacidadMaxima').value = formatNumberWithCommas(simulacionPlanta.capacidadMaxima);
    if(document.getElementById('numCostoMateriaPrima')) document.getElementById('numCostoMateriaPrima').value = formatNumberWithCommas(simulacionPlanta.costoMateriaPrima);
    if(document.getElementById('numInventarioInicial')) document.getElementById('numInventarioInicial').value = formatNumberWithCommas(simulacionPlanta.inventarioInicial);
    if(document.getElementById('numTarifaHoraMOD')) document.getElementById('numTarifaHoraMOD').value = formatNumberWithCommas(simulacionPlanta.tarifaHoraMOD);
    if(document.getElementById('numOperariosActivos')) document.getElementById('numOperariosActivos').value = formatNumberWithCommas(simulacionPlanta.operariosActivos);
}

function vincularEventos() {
    const slider = document.getElementById('rangeStressDemanda');
    if (slider) {
        slider.addEventListener('input', (e) => {
            simulacionPlanta.estresDemanda = parseInt(e.target.value) || 0;
            document.getElementById('txtStressDemanda').innerText = `+${simulacionPlanta.estresDemanda}%`;
            calcularPlanOperaciones();
        });
    }

    const mapeoInputs = {
        'numCapacidadMaxima': 'capacidadMaxima',
        'numCostoMateriaPrima': 'costoMateriaPrima',
        'numInventarioInicial': 'inventarioInicial',
        'numTarifaHoraMOD': 'tarifaHoraMOD',
        'numOperariosActivos': 'operariosActivos'
    };

    Object.keys(mapeoInputs).forEach(idHtml => {
        const inputEl = document.getElementById(idHtml);
        if (inputEl) {
            // Aplicar máscara en vivo mientras el usuario escribe
            inputEl.addEventListener('input', (e) => {
                let cursorPosition = e.target.selectionStart;
                let originalLength = e.target.value.length;
                
                // Remover todo lo que no sea número o un solo punto decimal
                let cleanValue = e.target.value.replace(/[^0-9.]/g, '');
                
                // Evitar múltiples puntos decimales
                const parts = cleanValue.split('.');
                if (parts.length > 2) {
                    cleanValue = parts[0] + '.' + parts.slice(1).join('');
                }

                // Guardar valor numérico en el estado
                const numericValue = parseFloat(cleanValue) || 0;
                simulacionPlanta[mapeoInputs[idHtml]] = numericValue;

                // Formatear visualmente el input
                if (cleanValue !== "") {
                    // Si tiene un punto decimal al final, mantenerlo de forma temporal para que el usuario pueda escribir los centavos
                    if (cleanValue.endsWith('.')) {
                        e.target.value = formatNumberWithCommas(parseFloat(parts[0])) + '.';
                    } else if (parts.length === 2) {
                        // Limitar decimales a un máximo de 2 dígitos al escribir
                        const decimals = parts[1].substring(0, 2);
                        e.target.value = formatNumberWithCommas(parseFloat(parts[0])) + '.' + decimals;
                    } else {
                        e.target.value = formatNumberWithCommas(numericValue);
                    }
                } else {
                    e.target.value = "";
                }

                // Corregir posición del cursor de texto para que no brinque al final
                let newLength = e.target.value.length;
                e.target.setSelectionRange(cursorPosition + (newLength - originalLength), cursorPosition + (newLength - originalLength));

                // Recalcular el dashboard en tiempo real
                calcularPlanOperaciones();
            });

            // Al salir del campo (blur), formatear estrictamente con decimales limpios
            inputEl.addEventListener('blur', (e) => {
                const numericValue = parseFormattedNumber(e.target.value);
                e.target.value = formatNumberWithCommas(numericValue);
            });
        }
    });
}

function calcularPlanOperaciones() {
    const factorIncremento = 1 + (simulacionPlanta.estresDemanda / 100);
    const demandaSimulada = Math.round(simulacionPlanta.demandaBase * factorIncremento);

    let porcentajeCapacidad = 0;
    if (simulacionPlanta.capacidadMaxima > 0) {
        porcentajeCapacidad = Math.round((demandaSimulada / simulacionPlanta.capacidadMaxima) * 100);
    }
    actualizarIndicadorCapacidad(porcentajeCapacidad);

    const comprasUnidades = Math.max(0, demandaSimulada - simulacionPlanta.inventarioInicial);
    const costoTotalMateriales = comprasUnidades * simulacionPlanta.costoMateriaPrima;
    actualizarTablaMRP(demandaSimulada, comprasUnidades, costoTotalMateriales);

    const horasOrdinariasSemestre = 960;
    const capacidadHorasInstaladas = simulacionPlanta.operariosActivos * horasOrdinariasSemestre;
    const horasNecesariasTotales = demandaSimulada * 2; 

    const horasOrdinariasTrabajadas = Math.min(horasNecesariasTotales, capacidadHorasInstaladas);
    const horasExtrasTrabajadas = Math.max(0, horasNecesariasTotales - capacidadHorasInstaladas);

    const costoNominaBase = horasOrdinariasTrabajadas * simulacionPlanta.tarifaHoraMOD;
    const costoHorasExtras = horasExtrasTrabajadas * (simulacionPlanta.tarifaHoraMOD * 1.50);
    const costoNominaTotal = costoNominaBase + costoHorasExtras;

    actualizarSeccionMOD(horasOrdinariasTrabajadas, horasExtrasTrabajadas, costoNominaTotal);

    const formatoMoneda = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    if(document.getElementById('txtCostoMateriales')) document.getElementById('txtCostoMateriales').innerText = formatoMoneda.format(costoTotalMateriales);
    if(document.getElementById('txtCostoNomina')) document.getElementById('txtCostoNomina').innerText = formatoMoneda.format(costoNominaTotal);

    actualizarGraficaOperacionesUI(porcentajeCapacidad, costoTotalMateriales, costoNominaTotal);
}

function actualizarIndicadorCapacidad(porcentaje) {
    const txtCapacidad = document.getElementById('txtCapacidadPorc');
    const lblAlerta = document.getElementById('lblAlertaCapacidad');
    const wrapperIcon = document.getElementById('wrapperCapacidadIcon');

    if (!txtCapacidad) return;
    txtCapacidad.innerText = `${porcentaje}%`;

    if (porcentaje > 100) {
        if (lblAlerta) lblAlerta.innerText = "¡Saturación! Requiere subcontratar";
        if (lblAlerta) lblAlerta.className = "text-[11px] text-red-600 font-bold mt-0.5 leading-tight";
        if (wrapperIcon) wrapperIcon.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4 text-red-600 animate-bounce"></i>`;
    } else if (porcentaje > 80) {
        if (lblAlerta) lblAlerta.innerText = "Sobreesfuerzo y Horas Extras activas";
        if (lblAlerta) lblAlerta.className = "text-[11px] text-amber-600 font-bold mt-0.5 leading-tight";
        if (wrapperIcon) wrapperIcon.innerHTML = `<i data-lucide="shield-alert" class="w-4 h-4 text-amber-600"></i>`;
    } else {
        if (lblAlerta) lblAlerta.innerText = "Dentro del límite operativo";
        if (lblAlerta) lblAlerta.className = "text-[11px] text-slate-400 mt-0.5 leading-tight";
        if (wrapperIcon) wrapperIcon.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>`;
    }
    if(window.lucide) window.lucide.createIcons();
}

function actualizarTablaMRP(demanda, comprasUnidades, costoTotal) {
    const tbody = document.getElementById('tablaMateriales');
    if (!tbody) return;

    const formatoMoneda = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    tbody.innerHTML = `
        <tr class="text-slate-700">
            <td class="py-3 font-semibold">Insumo Clave Suministro S.A.</td>
            <td class="py-3 font-medium text-slate-600">$${formatNumberWithCommas(simulacionPlanta.costoMateriaPrima)}</td>
            <td class="py-3 text-center text-slate-500">${formatNumberWithCommas(simulacionPlanta.inventarioInicial)} unds</td>
            <td class="py-3 text-center font-bold text-blue-600">${formatNumberWithCommas(demanda)} unds</td>
            <td class="py-3 text-right font-bold text-slate-900">
                <span class="block">${formatNumberWithCommas(comprasUnidades)} unds</span>
                <span class="block text-xs text-slate-400 font-normal">Subtotal: ${formatoMoneda.format(costoTotal)}</span>
            </td>
        </tr>
    `;
}

function actualizarSeccionMOD(horasOrd, horasExt, totalNomina) {
    const lista = document.getElementById('listaPersonal');
    if (!lista) return;

    const formatoMoneda = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    lista.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                <span class="text-slate-500">Horas Ordinarias Totales:</span>
                <span class="font-semibold text-slate-800">${formatNumberWithCommas(Math.round(horasOrd))} hrs</span>
            </div>
            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                <span class="text-slate-500">Horas Extras Requeridas:</span>
                <span class="font-bold ${horasExt > 0 ? 'text-amber-600' : 'text-slate-800'}">${formatNumberWithCommas(Math.round(horasExt))} hrs</span>
            </div>
            <div class="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                <span class="text-slate-500">Personal de Planta Activo:</span>
                <span class="font-semibold text-slate-800">${formatNumberWithCommas(simulacionPlanta.operariosActivos)} Obreros</span>
            </div>
            <div class="p-3 bg-slate-50 rounded-lg flex justify-between items-center mt-4">
                <span class="text-xs font-bold text-slate-500 uppercase">Gasto de Nómina MOD:</span>
                <span class="text-base font-bold text-blue-700">${formatoMoneda.format(totalNomina)}</span>
            </div>
        </div>
    `;
}

function actualizarGraficaOperacionesUI(porcentajeCapacidad, costoMateriales, costoNomina) {
    const ctx = document.getElementById('graficaOperaciones');
    if (!ctx) return;

    if (instanciaGraficaOperaciones) {
        instanciaGraficaOperaciones.destroy();
    }

    let colorCapacidad = 'rgba(16, 185, 129, 0.75)'; 
    if (porcentajeCapacidad > 100) colorCapacidad = 'rgba(239, 68, 68, 0.85)';  
    else if (porcentajeCapacidad > 80) colorCapacidad = 'rgba(245, 158, 11, 0.85)'; 

    instanciaGraficaOperaciones = new Chart(ctx, {
        data: {
            labels: ['Capacidad de Planta', 'Presupuestos de Operaciones'],
            datasets: [
                {
                    type: 'bar',
                    label: 'Uso de Planta (%)',
                    data: [porcentajeCapacidad, null],
                    backgroundColor: colorCapacidad,
                    borderRadius: 6,
                    yAxisID: 'yCapacidad'
                },
                {
                    type: 'bar',
                    label: 'Costo Materia Prima ($)',
                    data: [null, costoMateriales],
                    backgroundColor: 'rgba(59, 130, 246, 0.75)', 
                    borderRadius: 6,
                    yAxisID: 'yCostos'
                },
                {
                    type: 'bar',
                    label: 'Costo Nómina MOD ($)',
                    data: [null, costoNomina],
                    backgroundColor: 'rgba(99, 102, 241, 0.75)', 
                    borderRadius: 6,
                    yAxisID: 'yCostos'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yCapacidad: {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: Math.max(120, porcentajeCapacidad + 10),
                    ticks: { callback: function(value) { return value + '%'; } },
                    title: { display: true, text: 'Uso de Planta (%)', font: { size: 10 } }
                },
                yCostos: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: { callback: function(value) { return '$' + new Intl.NumberFormat('en-US').format(value); } },
                    title: { display: true, text: 'Presupuestos ($)', font: { size: 10 } }
                }
            },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
            }
        }
    });
}