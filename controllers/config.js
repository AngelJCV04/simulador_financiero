// Estado inicial de la estructura corporativa
const configuracionEmpresa = {
    filosofia: {
        mision: "Proveer soluciones tecnológicas financieras eficientes y accesibles para mercados emergentes.",
        vision: "Ser el simulador presupuestario líder elegido por las PyMEs de Latinoamérica para 2028."
    },
    departamentos: [
        { id: 1, nombre: "Operaciones y Logística", codigoCC: "CC-100-OPS", responsable: "Ing. Carlos Mendoza" },
        { id: 2, nombre: "Marketing y Crecimiento", codigoCC: "CC-200-MKT", responsable: "Lic. Laura Gómez" },
        { id: 3, nombre: "Tecnología e Infraestructura", codigoCC: "CC-300-TEC", responsable: "Sra. Amalia Rostova" }
    ],
    politicas: {
        toleranciaDesviacion: 10,
        frecuenciaRevision: "mensual",
        fondoReserva: 50000
    }
};

document.addEventListener("DOMContentLoaded", () => {
    cargarDatosIniciales();
    renderizarTablaDeptos();

    // Evento para añadir un nuevo departamento vacío a la estructura
    document.getElementById('btnAgregarDepto').addEventListener('click', () => {
        const nuevoId = configuracionEmpresa.departamentos.length > 0 
            ? Math.max(...configuracionEmpresa.departamentos.map(d => d.id)) + 1 
            : 1;

        configuracionEmpresa.departamentos.push({
            id: nuevoId,
            nombre: "",
            codigoCC: `CC-${nuevoId}00-NUEVO`,
            responsable: ""
        });
        renderizarTablaDeptos();
    });

    // Evento de guardado maestro
    document.getElementById('btnGuardarConfig').addEventListener('click', () => {
        capturarCambios();
        alert("Configuración estratégica y estructura organizacional guardadas correctamente en el estado local de la simulación.");
        console.log("Estado Actualizado del Sistema:", configuracionEmpresa);
    });
});

function cargarDatosIniciales() {
    document.getElementById('txtMision').value = configuracionEmpresa.filosofia.mision;
    document.getElementById('txtVision').value = configuracionEmpresa.filosofia.vision;
    document.getElementById('numTolerancia').value = configuracionEmpresa.politicas.toleranciaDesviacion;
    document.getElementById('selRevision').value = configuracionEmpresa.politicas.frecuenciaRevision;
    document.getElementById('numReserva').value = configuracionEmpresa.politicas.fondoReserva;
}

function renderizarTablaDeptos() {
    const tbody = document.getElementById('tablaDeptos');
    tbody.innerHTML = '';

    configuracionEmpresa.departamentos.forEach((depto, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition-colors";
        tr.innerHTML = `
            <td class="py-3 pr-4">
                <input type="text" value="${depto.nombre}" placeholder="Ej. Ventas" 
                    class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1 input-depto-nombre" data-index="${index}">
            </td>
            <td class="py-3 pr-4 font-mono text-xs text-slate-600">
                <input type="text" value="${depto.codigoCC}" placeholder="CC-000" 
                    class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1 input-depto-codigo" data-index="${index}">
            </td>
            <td class="py-3 pr-4">
                <input type="text" value="${depto.responsable}" placeholder="Nombre del líder" 
                    class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1 input-depto-responsable" data-index="${index}">
            </td>
            <td class="py-3 text-center">
                <button class="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition btn-eliminar-depto" data-index="${index}">
                    <i data-lucide="trash-2" class="w-4 h-4 mx-auto"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
    asignarEventosFila();
}

function asignarEventosFila() {
    // Manejar la eliminación de filas
    document.querySelectorAll('.btn-eliminar-depto').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            configuracionEmpresa.departamentos.splice(index, 1);
            renderizarTablaDeptos();
        });
    });
}

function capturarCambios() {
    // 1. Guardar Filosofía
    configuracionEmpresa.filosofia.mision = document.getElementById('txtMision').value;
    configuracionEmpresa.filosofia.vision = document.getElementById('txtVision').value;

    // 2. Guardar Políticas
    configuracionEmpresa.politicas.toleranciaDesviacion = parseFloat(document.getElementById('numTolerancia').value);
    configuracionEmpresa.politicas.frecuenciaRevision = document.getElementById('selRevision').value;
    configuracionEmpresa.politicas.fondoReserva = parseFloat(document.getElementById('numReserva').value);

    // 3. Guardar cambios en inputs dinámicos de departamentos
    document.querySelectorAll('.input-depto-nombre').forEach(input => {
        const idx = input.getAttribute('data-index');
        configuracionEmpresa.departamentos[idx].nombre = input.value;
    });
    document.querySelectorAll('.input-depto-codigo').forEach(input => {
        const idx = input.getAttribute('data-index');
        configuracionEmpresa.departamentos[idx].codigoCC = input.value;
    });
    document.querySelectorAll('.input-depto-responsable').forEach(input => {
        const idx = input.getAttribute('data-index');
        configuracionEmpresa.departamentos[idx].responsable = input.value;
    });
}