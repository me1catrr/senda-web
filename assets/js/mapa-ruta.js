/*
 * Mapa de la ruta con Leaflet. Se carga bajo demanda: hasta que el visitante pulsa el botón,
 * el navegador no pide ninguna tesela a servidores externos.
 * Lee el GeoJSON incrustado en la página (#datos-r06); no hace peticiones propias.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.SendaMapa = fabrica(raiz);
  }
})(typeof self !== "undefined" ? self : this, function (ventana) {
  "use strict";

  var CAPAS = {
    ruta: "Ruta",
    interes: "Puntos de interés",
    patrimonio: "Patrimonio",
    naturaleza: "Naturaleza",
    peligros: "Peligros",
  };

  var TIPOS_A_CAPA = {
    salida: "interes",
    llegada: "interes",
    agua: "interes",
    mirador: "interes",
    aparcamiento: "interes",
    otro: "interes",
    patrimonio: "patrimonio",
    naturaleza: "naturaleza",
    geologia: "naturaleza",
    peligro: "peligros",
  };

  var TESELAS = {
    osm: {
      nombre: "Mapa (OpenStreetMap)",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      atribucion: '© <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
    },
    pnoa: {
      nombre: "Ortofoto (IGN-PNOA)",
      url:
        "https://www.ign.es/wmts/pnoa-ma?service=WMTS&request=GetTile&version=1.0.0&layer=OI.OrthoimageCoverage" +
        "&style=default&tilematrixset=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}&format=image/jpeg",
      atribucion: '© <a href="https://www.ign.es/">Instituto Geográfico Nacional de España</a> (CC BY 4.0)',
    },
  };

  /** Capa del mapa a la que pertenece un punto según su tipo. */
  function capaDe(tipo) {
    return TIPOS_A_CAPA[tipo] || "interes";
  }

  /** Reparte los puntos de un FeatureCollection por capa. */
  function repartir(coleccion) {
    var porCapa = { interes: [], patrimonio: [], naturaleza: [], peligros: [] };
    ((coleccion && coleccion.features) || []).forEach(function (f) {
      porCapa[capaDe(f.properties && f.properties.tipo)].push(f);
    });
    return porCapa;
  }

  // ---------- Parte del navegador ----------

  function iniciar(L, datos, lienzo) {
    var porCapa = repartir(datos.poi);
    var vista = datos.poi.vista_orientativa;
    var base = {};
    Object.keys(TESELAS).forEach(function (clave) {
      base[TESELAS[clave].nombre] = L.tileLayer(TESELAS[clave].url, { maxZoom: 19, attribution: TESELAS[clave].atribucion });
    });
    var mapa = L.map(lienzo, { center: vista.centro, zoom: vista.zoom, layers: [base[TESELAS.osm.nombre]] });

    var grupos = {};
    var superpuestas = {};
    Object.keys(CAPAS).forEach(function (clave) {
      grupos[clave] = L.layerGroup();
      var cantidad = clave === "ruta" ? (datos.track ? 1 : 0) : porCapa[clave].length;
      superpuestas[CAPAS[clave] + " (" + (cantidad || "sin datos") + ")"] = grupos[clave];
      grupos[clave].addTo(mapa);
    });

    var conGeometria = []; // capas con límites propios, para encuadrar el mapa
    if (datos.track) {
      var trazado = L.geoJSON(datos.track, { style: { color: "#d9272e", weight: 5 } }).addTo(grupos.ruta);
      conGeometria.push(trazado);
    }
    Object.keys(porCapa).forEach(function (clave) {
      porCapa[clave].forEach(function (f) {
        var nodo = document.createElement("div");
        var titulo = document.createElement("strong");
        titulo.textContent = f.properties.nombre;
        nodo.appendChild(titulo);
        if (f.properties.descripcion) {
          var texto = document.createElement("p");
          texto.textContent = f.properties.descripcion;
          nodo.appendChild(texto);
        }
        var pie = document.createElement("small");
        pie.textContent = "Precisión: " + (f.properties.precision_m == null ? "no consta" : f.properties.precision_m + " m") + " · validado: " + (f.properties.fecha_validacion || "pendiente");
        nodo.appendChild(pie);
        var lonlat = f.geometry.coordinates;
        var marcador = L.marker([lonlat[1], lonlat[0]], { title: f.properties.nombre }).bindPopup(nodo).addTo(grupos[clave]);
        conGeometria.push(marcador);
      });
    });

    L.control.layers(base, superpuestas, { collapsed: false }).addTo(mapa);

    // El perfil altimétrico mueve esta marca por el trazado (solo si hay track con perfil)
    if (datos.track && datos.perfil && datos.perfil.indices) {
      var posicion = L.circleMarker(L.GeoJSON.coordsToLatLng(datos.track.geometry.coordinates[0]), {
        radius: 8, color: "#ffffff", weight: 2, fillColor: "#d9272e", fillOpacity: 1,
      }).addTo(mapa);
      ventana.addEventListener("senda:punto", function (evento) {
        var indices = evento.detail && evento.detail.indices;
        var coordenada = indices && datos.track.geometry.coordinates[indices[evento.detail.indice]];
        if (coordenada) posicion.setLatLng(L.GeoJSON.coordsToLatLng(coordenada));
      });
    }

    if (conGeometria.length > 0) {
      var limites = L.featureGroup(conGeometria).getBounds();
      if (limites.isValid()) mapa.fitBounds(limites, { padding: [24, 24] });
    } else {
      var aviso = L.control({ position: "bottomleft" });
      aviso.onAdd = function () {
        var caja = L.DomUtil.create("div", "mapa-aviso");
        caja.textContent = "Sin puntos ni trazado verificados todavía. El encuadre es orientativo.";
        return caja;
      };
      aviso.addTo(mapa);
    }
    return mapa;
  }

  function montar() {
    var contenedor = document.getElementById("mapa-ruta");
    var origen = document.getElementById("datos-r06");
    var boton = document.getElementById("mapa-cargar");
    var lienzo = document.getElementById("mapa-lienzo");
    if (!contenedor || !origen || !boton || !lienzo) return;
    var datos = JSON.parse(origen.textContent);

    boton.hidden = false;
    boton.addEventListener("click", function () {
      if (typeof ventana.L === "undefined") {
        boton.textContent = "No se pudo cargar la biblioteca del mapa";
        return;
      }
      boton.hidden = true;
      lienzo.hidden = false;
      var mapa = iniciar(ventana.L, datos, lienzo);
      contenedor.classList.add("mapa-activo");
      ventana.setTimeout(function () { mapa.invalidateSize(); }, 0);
    });
    contenedor.classList.add("mapa-preparado");
  }

  if (ventana && ventana.document) {
    if (ventana.document.readyState === "loading") {
      ventana.document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  }

  return { CAPAS: CAPAS, TESELAS: TESELAS, capaDe: capaDe, repartir: repartir };
});
