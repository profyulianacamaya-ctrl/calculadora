/* Lógica de cálculo (funciones puras) — método de promedio móvil, modelo multiplicativo.
   Los índices estacionales se expresan como razón (no en %): su suma da L.
   Funciona en el navegador (window.SerieCalc) y en Node (require). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SerieCalc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function nombrePeriodo(j, L) {
    return L === 12 ? MESES[j] : ROMANOS[j];
  }

  /* Convierte texto a número aceptando coma o punto decimal (y separador de miles).
     Devuelve NaN si no es un número válido. */
  function parseNumero(texto) {
    if (typeof texto === "number") return texto;
    let s = String(texto == null ? "" : texto).trim().replace(/\s/g, "");
    if (!s) return NaN;
    const ultComa = s.lastIndexOf(","), ultPunto = s.lastIndexOf(".");
    if (ultComa >= 0 && ultPunto >= 0) {
      // El último separador que aparece es el decimal; el otro es de miles.
      if (ultComa > ultPunto) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (ultComa >= 0) {
      s = s.replace(",", ".");
    }
    if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return NaN;
    return Number(s);
  }

  /* Lee una tabla pegada desde Excel (tabulaciones, punto y coma o espacios).
     Devuelve la lista de valores en orden cronológico (fila por fila). */
  function parsePegado(texto, L) {
    const valores = [];
    for (const linea of String(texto || "").split(/\r?\n/)) {
      if (!linea.trim()) continue;
      let partes;
      if (linea.includes("\t")) partes = linea.split("\t");
      else if (linea.includes(";")) partes = linea.split(";");
      else partes = linea.trim().split(/\s+/);
      let nums = partes.map(p => p.trim()).filter(p => p !== "").map(parseNumero).filter(v => !Number.isNaN(v));
      if (!nums.length) continue;                       // encabezados u otras filas de texto
      if (nums.length === L + 1 && Number.isInteger(nums[0]) && nums[0] >= 1900 && nums[0] <= 2200)
        nums = nums.slice(1);                           // la primera columna es el año
      valores.push(...nums);
    }
    return valores;
  }

  /* Cálculo completo. y: observaciones en orden cronológico (N = años × L). */
  function calcular(y, L, opciones) {
    const N = y.length;
    const H = (opciones && opciones.horizonte) || L;
    if (!Number.isInteger(L) || L < 2) throw new Error("L debe ser un entero mayor o igual a 2.");
    if (N < 2 * L || N % L !== 0) throw new Error("Se necesitan al menos 2 años completos de datos.");
    for (const v of y) if (!(Number.isFinite(v) && v > 0)) throw new Error("Todos los valores deben ser positivos.");

    const par = L % 2 === 0;
    const total = new Array(N).fill(null);   // total móvil, ubicado en su fila
    const pm = new Array(N).fill(null);      // promedio móvil
    const pmc = new Array(N).fill(null);     // promedio móvil centrado (solo L par)
    const base = new Array(N).fill(null);    // el promedio que se usa para el índice

    // Totales móviles de L períodos consecutivos (y[i] … y[i+L-1]).
    // L impar: queda centrado en la fila i + (L-1)/2.
    // L par: queda entre las filas i + L/2 - 1 e i + L/2; se muestra en la de arriba.
    const desplaz = par ? L / 2 - 1 : (L - 1) / 2;
    for (let i = 0; i + L <= N; i++) {
      let s = 0;
      for (let k = i; k < i + L; k++) s += y[k];
      total[i + desplaz] = s;
      pm[i + desplaz] = s / L;
    }
    if (par) {
      for (let j = 1; j < N; j++)
        if (pm[j - 1] !== null && pm[j] !== null) pmc[j] = (pm[j - 1] + pm[j]) / 2;
      for (let j = 0; j < N; j++) base[j] = pmc[j];
    } else {
      for (let j = 0; j < N; j++) base[j] = pm[j];
    }

    // Índice estacional específico.
    const ieEsp = y.map((v, j) => (base[j] === null ? null : v / base[j]));

    // Índice bruto por período del año, factor de corrección e índice ajustado.
    const bruto = [];
    for (let s = 0; s < L; s++) {
      const vals = [];
      for (let j = s; j < N; j += L) if (ieEsp[j] !== null) vals.push(ieEsp[j]);
      bruto.push(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    const sumaBruto = bruto.reduce((a, b) => a + b, 0);
    const fc = L / sumaBruto;
    const ajustado = bruto.map(b => b * fc);
    const sumaAjustado = ajustado.reduce((a, b) => a + b, 0);

    // Desestacionalización.
    const t = y.map((_, j) => j + 1);
    const desest = y.map((v, j) => v / ajustado[j % L]);

    // Recta de tendencia por mínimos cuadrados.
    let St = 0, Sy = 0, Stt = 0, Sty = 0;
    for (let j = 0; j < N; j++) {
      St += t[j]; Sy += desest[j]; Stt += t[j] * t[j]; Sty += t[j] * desest[j];
    }
    const b = (N * Sty - St * Sy) / (N * Stt - St * St);
    const a = Sy / N - b * (St / N);
    const tendencia = t.map(tt => a + b * tt);
    const media = Sy / N;
    let ssRes = 0, ssTot = 0;
    for (let j = 0; j < N; j++) {
      ssRes += (desest[j] - tendencia[j]) ** 2;
      ssTot += (desest[j] - media) ** 2;
    }
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

    // Pronóstico.
    const pronostico = [];
    for (let h = 1; h <= H; h++) {
      const tt = N + h, s = (tt - 1) % L;
      const tend = a + b * tt;
      pronostico.push({ t: tt, anio: Math.floor((tt - 1) / L), periodo: s, tendencia: tend,
                        indice: ajustado[s], pronostico: tend * ajustado[s] });
    }

    return { N, L, par, y: y.slice(), t, total, pm, pmc, ieEsp, bruto, sumaBruto, fc, ajustado,
             sumaAjustado, desest, a, b, r2, tendencia, pronostico };
  }

  return { calcular, parseNumero, parsePegado, nombrePeriodo };
});
