/*
 * «Calcula tu salida»: tiempo de marcha, hora de llegada, pasos y energía potencial ganada al subir.
 * Solo usa los números que escribe la familia; no incluye datos de ninguna ruta real.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaCaminata = fabrica(raiz);
  }
})(typeof self !== "undefined" ? self : this, function (ventana) {
  "use strict";

  var G = 9.81; // m/s²

  /** Horas de marcha para recorrer `km` a `kmh` kilómetros por hora. */
  function horasDeMarcha(km, kmh) {
    return kmh > 0 ? km / kmh : 0;
  }

  /** «1 h 05 min» a partir de horas decimales. */
  function formatoDuracion(horas) {
    var minutos = Math.round(horas * 60);
    var h = Math.floor(minutos / 60);
    var m = minutos % 60;
    return h + " h " + (m < 10 ? "0" : "") + m + " min";
  }

  /** Hora de llegada «HH:MM» sumando minutos a una hora de salida «HH:MM» (pasa de medianoche). */
  function horaDeLlegada(salida, minutos) {
    var partes = salida.split(":");
    var total = (Number(partes[0]) * 60 + Number(partes[1]) + Math.round(minutos)) % (24 * 60);
    var h = Math.floor(total / 60);
    var m = total % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  /** Número de pasos para una distancia (km) con una longitud de paso (cm). */
  function pasos(km, pasoCm) {
    return Math.round((km * 100000) / pasoCm);
  }

  /** Energía potencial ganada al subir `desnivel` metros con una masa en kg: E = m·g·h, en julios. */
  function energiaPotencial(masaKg, desnivelM) {
    return masaKg * G * desnivelM;
  }

  function numeroEs(valor, decimales) {
    var partes = Math.abs(valor).toFixed(decimales).split(".");
    var entera = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return partes.length > 1 ? entera + "," + partes[1] : entera;
  }

  // ---------- Parte del navegador ----------

  function montar() {
    var contenedor = document.getElementById("calc-caminata");
    if (!contenedor) return;
    var campos = [
      ["km", "Distancia", "km", 1, 20, 0.5, 5],
      ["ritmo", "Ritmo de marcha", "km/h", 1.5, 5, 0.1, 3],
      ["paradas", "Tiempo de paradas", "min", 0, 120, 5, 20],
      ["masa", "Masa de la persona", "kg", 20, 100, 1, 40],
      ["desnivel", "Desnivel que se sube", "m", 0, 600, 10, 100],
      ["paso", "Longitud del paso", "cm", 40, 80, 1, 55],
    ];
    var html = '<div class="calc-campos">';
    campos.forEach(function (c) {
      html +=
        '<div class="lab-campo"><label for="calc-' + c[0] + '">' + c[1] + ': <strong id="calc-' + c[0] + '-v"></strong> ' + c[2] + "</label>" +
        '<input id="calc-' + c[0] + '" type="range" min="' + c[3] + '" max="' + c[4] + '" step="' + c[5] + '" value="' + c[6] + '"></div>';
    });
    html +=
      '<div class="lab-campo"><label for="calc-salida">Hora de salida</label><input id="calc-salida" type="time" value="09:00" class="calc-hora"></div></div>' +
      '<dl class="lab-lecturas">' +
      '<div><dt>Tiempo caminando</dt><dd id="calc-marcha"></dd></div>' +
      '<div><dt>Tiempo total con paradas</dt><dd id="calc-total"></dd></div>' +
      '<div><dt>Hora de llegada</dt><dd id="calc-llegada"></dd></div>' +
      '<div><dt>Pasos que daréis</dt><dd id="calc-pasos"></dd></div>' +
      '<div><dt>Energía potencial ganada</dt><dd id="calc-energia"></dd></div>' +
      "</dl>" +
      '<p class="lab-rotulo"><strong>Cómo se calcula.</strong> Tiempo = distancia ÷ ritmo. Pasos = distancia ÷ longitud del paso. ' +
      "Energía potencial = masa × 9,81 × desnivel: es lo que “almacena” tu cuerpo al subir. " +
      "Son números de ejemplo para practicar; no son datos de ninguna ruta.</p>";
    contenedor.innerHTML = html;

    function leer(id) { return Number(contenedor.querySelector("#calc-" + id).value); }
    function actualizar() {
      campos.forEach(function (c) { contenedor.querySelector("#calc-" + c[0] + "-v").textContent = numeroEs(leer(c[0]), c[5] < 1 ? 1 : 0); });
      var horas = horasDeMarcha(leer("km"), leer("ritmo"));
      var total = horas * 60 + leer("paradas");
      var salida = contenedor.querySelector("#calc-salida").value || "09:00";
      contenedor.querySelector("#calc-marcha").textContent = formatoDuracion(horas);
      contenedor.querySelector("#calc-total").textContent = formatoDuracion(total / 60);
      contenedor.querySelector("#calc-llegada").textContent = horaDeLlegada(salida, total);
      contenedor.querySelector("#calc-pasos").textContent = numeroEs(pasos(leer("km"), leer("paso")), 0);
      contenedor.querySelector("#calc-energia").textContent = numeroEs(energiaPotencial(leer("masa"), leer("desnivel")) / 1000, 1) + " kJ";
    }
    contenedor.addEventListener("input", actualizar);
    contenedor.classList.add("calc-activo");
    actualizar();
  }

  if (ventana && ventana.document) {
    if (ventana.document.readyState === "loading") {
      ventana.document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  }

  return { horasDeMarcha: horasDeMarcha, formatoDuracion: formatoDuracion, horaDeLlegada: horaDeLlegada, pasos: pasos, energiaPotencial: energiaPotencial };
});
