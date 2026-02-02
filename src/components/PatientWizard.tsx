import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db';
import type { AssessmentFlags, InsulinRoute, Labs, Patient, Sex } from '../db/types';
import { setActiveEpisodeId } from '../utils/active';
import { Button, Card, Field, Input, Select, Toggle } from './ui';

export default function PatientWizard({
  onDone,
  onCancel,
  allowSkipAssessment = true
}: {
  onDone: (episodeId: number) => void;
  onCancel: () => void;
  allowSkipAssessment?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Identity
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ageYears, setAgeYears] = useState<number>(12);
  const [sex, setSex] = useState<Sex>('unknown');
  const [weightKg, setWeightKg] = useState<number>(30);
  const [isNewCase, setIsNewCase] = useState<boolean>(true);
  const [notes, setNotes] = useState('');

  // Optional assessment flags (toggles)
  const [assessment, setAssessment] = useState<AssessmentFlags>({});

  // Labs + settings
  const [insulinRoute, setInsulinRoute] = useState<InsulinRoute>('sq');
  const [shockState, setShockState] = useState(false);
  const [labs, setLabs] = useState<Labs>({
    bgMgDl: 350,
    ph: 7.15,
    hco3: 10,
    na: 135,
    k: 4.5,
    bun: 18,
    pco2: 25
  });

  const ageOptions = useMemo(() => {
    const arr: number[] = [];
    for (let a = 0; a <= 18; a++) arr.push(a);
    return arr;
  }, []);

  // Range-like dropdowns (labels are ranges; values are representative)
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

  function updateFlag(key: keyof AssessmentFlags, v: boolean) {
    setAssessment((prev) => ({ ...prev, [key]: v }));
  }

  async function save() {
    const p: Patient = {
      firstName: (firstName || '').trim() || (i18n.language === 'fa' ? 'بدون‌نام' : 'Unknown'),
      lastName: (lastName || '').trim() || (i18n.language === 'fa' ? '—' : '-'),
      ageYears,
      sex,
      weightKg,
      isNewCase,
      notes: notes.trim() || undefined,
      createdAt: Date.now()
    };

    const patientId = await db.patients.add(p);
    const episodeId = await db.episodes.add({
      patientId,
      startedAt: Date.now(),
      assessment,
      initialLabs: labs,
      insulinRoute,
      shockState
    });

    setActiveEpisodeId(episodeId);
    onDone(episodeId);
  }

  return (
    <div className="space-y-3">
      {step === 1 && (
        <Card title={t('patient.newPatient')} subtitle="🧩 مرحله ۱/۳">
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('patient.firstName')}>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={i18n.language === 'fa' ? 'مثلاً: سارا' : 'e.g. Sara'} />
              </Field>
              <Field label={t('patient.lastName')}>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={i18n.language === 'fa' ? 'مثلاً: محمدی' : 'e.g. Mohammadi'} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('patient.age')}>
                <Select value={ageYears} onChange={(e) => setAgeYears(Number(e.target.value))}>
                  {ageOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('patient.sex')}>
                <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                  <option value="unknown">{t('patient.unknown')}</option>
                  <option value="female">{t('patient.female')}</option>
                  <option value="male">{t('patient.male')}</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('patient.weight')} hint="برای محاسبات ضروری است ⚖️">
                <Input
                  type="number"
                  min={2}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                />
              </Field>
              <Field label={i18n.language === 'fa' ? 'وضعیت دیابت' : 'Diabetes status'}>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isNewCase ? 'primary' : 'soft'}
                    className="flex-1"
                    onClick={() => setIsNewCase(true)}
                  >
                    ✨ {t('patient.newCase')}
                  </Button>
                  <Button
                    type="button"
                    variant={!isNewCase ? 'primary' : 'soft'}
                    className="flex-1"
                    onClick={() => setIsNewCase(false)}
                  >
                    🧾 {t('patient.knownCase')}
                  </Button>
                </div>
              </Field>
            </div>

            <Field label={t('patient.notes')}>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={i18n.language === 'fa' ? 'اختیاری…' : 'Optional…'} />
            </Field>

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={onCancel}>❌ {i18n.language === 'fa' ? 'بستن' : 'Close'}</Button>
              <div className="flex gap-2">
                {allowSkipAssessment && (
                  <Button type="button" variant="soft" onClick={() => setStep(3)}>
                    ⏭️ {i18n.language === 'fa' ? 'پرش به محاسبه‌گر' : 'Skip to calculator'}
                  </Button>
                )}
                <Button type="button" onClick={() => setStep(2)}>
                  ادامه ➜
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title={t('assessment.optional')} subtitle="🧩 مرحله ۲/۳ – دکمه‌ای روشن/خاموش">
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Toggle checked={!!assessment.polyuria} onChange={(v) => updateFlag('polyuria', v)} label={t('assessment.polyuria')} emoji="🚽" />
              <Toggle checked={!!assessment.polydipsia} onChange={(v) => updateFlag('polydipsia', v)} label={t('assessment.polydipsia')} emoji="🥤" />
              <Toggle checked={!!assessment.weightLoss} onChange={(v) => updateFlag('weightLoss', v)} label={t('assessment.weightLoss')} emoji="📉" />
              <Toggle checked={!!assessment.rapidBreathing} onChange={(v) => updateFlag('rapidBreathing', v)} label={t('assessment.rapidBreathing')} emoji="💨" />
              <Toggle checked={!!assessment.nausea} onChange={(v) => updateFlag('nausea', v)} label={t('assessment.nausea')} emoji="🤢" />
              <Toggle checked={!!assessment.abdPain} onChange={(v) => updateFlag('abdPain', v)} label={t('assessment.abdPain')} emoji="🤲" />
              <Toggle checked={!!assessment.dehydration} onChange={(v) => updateFlag('dehydration', v)} label={t('assessment.dehydration')} emoji="💧" />
              <Toggle checked={!!assessment.loc} onChange={(v) => updateFlag('loc', v)} label={t('assessment.loc')} emoji="🧠" />
              <Toggle checked={!!assessment.kussmaul} onChange={(v) => updateFlag('kussmaul', v)} label={t('assessment.kussmaul')} emoji="😮‍💨" />
              <Toggle checked={!!assessment.shock} onChange={(v) => updateFlag('shock', v)} label={t('assessment.shock')} emoji="🚨" />
              <Toggle checked={!!assessment.coma} onChange={(v) => updateFlag('coma', v)} label={t('assessment.coma')} emoji="😴" />
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="soft" onClick={() => setStep(1)}>
                ⬅️ {i18n.language === 'fa' ? 'قبلی' : 'Back'}
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                ادامه ➜
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title={t('labs.initialLabs')} subtitle="🧩 مرحله ۳/۳ – ورودی‌ها + تنظیمات">
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('labs.bg')}>
                <Input type="number" value={labs.bgMgDl ?? ''} onChange={(e) => setLabs((p) => ({ ...p, bgMgDl: Number(e.target.value) }))} />
              </Field>
              <Field label={t('labs.ph')} hint="به صورت عددی (از لیست)">
                <Select value={labs.ph ?? ''} onChange={(e) => setLabs((p) => ({ ...p, ph: Number(e.target.value) }))}>
                  {phOptions.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('labs.hco3')}>
                <Select value={labs.hco3 ?? ''} onChange={(e) => setLabs((p) => ({ ...p, hco3: Number(e.target.value) }))}>
                  {hco3Options.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('labs.na')}>
                <Input type="number" value={labs.na ?? ''} onChange={(e) => setLabs((p) => ({ ...p, na: Number(e.target.value) }))} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('labs.k')}>
                <Input type="number" step={0.1} value={labs.k ?? ''} onChange={(e) => setLabs((p) => ({ ...p, k: Number(e.target.value) }))} />
              </Field>
              <Field label={t('labs.bun')}>
                <Input type="number" value={labs.bun ?? ''} onChange={(e) => setLabs((p) => ({ ...p, bun: Number(e.target.value) }))} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('labs.pco2')}>
                <Input type="number" value={labs.pco2 ?? ''} onChange={(e) => setLabs((p) => ({ ...p, pco2: Number(e.target.value) }))} />
              </Field>
              <Field label={t('labs.cr')}>
                <Input type="number" step={0.1} value={labs.cr ?? ''} onChange={(e) => setLabs((p) => ({ ...p, cr: Number(e.target.value) }))} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('calc.route')}>
                <Select value={insulinRoute} onChange={(e) => setInsulinRoute(e.target.value as InsulinRoute)}>
                  <option value="sq">{t('calc.routeSq')}</option>
                  <option value="iv">{t('calc.routeIv')}</option>
                </Select>
              </Field>
              <Field label={t('calc.shockState')}>
                <Toggle checked={shockState} onChange={setShockState} label={shockState ? '✅ بله' : '❌ خیر'} emoji="🚨" />
              </Field>
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="soft" onClick={() => setStep(allowSkipAssessment ? 1 : 2)}>
                ⬅️ {i18n.language === 'fa' ? 'قبلی' : 'Back'}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="soft" onClick={onCancel}>انصراف</Button>
                <Button type="button" onClick={save}>💾 ذخیره و ورود</Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
