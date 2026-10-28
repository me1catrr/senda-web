/*
 * Filtro de las fichas de especies por origen. Sin JavaScript se ven todas las fichas.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaPeces = fabrica(raiz);
  }
})(typeof self !== "undefined" ? self : this, function (ventana) {
  "use strict";

  var FILTROS = [
    { id: "todas", etiqueta: "Todas", coincide: function () { return true; } },
    { id: "autoctona", etiqueta: "Autóctonas", coincide: function (origen) { return origen === "autoctona"; } },
    { id: "invasora", etiqueta: "Invasoras y exóticas", coincide: function (origen) { return origen !== "autoctona"; } },
  ];

  /** Cuántos elementos de una lista de orígenes pasan un filtro. */
  function contar(origenes, idFiltro) {
    var filtro = FILTROS.filter(function (f) { return f.id === idFiltro; })[0] || FILTROS[0];
    return origenes.filter(filtro.coincide).length;
  }

  function montar() {
    var contenedor = document.getElementById("peces");
    if (!contenedor) return;
    var fichas = Array.prototype.slice.call(contenedor.querySelectorAll(".especie"));
    if (fichas.length === 0) return;

    var barra = document.createElement("div");
    barra.className = "peces-filtros";
    barra.setAttribute("role", "group");
    barra.setAttribute("aria-label", "Filtrar especies por origen");
    var estado = document.createElement("p");
    estado.className = "sr-solo";
    estado.setAttribute("aria-live", "polite");

    FILTROS.forEach(function (filtro, i) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton boton-filtro";
      boton.textContent = filtro.etiqueta;
      boton.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      boton.addEventListener("click", function () {
        Array.prototype.forEach.call(barra.children, function (b) { b.setAttribute("aria-pressed", "false"); });
        boton.setAttribute("aria-pressed", "true");
        var visibles = 0;
        fichas.forEach(function (ficha) {
          var ver = filtro.coincide(ficha.dataset.origen);
          ficha.hidden = !ver;
          if (ver) visibles += 1;
        });
        estado.textContent = visibles + " especies mostradas.";
      });
      barra.appendChild(boton);
    });

    contenedor.insertBefore(estado, contenedor.firstChild);
    contenedor.insertBefore(barra, contenedor.firstChild);
    contenedor.classList.add("peces-activo");
  }

  if (ventana && ventana.document) {
    if (ventana.document.readyState === "loading") {
      ventana.document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  }

  return { FILTROS: FILTROS, contar: contar };
});
