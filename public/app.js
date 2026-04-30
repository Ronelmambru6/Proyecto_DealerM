let modalVender, modalEditar, modalGasto;
let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0); 
    if(document.getElementById('modalVender')) modalVender = new bootstrap.Modal(document.getElementById('modalVender'));
    if(document.getElementById('modalEditar')) modalEditar = new bootstrap.Modal(document.getElementById('modalEditar'));
    if(document.getElementById('modalGasto')) modalGasto = new bootstrap.Modal(document.getElementById('modalGasto'));
    
    cargarMarcas();

    // Revisar si ya hay alguien con la sesión abierta
    const sesionGuardada = localStorage.getItem('sesion_dealer');
    if(sesionGuardada) {
        usuarioActual = JSON.parse(sesionGuardada);
        iniciarApp();
    }
});

// Lógica de Inicio de Sesión
document.getElementById('formulario-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnLogin = e.target.querySelector('button');
    btnLogin.disabled = true; btnLogin.textContent = 'Verificando...';

    const credenciales = {
        usuario: document.getElementById('login-usuario').value,
        password: document.getElementById('login-password').value
    };

    try {
        const res = await fetch('http://localhost:3000/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credenciales)
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('sesion_dealer', JSON.stringify(data.usuario));
            usuarioActual = data.usuario;
            document.getElementById('login-error').classList.add('d-none');
            iniciarApp();
        } else {
            document.getElementById('login-error').classList.remove('d-none');
        }
    } catch (error) {
        console.error(error);
    } finally {
        btnLogin.disabled = false; btnLogin.textContent = 'Entrar al Sistema';
    }
});

// Acceso rápido para Vendedores
document.getElementById('btn-acceso-vendedor')?.addEventListener('click', () => {
    // Creamos una sesión "temporal" de vendedor
    const sesionVendedor = { 
        usuario: 'Vendedor Externo', 
        rol: 'Vendedor' 
    };
    
    // Guardamos en el navegador y entramos
    localStorage.setItem('sesion_dealer', JSON.stringify(sesionVendedor));
    usuarioActual = sesionVendedor;
    
    iniciarApp();
});

// Función que acomoda la vista según el Rol
function iniciarApp() {
    document.getElementById('pantalla-login').classList.add('d-none');
    document.getElementById('aplicacion-principal').classList.remove('d-none');

    // RESTRICCIONES DE VENDEDOR
    if (usuarioActual.rol === 'Vendedor') {
        document.getElementById('nav-item-gastos')?.classList.add('d-none'); // Ocultar Pestaña Gastos
        document.getElementById('btn-registrar-vehiculo')?.classList.add('d-none'); // Ocultar Botón Registrar
        document.getElementById('seccion-registro')?.classList.add('d-none'); // Ocultar panel para registrar vehiculos
    } else {
        // Es ADMIN, mostramos todo
        document.getElementById('nav-item-gastos')?.classList.remove('d-none');
        document.getElementById('btn-registrar-vehiculo')?.classList.remove('d-none');
        cargarGastos(); // Solo cargamos los gastos si es Admin
    }
    
    cargarVehiculos();
}

// Lógica de Cerrar Sesión
document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('sesion_dealer');
    window.location.reload(); // Recarga la página y vuelve al login
});


const fReload = document.getElementById('titulo-emp');
fReload.addEventListener('click', () => {
    location.reload();
})

// Navegación
const btnNavInventario = document.getElementById('nav-inventario');
const btnNavGastos = document.getElementById('nav-gastos');
const seccionInventario = document.getElementById('seccion-inventario');
const seccionGastos = document.getElementById('seccion-gastos');
const tituloBanner = document.getElementById('titulo-banner');
const subtituloBanner = document.getElementById('subtitulo-banner');

//funcion para ocultar menu en celulares
function cerrarMenuMovil() {
    const menu = document.getElementById('navbarNav');
    if (menu.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(menu).hide();
    }
}

