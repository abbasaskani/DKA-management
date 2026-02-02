import { db } from '../db/db';
import type { Patient, AssessmentFlags, Labs } from '../db/types';
import { setActiveEpisodeId } from './active';

export async function createDemoSevereCase(): Promise<number> {
  // Demo only (for UI testing)
  const patient: Patient = {
    firstName: 'سارا',
    lastName: 'نمونه',
    ageYears: 12,
    sex: 'female',
    weightKg: 40,
    isNewCase: true,
    notes: 'Case demo: Severe DKA, resolves ~12h',
    createdAt: Date.now()
  };

  const assessment: AssessmentFlags = {
    polyuria: true,
    polydipsia: true,
    weightLoss: true,
    rapidBreathing: true,
    nausea: true,
    abdPain: true,
    dehydration: true,
    loc: true,
    kussmaul: true,
    shock: false,
    coma: false
  };

  const initialLabs: Labs = {
    bgMgDl: 560,
    ph: 6.95,
    hco3: 4,
    na: 130,
    k: 5.6,
    bun: 25,
    pco2: 18,
    cr: 1.2,
    ketones: '+++',
    wbc: 24000,
    fever: false
  };

  const patientId = await db.patients.add(patient);
  const episodeId = await db.episodes.add({
    patientId,
    startedAt: Date.now(),
    assessment,
    initialLabs,
    insulinRoute: 'sq',
    shockState: false
  });

  const points: Array<{ h: number; labs: Labs }> = [
    { h: 0, labs: initialLabs },
    { h: 2, labs: { bgMgDl: 420, ph: 7.02, hco3: 6.5, na: 132, k: 4.8, bun: 23, pco2: 20 } },
    { h: 4, labs: { bgMgDl: 320, ph: 7.10, hco3: 9.0, na: 134, k: 4.2, bun: 21, pco2: 24 } },
    { h: 6, labs: { bgMgDl: 240, ph: 7.18, hco3: 11.5, na: 136, k: 3.8, bun: 18, pco2: 28 } },
    { h: 8, labs: { bgMgDl: 190, ph: 7.25, hco3: 14.0, na: 137, k: 3.6, bun: 16, pco2: 32 } },
    { h: 10, labs: { bgMgDl: 150, ph: 7.29, hco3: 16.5, na: 138, k: 3.7, bun: 14, pco2: 34 } },
    { h: 12, labs: { bgMgDl: 130, ph: 7.32, hco3: 18.5, na: 138, k: 3.9, bun: 12, pco2: 36 } }
  ];

  await db.trendPoints.bulkAdd(
    points.map((p) => ({
      episodeId,
      hoursFromStart: p.h,
      recordedAt: Date.now() + p.h * 60 * 60 * 1000,
      labs: p.labs
    }))
  );

  setActiveEpisodeId(episodeId);
  return episodeId;
}
