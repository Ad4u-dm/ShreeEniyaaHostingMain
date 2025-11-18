import Dexie from 'dexie';

export const db = new Dexie('InvoifyDB');
db.version(1).stores({
  enrollments: '++id,userId,planId,synced',
});

export default db;
