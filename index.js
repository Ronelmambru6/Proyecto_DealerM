const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => res.send('¡DealerManager funcionando al 100%!'));

// ==========================================
// RUTA DE LOGIN (AUTENTICACIÓN)
// ==========================================
app.post('/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        const query = 'SELECT id, usuario, rol FROM usuarios WHERE usuario = ? AND password = ?';
        const [users] = await db.query(query, [usuario, password]);

        if (users.length > 0) {
            res.json({ success: true, usuario: users[0] });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// ==========================================
// MÓDULO DE INVENTARIO
// ==========================================
app.post('/vehiculos', async (req, res) => {
    try {
        const { marca, modelo, anio, vin, color, millaje, transmision, tipo_combustible, precio_venta } = req.body;
        const query = `INSERT INTO vehiculos (marca, modelo, anio, vin, color, millaje, transmision, tipo_combustible, precio_venta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [resultado] = await db.query(query, [marca, modelo, anio, vin, color, millaje, transmision, tipo_combustible, precio_venta]);
        res.status(201).json({ mensaje: 'Vehículo registrado exitosamente', id_vehiculo: resultado.insertId });
    } catch (error) { res.status(500).json({ error: 'Hubo un error al registrar' }); }
});

app.get('/vehiculos', async (req, res) => {
    try {
        const [vehiculos] = await db.query('SELECT * FROM vehiculos ORDER BY fecha_ingreso DESC');
        res.json(vehiculos);
    } catch (error) { res.status(500).json({ error: 'Error al obtener inventario' }); }
});

// VENDER (Simplificado)
app.put('/vehiculos/:id/vender', async (req, res) => {
    try {
        // Solo cambiamos el estado y la fecha, sin pedir precios extras
        const query = `UPDATE vehiculos SET estado = 'Vendido', fecha_venta = CURRENT_TIMESTAMP WHERE id = ?`;
        const [resultado] = await db.query(query, [req.params.id]);
        if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });
        res.json({ mensaje: '¡Vehículo vendido!' });
    } catch (error) { res.status(500).json({ error: 'Error al procesar la venta' }); }
});

app.get('/vehiculos/:id', async (req, res) => {
    try {
        const [vehiculo] = await db.query('SELECT * FROM vehiculos WHERE id = ?', [req.params.id]);
        if (vehiculo.length === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json(vehiculo[0]);
    } catch (error) { res.status(500).json({ error: 'Error al obtener datos' }); }
});

app.put('/vehiculos/:id', async (req, res) => {
    try {
        const { marca, modelo, anio, vin, color, millaje, precio_venta, transmision, tipo_combustible, estado } = req.body;
        const query = `UPDATE vehiculos SET marca=?, modelo=?, anio=?, vin=?, color=?, millaje=?, precio_venta=?, transmision=?, tipo_combustible=?, estado=? WHERE id=?`;
        await db.query(query, [marca, modelo, anio, vin, color, millaje, precio_venta, transmision, tipo_combustible, estado, req.params.id]);
        res.json({ mensaje: '¡Vehículo editado!' });
    } catch (error) { res.status(500).json({ error: 'Error al guardar cambios' }); }
});

app.delete('/vehiculos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM vehiculos WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Eliminado correctamente' });
    } catch (error) { res.status(500).json({ error: 'Error al borrar' }); }
});

// ==========================================
// MÓDULO DE GASTOS
// ==========================================
app.get('/gastos', async (req, res) => {
    try {
        const query = `
            SELECT g.*, v.marca, v.modelo 
            FROM gastos g LEFT JOIN vehiculos v ON g.vehiculo_id = v.id
            ORDER BY g.fecha_gasto DESC
        `;
        const [gastos] = await db.query(query);
        res.json(gastos);
    } catch (error) { 
        console.error("Error al leer la base de datos:", error);
        res.status(500).json({ error: 'Error al leer gastos' }); 
    }
});

// Guardar
app.post('/gastos', async (req, res) => {
    try {
        const { vehiculo_id, categoria, concepto, rnc_suplidor, ncf, tipo_comprobante, monto_subtotal, itbis, monto_total, fecha_gasto } = req.body;
        
        const idAInsertar = vehiculo_id ? vehiculo_id : null;
        
        const query = `INSERT INTO gastos (vehiculo_id, categoria, concepto, rnc_suplidor, ncf, tipo_comprobante, monto_subtotal, itbis, monto_total, fecha_gasto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.query(query, [idAInsertar, categoria, concepto, rnc_suplidor || null, ncf || null, tipo_comprobante || null, monto_subtotal, itbis, monto_total, fecha_gasto]);
        
        res.status(201).json({ mensaje: 'Gasto guardado' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: 'Error al registrar gasto' }); 
    }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));