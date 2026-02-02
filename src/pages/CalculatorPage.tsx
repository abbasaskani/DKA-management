import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Copy, Plus, Save } from 'lucide-react';

import { db } from '../db/db';
import type { Episode, InsulinRoute, Labs, Patient } from '../db/types';
import { getActiveEpisodeId } from '../utils/active';
import {
  brainEdemaRiskFactors,
  classifySeverity,
  correctedNa,
  effectiveOsmolality,
  fluidTypeByGlucose,
  potassiumPlan,
  totalFluidsRateMlPerHour
} from '../utils/dkaMath';
import { generateOrdersEN, generateOrdersFA } from '../utils/orders';
import PatientWizard from '../components/PatientWizard';
import { Badge, Button, Card, Field, Input, Select, Toggle } from '../components/ui';

function toneForSeverity(sev: string): 'red' | 'orange' | 'yellow' | 'green' | 'neutral' {
  if (sev === 'severe') return 'red';
  if (sev === 'moderate') return 'orange';
  if (sev === 'mild') return 'yellow';
  if (sev === 'resolved') return 'green';
  return 'neutral';
}

export default function CalculatorPage() {
  const { t, i18n } = useTranslation();
  const [showWizard, setShowWizard] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeEpisodeId = getActiveEpisodeId();

  const episode = useLiveQuery(async () => {
    if (!activeEpisodeId) return null;
    return db.episodes.get(activeEpisodeId);
  }, [activeEpisodeId]);

  const patient = useLiveQuery(async () => {
    if (!episode?.patientId) return null;
    return db.patients.get(episode.patientId);
  }, [episode?.patientId]);

  const [localLabs, setLocalLabs] = useState<Labs>({});
  const [localRoute, setLocalRoute] = useState<InsulinRoute>('sq');
  const [localShock, setLocalShock] = useState(false);

  useEffect(() => {
    if (episode) {
      setLocalLabs(episode.initialLabs || {});
      setLocalRoute(episode.insulinRoute || 'sq');
      setLocalShock(episode.shockState || false);
    }
  }, [episode?.id]);

  const sev = classifySeverity(localLabs.ph, localLabs.hco3);
  const sevBadge = useMemo(() => {
    const map: Record<string, string> = {
      mild: `🟡 ${t('calc.mild')}`,
      moderate: `🟠 ${t('calc.moderate')}`,
      severe: `🔴 ${t('calc.severe')}`,
      resolved: `🟢 ${t('calc.resolved')}`,
      unknown: '—'
    };
    return map[sev] || '—';
  }, [sev, t]);

  const derived = useMemo(() => {
    if (!patient) return null;
    const fluids = totalFluidsRateMlPerHour(patient.weightKg, sev, localShock);
    const k = potassiumPlan(localLabs.k);
    const cNa = correctedNa(localLabs.na, localLabs.bgMgDl);
    const eosm = effectiveOsmolality(localLabs.na, localLabs.bgMgDl);
    const beRisk = brainEdemaRiskFactors(localLabs, patient.ageYears);
    const fluidType = fluidTypeByGlucose(localLabs.bgMgDl);
    return { fluids, k, cNa, eosm, beRisk, fluidType };
  }, [patient, localLabs, sev, localShock]);

  const ordersFA = useMemo(() => {
    if (!patient || !episode) return '';
    return generateOrdersFA({
      patient,
      labs: localLabs,
      assessment: episode.assessment || {},
      insulinRoute: localRoute,
      shockState: localShock
    });
  }, [patient, episode?.id, localLabs, localRoute, localShock]);

  const ordersEN = useMemo(() => {
    if (!patient || !episode) return '';
    return generateOrdersEN({
      patient,
      labs: localLabs,
      assessment: episode.assessment || {},
      insulinRoute: localRoute,
      shockState: localShock
    });
  }, [patient, episode?.id, localLabs, localRoute, localShock]);

  async function save() {
    if (!episode) return;
    await db.episodes.update(episode.id!, {
      initialLabs: localLabs,
      insulinRoute: localRoute,
      shockState: localShock
    });
  }

  if (!activeEpisodeId || !episode || !patient) {
    return (
      <div className="space-y-3">
        <Card title={t('calc.headline')} subtitle="برای شروع یک بیمار/اپیزود انتخاب کن 👇">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowWizard(true)}>➕ {t('patient.newPatient')}</Button>
            <Button variant="soft" onClick={() => (window.location.href = '/patients')}>🧑‍⚕️ {t('nav.patients')}</Button>
          </div>
        </Card>
        {showWizard && (
          <Card title="🧩 ایجاد بیمار" subtitle="(می‌توانی مستقیم به محاسبه‌گر بپری)">
            <PatientWizard
              onCancel={() => setShowWizard(false)}
              onDone={() => {
                setShowWizard(false);
                window.location.reload();
              }}
              allowSkipAssessment
            />
          </Card>
        )}
      </div>
    );
  }

  // Per your request: range-like dropdowns (labels are ranges; values are representative)
  const phOptions = [
    { label: '< 7.1 (Severe)', value: 7.05 },
    { label: '7.1 – 7.2 (Moderate)', value: 7.15 },
    { label: '7.2 – 7.3 (Mild)', value: 7.25 },
    { label: '> 7.3 (Resolved/Not DKA)', value: 7.35 }
  ];
  const hco3Options = [
    { label: '< 5 (Severe)', value: 4 },
    { label: '5 – 10 (Moderate)', value: 7.5 },
    { label: '10 – 18 (Mild)', value: 14 },
    { label: '> 18 (Resolved/Not DKA)', value: 20 }
  ];

  return (
    <div className="space-y-3">
      <Card
        title={
          <div className="flex items-center justify-between gap-2">
            <div className="font-title">
              {t('calc.headline')} <span className="mx-2 text-sm text-mint-900/60">|</span>
              <span className="font-title">{patient.firstName} {patient.lastName}</span>
            </div>
            <Badge tone={toneForSeverity(sev)}>{sevBadge}</Badge>
          </div>
        }
        subtitle={
          <span>
            👶 {patient.ageYears}y • ⚖️ {patient.weightKg}kg • {patient.isNewCase ? '✨ نیوکِیس' : '🧾 شناخته‌شده'}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          {/* Safety prompts */}
          <div className="rounded-3xl border border-mint-200 bg-white/50 p-3">
            <div className="font-title mb-2">{t('calc.safety')}</div>
            <div className="space-y-1 text-sm">
              <div>• {t('calc.noBolus')}</div>
              <div className={localLabs.k != null && localLabs.k < 3 ? 'text-red-700 font-semibold' : ''}>
                • {t('calc.holdIfK')}
              </div>
              {localLabs.k != null && localLabs.k >= 3 && localLabs.k < 3.5 ? (
                <div className="text-orange-800 font-semibold">
                  • {i18n.language === 'fa' ? '🟠 K بین 3 تا 3.5: قبل از شروع انسولین، K را اصلاح کن + مانیتورینگ' : '🟠 K 3–3.5: correct K before insulin + monitoring'}
                </div>
              ) : null}
              {derived?.beRisk?.length ? (
                <div className="text-orange-800">• {t('calc.brainEdemaRisk')} ({derived.beRisk.join('، ')})</div>
              ) : null}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card title="🧾 تنظیمات سریع" subtitle="(همه قابل ویرایش)" className="bg-white/40">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('calc.route')}>
                  <Select value={localRoute} onChange={(e) => setLocalRoute(e.target.value as InsulinRoute)}>
                    <option value="sq">{t('calc.routeSq')}</option>
                    <option value="iv">{t('calc.routeIv')}</option>
                  </Select>
                </Field>
                <Field label={t('calc.shockState')}>
                  <Toggle checked={localShock} onChange={setLocalShock} label={localShock ? '✅ بله' : '❌ خیر'} emoji="🚨" />
                </Field>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={save}><Save size={16} className="inline" /> ذخیره</Button>
                <Button
                  variant="soft"
                  onClick={async () => {
                    // add a trend point quickly
                    await db.trendPoints.add({
                      episodeId: episode.id!,
                      hoursFromStart: Math.max(0, Math.round((Date.now() - episode.startedAt) / 36e5 * 10) / 10),
                      recordedAt: Date.now(),
                      labs: localLabs
                    });
                  }}
                >
                  <Plus size={16} className="inline" /> ثبت در ترند
                </Button>
              </div>
            </Card>

            <Card title="🧪 آزمایش‌ها" subtitle="BG، pH، HCO3، Na، K، BUN..." className="bg-white/40">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('labs.bg')}>
                  <Input type="number" value={localLabs.bgMgDl ?? ''} onChange={(e) => setLocalLabs((p) => ({ ...p, bgMgDl: Number(e.target.value) }))} />
                </Field>
                <Field label={t('labs.ph')}>
                  <Select value={localLabs.ph ?? ''} onChange={(e) => setLocalLabs((p) => ({ ...p, ph: Number(e.target.value) }))}>
                    {phOptions.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('labs.hco3')}>
                  <Select value={localLabs.hco3 ?? ''} onChange={(e) => setLocalLabs((p) => ({ ...p, hco3: Number(e.target.value) }))}>
                    {hco3Options.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('labs.na')}>
                  <Input type="number" value={localLabs.na ?? ''} onChange={(e) => setLocalLabs((p) => ({ ...p, na: Number(e.target.value) }))} />
                </Field>
                <Field label={t('labs.k')}>
                  <Input type="number" step={0.1} value={localLabs.k ?? ''} onChange={(e) => setLocalLabs((p) => ({ ...p, k: Number(e.target.value) }))} />
                </Field>
                <Field label={t('labs.bun')}>
                  <Input type="number" value={localLabs.bun ?? ''} onChange={(e) => setLocalLabs((p) => ({ ...p, bun: Number(e.target.value) }))} />
                </Field>
                <Field label={t('labs.pco2')}>
                  <Input type="number" value={localLabs.pco2 ?? ''} onChange={(e) => setLocalLabs((p) => ({ ...p, pco2: Number(e.target.value) }))} />
                </Field>
                <Field label={t('labs.cr')}>
                  <Input type="number" step={0.1} value={localLabs.cr ?? ''} onChange={(e) => setLocalLabs((p) => ({ ...p, cr: Number(e.target.value) }))} />
                </Field>
              </div>
            </Card>
          </div>

          {/* Outputs */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card title="💧 مایعات (محاسبات)" subtitle="Maintenance + Deficit + Bolus + Rate" className="bg-white/40">
              {derived ? (
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="neutral">Maintenance/day: {derived.fluids.maintenancePerDay} mL</Badge>
                    <Badge tone="neutral">Deficit: {derived.fluids.deficit} mL</Badge>
                    <Badge tone={derived.fluids.bolus ? 'yellow' : 'green'}>Bolus: {derived.fluids.bolus} mL</Badge>
                    <Badge tone="green">Rate: {derived.fluids.ratePerHour} mL/h</Badge>
                  </div>
                  <div className="rounded-2xl border border-mint-200 bg-white/60 p-3">
                    <div>🧪 Fluid type by glucose: <b>{derived.fluidType}</b></div>
                    <div className="mt-1 text-xs text-mint-900/70">{derived.fluids.note}</div>
                  </div>
                </div>
              ) : null}
            </Card>

            <Card title="🧪 الکترولیت‌ها + Na/Osm" subtitle="Corrected Na • Effective osmolality • K plan" className="bg-white/40">
              {derived ? (
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="neutral">Corrected Na: {derived.cNa ?? '—'} mEq/L</Badge>
                    <Badge tone="neutral">Eff Osm: {derived.eosm ?? '—'} mOsm/kg</Badge>
                  </div>
                  <div className="rounded-2xl border border-mint-200 bg-white/60 p-3">
                    <div className="font-title mb-1">🧂 Potassium plan</div>
                    <div className={derived.k.tone === 'red' ? 'text-red-700 font-semibold' : derived.k.tone === 'orange' ? 'text-orange-800 font-semibold' : ''}>
                      {derived.k.text}
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          </div>

          {/* Orders */}
          <Card title={t('calc.orders')} subtitle={i18n.language === 'fa' ? 'فارسی + انگلیسی (قابل کپی)' : 'FA + EN (copyable)'}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-mint-900/70">فارسی</div>
                <textarea className="w-full rounded-3xl border border-mint-200 bg-white/70 p-3 text-xs leading-5 outline-none" rows={14} value={ordersFA} readOnly />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-mint-900/70">English</div>
                <textarea className="font-en w-full rounded-3xl border border-mint-200 bg-white/70 p-3 text-xs leading-5 outline-none" rows={14} value={ordersEN} readOnly />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                onClick={async () => {
                  await navigator.clipboard.writeText(i18n.language === 'fa' ? ordersFA : ordersEN);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              >
                <Copy size={16} className="inline" /> {copied ? t('calc.copied') : t('calc.copy')}
              </Button>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}
