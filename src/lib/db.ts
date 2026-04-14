import Dexie, { type EntityTable } from "dexie";

export interface RecentFile {
  id?: number;
  path: string;
  title: string;
  openedAt: number;
}

const db = new Dexie("better-map") as Dexie & {
  recentFiles: EntityTable<RecentFile, "id">;
};

db.version(1).stores({
  recentFiles: "++id, path, openedAt",
});

const MAX_ENTRIES = 10;

export async function addRecentFile(path: string, title: string) {
  // Upsert: delete existing entry for this path, then add new one
  await db.recentFiles.where("path").equals(path).delete();
  await db.recentFiles.add({ path, title, openedAt: Date.now() });

  // Trim to MAX_ENTRIES
  const count = await db.recentFiles.count();
  if (count > MAX_ENTRIES) {
    const oldest = await db.recentFiles
      .orderBy("openedAt")
      .limit(count - MAX_ENTRIES)
      .toArray();
    await db.recentFiles.bulkDelete(oldest.map((r) => r.id!));
  }
}

export async function getRecentFiles(limit = 5): Promise<RecentFile[]> {
  return db.recentFiles.orderBy("openedAt").reverse().limit(limit).toArray();
}
