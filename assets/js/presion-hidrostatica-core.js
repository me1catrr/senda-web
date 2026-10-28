/*
 * Cálculos del laboratorio de presión hidrostática. Sin DOM, para poder probarlos con Node.
 * Modelo idealizado: agua en reposo contra un muro vertical, sin contar la presión atmosférica.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaPresion = fabrica();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var G = 9.81; // m/s²
  var FLUIDOS = {
    dulce: { nombre: "Agua dulce", densidad: 1000 },
    salada: { nombre: "Agua salada", densidad: 1025 },
  };

  /** Presión manométrica a una profundidad h (m), en pascales: p = ρ·g·h */
  function presion(h, densidad) {
    return densidad * G * h;
  }

  /** Fuerza total por metro de ancho de muro (N/m) con altura de agua H: F = ½·ρ·g·H² */
  function fuerzaPorMetro(H, densidad) {
    return 0.5 * densidad * G * H * H;
  }

  /** Altura sobre el fondo (m) a la que actúa la resultante: un tercio de H */
  function puntoAplicacion(H) {
    return H / 3;
  }

  /** Número con coma decimal y espacio fino como separador de miles. */
  function formatear(valor, decimales) {
    var partes = Math.abs(valor).toFixed(decimales).split(".");
    var entera = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    var texto = partes.length > 1 ? entera + "," + partes[1] : entera;
    return valor < 0 ? "-" + texto : texto;
  }

  /** Presión legible: kPa por debajo de 1 MPa y MPa a partir de ahí. */
  function formatearPresion(pascales) {
    return pascales >= 1e6
      ? formatear(pascales / 1e6, 2) + " MPa"
      : formatear(pascales / 1e3, 1) + " kPa";
  }

  /** Fuerza por metro legible en kN/m o MN/m. */
  function formatearFuerza(newtonsPorMetro) {
    return newtonsPorMetro >= 1e6
      ? formatear(newtonsPorMetro / 1e6, 2) + " MN/m"
      : formatear(newtonsPorMetro / 1e3, 1) + " kN/m";
  }

  return {
    G: G,
    FLUIDOS: FLUIDOS,
    presion: presion,
    fuerzaPorMetro: fuerzaPorMetro,
    puntoAplicacion: puntoAplicacion,
    formatear: formatear,
    formatearPresion: formatearPresion,
    formatearFuerza: formatearFuerza,
  };
});
