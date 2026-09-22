import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Contract tests read SQL migrations from the Backend repository.
 * Clone both repositories side by side (../Backend) or set AKAI_BACKEND_DIR.
 */
export const backendDir = resolve(process.env.AKAI_BACKEND_DIR ?? "../Backend");

export function backendPath(relative: string) {
  return resolve(backendDir, relative);
}

/** Maps a historical folder name such as "0012_sales_portal" or "0032_5_x" to its Supabase migration file. */
export function migrationPath(folder: string) {
  const match = /^(\d{4})(?:_(\d)(?=_))?_(.+)$/.exec(folder);
  if (!match) throw new Error(`Unrecognised migration folder: ${folder}`);
  const [, number, sub, name] = match;
  const version = `20250101${number}${sub ? `${sub}0` : "00"}`;
  return backendPath(`supabase/migrations/${version}_${name}.sql`);
}

export const backendAvailable = existsSync(backendPath("supabase/migrations"));
