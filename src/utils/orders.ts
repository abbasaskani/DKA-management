import type { AssessmentFlags, Labs, InsulinRoute, Patient } from '../db/types';
import {
  brainEdemaRiskFactors,
  classifySeverity,
  correctedNa,
  effectiveOsmolality,
  fluidTypeByGlucose,
  insulinIvRateUPerKgPerHour,
  potassiumPlan,
  totalFluidsRateMlPerHour
} from './dkaMath';

export type OrderInputs = {
  patient: Patient;
  labs: Labs;
  assessment: AssessmentFlags;
  insulinRoute: InsulinRoute;
  shockState: boolean;
};

const hr = '—'.repeat(38);

function fmt(n: number | null | undefined, suffix = '') {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n}${suffix}`;
}

export function generateOrdersFA(input: OrderInputs): string {
  const { patient, labs, assessment, insulinRoute, shockState } = input;
  const sev = classifySeverity(labs.ph, labs.hco3);

  const fluids = totalFluidsRateMlPerHour(patient.weightKg, sev, shockState);
  const fType = fluidTypeByGlucose(labs.bgMgDl);
  const kPlan = potassiumPlan(labs.k);

  const cNa = correctedNa(labs.na, labs.bgMgDl);
  const eosm = effectiveOsmolality(labs.na, labs.bgMgDl);
  const beRisk = brainEdemaRiskFactors(labs, patient.ageYears);

  const lines: string[] = [];
  lines.push('🧾 اوردر ست مدیریت DKA (پیشنهادی/کمکی)');
  lines.push(`👤 بیمار: ${patient.firstName} ${patient.lastName} | سن: ${patient.ageYears} سال | وزن: ${patient.weightKg} kg | ${patient.isNewCase ? 'نیوکِیس' : 'شناخته‌شده'}`);
  lines.push(hr);

  // Safety prompts
  lines.push('⚠️ هشدارهای ایمنی:');
  lines.push('• ❌ Insulin bolus ممنوع');
  if (labs.k != null && labs.k < 3) lines.push('• 🔴 Hold insulin if K<3');
  else if (labs.k != null && labs.k < 3.5) lines.push('• 🟠 K بین 3 تا 3.5: قبل از انسولین، K را اصلاح کن + مانیتورینگ');
  lines.push(hr);

  // Severity
  lines.push(`📌 شدت: ${sev === 'mild' ? 'خفیف 🟡' : sev === 'moderate' ? 'متوسط 🟠' : sev === 'severe' ? 'شدید 🔴' : sev === 'resolved' ? 'خروج از DKA 🟢' : 'نامشخص'}`);
  lines.push(`🧮 Corrected Na: ${fmt(cNa, ' mEq/L')} | Effective osmolality: ${fmt(eosm, ' mOsm/kg')}`);

  if (beRisk.length) {
    lines.push(`🧠 ریسک ادم مغزی: ${beRisk.join('، ')} → مانیتول/سالین ۵% کنار تخت (دوز محاسبه شود)`);
  }
  lines.push(hr);

  // Fluids
  lines.push('💧 مایعات:');
  if (fluids.bolus > 0) {
    lines.push(`• بولوس: NS 0.9%  ${fluids.bolus} mL طی ۱ ساعت (بدون پتاسیم)`);
    if (shockState) lines.push('  ↳ در شوک: بعد از بولوس، ارزیابی مجدد و در صورت نیاز تکرار.');
  } else {
    lines.push('• خفیف: بولوس لازم نیست (در صورت وضعیت شوک/کاهش پرفیوژن استثنا)');
  }
  lines.push(`• Maintenance (روزانه): ${fluids.maintenancePerDay} mL/day`);
  lines.push(`• Deficit: ${fluids.deficit} mL`);
  lines.push(`• ریت مایع: ${fluids.ratePerHour} mL/h  (فرمول 48h)  | ${fluids.note}`);
  lines.push(`• نوع مایع بر اساس قند: ${fType}`);
  lines.push('• ⚠️ ریت را صرفاً بر اساس تغییرات VBG بالا/پایین نکن.');
  lines.push(hr);

  // Insulin
  lines.push('💉 انسولین:');
  if (insulinRoute === 'sq') {
    lines.push('• مسیر: تزریق زیرجلدی Regular (SQ)');
    const dose = round2(0.15 * patient.weightKg);
    const interval = sev === 'mild' ? 'Q4h' : 'Q2h';
    lines.push(`• دوز پیشنهادی: Regular ${dose} unit SC ${interval} (طبق پروتکل برای خفیف/متوسط) تا رسیدن به مرکز/کنترل قند`);
    if (sev === 'severe') {
      lines.push('• 🔴 Severe DKA: ترجیحاً PICU/مرکز مجهز (در صورت اجبار SC با نظر اندوکرین و پایش دقیق).');
    }
    if (!patient.isNewCase && (sev === 'mild' || sev === 'moderate')) {
      lines.push('• در کیس شناخته‌شده (خفیف/متوسط) و پرفیوژن خوب: ادامه Long-acting insulin طبق برنامه.');
    }
  } else {
    const rate = insulinIvRateUPerKgPerHour(labs.bgMgDl);
    lines.push('• مسیر: انفوزیون وریدی Regular (در صورت امکان)');
    lines.push('• شروع: ۱ ساعت بعد از شروع بولوس/وقتی resuscitation اولیه تمام شد.');
    lines.push('• رقیق‌سازی: 50U Regular در 50 mL NS (۱U/mL)');
    if (rate === 0) {
      lines.push('• BS<100: انسولین را ۱ ساعت Hold کن، سپس بر اساس BS دوباره شروع کن.');
    } else {
      lines.push(`• ریت: ${fmt(rate, ' U/kg/h')}  (بر اساس BS)`);
    }
  }
  lines.push(hr);

  // Electrolytes
  lines.push('🧪 پتاسیم/الکترولیت‌ها:');
  lines.push('• ⚠️ بولوس بدون پتاسیم');
  lines.push(`• برنامه پتاسیم: ${kPlan.text}`);
  lines.push('• اگر KPhos IV در دسترس است: نصف پتاسیم را KPhos و نصف را KCl بده (برای پیشگیری از هیپوفسفاتمی).');
  lines.push('• فسفر: چک شود؛ در هیپوفسفاتمی طبق رفرنس سنی IV/خوراکی بعد از شروع تغذیه.');
  lines.push(hr);

  // Bicarb
  lines.push('🧯 بیکربنات:');
  lines.push('• فقط در pH<6.9 با ناپایداری همودینامیک یا هایپرکالمی مقاوم + با نظر اندو/استاد.');
  lines.push(hr);

  // Cerebral edema treatment note
  lines.push('🧠 ادم مغزی (در صورت شک بالینی):');
  lines.push('• درمان را برای تصویربرداری عقب ننداز.');
  const mannitolDose = round2(0.75 * patient.weightKg);
  const htsDose = Math.round(3 * patient.weightKg);
  lines.push(`• مانیتول 0.5–1 g/kg (مثلاً ~${mannitolDose} g برای این بیمار) طی ۱۵ دقیقه  OR`);
  lines.push(`  سالین هایپرتونیک ۵%، 3 mL/kg (=${htsDose} mL) طی ۱۵ دقیقه`);
  lines.push('• سپس تماس با فلو/اندو و انتقال به PICU');
  lines.push(hr);

  // Monitoring
  lines.push('📈 پایش:');
  lines.push('• قند با گلوکومتر Q1h');
  lines.push('• VBG Q2h');
  lines.push('• BUN/Na/K/Ca/Mg Q4h');
  lines.push('• علائم حیاتی Q1h | I/O Q1h | وضعیت نورولوژیک حداقل Q1h');

  // Assessment (optional) summary
  const positives = Object.entries(assessment).filter(([, v]) => v).map(([k]) => k);
  if (positives.length) {
    lines.push(hr);
    lines.push('✅ نکات ثبت‌شده (اختیاری):');
    lines.push(`• ${positives.join(', ')}`);
  }

  lines.push(hr);
  lines.push('📚 رفرنس‌ها: ISPAD 2022 / BSPED 2022 + پروتکل غدد اطفال شیراز');
  lines.push('⚠️ این خروجی جایگزین قضاوت بالینی و دستور پزشک مسئول نیست.');

  return lines.join('\n');
}

export function generateOrdersEN(input: OrderInputs): string {
  const { patient, labs, insulinRoute, shockState } = input;
  const sev = classifySeverity(labs.ph, labs.hco3);
  const fluids = totalFluidsRateMlPerHour(patient.weightKg, sev, shockState);
  const fType = fluidTypeByGlucose(labs.bgMgDl);
  const cNa = correctedNa(labs.na, labs.bgMgDl);
  const eosm = effectiveOsmolality(labs.na, labs.bgMgDl);

  const lines: string[] = [];
  lines.push('DKA Management – Order Set (assistive)');
  lines.push(`Patient: ${patient.firstName} ${patient.lastName} | Age ${patient.ageYears}y | Wt ${patient.weightKg}kg | ${patient.isNewCase ? 'New onset' : 'Known'}`);
  lines.push(hr);
  lines.push('Safety:');
  lines.push('• NO insulin bolus');
  if (labs.k != null && labs.k < 3) lines.push('• HOLD insulin if K < 3');
  lines.push(hr);
  lines.push(`Severity: ${sev}`);
  lines.push(`Corrected Na: ${fmt(cNa)} mEq/L | Effective osmolality: ${fmt(eosm)} mOsm/kg`);
  lines.push(hr);
  lines.push('Fluids:');
  if (fluids.bolus > 0) lines.push(`• Bolus: NS 0.9% ${fluids.bolus} mL over 1 hour (NO potassium)`);
  lines.push(`• Maintenance: ${fluids.maintenancePerDay} mL/day`);
  lines.push(`• Deficit: ${fluids.deficit} mL`);
  lines.push(`• Rate: ${fluids.ratePerHour} mL/h (48h formula)`);
  lines.push(`• Fluid type (by glucose): ${fType}`);
  lines.push(hr);
  lines.push('Insulin:');
  if (insulinRoute === 'sq') {
    const dose = round2(0.15 * patient.weightKg);
    lines.push(`• SubQ Regular: ${dose} units per dose (mild Q4h / moderate Q2h)`);
  } else {
    const rate = insulinIvRateUPerKgPerHour(labs.bgMgDl);
    lines.push('• IV Regular infusion (if available), start 1 hour after initial fluids');
    lines.push(`• Rate: ${fmt(rate)} U/kg/h (per glucose)`);
  }
  lines.push(hr);
  lines.push('Monitoring: BG Q1h, VBG Q2h, electrolytes Q4h, vitals/I&O/neuro Q1h');
  return lines.join('\n');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
