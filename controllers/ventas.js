// ==========================================
// 1. ESTADO GLOBAL DEL PLAN DE VENTAS
// ==========================================
let estadoVentas = {
    temporalidad: "corto",       // 'corto' o 'largo'
    tipoPresupuesto: "maestro",  // 'maestro', 'flexible', etc.
    metodoAlgoritmo: "porcentual",
    productos: [
        {
            id: 1,
            nombre: "Laptops Corporativas",
            canal: "Retail / Norte",
            precio: 1200.00,
            cantidad: 150
        },
        {
            id: 2,
            nombre: "Licencias de Software",
            canal: "B2B / Nacional",
            precio: 85.00,
            cantidad: 1200
        }
    ]
};

let instanciaGraficaVentas = null;

// ==========================================
// 2. HELPERS DE FORMATEO
// ==========================================
const formatMoney = (val) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
};

// ==========================================
// 3. INICIALIZADOR
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Escuchar cambios en los selectores de alcance de presupuesto
    vincularEventosConfiguracion();

    // Cargar la tabla dinámica por primera vez
    renderizarTablaProductos();

    // Ejecutar cálculos y gráfica inicial
    ejecutarCalculosVentas();

    // Evento para añadir nuevas líneas dinámicas
    const btnAgregar = document.getElementById('btnAgregarProducto');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', agregarFilaProducto);
    }

    // Evento del botón Calcular
    const btnCalcular = document.getElementById('btnCalcularVentas');
    if (btnCalcular) {
        btnCalcular.addEventListener('click', ejecutarCalculosVentas);
    }
});

// ==========================================
// 4. CONFIGURACIÓN DEL PRESUPUESTO
// ==========================================
function vincularEventosConfiguracion() {
    const selTemporalidad = document.getElementById('selTemporalidad');
    const selTipo = document.getElementById('selTipoPresupuesto');
    const selMetodo = document.getElementById('selMetodoAlgoritmo');

    if (selTemporalidad) {
        selTemporalidad.addEventListener('change', (e) => {
            estadoVentas.temporalidad = e.target.value;
            ejecutarCalculosVentas();
        });
    }
    if (selTipo) {
        selTipo.addEventListener('change', (e) => {
            estadoVentas.tipoPresupuesto = e.target.value;
            ejecutarCalculosVentas();
        });
    }
    if (selMetodo) {
        selMetodo.addEventListener('change', (e) => {
            estadoVentas.metodoAlgoritmo = e.target.value;
            ejecutarCalculosVentas();
        });
    }
}

