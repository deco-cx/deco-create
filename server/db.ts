import {
  drizzle,
  migrateWithoutTransaction,
} from "@deco/workers-runtime/drizzle";
import type { Env } from "./main";
import migrations from "./drizzle/migrations";

export const getDb = async (env: Env) => {
  const db = drizzle(env);
  await migrateWithoutTransaction(db, migrations);
  return db;
};
