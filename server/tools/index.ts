/**
 * Central export point for all tools organized by domain.
 *
 * This file aggregates all tools from different domains into a single
 * export, making it easy to import all tools in main.ts while keeping
 * the domain separation.
 */
import { todoTools } from "./todos.ts";
import { userTools } from "./user.ts";

// Export all tools from all domains
export const tools = [
  ...todoTools,
  ...userTools,
];

// Re-export domain-specific tools for direct access if needed
export { todoTools } from "./todos.ts";
export { userTools } from "./user.ts";
