// ==============================================
// PREDICTOR V4 (precio por tramos desde UI)
// ==============================================

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function oneHotNicho(nicho) {
  return [
    nicho === "alimentos" ? 1 : 0,
    nicho === "cosmetica" ? 1 : 0,
    nicho === "tecnologia" ? 1 : 0,
    nicho === "transportes" ? 1 : 0,
    nicho === "vestuario" ? 1 : 0,
    nicho === "libros" ? 1 : 0
  ];
}

function oneHotTipoUsuario(tipo) {
  return [
    tipo === "impulsivo" ? 1 : 0,
    tipo === "analitico" ? 1 : 0,
    tipo === "desconfiado" ? 1 : 0
  ];
}

// 🔥 etiquetas de precio
const rangosPrecio = [
  "0 - 20.000",
  "20.000 - 50.000",
  "50.000 - 100.000",
  "100.000 - 500.000",
  "500.000 - 1M",
  "1M - 5M",
  "5M - 10M",
  "+10M"
];

function generarDatos(n = 1000) {
  const nichos = ["alimentos", "cosmetica", "tecnologia", "transportes", "vestuario", "libros"];
  const tiposUsuario = ["impulsivo", "analitico", "desconfiado"];

  const data = [];

  for (let i = 0; i < n; i++) {
    const edad = Math.floor(Math.random() * 50) + 18;
    const experiencia = Math.floor(Math.random() * 3);
    const nicho = nichos[Math.floor(Math.random() * nichos.length)];
    const tipoUsuario = tiposUsuario[Math.floor(Math.random() * tiposUsuario.length)];

    const rating = Math.random() * 5;
    const reviews = Math.floor(Math.random() * 5000);
    const influencer = Math.random() > 0.5 ? 1 : 0;
    const demo = Math.random() > 0.5 ? 1 : 0;
    const urgencia = Math.random();

    const precioBucket = Math.floor(Math.random() * 8);

    let redes = edad < 35 ? 1 : 0;
    let tv = edad >= 35 && edad < 50 ? 1 : 0;
    let radio = edad >= 50 ? 1 : 0;

    let prob = 0.2;

    // =========================
    // REGLAS MEJORADAS
    // =========================

    // 🔹 Precio (menos castigo global)
    if (precioBucket <= 1) prob += 0.2;
    if (precioBucket >= 5) prob -= 0.1;


    // 🔹 Nicho (contexto real)
    if (nicho === "transportes" && precioBucket >= 5) prob += 0.15;
    if (nicho === "tecnologia" && precioBucket >= 4) prob += 0.15;
    if (nicho === "alimentos" && precioBucket >= 3) prob -= 0.25;


    // 🔹 Experiencia vs precio
    if (experiencia === 2 && precioBucket >= 5) prob += 0.15;
    if (experiencia === 0 && precioBucket >= 5) prob -= 0.25;


    // 🔹 Tipo de usuario (equilibrado real)

    // IMPULSIVO → fuerte cuando hay estímulos
    if (tipoUsuario === "impulsivo") {
    if (influencer) prob += 0.25;
    if (urgencia > 0.5) prob += 0.2;
    if (rating >= 4) prob += 0.1;
    }

    // ANALÍTICO → más racional, pero no dominante
    if (tipoUsuario === "analitico") {
    if (rating >= 4) prob += 0.1;
    if (reviews > 500) prob += 0.1;
    if (rating >= 4 && reviews > 1000) prob += 0.05;
    }

    // DESCONFIADO → restrictivo
    if (tipoUsuario === "desconfiado") {
    if (reviews < 100) prob -= 0.35;
    else if (reviews < 500) prob -= 0.2;
    else if (reviews > 1000) prob += 0.05;
    }

    // 🔹 Rating
    if (rating >= 4.5) prob += 0.2;
    if (rating <= 2) prob -= 0.3;


    // 🔹 Urgencia (muy importante)
    prob += urgencia * 0.15;


    // 🔹 Canal correcto
    if (redes && edad < 35) prob += 0.2;
    if (tv && edad >= 35 && edad < 55) prob += 0.2;
    if (radio && edad >= 50) prob += 0.2;


    // 🔹 Experiencia directa (demo)
    if (demo) prob += 0.2;

    const click = Math.random() < prob ? 1 : 0;

    data.push({
      edad,
      experiencia,
      rating,
      reviews,
      influencer,
      demo,
      redes,
      tv,
      radio,
      nicho,
      tipoUsuario,
      urgencia,
      precioBucket,
      click
    });
  }

  return data;
}

