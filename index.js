const express = require('express');
const cors = require('cors');
const db = require('./db.js');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => res.send('¡DealerManager funcionando al 100%!'));


// ==========================================
// RUTA DE LOGIN (SEGURO CON BCRYPT)
// ==========================================
app.post('/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        
        // Buscamos al usuario en la base de datos solo por su nombre
        const query = 'SELECT * FROM usuarios WHERE usuario = ?';
        const [users] = await db.query(query, [usuario]);

        // Verificamos si el usuario existe
        if (users.length > 0) {
            const usuarioDB = users[0];
            
            // Bcrypt compara la clave plana que escribió el usuario con el Hash de la DB
            const passwordValida = await bcrypt.compare(password, usuarioDB.password);
            
            if (passwordValida) {
                // Éxito: Le damos acceso, pero NUNCA enviamos la contraseña de vuelta al navegador
                res.json({ 
                    success: true, 
                    usuario: { id: usuarioDB.id, usuario: usuarioDB.usuario, rol: usuarioDB.rol } 
                });
            } else {
                // La contraseña no coincide
                res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
            }
        } else {
            // El usuario no existe
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error("Error en el login seguro:", error);
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
        const rolUsuario = req.query.rol; 
        const [vehiculos] = await db.query('SELECT * FROM vehiculos ORDER BY fecha_registro DESC');

        if (rolUsuario === 'Vendedor') {
            const vehiculosParaVendedor = vehiculos.map(vehiculo => {
                return {
                    ...vehiculo, // Copia la marca, año, modelo, etc.
                    precio_venta: vehiculo.precio_venta * 0.96
                };
            });
            
            return res.json(vehiculosParaVendedor);
        }

        res.json(vehiculos);

    } catch (error) { 
        console.error("Error al obtener inventario:", error);
        res.status(500).json({ error: 'Error al obtener inventario' }); 
    }
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

// ==========================================
// RUTA PARA ELIMINAR UN VEHÍCULO (DELETE)
// ==========================================
app.delete('/vehiculos/:id', async (req, res) => {
    try {
        const idVehiculo = req.params.id;

        const query = 'DELETE FROM vehiculos WHERE id = ?';
        const [resultado] = await db.query(query, [idVehiculo]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Vehículo no encontrado' });
        }

        res.json({ success: true, message: 'Vehículo eliminado del inventario' });

    } catch (error) {
        console.error("Error al eliminar el vehículo:", error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar' });
    }
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


// ==========================================
// RUTA PARA EDITAR UN GASTO (PUT)
// ==========================================
app.put('/gastos/:id', async (req, res) => {
    try {
        const idGasto = req.params.id;
        // Extraemos los datos que nos mandó el frontend en el body
        const { fecha_gasto, monto_total, concepto, categoria, vehiculo_id } = req.body;

        // Armamos la consulta SQL de actualización
        const query = `
            UPDATE gastos 
            SET fecha_gasto = ?, monto_total = ?, concepto = ?, categoria = ?, vehiculo_id = ?
            WHERE id = ?
        `;
        
        // Ejecutamos la consulta pasándole los valores en el mismo orden de los signos de interrogación
        const [resultado] = await db.query(query, [fecha_gasto, monto_total, concepto, categoria, vehiculo_id, idGasto]);

        // Verificamos si realmente se modificó alguna fila
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
        }

        res.json({ success: true, message: 'Gasto actualizado correctamente' });

    } catch (error) {
        console.error("Error al actualizar el gasto:", error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar' });
    }
});


// ==========================================
// RUTA PARA ELIMINAR UN GASTO (DELETE)
// ==========================================
app.delete('/gastos/:id', async (req, res) => {
    try {
        const idGasto = req.params.id;

        // Ejecutamos la consulta de borrado
        const query = 'DELETE FROM gastos WHERE id = ?';
        const [resultado] = await db.query(query, [idGasto]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
        }

        res.json({ success: true, message: 'Gasto eliminado permanentemente' });

    } catch (error) {
        console.error("Error al eliminar el gasto:", error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar' });
    }
});

app.listen(PORT, () => console.log(`Servidor de Dealer Manager corriendo exitosamente en el puerto ${PORT}`));