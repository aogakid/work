// who-growth.ts
// Cálculo de z-score e percentil pelas Curvas de Crescimento da OMS (WHO Child Growth
// Standards, 2006/2007) usando o método LMS (Cole & Green).
//
// Dados: OMS "anthro" (R), tabelas diárias para 0–5 anos, mais referência WHO 2007
// mensal para 5–19 anos (altura e IMC) e 5–10 anos (peso), interpoladas por LMS.
//
// Indicadores disponíveis: peso-idade, estatura/comprimento-idade, IMC-idade,
// perímetro cefálico-idade — 0 a 60 meses, sexo masculino e feminino.

interface LMSArrays {
  L: readonly number[];
  M: readonly number[];
  S: readonly number[];
}

import * as whoData from './who-lms-data';
import { WHO_REFERENCE_2007, WHO_REFERENCE_INDICATOR_MAX_MONTH, WHO_REFERENCE_START_MONTH } from './who-reference-2007-data';

export const WHO_DAYS = whoData.WHO_DAYS;
export const WHO_WEIGHT_M = whoData.WHO_WEIGHT_M;
export const WHO_WEIGHT_F = whoData.WHO_WEIGHT_F;
export const WHO_LENGTH_HEIGHT_M = whoData.WHO_LENGTH_HEIGHT_M;
export const WHO_LENGTH_HEIGHT_F = whoData.WHO_LENGTH_HEIGHT_F;
export const WHO_BMI_M = whoData.WHO_BMI_M;
export const WHO_BMI_F = whoData.WHO_BMI_F;
export const WHO_HEAD_CIRC_M = whoData.WHO_HEAD_CIRC_M;
export const WHO_HEAD_CIRC_F = whoData.WHO_HEAD_CIRC_F;

export type Sex = "M" | "F";

export type Indicator = "weight" | "length_height" | "bmi" | "head_circ";

export const INDICATOR_LABEL: Record<Indicator, string> = {
  weight: "Peso",
  length_height: "Estatura",
  bmi: "IMC",
  head_circ: "Perímetro cefálico",
};

export const INDICATOR_UNIT: Record<Indicator, string> = {
  weight: "kg",
  length_height: "cm",
  bmi: "kg/m²",
  head_circ: "cm",
};

// Comprimento é medido em decúbito até 731 dias (2 anos); altura em pé depois disso.
// Isso identifica a convenção etária da OMS; a UI deve informar se a medida foi em pé ou deitado
// para aplicar a conversão de 0,7 cm quando a posição não corresponder à faixa etária.
export function lengthOrHeightLabel(ageDays: number): "Comprimento" | "Altura" {
  return ageDays < 731 ? "Comprimento" : "Altura";
}

interface LMSArrays {
  L: readonly number[];
  M: readonly number[];
  S: readonly number[];
}

function getArrays(indicator: Indicator, sex: Sex): LMSArrays {
  const table: Record<Indicator, Record<Sex, LMSArrays>> = {
    weight: { M: WHO_WEIGHT_M, F: WHO_WEIGHT_F },
    length_height: { M: WHO_LENGTH_HEIGHT_M, F: WHO_LENGTH_HEIGHT_F },
    bmi: { M: WHO_BMI_M, F: WHO_BMI_F },
    head_circ: { M: WHO_HEAD_CIRC_M, F: WHO_HEAD_CIRC_F },
  };
  return table[indicator][sex];
}

export const MIN_AGE_DAYS = WHO_DAYS[0];
export const MAX_AGE_DAYS = WHO_DAYS[WHO_DAYS.length - 1];
export const MAX_AGE_MONTHS: Record<Indicator, number> = {
  weight: WHO_REFERENCE_INDICATOR_MAX_MONTH.weight,
  length_height: WHO_REFERENCE_INDICATOR_MAX_MONTH.length_height,
  bmi: WHO_REFERENCE_INDICATOR_MAX_MONTH.bmi,
  head_circ: 60,
};

