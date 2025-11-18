import Dexie from 'dexie';

export interface Enrollment {
  id?: number;
  userId: string;
  planId: string;
  synced: boolean;
}

class InvoifyDB extends Dexie {
  enrollments: Dexie.Table<Enrollment, number>;
  constructor() {
    super('InvoifyDB');
    this.version(1).stores({
      enrollments: '++id,userId,planId,synced',
    });
    this.enrollments = this.table('enrollments');
  }
}

export const db = new InvoifyDB();
