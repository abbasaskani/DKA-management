import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { db } from '../db/db';
import type { Episode, Labs, Patient, TrendPoint } from '../db/types';
import { getActiveEpisodeId } from '../utils/active';
import { classifySeverity, correctedNa, effectiveOsmolality } from '../utils/dkaMath';
import { Badge, Button, Card, Field, Input, Select } from '../components/ui';

type Metric = 'acid' | 'glucose' | 'electrolytes';

type Row = {
  h: number;
  bg: number | null;
  ph: number | null;
  hco3: number | null;
  na: number | null;
  k: number | null;
  bun: number | null;
  pco2: number | null;
  sev: ReturnType<typeof classifySeverity>;
};

function sevColor(sev: Row['sev']): string {
  if (sev === 'severe') return '#ef4444'; // red
  if (sev === 'moderate') return '#f97316'; // orange
  if (sev === 'mild') return '#eab308'; // yellow
  if (sev === 'resolved') return '#22c55e'; // green
  return '#64748b'; // slate
}

function fmt(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—';
  const p = Math.pow(10, digits);
  return String(Math.round(n * p) / p);
}

export default function TrendsPage() {
  const { t, i18n } = useTranslation();
  const [metric, setMetric] = useState<Metric>('acid');
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const activeEpisodeId = getActiveEpisodeId();

  const episode = useLiveQuery(async () => {
    if (!activeEpisodeId) return null;
    return db.episodes.get(activeEpisodeId);
  }, [activeEpisodeId]);

  const patient = useLiveQuery(async () => {
    if (!episode?.patientId) return null;
    return db.patients.get(episode.patientId);
  }, [episode?.patientId]);

  const points = useLiveQuery(async () => {
    if (!activeEpisodeId) return [];
    return db.trendPoints.where('episodeId').equals(activeEpisodeId).sortBy('hoursFromStart');
  }, [activeEpisodeId]);

  const rows: Row[] = useMemo(() => {
    const p = points || [];
    return p
      .slice()
      .sort((a, b) => a.hoursFromStart - b.hoursFromStart)
      .map((tp) => {
        const labs = tp.labs || {};
        const sev = classifySeverity(labs.ph, labs.hco3);
        return {
          h: tp.hoursFromStart,
          bg: labs.bgMgDl ?? null,
          ph: labs.ph ?? null,
          hco3: labs.hco3 ?? null,
          na: labs.na ?? null,
          k: labs.k ?? null,
          bun: labs.bun ?? null,
          pco2: labs.pco2 ?? null,
          sev
        };
      });
  }, [points]);

  const latest = rows.length ? rows[rows.length - 1] : null;
  const latestSev = latest?.sev ?? 'unknown';

  const correctedNaVal = useMemo(() => {
    if (!latest) return null;
    return correctedNa(latest.na ?? undefined, latest.bg ?? undefined);
  }, [latest]);

  const effOsmVal = useMemo(() => {
    if (!latest) return null;
    return effectiveOsmolality(latest.na ?? undefined, latest.bg ?? undefined);
  }, [latest]);

  // Quick-add inputs
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

  const defaultHours = useMemo(() => {
    if (!episode) return 0;
    const h = (Date.now() - episode.startedAt) / 36e5;
    return Math.max(0, Math.round(h * 10) / 10);
  }, [episode?.id]);

  const [addHours, setAddHours] = useState<number>(0);
  const [addLabs, setAddLabs] = useState<Labs>({});

  React.useEffect(() => {
    if (!showAdd) return;
    setAddHours(defaultHours);
    // Prefill with latest (or initial)
    const seed = latest
      ? {
          bgMgDl: latest.bg ?? undefined,
          ph: latest.ph ?? undefined,
          hco3: latest.hco3 ?? undefined,
          na: latest.na ?? undefined,
          k: latest.k ?? undefined,
          bun: latest.bun ?? undefined,
          pco2: latest.pco2 ?? undefined
        }
      : episode?.initialLabs || {};
    setAddLabs({ ...seed });
  }, [showAdd, defaultHours]);

  async function savePoint() {
    if (!episode) return;
    const labs: Labs = {
      ...addLabs,
      bgMgDl: num(addLabs.bgMgDl),
      ph: num(addLabs.ph),
      hco3: num(addLabs.hco3),
      na: num(addLabs.na),
      k: num(addLabs.k),
      bun: num(addLabs.bun),
      pco2: num(addLabs.pco2),
      cr: num(addLabs.cr)
    };

    await db.trendPoints.add({
      episodeId: episode.id!,
      hoursFromStart: Number(addHours),
      recordedAt: Date.now(),
      labs
    });

    setShowAdd(false);
  }

  function exportJson() {
    if (!episode || !patient) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      patient,
      episode,
      trendPoints: (points || [])
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DKA_${patient.lastName || 'patient'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importJsonFile(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);

    const p: Patient = {
      firstName: data?.patient?.firstName || (i18n.language === 'fa' ? 'واردشده' : 'Imported'),
      lastName: data?.patient?.lastName || '—',
      ageYears: Number(data?.patient?.ageYears ?? 0),
      sex: data?.patient?.sex || 'unknown',
      weightKg: Number(data?.patient?.weightKg ?? 0),
      isNewCase: !!data?.patient?.isNewCase,
      notes: (data?.patient?.notes || '') + ' | imported',
      createdAt: Date.now()
    };

    const patientId = await db.patients.add(p);

    const e: Episode = {
      patientId,
      startedAt: Date.now(),
      assessment: data?.episode?.assessment || {},
      initialLabs: data?.episode?.initialLabs || {},
      insulinRoute: data?.episode?.insulinRoute || 'sq',
      shockState: !!data?.episode?.shockState
    };

    const episodeId = await db.episodes.add(e);

    const tps: TrendPoint[] = Array.isArray(data?.trendPoints) ? data.trendPoints : [];
    if (tps.length) {
      await db.trendPoints.bulkAdd(
        tps.map((tp: any) => ({
          episodeId,
          hoursFromStart: Number(tp.hoursFromStart ?? 0),
          recordedAt: Date.now() + Number(tp.hoursFromStart ?? 0) * 3600_000,
          labs: tp.labs || {}
        }))
      );
    }

    localStorage.setItem('activeEpisodeId', String(episodeId));
    alert(i18n.language === 'fa' ? '✅ ایمپورت انجام شد' : '✅ Imported');
  }

  if (!activeEpisodeId || !episode || !patient) {
    return (
      <div className="space-y-3">
        <Card title={t('trends.title')} subtitle={i18n.language === 'fa' ? 'اول یک بیمار/اپیزود انتخاب کن 👇' : 'Pick a patient/episode first 👇'}>
          <Button onClick={() => (window.location.href = '/patients')}>🧑‍⚕️ {t('nav.patients')}</Button>
        </Card>
      </div>
    );
  }

  const metricLabel = (m: Metric) => {
    if (i18n.language === 'fa') {
      return m === 'acid' ? '🧪 Acid-base (pH/HCO3)' : m === 'glucose' ? '🍬 Glucose' : '🧂 Na/K';
    }
    return m === 'acid' ? 'Acid-base (pH/HCO3)' : m === 'glucose' ? 'Glucose' : 'Na/K';
  };

  return (
    <div className="space-y-3">
      <Card
        title={
          <div className="flex items-center justify-between gap-2">
            <div className="font-title">{t('trends.title')} • {patient.firstName} {patient.lastName}</div>
            <Badge tone={latestSev === 'severe' ? 'red' : latestSev === 'moderate' ? 'orange' : latestSev === 'mild' ? 'yellow' : latestSev === 'resolved' ? 'green' : 'neutral'}>
              {latestSev}
            </Badge>
          </div>
        }
        subtitle={
          <span>
            👶 {patient.ageYears}y • ⚖️ {patient.weightKg}kg • {patient.isNewCase ? '✨ New case' : '🧾 Known'}
            <span className="mx-2">•</span>
            🧮 Corrected Na: {fmt(correctedNaVal)} | Eff Osm: {fmt(effOsmVal)}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          {/* Controls */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Field label={i18n.language === 'fa' ? 'نمودار اصلی' : 'Main chart'}>
              <Select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
                <option value="acid">{metricLabel('acid')}</option>
                <option value="glucose">{metricLabel('glucose')}</option>
                <option value="electrolytes">{metricLabel('electrolytes')}</option>
              </Select>
            </Field>

            <div className="flex items-end gap-2">
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={16} className="inline" /> {i18n.language === 'fa' ? 'ثبت سریع' : 'Quick add'}
              </Button>
              <Button variant="soft" onClick={exportJson}>
                <Download size={16} className="inline" /> {i18n.language === 'fa' ? 'Export JSON' : 'Export JSON'}
              </Button>
              <Button
                variant="soft"
                onClick={() => {
                  fileRef.current?.click();
                }}
              >
                <Upload size={16} className="inline" /> {i18n.language === 'fa' ? 'Import' : 'Import'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await importJsonFile(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-3xl border border-mint-200 bg-white/60 p-3">
            {rows.length === 0 ? (
              <div className="text-sm text-mint-900/70">{t('trends.empty')}</div>
            ) : (
              <div style={{ width: '100%', height: 360 }}>
                <ResponsiveContainer>
                  <LineChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="h" tickFormatter={(v) => `${v}h`} />

                    {/* Y axes depend on metric */}
                    {metric === 'acid' && (
                      <>
                        <YAxis yAxisId="left" domain={[6.8, 7.45]} tickCount={7} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 24]} tickCount={7} />
                      </>
                    )}
                    {metric === 'glucose' && <YAxis yAxisId="left" domain={[0, 'auto']} />}
                    {metric === 'electrolytes' && (
                      <>
                        <YAxis yAxisId="left" domain={['auto', 'auto']} />
                        <YAxis yAxisId="right" orientation="right" domain={[2, 7]} />
                      </>
                    )}

                    <Tooltip
                      formatter={(value: any, name: any, props: any) => {
                        return [value ?? '—', name];
                      }}
                      labelFormatter={(label: any) => {
                        return i18n.language === 'fa' ? `⏱️ ${label} ساعت از شروع` : `⏱️ ${label}h from start`;
                      }}
                      contentStyle={{ borderRadius: 16, border: '1px solid rgba(31,122,82,0.2)' }}
                    />
                    <Legend />

                    {metric === 'acid' && (
                      <>
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="ph"
                          name="pH"
                          stroke="#0f766e"
                          strokeWidth={3}
                          dot={(props: any) => (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={4}
                              fill={sevColor(props.payload.sev)}
                              stroke="white"
                              strokeWidth={1}
                            />
                          )}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="hco3"
                          name="HCO3"
                          stroke="#16a34a"
                          strokeWidth={3}
                          dot={(props: any) => (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={4}
                              fill={sevColor(props.payload.sev)}
                              stroke="white"
                              strokeWidth={1}
                            />
                          )}
                        />
                      </>
                    )}

                    {metric === 'glucose' && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="bg"
                        name="BG"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        dot={(props: any) => (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={4}
                            fill={sevColor(props.payload.sev)}
                            stroke="white"
                            strokeWidth={1}
                          />
                        )}
                      />
                    )}

                    {metric === 'electrolytes' && (
                      <>
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="na"
                          name="Na"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={(props: any) => (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={4}
                              fill={sevColor(props.payload.sev)}
                              stroke="white"
                              strokeWidth={1}
                            />
                          )}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="k"
                          name="K"
                          stroke="#f97316"
                          strokeWidth={3}
                          dot={(props: any) => (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={4}
                              fill={sevColor(props.payload.sev)}
                              stroke="white"
                              strokeWidth={1}
                            />
                          )}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-2xl bg-white/70 px-2 py-1 ring-1 ring-mint-200">🔴 Severe</span>
              <span className="rounded-2xl bg-white/70 px-2 py-1 ring-1 ring-mint-200">🟠 Moderate</span>
              <span className="rounded-2xl bg-white/70 px-2 py-1 ring-1 ring-mint-200">🟡 Mild</span>
              <span className="rounded-2xl bg-white/70 px-2 py-1 ring-1 ring-mint-200">🟢 Resolved</span>
            </div>
          </div>

          {/* Timeline table */}
          <div className="rounded-3xl border border-mint-200 bg-white/60 p-3">
            <div className="font-title mb-2">🕒 {i18n.language === 'fa' ? 'تایم‌لاین' : 'Timeline'}</div>
            {rows.length === 0 ? (
              <div className="text-sm text-mint-900/70">{t('trends.empty')}</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-mint-900/70">
                      <th className="py-2 text-start">⏱️ h</th>
                      <th className="py-2 text-start">BG</th>
                      <th className="py-2 text-start">pH</th>
                      <th className="py-2 text-start">HCO3</th>
                      <th className="py-2 text-start">Na</th>
                      <th className="py-2 text-start">K</th>
                      <th className="py-2 text-start">Status</th>
                      <th className="py-2 text-end">—</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(points || [])
                      .slice()
                      .sort((a, b) => a.hoursFromStart - b.hoursFromStart)
                      .map((tp) => {
                        const labs = tp.labs || {};
                        const sev = classifySeverity(labs.ph, labs.hco3);
                        return (
                          <tr key={tp.id} className="border-t border-mint-200/70">
                            <td className="py-2">{fmt(tp.hoursFromStart, 1)}</td>
                            <td className="py-2">{fmt(labs.bgMgDl, 0)}</td>
                            <td className="py-2">{fmt(labs.ph, 2)}</td>
                            <td className="py-2">{fmt(labs.hco3, 1)}</td>
                            <td className="py-2">{fmt(labs.na, 0)}</td>
                            <td className="py-2">{fmt(labs.k, 1)}</td>
                            <td className="py-2">
                              <span className="rounded-2xl px-2 py-1" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(31,122,82,0.15)', color: sevColor(sev) }}>
                                {sev}
                              </span>
                            </td>
                            <td className="py-2 text-end">
                              <Button
                                variant="ghost"
                                onClick={async () => {
                                  if (!confirm(i18n.language === 'fa' ? 'حذف این نقطه؟' : 'Delete this point?')) return;
                                  await db.trendPoints.delete(tp.id!);
                                }}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Floating action button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-mint-400 to-mint-600 text-white shadow-lg ring-1 ring-mint-200 hover:opacity-95"
        title={i18n.language === 'fa' ? 'ثبت سریع' : 'Quick add'}
        aria-label="quick-add"
      >
        <Plus />
      </button>

      {/* Quick add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-3 md:items-center">
          <div className="w-full max-w-2xl">
            <Card
              title={i18n.language === 'fa' ? '➕ ثبت سریع' : '➕ Quick add'}
              subtitle={i18n.language === 'fa' ? 'سریع و مینیمال؛ فقط پارامترهای مهم ✨' : 'Fast minimal entry ✨'}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={i18n.language === 'fa' ? '⏱️ ساعت از شروع' : '⏱️ Hours from start'}>
                  <Input type="number" step={0.1} value={addHours} onChange={(e) => setAddHours(Number(e.target.value))} />
                </Field>

                <Field label="BG (mg/dL)">
                  <Input
                    type="number"
                    value={addLabs.bgMgDl ?? ''}
                    onChange={(e) => setAddLabs((p) => ({ ...p, bgMgDl: Number(e.target.value) }))}
                  />
                </Field>

                <Field label="pH">
                  <Select value={addLabs.ph ?? ''} onChange={(e) => setAddLabs((p) => ({ ...p, ph: Number(e.target.value) }))}>
                    {phOptions.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="HCO3">
                  <Select value={addLabs.hco3 ?? ''} onChange={(e) => setAddLabs((p) => ({ ...p, hco3: Number(e.target.value) }))}>
                    {hco3Options.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Na">
                  <Input type="number" value={addLabs.na ?? ''} onChange={(e) => setAddLabs((p) => ({ ...p, na: Number(e.target.value) }))} />
                </Field>

                <Field label="K">
                  <Input
                    type="number"
                    step={0.1}
                    value={addLabs.k ?? ''}
                    onChange={(e) => setAddLabs((p) => ({ ...p, k: Number(e.target.value) }))}
                  />
                </Field>

                <Field label="BUN">
                  <Input type="number" value={addLabs.bun ?? ''} onChange={(e) => setAddLabs((p) => ({ ...p, bun: Number(e.target.value) }))} />
                </Field>

                <Field label="pCO2">
                  <Input type="number" value={addLabs.pco2 ?? ''} onChange={(e) => setAddLabs((p) => ({ ...p, pco2: Number(e.target.value) }))} />
                </Field>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setShowAdd(false)}>
                  {i18n.language === 'fa' ? '❌ بستن' : '❌ Close'}
                </Button>
                <div className="flex gap-2">
                  <Button variant="soft" onClick={() => setAddLabs({})}>
                    {i18n.language === 'fa' ? 'پاک کردن' : 'Clear'}
                  </Button>
                  <Button onClick={savePoint}>💾 {i18n.language === 'fa' ? 'ذخیره' : 'Save'}</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function num(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