if (btnNavInventario && btnNavGastos) {
    btnNavInventario.addEventListener('click', (e) => {
        e.preventDefault();
        seccionInventario.classList.remove('d-none');
        seccionGastos.classList.add('d-none');
        btnNavInventario.classList.add('active');
        btnNavGastos.classList.remove('active');

        tituloBanner.textContent = 'Gestión de Inventario';
        subtituloBanner.textContent = 'Registra y administra tus vehículos al instante.';

        cerrarMenuMovil();
    });

    btnNavGastos.addEventListener('click', (e) => {
        e.preventDefault();

        // --- BARRERA DE SEGURIDAD PARA VENDEDORES ---
        if (usuarioActual && usuarioActual.rol === 'Vendedor') {
            alert("🔒 Acceso denegado: No puede acceder aquí.");
            return; // Detiene el código aquí, la pantalla no cambia
        }

        seccionInventario.classList.add('d-none');
        seccionGastos.classList.remove('d-none');
        btnNavInventario.classList.remove('active');
        btnNavGastos.classList.add('active');

        // Cambiamos el banner para Gastos
        tituloBanner.textContent = 'Control de Gastos y Facturas';
        subtituloBanner.textContent = 'Registra y administra factura/gastos generales al instante.';

        cerrarMenuMovil();
    });
} else {
    console.error("OJO: Javascript no encontró los IDs nav-inventario o nav-gastos en tu HTML.");
}

// ==========================================
// INVENTARIO
// ==========================================
document.getElementById('formulario-vehiculo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoVehiculo = {
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        anio: parseInt(document.getElementById('anio').value),
        vin: document.getElementById('vin').value,
        color: document.getElementById('color').value,
        millaje: parseInt(document.getElementById('millaje').value),
        precio_venta: parseFloat(document.getElementById('precio_venta').value), // Cambio a venta
        transmision: document.getElementById('transmision').value,
        tipo_combustible: document.getElementById('tipo_combustible').value
    };
    try {
        const res = await fetch('http://localhost:3000/vehiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoVehiculo) });
        if (res.ok) { document.getElementById('formulario-vehiculo').reset(); cargarVehiculos(); }
    } catch (error) { console.error(error); }
});

async function cargarVehiculos() {
    try {
        const res = await fetch('http://localhost:3000/vehiculos');
        const vehiculos = await res.json();
        const tbody = document.getElementById('tabla-inventario');
        if(!tbody) return;

        if(vehiculos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-5">
                        <div class="mb-2" style="font-size: 2.5rem;">🔃</div>
                        <h6 class="fw-bold mb-1">Sin vehículos registrados</h6>
                        <small>Aún no hay registros de algún vehículo. Haz clic en el botón azul para comenzar.</small>
                    </td>
                </tr>`;
            return;
        }
        
        tbody.innerHTML = ''; 
        document.getElementById('total-vehiculos').textContent = `${vehiculos.length} vehículos`;

        vehiculos.forEach(vehiculo => {
            // 1. Calculamos el precio y el color del estado
            const precio = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(vehiculo.precio_venta);
            let colorEstado = 'bg-light text-dark border'; 
            if (vehiculo.estado === 'Vendido') colorEstado = 'bg-primary text-white';
            if (vehiculo.estado === 'Reservado') colorEstado = 'bg-warning text-dark';
            if (vehiculo.estado === 'Archivado') colorEstado = 'bg-secondary text-white';

            let botonesHTML = '';
            if (usuarioActual && usuarioActual.rol === 'Admin') {
                botonesHTML = `
                    <button class="btn btn-sm btn-outline-primary mb-1 shadow-sm" onclick="abrirModalEditar(${vehiculo.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-success mb-1 shadow-sm" onclick="abrirModalVender(${vehiculo.id})">Vender</button>
                    <button class="btn btn-sm btn-outline-danger mb-1 shadow-sm" onclick="eliminarVehiculo(${vehiculo.id})">Eliminar</button>
                `;
            } else {
                // Si es vendedor, solo ve una etiqueta
                botonesHTML = `<span class="badge bg-light text-dark border p-2">Solo lectura</span>`;
            }

            // 3. Dibujamos la fila
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><strong>${vehiculo.marca} ${vehiculo.modelo}</strong><br><small class="text-muted">${vehiculo.color} • ${vehiculo.millaje} mi • ${vehiculo.tipo_combustible}</small></td>
                <td>${vehiculo.anio}</td>
                <td><small class="font-monospace">${vehiculo.vin}</small></td>
                <td><span class="badge ${colorEstado}">${vehiculo.estado}</span></td>
                <td class="fw-bold text-success">${precio}</td>
                <td>${botonesHTML}</td>
            `;
            tbody.appendChild(fila);
        });
    } catch (error) { 
        console.error("Error al cargar vehículos:", error); 
    }
}

