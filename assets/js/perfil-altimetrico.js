/*
 * Perfil altimétrico del recorrido. Solo se dibuja cuando existe un GPX propio validado
 * (datos.perfil con altitudes); mientras tanto la página muestra un aviso de «pendiente».
 * El control deslizante es accesible con teclado y avisa al mapa mediante el evento «senda:punto».
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaPerfil = fabrica(raiz);
  }
})(typeof self !== "undefined" ? self : this, function (ventana) {
  "use strict";

  /** Convierte el perfil (km y metros) en coordenadas de dibujo dentro de un rectángulo con márgenes. */
  function escalar(perfil, ancho, alto, margen) {
    var xs = perfil.distancia_km;
    var ys = perfil.altitud_m;
    var minimo = Math.floor(Math.min.apply(null, ys) / 10) * 10;
    var maximo = Math.ceil(Math.max.apply(null, ys) / 10) * 10;
    if (maximo === minimo) maximo = minimo + 10;
    var maxX = xs[xs.length - 1] || 1;
    var util = { x: ancho - margen.izq - margen.der, y: alto - margen.sup - margen.inf };
    return {
      minY: minimo,
      maxY: maximo,
      maxX: maxX,
      puntos: xs.map(function (x, i) {
        return {
          x: margen.izq + (x / maxX) * util.x,
          y: margen.sup + (1 - (ys[i] - minimo) / (maximo - minimo)) * util.y,
        };
      }),
    };
  }

  function hayPerfil(perfil) {
    return !!(perfil && perfil.altitud_m && perfil.altitud_m.length > 1);
  }

  // ---------- Parte del navegador ----------

  function montar() {
    var contenedor = document.getElementById("perfil-ruta");
    var origen = document.getElementById("datos-r06");
    if (!contenedor || !origen) return;
    var datos = JSON.parse(origen.textContent);
    if (!hayPerfil(datos.perfil)) return;

    var NS = "http://www.w3.org/2000/svg";
    var perfil = datos.perfil;
    var ancho = 600;
    var alto = 240;
    var margen = { izq: 52, der: 14, sup: 14, inf: 36 };
    var escala = escalar(perfil, ancho, alto, margen);

    function el(nombre, atributos, texto) {
      var nodo = document.createElementNS(NS, nombre);
      Object.keys(atributos).forEach(function (k) { nodo.setAttribute(k, atributos[k]); });
      if (texto) nodo.textContent = texto;
      return nodo;
    }

    var svg = el("svg", { viewBox: "0 0 " + ancho + " " + alto, role: "img", "aria-label": "Perfil altimétrico del recorrido grabado" });
    var linea = escala.puntos.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
    var fondo = escala.puntos[0].x + "," + (alto - margen.inf) + " " + linea + " " + escala.puntos[escala.puntos.length - 1].x + "," + (alto - margen.inf);
    svg.appendChild(el("polygon", { points: fondo, fill: "#42702a", "fill-opacity": 0.2 }));
    svg.appendChild(el("polyline", { points: linea, fill: "none", stroke: "#1d3a2a", "stroke-width": 2.5 }));
    [escala.minY, escala.maxY].forEach(function (m) {
      var y = margen.sup + (1 - (m - escala.minY) / (escala.maxY - escala.minY)) * (alto - margen.sup - margen.inf);
      svg.appendChild(el("text", { x: margen.izq - 6, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "#3b5a45" }, m + " m"));
    });
    svg.appendChild(el("text", { x: margen.izq, y: alto - 10, "font-size": 11, fill: "#3b5a45" }, "0 km"));
    svg.appendChild(el("text", { x: ancho - margen.der, y: alto - 10, "text-anchor": "end", "font-size": 11, fill: "#3b5a45" }, escala.maxX.toFixed(1).replace(".", ",") + " km"));
    var marca = el("circle", { r: 6, fill: "#b3261e", stroke: "#fff", "stroke-width": 2, cx: escala.puntos[0].x, cy: escala.puntos[0].y });
    svg.appendChild(marca);

    var control = document.createElement("input");
    control.type = "range";
    control.min = 0;
    control.max = escala.puntos.length - 1;
    control.value = 0;
    control.id = "perfil-control";
    var etiqueta = document.createElement("label");
    etiqueta.htmlFor = "perfil-control";
    etiqueta.textContent = "Recorre el perfil";
    var lectura = document.createElement("output");
    lectura.setAttribute("for", "perfil-control");
    lectura.setAttribute("aria-live", "polite");

    function actualizar() {
      var i = Number(control.value);
      marca.setAttribute("cx", escala.puntos[i].x);
      marca.setAttribute("cy", escala.puntos[i].y);
      lectura.textContent = perfil.distancia_km[i].toFixed(2).replace(".", ",") + " km · " + Math.round(perfil.altitud_m[i]) + " m de altitud";
      ventana.dispatchEvent(new CustomEvent("senda:punto", { detail: { indice: i, indices: perfil.indices || null } }));
    }
    control.addEventListener("input", actualizar);

    contenedor.textContent = "";
    contenedor.appendChild(svg);
    contenedor.appendChild(etiqueta);
    contenedor.appendChild(control);
    contenedor.appendChild(lectura);
    contenedor.classList.add("perfil-activo");
    actualizar();
  }

  if (ventana && ventana.document) {
    if (ventana.document.readyState === "loading") {
      ventana.document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  }

  return { escalar: escalar, hayPerfil: hayPerfil };
});
