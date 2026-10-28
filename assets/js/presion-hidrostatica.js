/*
 * Laboratorio de presión hidrostática: diagrama interactivo sobre un muro vertical.
 * Es un modelo idealizado; no representa el nivel real del embalse ni un cálculo de La Breña II.
 * Mejora progresiva: sin JavaScript la página muestra una tabla con valores de referencia.
 */
(function () {
  "use strict";

  var P = window.SendaPresion;
  var contenedor = document.getElementById("lab-presion");
  if (!P || !contenedor) return;

  var NS = "http://www.w3.org/2000/svg";
  var H_MAX = 100; // m: altura que representa el muro completo
  var ANCHO = 540;
  var ALTO = 330;
  var X_MURO = 430;
  var Y_FONDO = 290;
  var Y_TOPE = 30;
  var ESCALA_Y = (Y_FONDO - Y_TOPE) / H_MAX; // px por metro
  var L_MAX = 360; // px de la flecha de presión a H_MAX con la densidad más alta
  var P_REF = P.presion(H_MAX, P.FLUIDOS.salada.densidad);
  var reducirMovimiento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var estado = { H: 30, mostrado: 30, fluido: "dulce", doble: false, animacion: null };

  contenedor.innerHTML =
    '<div class="lab-controles">' +
    '<div class="lab-campo"><label for="lab-h">Profundidad del agua: <strong id="lab-h-valor"></strong></label>' +
    '<input id="lab-h" type="range" min="1" max="100" step="1" value="30"></div>' +
    '<div class="lab-campo"><label for="lab-fluido">Fluido</label>' +
    '<select id="lab-fluido"><option value="dulce">Agua dulce (1000 kg/m³)</option>' +
    '<option value="salada">Agua salada (1025 kg/m³)</option></select></div>' +
    '<label class="casilla"><input type="checkbox" id="lab-doble"><span>Comparar con el doble de profundidad</span></label>' +
    "</div>" +
    '<svg id="lab-svg" viewBox="0 0 ' + ANCHO + " " + ALTO + '" role="img" aria-label=""></svg>' +
    '<dl class="lab-lecturas">' +
    '<div><dt>Presión en el fondo</dt><dd id="lab-p"></dd></div>' +
    '<div><dt>Fuerza por metro de ancho</dt><dd id="lab-f"></dd></div>' +
    '<div><dt>Altura de la resultante</dt><dd id="lab-y"></dd></div>' +
    '<div id="lab-comparacion" hidden><dt>Con el doble de profundidad</dt><dd id="lab-c"></dd></div>' +
    "</dl>" +
    '<p class="sr-solo" id="lab-resumen" aria-live="polite"></p>' +
    '<p class="lab-rotulo"><strong>Modelo idealizado.</strong> Agua en reposo contra un muro vertical y sin contar la presión de la atmósfera. ' +
    "No representa el nivel real del embalse ni un cálculo estructural de La Breña II.</p>";

  var svg = contenedor.querySelector("#lab-svg");
  var entradaH = contenedor.querySelector("#lab-h");
  var selectorFluido = contenedor.querySelector("#lab-fluido");
  var casillaDoble = contenedor.querySelector("#lab-doble");

  function el(nombre, atributos, texto) {
    var nodo = document.createElementNS(NS, nombre);
    Object.keys(atributos || {}).forEach(function (clave) {
      nodo.setAttribute(clave, atributos[clave]);
    });
    if (texto) nodo.textContent = texto;
    return nodo;
  }

  function yDe(profundidadDesdeFondo) {
    return Y_FONDO - profundidadDesdeFondo * ESCALA_Y;
  }

  function longitudFlecha(profundidad, densidad) {
    return (P.presion(profundidad, densidad) / P_REF) * L_MAX;
  }

  function flecha(x1, y, x2, color, grosor, marcador) {
    return el("line", { x1: x1, y1: y, x2: x2, y2: y, stroke: color, "stroke-width": grosor, "marker-end": "url(#" + marcador + ")" });
  }

  function triangulo(H, densidad, atributos) {
    var ySuperficie = yDe(H);
    var L = longitudFlecha(H, densidad);
    var puntos = [X_MURO + "," + ySuperficie, X_MURO - L + "," + Y_FONDO, X_MURO + "," + Y_FONDO].join(" ");
    return el("polygon", Object.assign({ points: puntos }, atributos));
  }

  function dibujar(H) {
    var densidad = P.FLUIDOS[estado.fluido].densidad;
    svg.textContent = "";

    var defs = el("defs");
    [["punta", "#1d3a2a"], ["puntaT", "#b3261e"]].forEach(function (m) {
      var marcador = el("marker", { id: m[0], viewBox: "0 0 10 10", refX: 9, refY: 5, markerUnits: "userSpaceOnUse", markerWidth: 13, markerHeight: 13, orient: "auto-start-reverse" });
      marcador.appendChild(el("path", { d: "M0 0 L10 5 L0 10 z", fill: m[1] }));
      defs.appendChild(marcador);
    });
    svg.appendChild(defs);

    // agua, terreno y muro
    svg.appendChild(el("rect", { x: 40, y: yDe(H), width: X_MURO - 40, height: H * ESCALA_Y, fill: "#2d6673", "fill-opacity": 0.22 }));
    svg.appendChild(el("line", { x1: 40, y1: yDe(H), x2: X_MURO, y2: yDe(H), stroke: "#2d6673", "stroke-width": 2 }));
    svg.appendChild(el("rect", { x: 0, y: Y_FONDO, width: ANCHO, height: ALTO - Y_FONDO, fill: "#bcd9b0" }));
    svg.appendChild(el("rect", { x: X_MURO, y: Y_TOPE, width: 70, height: Y_FONDO - Y_TOPE, fill: "#c5d6bf", stroke: "#1d3a2a", "stroke-width": 2.5 }));
    svg.appendChild(el("text", { x: X_MURO + 35, y: Y_TOPE + 60, "text-anchor": "middle", fill: "#1d3a2a", "font-size": 13 }, "Muro"));

    // escala de profundidad
    [0, 25, 50, 75, 100].forEach(function (m) {
      svg.appendChild(el("line", { x1: 34, y1: yDe(m), x2: 40, y2: yDe(m), stroke: "#3b5a45" }));
      svg.appendChild(el("text", { x: 30, y: yDe(m) + 4, "text-anchor": "end", fill: "#3b5a45", "font-size": 11 }, m + " m"));
    });

    // comparación con el doble de profundidad (contorno punteado)
    if (estado.doble) {
      var H2 = Math.min(2 * H, H_MAX);
      svg.appendChild(triangulo(H2, densidad, { fill: "none", stroke: "#b3261e", "stroke-width": 2, "stroke-dasharray": "6 4" }));
      svg.appendChild(el("line", { x1: 40, y1: yDe(H2), x2: X_MURO, y2: yDe(H2), stroke: "#b3261e", "stroke-width": 1.5, "stroke-dasharray": "6 4" }));
    }

    // diagrama de presión: triángulo y flechas
    svg.appendChild(triangulo(H, densidad, { fill: "#1d3a2a", "fill-opacity": 0.1, stroke: "#1d3a2a", "stroke-width": 1.5, "stroke-dasharray": "4 3" }));
    var n = 6;
    for (var i = 1; i <= n; i++) {
      var d = (H * i) / n;
      var y = yDe(H) + d * ESCALA_Y;
      svg.appendChild(flecha(X_MURO - longitudFlecha(d, densidad), y, X_MURO - 2, "#1d3a2a", 2, "punta"));
    }

    // resultante a un tercio de la altura desde el fondo
    var yRes = yDe(P.puntoAplicacion(H));
    svg.appendChild(flecha(X_MURO - 110, yRes, X_MURO - 2, "#b3261e", 5, "puntaT"));
    svg.appendChild(el("text", { x: X_MURO - 112, y: yRes - 8, "text-anchor": "end", fill: "#b3261e", "font-size": 13, "font-weight": 700 }, "F (resultante)"));
    svg.appendChild(el("line", { x1: X_MURO + 70, y1: yDe(0), x2: X_MURO + 70, y2: yRes, stroke: "#b3261e", "stroke-width": 1.5 }));
    svg.appendChild(el("text", { x: X_MURO + 76, y: (yDe(0) + yRes) / 2 + 4, fill: "#b3261e", "font-size": 12 }, "H/3"));
    svg.appendChild(el("text", { x: 46, y: yDe(H) - 8, fill: "#1c4853", "font-size": 13 }, "Superficie"));

    svg.setAttribute(
      "aria-label",
      "Diagrama de la presión del agua sobre un muro: con " + Math.round(H) + " metros de agua, la presión crece de cero en la superficie a " +
        P.formatearPresion(P.presion(H, densidad)) + " en el fondo, y la fuerza resultante actúa a un tercio de la altura."
    );
  }

  function lecturas(H) {
    var densidad = P.FLUIDOS[estado.fluido].densidad;
    var p = P.presion(H, densidad);
    var f = P.fuerzaPorMetro(H, densidad);
    contenedor.querySelector("#lab-h-valor").textContent = Math.round(H) + " m";
    contenedor.querySelector("#lab-p").textContent = P.formatearPresion(p) + " (" + P.formatear(p / 1e6, 3) + " MPa)";
    contenedor.querySelector("#lab-f").textContent = P.formatearFuerza(f);
    contenedor.querySelector("#lab-y").textContent = P.formatear(P.puntoAplicacion(H), 1) + " m sobre el fondo (un tercio de la altura)";

    var comparacion = contenedor.querySelector("#lab-comparacion");
    comparacion.hidden = !estado.doble;
    if (estado.doble) {
      var H2 = Math.min(2 * H, H_MAX);
      var razon = H2 / H;
      var texto =
        P.formatear(H2, 0) + " m: presión " + P.formatearPresion(P.presion(H2, densidad)) + " (×" + P.formatear(razon, 1) +
        "), fuerza " + P.formatearFuerza(P.fuerzaPorMetro(H2, densidad)) + " (×" + P.formatear(razon * razon, 1) + ")";
      if (2 * H > H_MAX) texto += ". El diagrama se limita a " + H_MAX + " m.";
      contenedor.querySelector("#lab-c").textContent = texto;
    }
  }

  function refrescar(H) {
    dibujar(H);
    lecturas(H);
  }

  function animarHasta(destino) {
    if (estado.animacion) window.cancelAnimationFrame(estado.animacion);
    if (reducirMovimiento) {
      estado.mostrado = destino;
      refrescar(destino);
      return;
    }
    var inicio = estado.mostrado;
    var t0 = null;
    function paso(t) {
      if (t0 === null) t0 = t;
      var avance = Math.min((t - t0) / 220, 1);
      var suave = 1 - Math.pow(1 - avance, 3);
      estado.mostrado = inicio + (destino - inicio) * suave;
      refrescar(estado.mostrado);
      if (avance < 1) estado.animacion = window.requestAnimationFrame(paso);
    }
    estado.animacion = window.requestAnimationFrame(paso);
  }

  function anunciar() {
    var densidad = P.FLUIDOS[estado.fluido].densidad;
    contenedor.querySelector("#lab-resumen").textContent =
      "Con " + estado.H + " metros de agua, la presión en el fondo es de " + P.formatearPresion(P.presion(estado.H, densidad)) +
      " y la fuerza por metro de ancho es de " + P.formatearFuerza(P.fuerzaPorMetro(estado.H, densidad)) + ".";
  }

  entradaH.addEventListener("input", function () {
    estado.H = Number(entradaH.value);
    animarHasta(estado.H);
  });
  entradaH.addEventListener("change", anunciar);
  selectorFluido.addEventListener("change", function () {
    estado.fluido = selectorFluido.value;
    refrescar(estado.mostrado);
    anunciar();
  });
  casillaDoble.addEventListener("change", function () {
    estado.doble = casillaDoble.checked;
    refrescar(estado.mostrado);
  });

  contenedor.classList.add("lab-activo");
  refrescar(estado.H);
})();