function preparar(data) {
  return data.map(d => [
    d.edad / 100,
    d.experiencia / 2,
    d.rating / 5,
    d.reviews / 5000,
    d.influencer,
    d.demo,
    d.redes,
    d.tv,
    d.radio,
    d.urgencia,
    d.precioBucket / 7,
    ...oneHotNicho(d.nicho),
    ...oneHotTipoUsuario(d.tipoUsuario),
    d.click
  ]);
}

function entrenar(data, epochs = 500, lr = 0.1) {
  let pesos = Array(data[0].length - 1).fill(0).map(() => Math.random());
  let bias = Math.random();

  for (let e = 0; e < epochs; e++) {
    for (let fila of data) {
      const x = fila.slice(0, -1);
      const y = fila[fila.length - 1];

      let z = bias;
      for (let i = 0; i < x.length; i++) z += pesos[i] * x[i];

      const pred = sigmoid(z);
      const error = pred - y;

      for (let i = 0; i < pesos.length; i++) {
        pesos[i] -= lr * error * x[i];
      }

      bias -= lr * error;
    }
  }

  return { pesos, bias };
}

function generarExplicacion(d) {
  let positivos = "";
  let negativos = "";

  // =========================
  // ✔ FACTORES POSITIVOS
  // =========================

    // Rating
    if (d.rating >= 4.5) {
      positivos += "✔ Excelente rating del producto (" + d.rating + ")\n";
    } else if (d.rating >= 4) {
      positivos += "✔ Buen rating del producto (" + d.rating + ")\n";
    }

    // Reviews
    if (d.reviews > 1000) {
      positivos += "✔ Muchas reseñas → alta confianza del público\n";
    } else if (d.reviews > 500) {
      positivos += "✔ Cantidad aceptable de reseñas\n";
    }

    // Tipo de usuario
    if (d.tipoUsuario === "analitico") {
      positivos += "✔ Usuario analítico valora evidencia (rating y reseñas)\n";
    }

    if (d.tipoUsuario === "impulsivo" && d.influencer) {
      positivos += "✔ Influencer impacta fuertemente en usuario impulsivo\n";
    }

    // Demo
    if (d.demo) {
      positivos += "✔ Experiencia directa con el producto reduce incertidumbre\n";
    }

    // Canal + edad (muy importante en tu modelo)
    if (d.canal === "redes" && d.edad < 35) {
      positivos += "✔ Canal adecuado: redes sociales para usuario joven\n";
    }

    if (d.canal === "tv" && d.edad >= 35 && d.edad < 55) {
      positivos += "✔ Canal adecuado: televisión para público adulto\n";
    }

    if (d.canal === "radio" && d.edad >= 50) {
      positivos += "✔ Canal adecuado: radio para segmento mayor\n";
    }

    // Urgencia
    if (d.urgencia > 0.7) {
      positivos += "✔ Alta urgencia impulsa la decisión de compra\n";
    }

    // Experiencia + precio (INTERACCIÓN REAL)
    if (d.experiencia === 2 && d.precioBucket >= 5) {
      positivos += "✔ Usuario con experiencia tolera precios elevados\n";
    }

    // Nicho + precio
    if (d.nicho === "tecnologia" && d.precioBucket >= 4) {
      positivos += "✔ En tecnología, precios altos pueden ser percibidos como calidad\n";
    }

    if (d.nicho === "transportes" && d.precioBucket >= 5) {
      positivos += "✔ En transportes, precios altos pueden justificarse por necesidad\n";
    }

    // =========================
    // ⚠ FACTORES NEGATIVOS
    // =========================

    // Precio alto general
    if (d.precioBucket >= 5) {
      negativos += "⚠ Precio elevado puede frenar la decisión\n";
    }

    // Reviews bajas
    if (d.reviews < 100) {
      negativos += "⚠ Muy pocas reseñas → baja confianza\n";
    } else if (d.reviews < 500) {
      negativos += "⚠ Pocas reseñas → genera dudas\n";
    }

    // Rating bajo
    if (d.rating <= 2) {
      negativos += "⚠ Rating bajo reduce fuertemente la intención de compra\n";
    }

    // Urgencia baja
    if (d.urgencia < 0.3) {
      negativos += "⚠ Baja urgencia disminuye la probabilidad de acción\n";
    }

    // Usuario desconfiado
    if (d.tipoUsuario === "desconfiado") {
      if (d.reviews < 100) {
        negativos += "⚠ Usuario desconfiado + pocas reseñas → alto rechazo\n";
      } else if (d.reviews < 500) {
        negativos += "⚠ Usuario desconfiado percibe riesgo en el producto\n";
      }
    }

    // Experiencia baja + precio alto
    if (d.experiencia === 0 && d.precioBucket >= 5) {
      negativos += "⚠ Usuario sin experiencia evita precios altos\n";
    }

    // Nicho sensible al precio
    if (d.nicho === "alimentos" && d.precioBucket >= 3) {
      negativos += "⚠ En alimentos, precios altos reducen el interés\n";
    }

    // =========================
    // 📊 OUTPUT FINAL
    // =========================

    let texto = "🔍 Explicación del resultado\n\n";

    if (positivos) {
      texto += "✔ Factores que aumentan la probabilidad:\n";
      texto += positivos + "\n";
    }

    if (negativos) {
      texto += "⚠ Factores que reducen la probabilidad:\n";
      texto += negativos;
    }

    if (!positivos && !negativos) {
      texto += "No se identificaron factores claros en la decisión.";
    }

    return texto;
  }

