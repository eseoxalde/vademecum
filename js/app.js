// ============ Vademecum de Enfermería - App principal ============
// SPA con ruteo por hash, pensada para funcionar offline (PWA).

const state = {
  farmacos: [],
  cargando: true,
};

const root = document.getElementById("app");
const ALFABETO = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

// ---------- Carga de datos ----------
async function cargarDatos() {
  try {
    const res = await fetch("data/farmacos.json", { cache: "no-cache" });
    const json = await res.json();
    state.farmacos = json.farmacos || [];
  } catch (e) {
    // Si falla el fetch (sin conexión y sin cache previa), intentamos localStorage como respaldo
    const respaldo = localStorage.getItem("vademecum_farmacos_cache");
    if (respaldo) {
      state.farmacos = JSON.parse(respaldo);
    } else {
      state.farmacos = [];
    }
  }
  if (state.farmacos.length) {
    localStorage.setItem(
      "vademecum_farmacos_cache",
      JSON.stringify(state.farmacos),
    );
  }
  state.cargando = false;
}

function normalizar(txt) {
  return (txt || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ---------- Router ----------
function parseHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [modo, sub, id] = hash.split("/").filter(Boolean);
  return {
    modo: modo || "",
    sub: sub || "",
    id: id ? decodeURIComponent(id) : "",
  };
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", async () => {
  await cargarDatos();
  render();
  actualizarEstadoConexion();
});
window.addEventListener("online", actualizarEstadoConexion);
window.addEventListener("offline", actualizarEstadoConexion);

function actualizarEstadoConexion() {
  const pill = document.getElementById("connPill");
  if (!pill) return;
  if (navigator.onLine) {
    pill.textContent = "En línea";
    pill.dataset.state = "online";
  } else {
    pill.textContent = "Sin conexión · modo offline";
    pill.dataset.state = "offline";
  }
}

function render() {
  const { modo, sub, id } = parseHash();

  if (!modo) return renderHome();
  if ((modo === "ficha-tecnica" || modo === "tarjetas") && !sub)
    return renderLista(modo);
  if ((modo === "ficha-tecnica" || modo === "tarjetas") && sub === "d" && id)
    return renderDetalle(modo, id);
  return renderHome();
}

// ---------- Topbar helper ----------
function topbar({ titulo, subtitulo = "", volver = null }) {
  return `
    <header class="topbar">
      ${volver ? `<button class="topbar__back" onclick="location.hash='${volver}'" aria-label="Volver">‹</button>` : ""}
      <div>
        <div class="topbar__title">${titulo}</div>
        ${subtitulo ? `<div class="topbar__subtitle">${subtitulo}</div>` : ""}
      </div>
      <span class="offline-pill" id="connPill" data-state="online">En línea</span>
    </header>
  `;
}

// ---------- Vista: Home ----------
function renderHome() {
  root.innerHTML = `
    ${topbar({ titulo: "Vademécum de Enfermería" })}
    <main class="home">
      <div class="home__eyebrow">Farmacología en Enfermería</div>
      <h1 class="home__title">Consultá fármacos por ficha técnica o tarjeta rápida</h1>
      <p class="home__desc">Elegí el tipo de información que necesitás.</p>
      <div class="home__grid">
        <a class="mode-card mode-card--ficha" href="#/ficha-tecnica">
          <span class="mode-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6M9 9h2"/></svg>
          </span>
          <span class="mode-card__body">
            <h2>Ficha técnica</h2>
            <p>Farmacodinamia, ADME, indicaciones, dosis, preparación e información completa.</p>
          </span>
        </a>
        <a class="mode-card mode-card--tarjetas" href="#/tarjetas">
          <span class="mode-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>
          </span>
          <span class="mode-card__body">
            <h2>Tarjetas</h2>
            <p>Resumen rápido para la práctica: dosis, vías, cuidados y alarmas de riesgo.</p>
          </span>
        </a>
      </div>
      <p class="home__footer">${state.farmacos.length} fármacos cargados</p>
    </main>
  `;
  actualizarEstadoConexion();
}

