import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tracksTable } from "@workspace/db";
import {
  ListTracksResponse,
  UpsertTrackBody,
  UpsertTrackResponse,
  UpdateTrackBody,
  UpdateTrackResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tracks", async (_req, res) => {
  const rows = await db.select().from(tracksTable);
  const data = ListTracksResponse.parse(
    rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  );
  res.json(data);
});

router.post("/tracks", async (req, res) => {
  const body = UpsertTrackBody.parse(req.body);

  const [existing] = await db
    .select()
    .from(tracksTable)
    .where(eq(tracksTable.fingerprint, body.fingerprint));

  const values = {
    id: body.id,
    fingerprint: body.fingerprint,
    name: body.name,
    artist: body.artist,
    album: body.album,
    genre: body.genre,
    duration: body.duration,
    bpm: body.bpm ?? null,
    bpmConfidence: body.bpmConfidence,
    key: body.key ?? null,
    camelot: body.camelot ?? null,
    energy: body.energy,
    mood: body.mood,
    danceability: body.danceability,
    loudness: body.loudness,
    albumArt: body.albumArt ?? null,
    isFavorite: body.isFavorite,
    colorLabel: body.colorLabel ?? null,
    hotCues: body.hotCues,
    loopIn: body.loopIn ?? null,
    loopOut: body.loopOut ?? null,
    updatedAt: new Date(),
  };

  const [row] = existing
    ? await db
        .update(tracksTable)
        .set(values)
        .where(eq(tracksTable.fingerprint, body.fingerprint))
        .returning()
    : await db.insert(tracksTable).values(values).returning();

  const data = UpsertTrackResponse.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
  res.json(data);
});

router.patch("/tracks/:id", async (req, res) => {
  const { id } = req.params;
  const body = UpdateTrackBody.parse(req.body);

  const [row] = await db
    .update(tracksTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tracksTable.id, id))
    .returning();

  if (!row) {
    res.status(404).end();
    return;
  }

  const data = UpdateTrackResponse.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
  res.json(data);
});

router.delete("/tracks/:id", async (req, res) => {
  const { id } = req.params;
  const [row] = await db
    .delete(tracksTable)
    .where(eq(tracksTable.id, id))
    .returning();

  if (!row) {
    res.status(404).end();
    return;
  }

  res.status(204).end();
});

export default router;