let modelo;

function iniciar() {
  modelo = entrenar(preparar(generarDatos(1200)));
}

function predecirUI() {
  const edad = document.getElementById("edad").value / 100;
  const experiencia = document.getElementById("nivel").value / 2;
  const ratingRaw = parseFloat(document.getElementById("rating").value);
  const rating = ratingRaw / 5;

  const reviews = parseInt(document.getElementById("reviews").value);
  const influencer = parseInt(document.getElementById("influencer").value);
  const demo = parseInt(document.getElementById("demo").value);

  const canal = document.getElementById("canal").value;
  const redes = canal === "redes" ? 1 : 0;
  const tv = canal === "tv" ? 1 : 0;
  const radio = canal === "radio" ? 1 : 0;

  const nicho = document.getElementById("nicho").value;
  const tipoUsuario = document.getElementById("tipoUsuario").value;
  const urgencia = parseFloat(document.getElementById("urgencia").value);

  const precioBucket = parseInt(document.getElementById("precio").value);

  const input = [
    edad,
    experiencia,
    rating,
    reviews / 5000,
    influencer,
    demo,
    redes,
    tv,
    radio,
    urgencia,
    precioBucket / 7,
    ...oneHotNicho(nicho),
    ...oneHotTipoUsuario(tipoUsuario)
  ];
let z = modelo.bias;
for (let i = 0; i < input.length; i++) {
  z += modelo.pesos[i] * input[i];
}

const prob = sigmoid(z);

// 🔥 NUEVO BLOQUE VISUAL
const porcentaje = (prob * 100).toFixed(2);

// TEXTO GRANDE
document.getElementById("resultado").innerText = porcentaje + "%";

// BARRA
const barra = document.getElementById("barra");
barra.style.width = porcentaje + "%";

// COLOR DINÁMICO
barra.classList.remove("bajo", "medio", "alto");

if (porcentaje < 30) {
  barra.classList.add("bajo");
} else if (porcentaje < 70) {
  barra.classList.add("medio");
} else {
  barra.classList.add("alto");
}

// 🧠 EXPLICACIÓN
const explicacion = generarExplicacion({
  rating: ratingRaw,
  reviews: reviews,
  tipoUsuario: tipoUsuario,
  influencer: influencer,
  demo: demo,
  canal: canal,
  edad: edad * 100,
  precioBucket: precioBucket
});

document.getElementById("explicacion").innerText = explicacion;
}
iniciar();