/** Converte idade em meses completos (float) para dias, usando a convenção da OMS (1 mês = 30.4375 dias). */
export function monthsToDays(months: number): number {
  return months * 30.4375;
}

export function daysToMonths(days: number): number {
  return days / 30.4375;
}

/** Interpolação linear do L, M, S para uma idade exata em dias. */
export function lookupLMS(
  indicator: Indicator,
  sex: Sex,
  ageDays: number
): { L: number; M: number; S: number } {
  const clamped = Math.min(Math.max(ageDays, MIN_AGE_DAYS), MAX_AGE_DAYS);
  const { L, M, S } = getArrays(indicator, sex);

  // busca binária pelo intervalo de dias que contém `clamped`
  let lo = 0;
  let hi = WHO_DAYS.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (WHO_DAYS[mid] <= clamped) lo = mid;
    else hi = mid;
  }
  const d0 = WHO_DAYS[lo];
  const d1 = WHO_DAYS[hi];
  const frac = d1 === d0 ? 0 : (clamped - d0) / (d1 - d0);

  return {
    L: L[lo] + frac * (L[hi] - L[lo]),
    M: M[lo] + frac * (M[hi] - M[lo]),
    S: S[lo] + frac * (S[hi] - S[lo]),
  };
}

function lookupReferenceLMS(indicator: Indicator, sex: Sex, ageMonths: number): LMSArrays | null {
  const maxMonth = MAX_AGE_MONTHS[indicator];
  if (ageMonths < WHO_REFERENCE_START_MONTH || ageMonths >= maxMonth) return null;
  if (indicator === "head_circ") return null;
  const values = WHO_REFERENCE_2007[indicator as "weight" | "length_height" | "bmi"][sex];
  const index = Math.floor(ageMonths - WHO_REFERENCE_START_MONTH);
  const fraction = ageMonths - Math.floor(ageMonths);
  const next = index + 1;
  return {
    L: [values[index][0] + fraction * (values[next][0] - values[index][0])],
    M: [values[index][1] + fraction * (values[next][1] - values[index][1])],
    S: [values[index][2] + fraction * (values[next][2] - values[index][2])],
  };
}

function lookupForAge(indicator: Indicator, sex: Sex, ageDays: number): { L: number; M: number; S: number } | null {
  const ageMonths = daysToMonths(ageDays);
  if (ageMonths >= 60 && indicator !== "head_circ") {
    const ref = lookupReferenceLMS(indicator, sex, ageMonths);
    return ref ? { L: ref.L[0], M: ref.M[0], S: ref.S[0] } : null;
  }
  if (ageMonths > 60) return null;
  if (ageMonths > MAX_AGE_MONTHS[indicator]) return null;
  return lookupLMS(indicator, sex, ageDays);
}

/** Z-score pelo método LMS (Cole & Green, 1992). */
export function zScoreFromValue(
  indicator: Indicator,
  sex: Sex,
  ageDays: number,
  value: number
): number | null {
  const lms = lookupForAge(indicator, sex, ageDays);
  if (!lms || value <= 0) return null;
  const { L, M, S } = lms;
  const z = Math.abs(L) < 1e-8
    ? Math.log(value / M) / S
    : (Math.pow(value / M, L) - 1) / (L * S);
  if ((indicator !== "weight" && indicator !== "bmi") || Math.abs(z) <= 3) return z;

  // WHO Anthro/AnthroPlus linearize weight and BMI scores beyond ±3 SD.
  const valueAtZ = (score: number) => Math.abs(L) < 1e-8
    ? M * Math.exp(S * score)
    : M * Math.pow(1 + L * S * score, 1 / L);
  if (z > 3) {
    const sd3 = valueAtZ(3);
    const sd2 = valueAtZ(2);
    return 3 + (value - sd3) / (sd3 - sd2);
  }
  const sd3 = valueAtZ(-3);
  const sd2 = valueAtZ(-2);
  return -3 + (value - sd3) / (sd2 - sd3);
}

