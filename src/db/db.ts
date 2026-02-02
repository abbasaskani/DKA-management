import Dexie, { Table } from 'dexie';
import type { Patient, Episode, TrendPoint, AppSettings } from './types';

export class DkaDB extends Dexie {
  patients!: Table<Patient, number>;
  episodes!: Table<Episode, number>;
  trendPoints!: Table<TrendPoint, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('dkaManagement');
    this.version(1).stores({
      patients: '++id, lastName, createdAt',
      episodes: '++id, patientId, startedAt',
      trendPoints: '++id, episodeId, recordedAt, hoursFromStart',
      settings: '++id, key'
    });
  }
}

export const db = new DkaDB();
