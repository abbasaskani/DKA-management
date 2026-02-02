export type Sex = 'female' | 'male' | 'unknown';
export type InsulinRoute = 'sq' | 'iv';

export type AssessmentFlags = {
  polyuria?: boolean;
  polydipsia?: boolean;
  weightLoss?: boolean;
  rapidBreathing?: boolean;
  nausea?: boolean;
  abdPain?: boolean;
  dehydration?: boolean;
  loc?: boolean;
  kussmaul?: boolean;
  shock?: boolean;
  coma?: boolean;
};

export type Labs = {
  bgMgDl?: number;
  ph?: number;
  hco3?: number;
  na?: number;
  k?: number;
  bun?: number;
  pco2?: number;
  cr?: number;
  ketones?: string;
  wbc?: number;
  fever?: boolean;
};

export interface Patient {
  id?: number;
  firstName: string;
  lastName: string;
  ageYears: number;
  sex: Sex;
  weightKg: number;
  isNewCase: boolean;
  notes?: string;
  createdAt: number;
}

export interface Episode {
  id?: number;
  patientId: number;
  startedAt: number;
  assessment: AssessmentFlags;
  initialLabs: Labs;
  insulinRoute: InsulinRoute;
  shockState: boolean;
}

export interface TrendPoint {
  id?: number;
  episodeId: number;
  hoursFromStart: number;
  recordedAt: number;
  labs: Labs;
}

export interface AppSettings {
  id?: number;
  key: 'viewMode' | 'lang';
  value: string;
}