async function eliminarVehiculo(id) {
    if (confirm("⚠️ ¿Estás seguro de que deseas ELIMINAR este vehículo?")) {
        await fetch(`http://localhost:3000/vehiculos/${id}`, { method: 'DELETE' });
        cargarVehiculos();
    }
}

document.getElementById('buscador-inventario')?.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    document.querySelectorAll('#tabla-inventario tr').forEach(f => f.style.display = f.textContent.toLowerCase().includes(texto) ? '' : 'none');
});

// ==========================================
// VENTAS Y EDICIÓN
// ==========================================
let vehiculoAVenderId = null; 
function abrirModalVender(id) { vehiculoAVenderId = id; modalVender.show(); }

// Vender: peticion directa
document.getElementById('btn-confirmar-venta')?.addEventListener('click', async () => {
    try {
        const res = await fetch(`http://localhost:3000/vehiculos/${vehiculoAVenderId}/vender`, { method: 'PUT' });
        if (res.ok) { modalVender.hide(); cargarVehiculos(); setTimeout(() => alert("¡Vendido!"), 300); } 
    } catch (error) { console.error(error); }
});

let vehiculoAEditarId = null;
async function abrirModalEditar(id) {
    vehiculoAEditarId = id;
    try {
        const res = await fetch(`http://localhost:3000/vehiculos/${id}`);
        const v = await res.json();
        document.getElementById('edit_marca').value = v.marca;
        document.getElementById('edit_modelo').value = v.modelo;
        document.getElementById('edit_anio').value = v.anio;
        document.getElementById('edit_vin').value = v.vin;
        document.getElementById('edit_color').value = v.color;
        document.getElementById('edit_millaje').value = v.millaje;
        document.getElementById('edit_precio_venta').value = v.precio_venta; // Cambio a venta
        document.getElementById('edit_transmision').value = v.transmision;
        document.getElementById('edit_combustible').value = v.tipo_combustible;
        if(document.getElementById('edit_estado')) document.getElementById('edit_estado').value = v.estado;
        modalEditar.show();
    } catch (error) { alert("Error al cargar datos"); }
}

