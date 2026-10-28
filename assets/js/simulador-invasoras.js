/*
 * Simulador «¿qué pasa si alguien suelta un pez?». Es un modelo de juguete (crecimiento logístico con
 * competencia entre dos poblaciones). No usa datos de La Breña ni predice nada real: sirve para entender
 * por qué una especie exótica que crece rápido y desplaza a las autóctonas es un problema.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaInvasoras = fabrica(raiz);
  }
})(typeof self !== "undefined" ? self : this, function (ventana) {
  "use strict";

  // Capacidad del ambiente (individuos), crecimiento de cada población y cuánto perjudica una a la otra.
  var PARAMETROS = { K: 100, rNativas: 0.25, rExoticas: 0.6, alfa: 1.5, beta: 0.3, anios: 30, nativas0: 80 };

  /** Evoluciona las dos poblaciones año a año. Devuelve las series de nativas y exóticas. */
  function simular(exoticas0, p) {
    p = p || PARAMETROS;
    var nativas = [p.nativas0];
    var exoticas = [exoticas0];
    for (var t = 0; t < p.anios; t++) {
      var n = nativas[t];
      var e = exoticas[t];
      var siguienteN = n + p.rNativas * n * (1 - (n + p.alfa * e) / p.K);
      var siguienteE = e + p.rExoticas * e * (1 - (e + p.beta * n) / p.K);
      nativas.push(Math.max(0, siguienteN));
      exoticas.push(Math.max(0, siguienteE));
    }
    return { nativas: nativas, exoticas: exoticas };
  }

  /** Frase que resume cómo acaba el último año de la simulación. */
  function veredicto(resultado, exoticas0) {
    var n = resultado.nativas[resultado.nativas.length - 1];
    var e = resultado.exoticas[resultado.exoticas.length - 1];
    if (exoticas0 === 0) return "Sin especies exóticas, las autóctonas se estabilizan en lo que da de sí el ambiente.";
    if (n < 5) return "Las autóctonas casi han desaparecido: la especie exótica ha ocupado su sitio.";
    if (n < resultado.nativas[0] * 0.6) return "Las autóctonas han perdido buena parte de su población.";
    if (e > n) return "Las exóticas son ya más numerosas que las autóctonas.";
    return "Las autóctonas resisten, pero su espacio se ha reducido.";
  }

  // ---------- Parte del navegador ----------

  function montar() {
    var contenedor = document.getElementById("sim-invasoras");
    if (!contenedor) return;
    var NS = "http://www.w3.org/2000/svg";
    var ANCHO = 520;
    var ALTO = 280;
    var margen = { izq: 46, der: 16, sup: 16, inf: 38 };
    var p = PARAMETROS;
    var reducir = ventana.matchMedia && ventana.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var estado = { exoticas0: 0, hasta: p.anios, temporizador: null };

    contenedor.innerHTML =
      '<div class="lab-controles">' +
      '<div class="lab-campo"><label for="sim-n">Peces exóticos que alguien suelta: <strong id="sim-n-valor">0</strong></label>' +
      '<input id="sim-n" type="range" min="0" max="10" step="1" value="0"></div>' +
      '<div class="lab-campo"><button type="button" id="sim-reproducir" class="boton">Ver cómo pasan los años</button></div>' +
      "</div>" +
      '<svg id="sim-svg" viewBox="0 0 ' + ANCHO + " " + ALTO + '" role="img" aria-label=""></svg>' +
      '<p id="sim-lectura" class="sim-lectura" aria-live="polite"></p>' +
      '<p class="lab-rotulo"><strong>Modelo de juguete.</strong> Dos poblaciones que compiten por el mismo espacio. ' +
      "Los números son inventados para enseñar la idea; no son datos de La Breña.</p>";

    var svg = contenedor.querySelector("#sim-svg");
    var control = contenedor.querySelector("#sim-n");
    var boton = contenedor.querySelector("#sim-reproducir");
    var lectura = contenedor.querySelector("#sim-lectura");

    function el(nombre, atributos, texto) {
      var nodo = document.createElementNS(NS, nombre);
      Object.keys(atributos).forEach(function (k) { nodo.setAttribute(k, atributos[k]); });
      if (texto) nodo.textContent = texto;
      return nodo;
    }

    function dibujar(resultado, hasta) {
      svg.textContent = "";
      var x = function (t) { return margen.izq + (t / p.anios) * (ANCHO - margen.izq - margen.der); };
      var y = function (v) { return margen.sup + (1 - v / (p.K * 1.05)) * (ALTO - margen.sup - margen.inf); };
      [0, 25, 50, 75, 100].forEach(function (v) {
        svg.appendChild(el("line", { x1: margen.izq, y1: y(v), x2: ANCHO - margen.der, y2: y(v), stroke: "#1d3a2a", "stroke-opacity": 0.15 }));
        svg.appendChild(el("text", { x: margen.izq - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "#3b5a45" }, String(v)));
      });
      [0, 10, 20, 30].forEach(function (t) {
        svg.appendChild(el("text", { x: x(t), y: ALTO - 18, "text-anchor": "middle", "font-size": 11, fill: "#3b5a45" }, String(t)));
      });
      svg.appendChild(el("text", { x: (ANCHO + margen.izq) / 2, y: ALTO - 3, "text-anchor": "middle", "font-size": 11, fill: "#3b5a45" }, "años desde la suelta"));
      [["nativas", "#2f8f46", "Peces autóctonos"], ["exoticas", "#b3261e", "Peces exóticos"]].forEach(function (serie, i) {
        var puntos = resultado[serie[0]].slice(0, hasta + 1).map(function (v, t) { return x(t).toFixed(1) + "," + y(v).toFixed(1); }).join(" ");
        svg.appendChild(el("polyline", { points: puntos, fill: "none", stroke: serie[1], "stroke-width": 3 }));
        svg.appendChild(el("rect", { x: margen.izq + 8 + i * 150, y: margen.sup + 2, width: 12, height: 12, fill: serie[1] }));
        svg.appendChild(el("text", { x: margen.izq + 26 + i * 150, y: margen.sup + 13, "font-size": 12, fill: "#1d3a2a" }, serie[2]));
      });
      var n = resultado.nativas[hasta];
      var e = resultado.exoticas[hasta];
      lectura.textContent = "Año " + hasta + ": autóctonos " + Math.round(n) + ", exóticos " + Math.round(e) + ". " + (hasta === p.anios ? veredicto(resultado, estado.exoticas0) : "");
      svg.setAttribute("aria-label", "Gráfico de la evolución de dos poblaciones de peces durante " + p.anios + " años. " + lectura.textContent);
    }

    function refrescar(hasta) {
      dibujar(simular(estado.exoticas0), hasta);
    }

    function parar() {
      if (estado.temporizador) ventana.clearInterval(estado.temporizador);
      estado.temporizador = null;
    }

    control.addEventListener("input", function () {
      parar();
      estado.exoticas0 = Number(control.value);
      contenedor.querySelector("#sim-n-valor").textContent = control.value;
      refrescar(p.anios);
    });
    boton.addEventListener("click", function () {
      parar();
      if (reducir) {
        refrescar(p.anios);
        return;
      }
      var año = 0;
      refrescar(0);
      estado.temporizador = ventana.setInterval(function () {
        año += 1;
        refrescar(año);
        if (año >= p.anios) parar();
      }, 180);
    });

    contenedor.classList.add("sim-activo");
    refrescar(p.anios);
  }

  if (ventana && ventana.document) {
    if (ventana.document.readyState === "loading") {
      ventana.document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  }

  return { PARAMETROS: PARAMETROS, simular: simular, veredicto: veredicto };
});
