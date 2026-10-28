/*
 * Referencias al margen: junto a cada dato con fuente, en la columna derecha, aparece la referencia
 * citada mientras lees. Es una mejora progresiva: sin JavaScript, o en pantallas estrechas, siguen
 * los números en el texto y la lista de fuentes al final.
 * Para no saturar el margen, cada fuente se muestra completa la primera vez que se cita dentro de
 * una misma sección; las siguientes menciones conservan solo su número.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaMargen = fabrica(raiz);
  }
})(typeof self !== "undefined" ? self : this, function (ventana) {
  "use strict";

  var TIPOS = { oficial: "Oficial", tecnica: "Técnica", secundaria: "Secundaria", libro: "Bibliografía" };
  var SEPARACION = 8; // px entre notas

  /** Decide qué referencias se muestran: la primera vez que una fuente aparece en cada sección. */
  function primerasMenciones(menciones) {
    var vistas = {};
    return menciones.map(function (m) {
      var clave = m.seccion + "|" + m.fuente;
      if (vistas[clave]) return false;
      vistas[clave] = true;
      return true;
    });
  }

  /** Reparte posiciones verticales (en px) sin que dos notas se solapen. */
  function repartir(objetivos, alturas) {
    var limite = 0;
    return objetivos.map(function (y, i) {
      if (y === null) return null; // la referencia no está visible
      var top = Math.max(y, limite);
      limite = top + alturas[i] + SEPARACION;
      return top;
    });
  }

  /** ¿Está la referencia a la vista? Un desplegable cerrado oculta su contenido sin quitarlo del diseño. */
  function estaOculta(ref) {
    if (ref.closest("[hidden]")) return true;
    var detalle = ref.closest("details");
    while (detalle) {
      if (!detalle.open && !ref.closest("summary")) return true;
      detalle = detalle.parentElement ? detalle.parentElement.closest("details") : null;
    }
    return ref.offsetParent === null;
  }

  function fechaEs(iso) {
    var p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  // ---------- Parte del navegador ----------

  function montar() {
    var origen = document.getElementById("datos-r06");
    var contenido = document.getElementById("quarto-document-content");
    if (!origen || !contenido) return;
    var datos = JSON.parse(origen.textContent);
    var numeros = {};
    datos.orden_fuentes.forEach(function (id, i) { numeros[id] = i + 1; });

    var enlaces = Array.prototype.slice.call(contenido.querySelectorAll("sup.refs a[href^='#fuente-']"));
    var menciones = enlaces.map(function (a) {
      var seccion = a.closest("section.level2");
      return { seccion: seccion ? seccion.id : "inicio", fuente: a.getAttribute("href").slice("#fuente-".length) };
    });
    var mostrar = primerasMenciones(menciones);

    var caja = document.createElement("div");
    caja.className = "senda-margen";
    caja.setAttribute("role", "complementary");
    caja.setAttribute("aria-label", "Fuentes de lo que estás leyendo");
    var notas = [];

    enlaces.forEach(function (enlace, i) {
      var fuente = datos.fuentes[menciones[i].fuente];
      if (!mostrar[i] || !fuente) return;
      var nota = document.createElement("aside");
      nota.className = "senda-margen-nota";
      var numero = document.createElement("span");
      numero.className = "senda-margen-num";
      numero.textContent = "[" + numeros[menciones[i].fuente] + "]";
      nota.appendChild(numero);
      var titulo = fuente.url ? document.createElement("a") : document.createElement("span");
      titulo.textContent = " " + fuente.titulo;
      if (fuente.url) {
        titulo.href = fuente.url;
        titulo.rel = "noopener noreferrer";
      }
      nota.appendChild(titulo);
      var meta = document.createElement("span");
      meta.className = "senda-margen-meta";
      meta.textContent = fuente.entidad + " · " + (TIPOS[fuente.tipo] || fuente.tipo) + " · consultada el " + fechaEs(fuente.consultada);
      nota.appendChild(meta);
      nota.addEventListener("mouseenter", function () { enlace.classList.add("ref-activa"); });
      nota.addEventListener("mouseleave", function () { enlace.classList.remove("ref-activa"); });
      enlace.addEventListener("mouseenter", function () { nota.classList.add("senda-margen-activa"); });
      enlace.addEventListener("mouseleave", function () { nota.classList.remove("senda-margen-activa"); });
      caja.appendChild(nota);
      notas.push({ ref: enlace, nota: nota });
    });
    if (notas.length === 0) return;
    contenido.appendChild(caja);
    contenido.classList.add("con-margen");

    var pendiente = false;
    function colocar() {
      pendiente = false;
      var visible = ventana.matchMedia("(min-width: 1200px)").matches;
      caja.hidden = !visible;
      if (!visible) return;
      var base = caja.getBoundingClientRect().top + ventana.scrollY;
      notas.forEach(function (n) {
        n.nota.hidden = estaOculta(n.ref);
      });
      var visibles = notas.filter(function (n) { return !n.nota.hidden; });
      var objetivos = visibles.map(function (n) { return n.ref.getBoundingClientRect().top + ventana.scrollY - base; });
      var tops = repartir(objetivos, visibles.map(function (n) { return n.nota.offsetHeight; }));
      visibles.forEach(function (n, i) { n.nota.style.top = tops[i] + "px"; });
    }
    function pedirColocar() {
      if (pendiente) return;
      pendiente = true;
      ventana.setTimeout(colocar, 16); // se agrupan los cambios seguidos en un solo recálculo
    }

    ventana.addEventListener("resize", pedirColocar);
    ventana.addEventListener("load", pedirColocar);
    document.addEventListener("toggle", pedirColocar, true); // <details> abierto o cerrado
    document.addEventListener("click", function () { ventana.setTimeout(pedirColocar, 60); }); // pestañas, filtros, botones
    if (ventana.ResizeObserver) new ventana.ResizeObserver(pedirColocar).observe(contenido);
    pedirColocar();
  }

  if (ventana && ventana.document) {
    if (ventana.document.readyState === "loading") {
      ventana.document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  }

  return { primerasMenciones: primerasMenciones, repartir: repartir, fechaEs: fechaEs };
});
