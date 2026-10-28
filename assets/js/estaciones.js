/*
 * Selector de estaciones. Sin JavaScript, la página muestra las cuatro estaciones una tras otra;
 * con JavaScript se convierte en pestañas accesibles (flechas, Inicio y Fin) y abre la estación actual.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaEstaciones = fabrica(raiz);
  }
})(typeof self !== "undefined" ? self : this, function (ventana) {
  "use strict";

  /** Estación meteorológica del hemisferio norte para una fecha (marzo–mayo = primavera). */
  function estacionActual(fecha) {
    var mes = fecha.getMonth(); // 0 = enero
    if (mes >= 2 && mes <= 4) return "primavera";
    if (mes >= 5 && mes <= 7) return "verano";
    if (mes >= 8 && mes <= 10) return "otono";
    return "invierno";
  }

  /** Índice de la pestaña a la que se llega con una tecla; si la tecla no navega, devuelve el mismo. */
  function indiceTrasTecla(indice, tecla, total) {
    switch (tecla) {
      case "ArrowRight":
      case "ArrowDown":
        return (indice + 1) % total;
      case "ArrowLeft":
      case "ArrowUp":
        return (indice - 1 + total) % total;
      case "Home":
        return 0;
      case "End":
        return total - 1;
      default:
        return indice;
    }
  }

  function montar() {
    var contenedor = document.getElementById("selector-estaciones");
    if (!contenedor) return;
    var paneles = Array.prototype.slice.call(contenedor.querySelectorAll(".estacion"));
    if (paneles.length === 0) return;

    var lista = document.createElement("div");
    lista.className = "estaciones-pestanas";
    lista.setAttribute("role", "tablist");
    lista.setAttribute("aria-label", "Estación del año");

    var pestanas = paneles.map(function (panel, i) {
      var titulo = panel.querySelector(".estacion-titulo").textContent;
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "estaciones-pestana";
      boton.id = "pestana-" + panel.dataset.estacion;
      boton.setAttribute("role", "tab");
      boton.setAttribute("aria-controls", panel.id);
      boton.textContent = titulo;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", boton.id);
      boton.addEventListener("click", function () { seleccionar(i, false); });
      boton.addEventListener("keydown", function (evento) {
        var destino = indiceTrasTecla(i, evento.key, paneles.length);
        if (destino !== i) {
          evento.preventDefault();
          seleccionar(destino, true);
        }
      });
      lista.appendChild(boton);
      return boton;
    });

    function seleccionar(indice, enfocar) {
      paneles.forEach(function (panel, i) {
        var activa = i === indice;
        panel.hidden = !activa;
        pestanas[i].setAttribute("aria-selected", activa ? "true" : "false");
        pestanas[i].tabIndex = activa ? 0 : -1;
      });
      if (enfocar) pestanas[indice].focus();
    }

    contenedor.insertBefore(lista, contenedor.firstChild);
    contenedor.classList.add("estaciones-activo");
    var actual = estacionActual(new Date());
    var inicial = paneles.findIndex(function (p) { return p.dataset.estacion === actual; });
    seleccionar(inicial < 0 ? 0 : inicial, false);
  }

  if (ventana && ventana.document) {
    if (ventana.document.readyState === "loading") {
      ventana.document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  }

  return { estacionActual: estacionActual, indiceTrasTecla: indiceTrasTecla };
});
