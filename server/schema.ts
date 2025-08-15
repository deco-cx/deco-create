import { integer, sqliteTable, text } from "@deco/workers-runtime/drizzle";

export const todosTable = sqliteTable("todos", {
  id: integer("id").primaryKey(),
  title: text("title"),
  completed: integer("completed").default(0),
});
