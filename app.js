const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

// Middleware
app.use(cors()); // Habilita CORS para permitir solicitudes desde el frontend
app.use(express.json()); // Habilita el parsing de JSON en las solicitudes

//Servidor de archivos desde la carpeta frontend
//con nombre el index.html responde automaticamente al http://15.204.173.7:3001/
app.use(express.static(path.join(__dirname, '../frontend')));

// Cargar productos desde el archivo JSON
let productos = [];
try {
    const data = fs.readFileSync('./Productos.json', 'utf8');
    productos = JSON.parse(data);
    console.log("Productos cargados exitosamente.  Total:", productos.length);
} catch (error) {
    console.error("Error al cargar productos.json:", error);
    process.exit(1); // Salir si no se pueden cargar los productos
}

// Función auxiliar para encontrar productos
function findProducts(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase();
    let exactMatch = null;
    let partialMatches = [];

    // 1. Intentar encontrar coincidencia EXACTA
    // Recorremos todos los productos para ver si el mensaje del usuario coincide con el nombre completo o casi completo
    for (const p of productos) {
        const lowerCaseProductName = p.producto.toLowerCase();
        // Coincidencia exacta o muy cercana
        if (lowerCaseMessage === lowerCaseProductName || // Si es igual
            lowerCaseMessage.includes(lowerCaseProductName) || // Si el mensaje incluye el nombre completo del producto
            lowerCaseProductName.includes(lowerCaseMessage)) { // Si el nombre del producto incluye el mensaje completo
            // Para ser más estrictos, podemos ajustar esto. Por ahora, si es una coincidencia "fuerte", la consideramos exacta.            // Para "Leche Entera" vs "precio de leche entera" podemos usar un .replace() para quitar palabras comune
            if (lowerCaseMessage.includes(lowerCaseProductName) && (lowerCaseMessage.length - lowerCaseProductName.length < 10) ) { // si la diferencia de longitud es pequeña, es casi exacta.
                exactMatch = p;
                break; // Found a strong candidate, stop here.
            }
        }
    }

    if (exactMatch) {
        return [exactMatch]; // Si encontramos una coincidencia exacta, devolvemos solo ese producto
    }

    // 2. Si no hay coincidencia exacta, buscar coincidencias parciales/sugerencias
    const palabrasClave = lowerCaseMessage.split(' ').filter(word => !['el', 'la', 'los', 'las', 'de', 'del', 'precio', 'es', 'un', 'una', 'quiero', 'dime', 'dame', 'cuanto', 'cuesta'].includes(word) && word.length > 2);

    for (const p of productos) {
        const lowerCaseProductName = p.producto.toLowerCase();
        for (const keyword of palabrasClave) {
            if (lowerCaseProductName.includes(keyword) && !partialMatches.includes(p)) {
                partialMatches.push(p);
            }
        }
    }
    return partialMatches; // Devolvemos todas las coincidencias parciales
}

// *Endpoint de la API para el Chat 
app.post('/api/chat', (req, res) => {
    const userMessage = req.body.message ? req.body.message.toLowerCase() : '';
    console.log("Mensaje recibido del usuario:", userMessage);
    let botReply = "Lo siento, no entendí tu solicitud. ¿Podrías ser más específico o preguntar por un producto?";

    // Lógica del bot
    if (userMessage.includes("hola")) {
        botReply = "¡Hola! Soy tu asistente de e-commerce de lácteos. ¿En qué puedo ayudarte hoy?";
    } else if (userMessage.includes("productos") || userMessage.includes("catalogo")) {
        const nombresProductos = productos.map(p => p.producto).join(", ");
        botReply = `Tenemos los siguientes productos: ${nombresProductos}. ¿Hay alguno en particular que te interese?`;
    } else if (userMessage.includes("gracia")) {
        botReply = "De nada. Si tienes más preguntas, no dudes en consultarme.";
    } else {
        // Lógica general para buscar productos
        const foundProducts = findProducts(userMessage);

        if (foundProducts.length === 1) {
            // Si encontramos un único producto (ya sea por coincidencia exacta o si solo hay 1 coincidencia parcial)
            const p = foundProducts[0];
            botReply = `El precio de ${p.producto} (${p.tamanio}) es de Q${p.precio.toFixed(2)}. Puedes verlo aquí: ${p.url}`;
        } else if (foundProducts.length > 1) {
            // Si encontramos múltiples productos
            let replyParts = [];
            foundProducts.forEach(p => {
                replyParts.push(`${p.producto} (${p.tamanio}) a Q${p.precio.toFixed(2)}`);
            });
            botReply = `Puedo sugerirte los siguientes: ${replyParts.join(", ")}. ¿Hay alguno que te interese más?`;
        } else {
            // No se encontraron productos
            botReply = "Lo siento, no encontré productos que coincidan con tu búsqueda. ¿Podrías probar con otro nombre o ser más general (ej. 'productos')?";
        }
    }

    console.log("Respuesta del bot:", botReply);
    res.json({ reply: botReply });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor backend escuchando en http://15.204.173.7:${port}`);
});
