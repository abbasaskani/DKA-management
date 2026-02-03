import type { Labs } from '../db/types';

export type DkaSeverity = 'mild' | 'moderate' | 'severe' | 'resolved' | 'unknown';

export function classifySeverity(ph?: number, hco3?: number): DkaSeverity {
  if (ph == null && hco3 == null) return 'unknown';

  // Resolution criterion from provided protocol
  if ((ph != null && ph > 7.3) && (hco3 != null && hco3 > 18)) return 'resolved';

  // Severe: pH < 7.1 OR HCO3 < 5
  if ((ph != null && ph < 7.1) || (hco3 != null && hco3 < 5)) return 'severe';

  // Moderate: pH 7.1-7.2 OR HCO3 5-10
  if ((ph != null && ph >= 7.1 && ph < 7.2) || (hco3 != null && hco3 >= 5 && hco3 <= 10)) return 'moderate';

  // Mild: pH 7.2-7.3 OR HCO3 10-18
  if ((ph != null && ph >= 7.2 && ph <= 7.3) || (hco3 != null && hco3 > 10 && hco3 <= 18)) return 'mild';

  // If still acidotic but not fitting nicely, call it moderate
  if ((ph != null && ph <= 7.3) || (hco3 != null && hco3 <= 18)) return 'moderate';

  return 'unknown';
}

export function correctedNa(measuredNa?: number, glucoseMgDl?: number): number | null {
  if (measuredNa == null || glucoseMgDl == null) return null;
  const delta = Math.max(0, glucoseMgDl - 100);
  // ISPAD 2022: measured Na + 1.6 * ((glucose - 100)/100) (mg/dL)
  return round1(measuredNa + 1.6 * (delta / 100));
}

export function effectiveOsmolality(measuredNa?: number, glucoseMgDl?: number): number | null {
  if (measuredNa == null || glucoseMgDl == null) return null;
  // ISPAD 2022 (mmol/L): 2*Na + glucose(mmol/L)
  // glucose mmol/L = mg/dL / 18
  return round1(2 * measuredNa + glucoseMgDl / 18);
}

export function maintenanceMlPerDay(weightKg: number): number {
  // Holliday-Segar
  if (weightKg <= 0) return 0;
  let ml = 0;
  const w1 = Math.min(10, weightKg);
  ml += w1 * 100;
  const w2 = Math.min(10, Math.max(0, weightKg - 10));
  ml += w2 * 50;
  const w3 = Math.max(0, weightKg - 20);
  ml += w3 * 20;
  return ml;
}

export function dehydrationFraction(severity: DkaSeverity): number {
  if (severity === 'mild') return 0.05;
  if (severity === 'moderate') return 0.07;
  if (severity === 'severe') return 0.10;
  return 0.07;
}

export function bolusMl(weightKg: number, severity: DkaSeverity, shockState: boolean): number {
  if (shockState) return Math.min(1000, Math.round(weightKg * 20));
  if (severity === 'mild') return 0;
  if (severity === 'moderate') return Math.round(weightKg * 10);
  if (severity === 'severe') return Math.min(1000, Math.round(weightKg * 20));
  return 0;
}

export function deficitMl(weightKg: number, severity: DkaSeverity): number {
  const frac = dehydrationFraction(severity);
  return Math.round(weightKg * 1000 * frac);
}

export function totalFluidsRateMlPerHour(weightKg: number, severity: DkaSeverity, shockState: boolean): {
  maintenancePerDay: number;
  deficit: number;
  bolus: number;
  ratePerHour: number;
  note: string;
} {
  const maintenance = maintenanceMlPerDay(weightKg);
  const twoMaintenance = 2 * maintenance;
  const deficit = deficitMl(weightKg, severity);
  const bolus = bolusMl(weightKg, severity, shockState);
  const numerator = twoMaintenance + deficit - (shockState ? 0 : bolus);
  const rate = numerator / 48;
  const note = shockState
    ? 'در شوک: بولوس از محاسبه ریت کم نمی‌شود.'
    : 'طبق پروتکل: حجم بولوس اولیه از محاسبه ریت کم می‌شود.';
  return {
    maintenancePerDay: Math.round(maintenance),
    deficit,
    bolus,
    ratePerHour: round1(rate),
    note
  };
}

export function fluidTypeByGlucose(glucoseMgDl?: number): string {
  if (glucoseMgDl == null) return '—';
  if (glucoseMgDl > 300) return 'NaCl 0.9%';
  if (glucoseMgDl > 200) return 'D5W + NaCl 77 mEq/L';
  if (glucoseMgDl > 100) return 'D7.5W + NaCl 77 mEq/L';
  return 'D10W + NaCl 77 mEq/L';
}

export function insulinIvRateUPerKgPerHour(glucoseMgDl?: number): number | null {
  if (glucoseMgDl == null) return null;
  if (glucoseMgDl > 300) return 0.1;
  if (glucoseMgDl > 200) return 0.075;
  if (glucoseMgDl > 100) return 0.05;
  return 0; // hold 1 hour
}

export function potassiumPlan(k?: number): { tone: 'green' | 'yellow' | 'orange' | 'red'; text: string; addMeqPerL: number | null; holdInsulin: boolean } {
  if (k == null) {
    return { tone: 'yellow', text: 'K نامشخص: قبل از تصمیم‌گیری اندازه‌گیری شود.', addMeqPerL: null, holdInsulin: false };
  }
  if (k > 5.5) {
    return { tone: 'yellow', text: 'K>5.5 → فعلاً KCl نده، K هر ۱ ساعت چک شود.', addMeqPerL: 0, holdInsulin: false };
  }
  if (k >= 5 && k <= 5.5) {
    return { tone: 'green', text: '5<K<5.5 → KCl 20 mEq/L', addMeqPerL: 20, holdInsulin: false };
  }
  if (k >= 3.5 && k < 5) {
    return { tone: 'green', text: '3.5<K<5 → KCl 40 mEq/L', addMeqPerL: 40, holdInsulin: false };
  }
  if (k >= 3 && k < 3.5) {
    return { tone: 'orange', text: '3<K<3.5 → KCl 50–60 mEq/L در PICU + مانیتورینگ', addMeqPerL: 55, holdInsulin: false };
  }
  // k < 3
  return {
    tone: 'red',
    text: 'K<3 → KCl 60–80 mEq/L در PICU + مانیتورینگ | انسولین را HOLD کن | KCl 0.5 mEq/kg در ۱ ساعت (max 10 mEq)',
    addMeqPerL: 70,
    holdInsulin: true
  };
}

export function icuIndications(labs: Labs, ageYears: number): string[] {
  const sev = classifySeverity(labs.ph, labs.hco3);
  const out: string[] = [];
  if (sev === 'severe') out.push('Severe DKA (pH<7.1 یا HCO3<5)');
  if (ageYears < 2) out.push('Age < 2 years');
  if (labs.bgMgDl != null && labs.bgMgDl > 700) out.push('Blood sugar > 700 mg/dL');
  if (labs.na != null && labs.na > 150) out.push('Serum Na > 150');
  if (labs.k != null && labs.k < 3) out.push('Serum K < 3');
  // Brain edema suspicion is clinical; not auto
  return out;
}

export function brainEdemaRiskFactors(labs: Labs, ageYears: number): string[] {
  const out: string[] = [];
  if (labs.bun != null && labs.bun > 20) out.push('BUN > 20');
  if (labs.ph != null && labs.ph < 7.1) out.push('pH < 7.1');
  if (labs.pco2 != null && labs.pco2 < 21) out.push('pCO2 < 21');
  if (ageYears < 5) out.push('Age < 5 years');
  return out;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
