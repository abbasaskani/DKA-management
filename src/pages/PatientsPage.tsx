import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db';
import { setActiveEpisodeId } from '../utils/active';
import PatientWizard from '../components/PatientWizard';
import { Badge, Button, Card } from '../components/ui';

export default function PatientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);

  const patients = useLiveQuery(async () => {
    return db.patients.orderBy('createdAt').reverse().toArray();
  }, []);

  const episodesByPatient = useLiveQuery(async () => {
    const eps = await db.episodes.toArray();
    const map = new Map<number, number>(); // patientId -> latest episodeId
    eps
      .sort((a, b) => b.startedAt - a.startedAt)
      .forEach((e) => {
        if (!map.has(e.patientId)) map.set(e.patientId, e.id!);
      });
    return map;
  }, []);

  const content = useMemo(() => {
    if (!patients) return [];
    return patients.map((p) => {
      const epId = episodesByPatient?.get(p.id!);
      return { p, epId };
    });
  }, [patients, episodesByPatient]);

  return (
    <div className="space-y-3">
      <Card
        title={<span className="flex items-center gap-2">🧑‍⚕️ {t('nav.patients')}</span>}
        subtitle="ذخیره محلی: با بستن صفحه، اطلاعات باقی می‌ماند ✅"
      >
        <div className="flex gap-2">
          <Button onClick={() => setShowWizard(true)}>➕ {t('patient.newPatient')}</Button>
          <Button variant="soft" onClick={() => navigate('/calculator')}>🧮 {t('nav.calculator')}</Button>
        </div>
      </Card>

      {content.length === 0 ? (
        <Card title="هیچ بیماری ثبت نشده 😄" subtitle="از دکمه بالا شروع کن">
          <Button onClick={() => setShowWizard(true)}>➕ {t('patient.newPatient')}</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {content.map(({ p, epId }) => (
            <Card
              key={p.id}
              title={
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-title">{p.firstName} {p.lastName}</span>
                    <span className="mx-2 text-xs text-mint-900/60">({p.ageYears}y • {p.weightKg}kg)</span>
                  </div>
                  <Badge tone={p.isNewCase ? 'yellow' : 'green'}>{p.isNewCase ? '✨ نیوکِیس' : '🧾 شناخته‌شده'}</Badge>
                </div>
              }
              subtitle={p.notes ? `📝 ${p.notes}` : undefined}
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    if (!epId) return;
                    setActiveEpisodeId(epId);
                    navigate('/calculator');
                  }}
                  disabled={!epId}
                >
                  ▶️ باز کردن
                </Button>
                <Button
                  variant="soft"
                  onClick={async () => {
                    // start a new episode (fresh DKA visit) for the same patient
                    const newEpId = await db.episodes.add({
                      patientId: p.id!,
                      startedAt: Date.now(),
                      assessment: {},
                      initialLabs: {},
                      insulinRoute: 'sq',
                      shockState: false
                    });
                    setActiveEpisodeId(newEpId);
                    navigate('/calculator');
                  }}
                >
                  ➕ ویزیت/اپیزود جدید
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm('حذف بیمار؟ (تمام اپیزودها و ترندها پاک می‌شود)')) return;
                    const eps = await db.episodes.where('patientId').equals(p.id!).toArray();
                    const epIds = eps.map((e) => e.id!).filter(Boolean);
                    await db.trendPoints.where('episodeId').anyOf(epIds).delete();
                    await db.episodes.where('patientId').equals(p.id!).delete();
                    await db.patients.delete(p.id!);
                  }}
                >
                  🗑️ حذف
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showWizard && (
        <Card title="🧩 ایجاد بیمار جدید" subtitle="(می‌توانی مرحله ارزیابی را رد کنی)">
          <PatientWizard
            onCancel={() => setShowWizard(false)}
            onDone={() => {
              setShowWizard(false);
              navigate('/calculator');
            }}
            allowSkipAssessment
          />
        </Card>
      )}
    </div>
  );
}
