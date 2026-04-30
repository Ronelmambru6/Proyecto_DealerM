const bcrypt = require('bcrypt');
const db = require('./db'); 

async function crearUsuarios() {
    try {
        const passwordPlana = 'm4mbru!197501'; 
        const saltRounds = 10; // Nivel de seguridad de la encriptación
        const passwordEncriptada = await bcrypt.hash(passwordPlana, saltRounds);

        // Guardamos a Mambrú (Admin) en la base de datos
        await db.query(
            `INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)`, 
            ['mambru', passwordEncriptada, 'Admin']
        );
        
        console.log("✅ Usuario creado con éxito. Contraseña encriptada y guardada.");
        process.exit();
    } catch (error) {
        console.error("Error al crear usuario:", error);
        process.exit(1);
    }
}

crearUsuarios();