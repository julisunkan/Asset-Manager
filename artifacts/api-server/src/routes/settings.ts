import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable, SETTINGS_KEYS, type SettingsKey } from "@workspace/db";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function maskPreview(value: string): string {
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

async function loadStatus() {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const status: Record<string, { configured: boolean; preview: string | null }> = {};
  for (const key of SETTINGS_KEYS) {
    const value = map.get(key);
    status[key] = value
      ? { configured: true, preview: maskPreview(value) }
      : { configured: false, preview: null };
  }
  return status;
}

router.get("/settings", async (_req, res) => {
  const status = await loadStatus();
  res.json(GetSettingsResponse.parse(status));
});

router.put("/settings", async (req, res) => {
  const body = UpdateSettingsBody.parse(req.body);

  for (const key of SETTINGS_KEYS as readonly SettingsKey[]) {
    const value = body[key];
    if (value === undefined) continue;

    if (value === "") {
      await db.delete(settingsTable).where(eq(settingsTable.key, key));
      continue;
    }

    const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    if (existing) {
      await db
        .update(settingsTable)
        .set({ value, updatedAt: new Date() })
        .where(eq(settingsTable.key, key));
    } else {
      await db.insert(settingsTable).values({ key, value });
    }
  }

  const status = await loadStatus();
  res.json(UpdateSettingsResponse.parse(status));
});

export default router;

/** Internal helper for other routes (integrations) to read a raw credential value. */
export async function getSettingValue(key: SettingsKey): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}