document.getElementById('btn-guardar-edicion')?.addEventListener('click', async () => {
    const datos = {
        marca: document.getElementById('edit_marca').value, modelo: document.getElementById('edit_modelo').value,
        anio: parseInt(document.getElementById('edit_anio').value), vin: document.getElementById('edit_vin').value, 
        color: document.getElementById('edit_color').value,
        millaje: parseInt(document.getElementById('edit_millaje').value), precio_venta: parseFloat(document.getElementById('edit_precio_venta').value),
        transmision: document.getElementById('edit_transmision').value, tipo_combustible: document.getElementById('edit_combustible').value
    };
    if(document.getElementById('edit_estado')) datos.estado = document.getElementById('edit_estado').value;
    try {
        const res = await fetch(`http://localhost:3000/vehiculos/${vehiculoAEditarId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(datos) });
        if (res.ok) { document.activeElement.blur(); modalEditar.hide(); cargarVehiculos(); }
    } catch (error) { console.error(error); }
});


// ==========================================
// AUTOCOMPLETADO 
// ==========================================
const baseDatosCarros = {
    // Los líderes indiscutibles en RD
    "Toyota": ["Corolla", "Camry", "RAV4", "Hilux", "Yaris", "Highlander", "Tacoma", "Land Cruiser", "Prado", "4Runner", "Vitz", "Aqua", "Passo", "Sienna", "Fortuner", "Raize", "Agya"],
    "Honda": ["Civic", "Accord", "CR-V", "Pilot", "Fit", "HR-V", "Odyssey", "City", "Ridgeline", "Passport"],
    
    // Los GNV/GLP y yipetas familiares
    "Hyundai": ["Tucson", "Santa Fe", "Sonata", "Elantra", "Accent", "Cantus", "Kona", "Palisade", "Staria", "Grand i10", "Venue"],
    "Kia": ["Sportage", "Sorento", "K5", "Forte", "Rio", "Picanto", "Seltos", "Telluride", "Sonet", "Carnival"],
    
    // Japoneses muy populares
    "Nissan": ["Sentra", "Versa", "Altima", "Frontier", "Rogue", "Kicks", "Pathfinder", "X-Trail", "Qashqai", "Note", "March", "Murano"],
    "Mazda": ["Mazda3", "Mazda6", "CX-3", "CX-5", "CX-9", "CX-30", "BT-50", "Demio"],
    "Mitsubishi": ["Montero", "L200", "Outlander", "ASX", "Mirage", "Nativa", "Eclipse Cross"],
    "Suzuki": ["Swift", "Vitara", "Jimny", "Grand Vitara", "Baleno", "Celerio", "Ertiga"],
    "Daihatsu": ["Mira", "Hijet", "Terios", "Boon"],
    
    // Americanos
    "Ford": ["F-150", "Explorer", "Escape", "Mustang", "Focus", "Edge", "Ranger", "Bronco"],
    "Chevrolet": ["Spark", "Malibu", "Silverado", "Tahoe", "Equinox", "Colorado", "Trax", "Tracker", "Traverse"],
    "Jeep": ["Wrangler", "Grand Cherokee", "Compass", "Renegade", "Cherokee", "Gladiator"],
    
    // Marcas Premium
    "Lexus": ["IS", "ES", "RX", "NX", "GX", "LX"],
    "Mercedes-Benz": ["Clase C", "Clase E", "Clase A", "GLC", "GLE", "GLS", "Clase G", "CLA"],
    "BMW": ["Serie 3", "Serie 4", "Serie 5", "X1", "X3", "X4", "X5", "X6"],
    "Audi": ["A3", "A4", "A6", "Q3", "Q5", "Q7", "Q8"],
    "Porsche": ["Cayenne", "Macan", "Panamera", "911"],
    
    // Europeos generales
    "Volkswagen": ["Jetta", "Golf", "Tiguan", "Touareg", "Amarok", "Polo", "Teramont"],
    "Peugeot": ["208", "2008", "308", "3008", "5008"],
    
    // Marcas Chinas
    "Changan": ["CS35 Plus", "CS55 Plus", "CS75 Plus", "Uni-T", "Uni-K", "Alsvin"],
    "Haval": ["Jolion", "H6", "Dargo"],
    "Geely": ["Coolray", "Azkarra", "Okavango"],
    "BYD": ["Dolphin", "Yuan Plus", "Tang", "Han", "Song Plus"]
};

function cargarMarcas() {
    const dm = document.getElementById('lista-marcas');
    if(dm) Object.keys(baseDatosCarros).forEach(m => dm.appendChild(new Option(m, m)));
}
document.getElementById('marca')?.addEventListener('change', (e) => {
    const m = e.target.value; const mod = document.getElementById('modelo'); const dl = document.getElementById('lista-modelos');
    dl.innerHTML = ''; mod.disabled = false;
    if (baseDatosCarros[m]) { baseDatosCarros[m].forEach(md => dl.appendChild(new Option(md, md))); mod.placeholder = "Selecciona el modelo"; } 
    else { mod.placeholder = "Escribe manualmente"; }
});



// ==========================================
// MÓDULO DE GASTOS
// ==========================================
async function cargarGastos() {
    try {
        const res = await fetch('http://localhost:3000/gastos');
        const gastos = await res.json();
        const tbody = document.getElementById('tabla-gastos');
        if(!tbody) return;
        
        // --- MENSAJE DE "SIN DATOS" ---
        if (gastos.length === 0) { 
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-5">
                        <div class="mb-2" style="font-size: 2.5rem;">📭</div>
                        <h6 class="fw-bold mb-1">Sin datos registrados</h6>
                        <small>Aún no hay facturas ni gastos. Haz clic en el botón azul para comenzar.</small>
                    </td>
                </tr>`; 
            return; 
        }

        tbody.innerHTML = ''; 
        gastos.forEach(gasto => {
            const monto = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(gasto.monto_total);
            const fecha = new Date(gasto.fecha_gasto).toLocaleDateString('es-DO'); 
            
            let colorTipo = 'bg-secondary';
            if (gasto.categoria === 'Mantenimiento' || gasto.categoria === 'Piezas') colorTipo = 'bg-info text-dark';
            if (gasto.categoria === 'Reparacion') colorTipo = 'bg-danger';
            if (gasto.categoria === 'Administrativo') colorTipo = 'bg-dark';

            let asociado = '<span class="text-emphasis"><small>Gasto General</small></span>';
            if (gasto.marca && gasto.modelo) asociado = `<strong>${gasto.marca} ${gasto.modelo}</strong>`;

            let dataFiscal = '';
            if(gasto.ncf || gasto.rnc_suplidor) { 
                dataFiscal = `<br><small class="text-muted border rounded px-1 mt-1 d-inline-block">
                ${gasto.ncf ? 'NCF: '+gasto.ncf : ''} ${gasto.rnc_suplidor ? '| RNC: '+gasto.rnc_suplidor : ''}</small>`;
            }

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${fecha}</td>
                <td>
                    <strong>${gasto.concepto}</strong><br> <span class="badge ${colorTipo} mt-1">${gasto.categoria}</span>
                    ${dataFiscal}
                </td>
                <td>${asociado}</td>
                <td class="text-danger fw-bold">-${monto}</td>
            `;
            tbody.appendChild(fila);
        });
    } catch (error) { console.error(error); }
}

async function cargarVehiculosParaGastos() {
    try {
        const res = await fetch('http://localhost:3000/vehiculos');
        const vehiculos = await res.json();
        const select = document.getElementById('gasto_vehiculo_id');
        if(!select) return;
        select.innerHTML = '<option value="">Ninguno (Gasto general del negocio)</option>';
        vehiculos.forEach(v => {
            if(v.estado === 'Disponible' || v.estado === 'Reservado') {
                select.appendChild(new Option(`${v.marca} ${v.modelo} - ...${v.vin.slice(-6)}`, v.id));
            }
        });
    } catch (error) { console.error(error); }
}

// Lógica de suma automática (Subtotal + ITBIS = Total)
const inputSubtotal = document.getElementById('gasto_subtotal');
const inputItbis = document.getElementById('gasto_itbis');
const inputTotal = document.getElementById('gasto_total');

function calcularTotal() {
    const sub = parseFloat(inputSubtotal.value) || 0;
    const itb = parseFloat(inputItbis.value) || 0;
    if(inputTotal) inputTotal.value = (sub + itb).toFixed(2);
}

if(inputSubtotal && inputItbis) {
    inputSubtotal.addEventListener('input', calcularTotal);
    inputItbis.addEventListener('input', calcularTotal);
}

// Codigo para abrir el modal
document.getElementById('btn-nuevo-gasto')?.addEventListener('click', () => {
    cargarVehiculosParaGastos(); 
    const formGasto = document.getElementById('formulario-gasto');
    if(formGasto) formGasto.reset(); 
    
    const inputFecha = document.getElementById('gasto_fecha');
    if(inputFecha) inputFecha.valueAsDate = new Date(); // Fecha de hoy
    
    if(inputTotal) inputTotal.value = "0.00"; // Reiniciar total
    
    if(modalGasto) modalGasto.show();
});

// Guardar el gasto
document.getElementById('formulario-gasto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevoGasto = {
        concepto: document.getElementById('gasto_concepto').value,
        categoria: document.getElementById('gasto_categoria').value,
        fecha_gasto: document.getElementById('gasto_fecha').value,
        vehiculo_id: document.getElementById('gasto_vehiculo_id').value || null,
        rnc_suplidor: document.getElementById('gasto_rnc_suplidor').value || null,
        ncf: document.getElementById('gasto_ncf').value || null,
        tipo_comprobante: document.getElementById('gasto_tipo_comprobante').value || null,
        monto_subtotal: parseFloat(document.getElementById('gasto_subtotal').value) || 0,
        itbis: parseFloat(document.getElementById('gasto_itbis').value) || 0,
        monto_total: parseFloat(document.getElementById('gasto_total').value) || 0
    };

    try {
        const res = await fetch('http://localhost:3000/gastos', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(nuevoGasto) 
        });
        if (res.ok) { 
            if(modalGasto) modalGasto.hide(); 
            cargarGastos(); 
        }
    } catch (error) { console.error(error); }
});