// ---------- Vista: Lista ----------
function renderLista(modo, filtroTexto = "", letraActiva = "") {
  const titulo = modo === "ficha-tecnica" ? "Ficha técnica" : "Tarjetas";
  const letrasDisponibles = new Set(
    state.farmacos.map((f) => (f.letra || "").toUpperCase()),
  );

  let lista = state.farmacos
    .slice()
    .sort((a, b) => a.nombre_generico.localeCompare(b.nombre_generico, "es"));
  if (letraActiva)
    lista = lista.filter((f) => (f.letra || "").toUpperCase() === letraActiva);
  if (filtroTexto) {
    const q = normalizar(filtroTexto);
    lista = lista.filter((f) => normalizar(f.nombre_generico).includes(q));
  }

  root.innerHTML = `
    ${topbar({ titulo, subtitulo: `${state.farmacos.length} fármacos`, volver: "#/" })}
    <div class="list-controls">
      <div class="search-box">
        <input id="buscador" type="search" inputmode="search" placeholder="Buscar por nombre genérico..." value="${filtroTexto.replace(/"/g, "&quot;")}" />
      </div>
      <div class="alphabet" id="alfabeto">
        <button class="alphabet__chip" data-letra="" data-active="${letraActiva === ""}">Todas</button>
        ${ALFABETO.map((l) => `<button class="alphabet__chip" data-letra="${l}" data-active="${letraActiva === l}" ${letrasDisponibles.has(l) ? "" : "disabled"}>${l}</button>`).join("")}
      </div>
    </div>
    <ul class="drug-list">
      ${
        lista.length
          ? lista
              .map(
                (f) => `
        <li class="drug-list__item">
          <a class="drug-list__link" href="#/${modo}/d/${encodeURIComponent(f.id)}">
            <span>
              <span class="drug-list__name">${f.nombre_generico}</span>
              <span class="drug-list__meta">${f.farmacodinamia?.clasificacion || ""}</span>
            </span>
            ${f.alto_riesgo ? '<span class="risk-badge">ALTO RIESGO</span>' : ""}
          </a>
        </li>
      `,
              )
              .join("")
          : `<li class="empty-state">No se encontraron fármacos con ese criterio.</li>`
      }
    </ul>
  `;
  actualizarEstadoConexion();

  document.getElementById("buscador").addEventListener("input", (e) => {
    renderLista(modo, e.target.value, letraActiva);
    // mantener foco y cursor tras re-render
    const input = document.getElementById("buscador");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });

  document.getElementById("alfabeto").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-letra]");
    if (!btn || btn.disabled) return;
    const letra = btn.dataset.letra;
    renderLista(modo, filtroTexto, letra === letraActiva ? "" : letra);
  });
}

// ---------- Vista: Detalle ----------
function campo(label, valor, mono = false) {
  if (!valor) return "";
  return `
    <div class="field">
      <div class="field__label">${label}</div>
      <div class="field__value ${mono ? "mono" : ""}">${valor}</div>
    </div>
  `;
}

function seccion(id, titulo, contenidoHtml) {
  if (!contenidoHtml) return "";
  return `
    <section class="section" id="${id}" data-collapsed="false">
      <button type="button" class="section__header" aria-expanded="true" data-toggle="${id}">
        <span>${titulo}</span>
        <span class="section__chevron" aria-hidden="true">▾</span>
      </button>
      <div class="section__body" id="body-${id}">${contenidoHtml}</div>
    </section>
  `;
}

