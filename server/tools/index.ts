/**
 * Central export point for all tools organized by domain.
 *
 * This file aggregates all tools from different domains into a single
 * export, making it easy to import all tools in main.ts while keeping
 * the domain separation.
 */
import { DeconfigResource } from "@deco/workers-runtime/deconfig";
import { z } from "zod";
import { type Env } from '../main.ts';
import { todoTools } from "./todos.ts";
import { userTools } from "./user.ts";

const TodoSettings = DeconfigResource.define({
  dataSchema: z.object({
    name: z.string().min(1).describe("Theme name"),
    description: z.string().describe("Theme description"),
    cardColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe("Card background color (hex)"),
    completedColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe("Completed card color (hex)"),
    textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe("Text color (hex)"),
  }),
  resourceName: "todo_settings",
});

const AppPreferences = DeconfigResource.define({
  dataSchema: z.object({
    name: z.string().min(1).describe("Preference key name"),
    description: z.string().describe("Preference description"),
    selectedThemeUri: z.string().optional().describe("URI of the currently selected theme"),
  }),
  resourceName: "app_preferences",
});

// Export all tools from all domains
export const tools = [
  ...todoTools,
  ...userTools,
  (env: Env) => {
    return TodoSettings.create(env);
  },
  (env: Env) => {
    return AppPreferences.create(env);
  }
];

// Export resources for use in main.ts (watch API)
export { TodoSettings, AppPreferences };

// Re-export domain-specific tools for direct access if needed
export { todoTools } from "./todos.ts";
export { userTools } from "./user.ts";