// ==========================================
// 5. RENDERIZACIÓN DE LA TABLA DINÁMICA
// ==========================================
function renderizarTablaProductos() {
    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;

    tbody.innerHTML = "";

    estadoVentas.productos.forEach((prod) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition duration-150";
        tr.dataset.id = prod.id;

        tr.innerHTML = `
            <td class="py-3">
                <input type="text" value="${prod.nombre}" 
                    class="nombre-producto w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-md text-slate-800 text-sm font-semibold transition focus:outline-hidden" 
                    placeholder="Ej. Laptop Corporativa">
            </td>
            <td class="py-3">
                <input type="text" value="${prod.canal}" 
                    class="canal-producto w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-md text-slate-600 text-sm font-medium transition focus:outline-hidden" 
                    placeholder="Ej. Retail / Norte">
            </td>
            <td class="py-3">
                <div class="relative w-32">
                    <span class="absolute left-1.5 top-1 text-slate-400 text-xs">$</span>
                    <input type="number" step="0.01" value="${prod.precio}" 
                        class="precio-producto w-full pl-5 pr-1 py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-md text-sm font-bold text-slate-800 transition focus:outline-hidden" 
                        placeholder="0.00">
                </div>
            </td>
            <td class="py-3 text-center">
                <input type="number" value="${prod.cantidad}" 
                    class="cantidad-producto w-20 text-center py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-md text-sm font-semibold text-slate-700 transition focus:outline-hidden" 
                    placeholder="0">
            </td>
            <td class="py-3 text-right font-bold text-slate-900 pr-2 flex items-center justify-end gap-2">
                <span class="subtotal-fila">$0.00</span>
                <button class="btn-eliminar-prod text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-md transition" title="Eliminar Línea">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
    vincularEventosTabla();
}

// ==========================================
// 6. ESCUCHA DE EDICIONES EN TIEMPO REAL
// ==========================================
function vincularEventosTabla() {
    const filas = document.querySelectorAll('#tablaProductos tr');

    filas.forEach(fila => {
        const idProd = parseInt(fila.dataset.id);
        const prodObj = estadoVentas.productos.find(p => p.id === idProd);

        if (!prodObj) return;

        // 1. Edición de Producto / Categoría
        const inputNombre = fila.querySelector('.nombre-producto');
        inputNombre.addEventListener('input', (e) => {
            prodObj.nombre = e.target.value;
            // Actualiza la gráfica en vivo si cambia el nombre
            actualizarGraficaVentas(); 
        });

        // 2. Edición de Canal / Territorio
        const inputCanal = fila.querySelector('.canal-producto');
        inputCanal.addEventListener('input', (e) => {
            prodObj.canal = e.target.value;
        });

        // 3. Edición de Precio Unitario
        const inputPrecio = fila.querySelector('.precio-producto');
        inputPrecio.addEventListener('input', (e) => {
            prodObj.precio = parseFloat(e.target.value) || 0;
            ejecutarCalculosVentas();
        });

        // 4. Edición de Cantidad Mensual Meta
        const inputCantidad = fila.querySelector('.cantidad-producto');
        inputCantidad.addEventListener('input', (e) => {
            prodObj.cantidad = parseInt(e.target.value) || 0;
            ejecutarCalculosVentas();
        });

        // 5. Eliminar fila del catálogo
        const btnEliminar = fila.querySelector('.btn-eliminar-prod');
        btnEliminar.addEventListener('click', () => {
            estadoVentas.productos = estadoVentas.productos.filter(p => p.id !== idProd);
            renderizarTablaProductos();
            ejecutarCalculosVentas();
        });
    });
}

// Agregar un nuevo producto vacío al catálogo
function agregarFilaProducto() {
    const nuevoId = estadoVentas.productos.length > 0 ? Math.max(...estadoVentas.productos.map(p => p.id)) + 1 : 1;
    estadoVentas.productos.push({
        id: nuevoId,
        nombre: "",
        canal: "",
        precio: 0.00,
        cantidad: 0
    });
    renderizarTablaProductos();
    ejecutarCalculosVentas();
}

// ==========================================
// 7. MATEMÁTICA E INYECCIÓN DE MÉTRICAS
// ==========================================
function ejecutarCalculosVentas() {
    let acumuladoVentasMonto = 0;
    let acumuladoUnidades = 0;

    estadoVentas.productos.forEach(prod => {
        const subtotal = prod.precio * prod.cantidad;
        acumuladoVentasMonto += subtotal;
        acumuladoUnidades += prod.cantidad;

        // Imprimir subtotal formateado en la celda de la fila correspondiente
        const fila = document.querySelector(`#tablaProductos tr[data-id="${prod.id}"]`);
        if (fila) {
            const txtSubtotal = fila.querySelector('.subtotal-fila');
            if (txtSubtotal) {
                txtSubtotal.innerText = '$' + formatMoney(subtotal);
            }
        }
    });

    // Modificadores opcionales según el algoritmo o tipo de presupuesto seleccionado
    let multiplicadorAlgoritmo = 1.0;
    if (estadoVentas.metodoAlgoritmo === "lineal") {
        multiplicadorAlgoritmo = 1.08; // Ejemplo de simulación: incremento del 8% por tendencia
    } else if (estadoVentas.metodoAlgoritmo === "promedio") {
        multiplicadorAlgoritmo = 1.03; // Incremento del 3%
    }

    const ventasFinalesProyectadas = acumuladoVentasMonto * multiplicadorAlgoritmo;

    // Actualizar las tarjetas de resumen
    const txtTotalComercial = document.getElementById('txtTotalComercial');
    if (txtTotalComercial) {
        txtTotalComercial.innerText = '$' + formatMoney(ventasFinalesProyectadas);
    }

    const txtVolumenUnidades = document.getElementById('txtVolumenUnidades');
    if (txtVolumenUnidades) {
        txtVolumenUnidades.innerText = acumuladoUnidades.toLocaleString('en-US') + " unds";
    }

    // Actualizar gráfica analítica
    actualizarGraficaVentas();
}

// ==========================================
// 8. GRÁFICA ANALÍTICA DE PROYECCIONES
// ==========================================
function actualizarGraficaVentas() {
    const canvas = document.getElementById('graficaProyeccionVentas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (instanciaGraficaVentas) {
        instanciaGraficaVentas.destroy();
    }

    // Datos dinámicos basados en lo que escribe el usuario
    const nombresLabels = estadoVentas.productos.map(p => p.nombre || "Sin Nombre");
    const valoresVenta = estadoVentas.productos.map(p => p.precio * p.cantidad);

    // Si la tabla está vacía, mostrar estado de carga neutral
    const etiquetas = nombresLabels.length > 0 ? nombresLabels : ["Esperando Datos..."];
    const datos = valoresVenta.length > 0 ? valoresVenta : [0];

    instanciaGraficaVentas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Proyección de Ventas ($)',
                data: datos,
                backgroundColor: 'rgba(37, 99, 235, 0.85)', // Blue 600
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ' Ventas: $' + formatMoney(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { family: 'sans-serif', size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'sans-serif', size: 10 } }
                }
            }
        }
    });
}