function renderDetalle(modo, id) {
  const f = state.farmacos.find((x) => x.id === id);
  const volver = `#/${modo}`;

  if (!f) {
    root.innerHTML = `
      ${topbar({ titulo: "No encontrado", volver })}
      <main class="detail"><p class="empty-state">No se encontró el fármaco solicitado.</p></main>
    `;
    return;
  }

  const riskBanner = f.alto_riesgo
    ? `
    <div class="risk-banner">⚠ Medicamento de alto riesgo: extremar el doble chequeo antes de administrar.</div>
  `
    : "";

  let cuerpo = "";

  if (modo === "ficha-tecnica") {
    cuerpo = `
      ${seccion(
        "farmacodinamia",
        "Farmacodinamia",
        `
        ${campo("Principio activo", f.farmacodinamia?.principio_activo)}
        ${campo("Clasificación", f.farmacodinamia?.clasificacion)}
        ${campo("Acción terapéutica", f.farmacodinamia?.accion_terapeutica)}
        ${campo("Mecanismo de acción", f.farmacodinamia?.mecanismo_accion)}
      `,
      )}
      ${seccion(
        "adme",
        "Farmacocinética (ADME)",
        `
        ${campo("Absorción", f.farmacocinetica_adme?.absorcion)}
        ${campo("Distribución", f.farmacocinetica_adme?.distribucion)}
        ${campo("Metabolismo", f.farmacocinetica_adme?.metabolismo)}
        ${campo("Eliminación", f.farmacocinetica_adme?.eliminacion)}
      `,
      )}
      ${seccion(
        "clinico",
        "Uso clínico",
        `
        ${campo("Indicaciones", f.indicaciones)}
        ${campo("Contraindicaciones", f.contraindicaciones)}
        ${campo("Precauciones", f.precauciones)}
        ${campo("Advertencias", f.advertencias)}
        ${campo("Embarazo y lactancia", f.embarazo_lactancia)}
      `,
      )}
      ${seccion(
        "ajustes",
        "Ajustes de dosis",
        `
        ${campo("Renal", f.ajustes?.renal)}
        ${campo("Hepático", f.ajustes?.hepatico)}
      `,
      )}
      ${seccion(
        "seguridad",
        "Seguridad",
        `
        ${campo("Interacciones farmacológicas", f.interacciones)}
        ${campo("Reacciones adversas", f.reacciones_adversas)}
        ${campo("Efectos secundarios", f.efectos_secundarios)}
        ${campo("Toxicidad y sobredosis", f.toxicidad_sobredosis)}
        ${campo("Antídotos", f.antidotos)}
      `,
      )}
      ${seccion(
        "monitorizacion",
        "Monitorización",
        `
        ${campo("Clínica", f.monitorizacion?.clinica)}
        ${campo("Laboratorio", f.monitorizacion?.laboratorio)}
      `,
      )}
      ${seccion(
        "valoracion",
        "Parámetros de valoración",
        `
        ${campo("Antes", f.parametros_valoracion?.antes)}
        ${campo("Durante", f.parametros_valoracion?.durante)}
        ${campo("Después", f.parametros_valoracion?.despues)}
      `,
      )}
      ${seccion(
        "dosis",
        "Presentaciones y dosis",
        `
        ${campo("Presentaciones", f.presentaciones)}
        ${campo("Vías de administración", f.vias_administracion)}
        ${campo("Dosis adulto", f.dosis?.adultos)}
        ${campo("Dosis pediátrica", f.dosis?.pediatrico)}
        ${campo("Dosis adulto mayor", f.dosis?.geriatrico)}
      `,
      )}
      ${seccion(
        "preparacion",
        "Preparación y administración",
        `
        ${campo("Dilución", f.preparacion?.dilucion)}
        ${campo("Compatibilidad IV", f.preparacion?.compatibilidad_iv)}
        ${campo("Velocidad de infusión", f.velocidad_infusion)}
        ${campo("Estabilidad de la solución", f.estabilidad_soluciones)}
        ${campo("Conservación", f.conservacion, true)}
        ${campo("Alarma de riesgo", f.alarma_riesgo)}
      `,
      )}
    `;
  } else {
    // Tarjeta: versión resumida orientada a la práctica de enfermería
    cuerpo = `
      ${seccion(
        "resumen",
        "Resumen",
        `
        ${campo("Acción terapéutica", f.farmacodinamia?.accion_terapeutica)}
        ${campo("Presentaciones", f.presentaciones)}
        ${campo("Vías de administración", f.vias_administracion)}
      `,
      )}
      ${seccion(
        "dosis",
        "Dosis estándar",
        `
        ${campo("Adultos", f.dosis?.adultos)}
        ${campo("Pediátrico", f.dosis?.pediatrico)}
        ${campo("Adulto mayor", f.dosis?.geriatrico)}
      `,
      )}
      ${seccion(
        "preparacion",
        "Preparación y administración",
        `
        ${campo("Dilución", f.preparacion?.dilucion)}
        ${campo("Compatibilidad IV", f.preparacion?.compatibilidad_iv)}
        ${campo("Velocidad de infusión", f.velocidad_infusion)}
        ${campo("Estabilidad de la solución", f.estabilidad_soluciones)}
        ${campo("Conservación", f.conservacion, true)}
      `,
      )}
      ${seccion(
        "seguridad",
        "Seguridad y cuidados",
        `
        ${campo("Antídotos", f.antidotos)}
        ${campo("Alarma de riesgo", f.alarma_riesgo)}
        ${campo("Cuidados de enfermería", f.cuidados_enfermeria)}
      `,
      )}
       ${seccion(
         "monitorizacion",
         "Monitorización",
         `
        ${campo("Clínica", f.monitorizacion?.clinica)}
        ${campo("Laboratorio", f.monitorizacion?.laboratorio)}
      `,
       )}
      ${seccion(
        "valoracion",
        "Parámetros de valoración",
        `
        ${campo("Antes", f.parametros_valoracion?.antes)}
        ${campo("Durante", f.parametros_valoracion?.durante)}
        ${campo("Después", f.parametros_valoracion?.despues)}
      `,
      )}
    `;
  }

  root.innerHTML = `
    ${topbar({ titulo: f.nombre_generico, subtitulo: modo === "ficha-tecnica" ? "Ficha técnica" : "Tarjeta", volver })}
    <main class="detail">
      ${riskBanner}
      <div class="detail__toolbar">
        <button type="button" class="btn-link" id="btnExpandirTodo">Expandir todo</button>
        <span class="detail__toolbar-sep">·</span>
        <button type="button" class="btn-link" id="btnColapsarTodo">Colapsar todo</button>
      </div>
      ${cuerpo}
    </main>
  `;
  actualizarEstadoConexion();
  inicializarAcordeon();
}

// ---------- Acordeón de secciones ----------
function alternarSeccion(section, colapsar) {
  const header = section.querySelector(".section__header");
  const body = section.querySelector(".section__body");
  const debeColapsar =
    colapsar !== undefined ? colapsar : section.dataset.collapsed !== "true";
  section.dataset.collapsed = String(debeColapsar);
  header.setAttribute("aria-expanded", String(!debeColapsar));
  body.style.display = debeColapsar ? "none" : "";
}

function inicializarAcordeon() {
  document.querySelectorAll(".section__header").forEach((header) => {
    header.addEventListener("click", () => {
      const section = header.closest(".section");
      alternarSeccion(section);
    });
  });

  const btnExpandir = document.getElementById("btnExpandirTodo");
  const btnColapsar = document.getElementById("btnColapsarTodo");
  if (btnExpandir) {
    btnExpandir.addEventListener("click", () => {
      document
        .querySelectorAll(".section")
        .forEach((s) => alternarSeccion(s, false));
    });
  }
  if (btnColapsar) {
    btnColapsar.addEventListener("click", () => {
      document
        .querySelectorAll(".section")
        .forEach((s) => alternarSeccion(s, true));
    });
  }
}
