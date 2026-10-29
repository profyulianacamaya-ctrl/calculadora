/* Pruebas de la lógica de cálculo. Ejecutar con: node test.js */
"use strict";
const assert = require("node:assert/strict");
const { calcular, parseNumero, parsePegado } = require("./calc.js");

let fallas = 0, total = 0;
function prueba(nombre, fn) {
  total++;
  try { fn(); console.log("  ok   " + nombre); }
  catch (e) { fallas++; console.log("  FALLA " + nombre + "\n        " + e.message); }
}
const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const r2d = (x, d) => Number(x.toFixed(d));

// Ejemplo precargado (el mismo de la clase en Manim, con resultados verificados con fracciones exactas).
const EJEMPLO = [26, 30, 24, 42, 28, 38, 27, 44, 34, 36, 33, 52];

// Serie sintética con tendencia, estacionalidad y ruido determinístico.
function serie(anios, L, semilla) {
  const y = [];
  let s = semilla;
  for (let k = 0; k < anios * L; k++) {
    s = (s * 9301 + 49297) % 233280;
    y.push(100 + 2 * k + 25 * Math.sin((2 * Math.PI * (k % L)) / L) + (s / 233280) * 10);
  }
  return y;
}

/* PMC calculado por otra vía: promedio ponderado 2×L centrado en j (pesos 1/2 en los extremos). */
function pmcDirecto(y, L, j) {
  let s = y[j - L / 2] / 2 + y[j + L / 2] / 2;
  for (let k = j - L / 2 + 1; k <= j + L / 2 - 1; k++) s += y[k];
  return s / L;
}

/* Regresión por otra vía: medias, covarianza y desvíos. */
function regresionMedias(x, y) {
  const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  const sx = Math.sqrt(sxx / (n - 1)), sy = Math.sqrt(syy / (n - 1)), r = sxy / Math.sqrt(sxx * syy);
  const b = r * sy / sx;
  return { a: my - b * mx, b, r2: r * r };
}

console.log("Ejemplo precargado (L = 4)");
const R = calcular(EJEMPLO, 4);
prueba("suma de índices ajustados = 4 (tol. 1e-9)", () => cerca(R.sumaAjustado, 4, 1e-9, "suma"));
prueba("totales móviles = 122, 124, …, 155", () =>
  assert.deepEqual(R.total.filter(v => v !== null), [122, 124, 132, 135, 137, 143, 141, 147, 155]));
prueba("PMC = 30,75 … 37,75 en t = 3 … 10", () => {
  assert.deepEqual(R.pmc.slice(2, 10), [30.75, 32, 33.375, 34, 35, 35.5, 36, 37.75]);
  assert.equal(R.pmc[1], null); assert.equal(R.pmc[10], null);
});
prueba("índices ajustados = 0,8963 / 1,0410 / 0,7800 / 1,2826", () =>
  assert.deepEqual(R.ajustado.map(v => r2d(v, 4)), [0.8963, 1.0410, 0.7800, 1.2826]));
prueba("factor de corrección = 1,0052", () => assert.equal(r2d(R.fc, 4), 1.0052));
prueba("tendencia t = 13…16 = 41,45 / 42,53 / 43,61 / 44,69", () =>
  assert.deepEqual(R.pronostico.map(p => r2d(p.tendencia, 2)), [41.45, 42.53, 43.61, 44.69]));
prueba("pronóstico = 37,16 / 44,28 / 34,01 / 57,31", () =>
  assert.deepEqual(R.pronostico.map(p => r2d(p.pronostico, 2)), [37.16, 44.28, 34.01, 57.31]));

for (const L of [4, 12, 2, 6]) {
  console.log(`\nAlineación del PMC con L = ${L} (par)`);
  const y = serie(L === 2 ? 5 : 3, L, 7 + L), r = calcular(y, L), N = y.length;
  prueba(`PMC solo en t = ${L / 2 + 1} … ${N - L / 2}`, () => {
    r.pmc.forEach((v, j) => {
      const t = j + 1, debe = t >= L / 2 + 1 && t <= N - L / 2;
      assert.equal(v !== null, debe, `t = ${t}`);
    });
  });
  prueba("PMC = promedio 2×L centrado en su período", () => {
    r.pmc.forEach((v, j) => { if (v !== null) cerca(v, pmcDirecto(y, L, j), 1e-9, `t = ${j + 1}`); });
  });
  prueba(`suma de índices ajustados = ${L}`, () => cerca(r.sumaAjustado, L, 1e-9, "suma"));
}

console.log("\nL = 3 (impar)");
{
  const y = serie(4, 3, 11), r = calcular(y, 3), N = y.length;
  prueba("promedio móvil centrado en el período del medio (t = 2 … N−1)", () => {
    r.pm.forEach((v, j) => {
      const debe = j >= 1 && j <= N - 2;
      assert.equal(v !== null, debe, `t = ${j + 1}`);
      if (debe) cerca(v, (y[j - 1] + y[j] + y[j + 1]) / 3, 1e-9, `t = ${j + 1}`);
    });
  });
  prueba("no hay columna PMC (todo nulo)", () => assert.ok(r.pmc.every(v => v === null) && !r.par));
  prueba("IE específico = Y / PM", () =>
    r.ieEsp.forEach((v, j) => { if (v !== null) cerca(v, y[j] / r.pm[j], 1e-9, `t = ${j + 1}`); }));
  prueba("suma de índices ajustados = 3", () => cerca(r.sumaAjustado, 3, 1e-9, "suma"));
}

console.log("\nRecta de tendencia contra otra vía (medias y desvíos)");
for (const [nombre, y, L] of [["ejemplo", EJEMPLO, 4], ["L = 12", serie(3, 12, 5), 12], ["L = 3", serie(4, 3, 3), 3]]) {
  const r = calcular(y, L), o = regresionMedias(r.t, r.desest);
  prueba(`a, b y R² coinciden (${nombre})`, () => {
    cerca(r.a, o.a, 1e-9, "a"); cerca(r.b, o.b, 1e-9, "b"); cerca(r.r2, o.r2, 1e-9, "R²");
  });
}

console.log("\nEntrada de datos");
prueba("coma y punto decimal", () => {
  assert.equal(parseNumero("12,5"), 12.5); assert.equal(parseNumero("12.5"), 12.5);
  assert.equal(parseNumero("1.234,5"), 1234.5); assert.equal(parseNumero("1,234.5"), 1234.5);
  assert.ok(Number.isNaN(parseNumero("abc"))); assert.ok(Number.isNaN(parseNumero("")));
});
prueba("pegar desde Excel (tabs, punto y coma, espacios, columna de año)", () => {
  assert.deepEqual(parsePegado("26\t30\t24\t42\n28\t38\t27\t44", 4), [26, 30, 24, 42, 28, 38, 27, 44]);
  assert.deepEqual(parsePegado("Año;I;II;III;IV\n2022;26,5;30;24;42", 4), [26.5, 30, 24, 42]);
  assert.deepEqual(parsePegado("26 30 24 42\r\n", 4), [26, 30, 24, 42]);
});
prueba("rechaza valores no positivos y menos de 2 años", () => {
  assert.throws(() => calcular([1, 2, 0, 4, 5, 6, 7, 8], 4));
  assert.throws(() => calcular([1, 2, 3, 4], 4));
});

console.log(`\n${total - fallas} de ${total} pruebas pasaron.`);
process.exit(fallas ? 1 : 0);
