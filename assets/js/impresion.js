/*
 * Modo de impresión de la ficha: al imprimir o generar un PDF, muestra todo el contenido
 * (desplegables abiertos, todas las pestañas y estaciones, cuestionario con respuestas)
 * y al terminar lo deja como estaba. Con «?pdf=1» en la dirección se activa de forma permanente,
 * que es lo que usa scripts/generar_pdf.py.
 */
(function () {
  "use strict";

  var guardado = null;

  function titulosDePestana() {
    var creados = [];
    document.querySelectorAll(".tab-pane").forEach(function (panel) {
      var pestana = document.getElementById(panel.getAttribute("aria-labelledby"));
      if (!pestana) return;
      var titulo = document.createElement("h4");
      titulo.className = "titulo-impresion";
      titulo.textContent = pestana.textContent;
      panel.insertBefore(titulo, panel.firstChild);
      creados.push(titulo);
    });
    return creados;
  }

  function preparar() {
    if (guardado) return;
    document.body.classList.add("modo-impresion");
    guardado = { desplegables: [], ocultos: [], titulos: [] };

    document.querySelectorAll("details").forEach(function (d) {
      guardado.desplegables.push([d, d.open]);
      d.open = true;
    });
    // elementos que el JavaScript de la página oculta (estaciones no activas, cuestionario estático)
    document.querySelectorAll(".estacion[hidden], .quiz-estatico[hidden]").forEach(function (nodo) {
      guardado.ocultos.push(nodo);
      nodo.hidden = false;
    });
    guardado.titulos = titulosDePestana();
  }

  function restaurar() {
    if (!guardado) return;
    guardado.desplegables.forEach(function (par) { par[0].open = par[1]; });
    guardado.ocultos.forEach(function (nodo) { nodo.hidden = true; });
    guardado.titulos.forEach(function (titulo) { titulo.remove(); });
    document.body.classList.remove("modo-impresion");
    guardado = null;
  }

  window.addEventListener("beforeprint", preparar);
  window.addEventListener("afterprint", restaurar);

  if (/[?&]pdf=1(&|$)/.test(window.location.search)) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { window.setTimeout(preparar, 0); });
    } else {
      window.setTimeout(preparar, 0);
    }
  }
})();