/** Valor da medida correspondente a um z-score dado (inverso do LMS) — usado para desenhar as curvas de percentil. */
export function valueFromZScore(
  indicator: Indicator,
  sex: Sex,
  ageDays: number,
  z: number
): number {
  const lms = lookupForAge(indicator, sex, ageDays);
  if (!lms) return Number.NaN;
  const { L, M, S } = lms;
  if (Math.abs(L) < 1e-8) {
    return M * Math.exp(S * z);
  }
  return M * Math.pow(1 + L * S * z, 1 / L);
}

/** Aproximação numérica (Zelen & Severo) da função de distribuição normal padrão. */
export function standardNormalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  let p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

export function percentileFromZ(z: number): number {
  return standardNormalCDF(z) * 100;
}

export interface GrowthResult {
  ageDays: number;
  ageMonths: number;
  z: number;
  percentile: number;
  classification: string;
}

// Faixas de classificação clínica padrão da OMS por indicador (referência: Manual AIDPI /
// WHO Training Course on Child Growth Assessment). Peso-idade não tem categoria de "risco
// de sobrepeso" oficial isolada — segue as mesmas faixas de IMC-idade na prática clínica.
function classify(indicator: Indicator, z: number, ageDays?: number): string {
  if (indicator === "head_circ") {
    if (z < -2) return "Microcefalia";
    if (z > 2) return "Macrocefalia";
    return "Adequado";
  }
  if (indicator === "length_height") {
    const s = ageDays !== undefined && ageDays < 731 ? "o" : "a";
    if (z < -3) return "Muito baix" + s;
    if (z < -2) return "Baix" + s;
    if (z > 3) return "Muito alt" + s;
    if (z > 2) return "Alt" + s;
    return "Adequad" + s;
  }
  if (indicator === "bmi") {
    if (ageDays !== undefined && daysToMonths(ageDays) >= 60) {
      if (z < -3) return "Magreza acentuada";
      if (z < -2) return "Magreza";
      if (z > 2) return "Obesidade";
      if (z > 1) return "Sobrepeso";
      return "Eutrófico";
    }
    if (z < -3) return "Magreza acentuada";
    if (z < -2) return "Magreza";
    if (z > 3) return "Obesidade";
    if (z > 2) return "Sobrepeso";
    if (z > 1) return "Risco de sobrepeso";
    return "Eutrófico";
  }
  // weight
  if (z < -3) return "Muito baixo";
  if (z < -2) return "Baixo";
  if (z > 2) return "Elevado";
  return "Adequado";
}

export function evaluate(
  indicator: Indicator,
  sex: Sex,
  ageDays: number,
  value: number
): GrowthResult | null {
  const z = zScoreFromValue(indicator, sex, ageDays, value);
  if (z === null) return null;
  return {
    ageDays,
    ageMonths: daysToMonths(ageDays),
    z,
    percentile: percentileFromZ(z),
    classification: classify(indicator, z, ageDays),
  };
}

/** Gera pontos (idade em dias -> valor) de uma curva de percentil/DP específica, para plotagem. */
export function buildCurve(
  indicator: Indicator,
  sex: Sex,
  z: number,
  minAgeDays = MIN_AGE_DAYS,
  maxAgeDays = MAX_AGE_DAYS,
  numPoints = 120
): { ageDays: number; value: number }[] {
  const points: { ageDays: number; value: number }[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const ageDays = minAgeDays + ((maxAgeDays - minAgeDays) * i) / numPoints;
    const value = valueFromZScore(indicator, sex, ageDays, z);
    if (Number.isFinite(value)) points.push({ ageDays, value });
  }
  return points;
}

export const STANDARD_Z_LINES = [-3, -2, -1, 0, 1, 2, 3] as const;
