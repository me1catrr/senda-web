/*
 * Modo explorador: progreso de los retos y cuestionario con explicación.
 * Todo ocurre en el navegador. Solo se recuerdan, en este dispositivo, los retos marcados como hechos
 * (una lista de identificadores de reto); el cuestionario no guarda nada y no hay peticiones de red.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaExplorador = fabrica(raiz);
  }
})(typeof self !== "undefined" ? self : this, function (ventana) {
  "use strict";

  var CLAVE_RETOS = "senda-r06-retos";
  var CATEGORIAS = {
    matematicas: "Matemáticas",
    fisica: "Física",
    ingenieria: "Ingeniería",
    naturaleza: "Naturaleza y animales",
  };

  /** Texto de progreso de los retos: «2 de 5 retos completados». */
  function textoProgreso(hechos, total) {
    return hechos + " de " + total + (total === 1 ? " reto completado" : " retos completados");
  }

  /** Corrige una respuesta: devuelve true si el índice elegido es el de la opción correcta. */
  function corregir(pregunta, elegida) {
    return elegida === pregunta.correcta;
  }

  /** Cuenta los aciertos de una lista de respuestas (una por pregunta; null si no se contestó). */
  function puntuar(preguntas, respuestas) {
    return preguntas.reduce(function (aciertos, pregunta, i) {
      return aciertos + (respuestas[i] !== null && respuestas[i] !== undefined && corregir(pregunta, respuestas[i]) ? 1 : 0);
    }, 0);
  }

  /** Aciertos y total por materia, en el orden de CATEGORIAS; ignora las preguntas sin materia. */
  function desglose(preguntas, respuestas) {
    return Object.keys(CATEGORIAS)
      .map(function (clave) {
        var total = 0;
        var aciertos = 0;
        preguntas.forEach(function (pregunta, i) {
          if (pregunta.categoria !== clave) return;
          total += 1;
          if (respuestas[i] !== null && respuestas[i] !== undefined && corregir(pregunta, respuestas[i])) aciertos += 1;
        });
        return { categoria: clave, etiqueta: CATEGORIAS[clave], aciertos: aciertos, total: total };
      })
      .filter(function (fila) { return fila.total > 0; });
  }

  /** Mensaje final según la proporción de aciertos. */
  function valoracion(aciertos, total) {
    var proporcion = total === 0 ? 0 : aciertos / total;
    if (proporcion === 1) return "¡Perfecto! Eres un explorador o una exploradora de La Breña.";
    if (proporcion >= 0.75) return "¡Muy bien! Casi lo tienes todo.";
    if (proporcion >= 0.5) return "Buen comienzo. Relee las explicaciones y vuelve a intentarlo.";
    return "Aún queda por descubrir. Repasa la sección de la presa y prueba de nuevo.";
  }

  // ---------- Parte del navegador ----------

  function leerRetosGuardados() {
    try {
      var texto = ventana.localStorage.getItem(CLAVE_RETOS);
      var lista = texto ? JSON.parse(texto) : [];
      return Array.isArray(lista) ? lista.filter(function (x) { return typeof x === "string"; }) : [];
    } catch (error) {
      return [];
    }
  }

  function guardarRetos(lista) {
    try {
      ventana.localStorage.setItem(CLAVE_RETOS, JSON.stringify(lista));
    } catch (error) {
      /* el navegador puede bloquear el almacenamiento; la página sigue funcionando */
    }
  }

  function montarRetos() {
    var contenedor = document.getElementById("retos");
    if (!contenedor) return;
    var casillas = Array.prototype.slice.call(contenedor.querySelectorAll("input.reto-hecho"));
    if (casillas.length === 0) return;
    var progreso = document.getElementById("retos-progreso");
    var barra = document.getElementById("retos-barra");
    var guardados = leerRetosGuardados();

    function actualizar() {
      var hechos = casillas.filter(function (c) { return c.checked; });
      progreso.textContent = textoProgreso(hechos.length, casillas.length) + (hechos.length === casillas.length ? ". ¡Misión cumplida!" : "");
      barra.max = casillas.length;
      barra.value = hechos.length;
      guardarRetos(hechos.map(function (c) { return c.dataset.reto; }));
    }

    casillas.forEach(function (casilla) {
      casilla.checked = guardados.indexOf(casilla.dataset.reto) !== -1;
      casilla.addEventListener("change", actualizar);
    });
    contenedor.classList.add("retos-activo");
    actualizar();
  }

  function montarCuestionario() {
    var contenedor = document.getElementById("quiz");
    var origen = document.getElementById("datos-r06");
    if (!contenedor || !origen) return;
    var preguntas = JSON.parse(origen.textContent).quiz.preguntas;
    if (!preguntas || preguntas.length === 0) return;

    var estado = { indice: 0, respuestas: preguntas.map(function () { return null; }) };
    var zona = document.createElement("div");
    zona.className = "quiz-interactivo";

    function nodo(etiqueta, clase, texto) {
      var n = document.createElement(etiqueta);
      if (clase) n.className = clase;
      if (texto) n.textContent = texto;
      return n;
    }

    function mostrarPregunta(enfocar) {
      var pregunta = preguntas[estado.indice];
      zona.textContent = "";
      var materia = CATEGORIAS[pregunta.categoria] ? " · " + CATEGORIAS[pregunta.categoria] : "";
      zona.appendChild(nodo("p", "quiz-contador", "Pregunta " + (estado.indice + 1) + " de " + preguntas.length + materia));
      var titulo = nodo("h4", "quiz-pregunta", pregunta.pregunta);
      titulo.id = "quiz-pregunta";
      titulo.tabIndex = -1;
      zona.appendChild(titulo);
      var opciones = nodo("div", "quiz-opciones");
      opciones.setAttribute("role", "group");
      opciones.setAttribute("aria-labelledby", "quiz-pregunta");
      var retroalimentacion = nodo("div", "quiz-retro");
      retroalimentacion.setAttribute("aria-live", "polite");

      pregunta.opciones.forEach(function (texto, i) {
        var boton = nodo("button", "quiz-opcion", texto);
        boton.type = "button";
        boton.addEventListener("click", function () { responder(i, opciones, retroalimentacion, pregunta); });
        opciones.appendChild(boton);
      });
      zona.appendChild(opciones);
      zona.appendChild(retroalimentacion);
      // Solo se mueve el foco tras una acción del visitante; al cargar la página no debe desplazarla
      if (enfocar) titulo.focus();
    }

    function responder(elegida, opciones, retroalimentacion, pregunta) {
      estado.respuestas[estado.indice] = elegida;
      var botones = Array.prototype.slice.call(opciones.children);
      botones.forEach(function (boton, i) {
        boton.disabled = true;
        if (i === pregunta.correcta) {
          boton.classList.add("quiz-correcta");
          boton.textContent = "✓ " + boton.textContent;
        } else if (i === elegida) {
          boton.classList.add("quiz-incorrecta");
          boton.textContent = "✗ " + boton.textContent;
        }
      });
      var acierto = corregir(pregunta, elegida);
      retroalimentacion.appendChild(nodo("p", "quiz-veredicto " + (acierto ? "quiz-bien" : "quiz-mal"), acierto ? "¡Correcto!" : "No es esa."));
      retroalimentacion.appendChild(nodo("p", "quiz-explicacion", pregunta.explicacion));
      var ultima = estado.indice === preguntas.length - 1;
      var siguiente = nodo("button", "boton", ultima ? "Ver el resultado" : "Siguiente pregunta");
      siguiente.type = "button";
      siguiente.addEventListener("click", function () {
        if (ultima) mostrarResultado();
        else {
          estado.indice += 1;
          mostrarPregunta(true);
        }
      });
      retroalimentacion.appendChild(siguiente);
      siguiente.focus();
    }

    function mostrarResultado() {
      var aciertos = puntuar(preguntas, estado.respuestas);
      zona.textContent = "";
      var titulo = nodo("h4", "quiz-resultado", "Has acertado " + aciertos + " de " + preguntas.length);
      titulo.tabIndex = -1;
      zona.appendChild(titulo);
      zona.appendChild(nodo("p", "", valoracion(aciertos, preguntas.length)));
      var filas = desglose(preguntas, estado.respuestas);
      if (filas.length > 0) {
        var lista = nodo("ul", "quiz-desglose");
        filas.forEach(function (fila) {
          lista.appendChild(nodo("li", "", fila.etiqueta + ": " + fila.aciertos + " de " + fila.total));
        });
        zona.appendChild(lista);
      }
      var otra = nodo("button", "boton", "Repetir el cuestionario");
      otra.type = "button";
      otra.addEventListener("click", function () {
        estado.indice = 0;
        estado.respuestas = preguntas.map(function () { return null; });
        mostrarPregunta(true);
      });
      zona.appendChild(otra);
      titulo.focus();
    }

    var estatico = contenedor.querySelector(".quiz-estatico");
    if (estatico) estatico.hidden = true;
    contenedor.appendChild(zona);
    contenedor.classList.add("quiz-activo");
    mostrarPregunta(false);
  }

  function montar() {
    montarRetos();
    montarCuestionario();
    var imprimir = document.getElementById("imprimir");
    if (imprimir) {
      imprimir.hidden = false;
      imprimir.addEventListener("click", function () { ventana.print(); });
    }
  }

  if (ventana && ventana.document) {
    if (ventana.document.readyState === "loading") {
      ventana.document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  }

  return { CATEGORIAS: CATEGORIAS, textoProgreso: textoProgreso, corregir: corregir, puntuar: puntuar, desglose: desglose, valoracion: valoracion };
});
