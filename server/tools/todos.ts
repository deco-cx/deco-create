/**
 * Todo-related tools for managing tasks.
 *
 * This file contains all tools related to todo operations including:
 * - Listing todos
 * - Generating todos with AI
 * - Toggling todo completion status
 * - Deleting todos
 */
import { createPrivateTool, createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { todosTable } from "../schema.ts";
import { getDb } from "../db.ts";
import { eq } from "drizzle-orm";

/**
 * This tool is declared as public and can be executed by anyone
 * that has access to your MCP server.
 */
export const createListTodosTool = (env: Env) =>
  createTool({
    id: "LIST_TODOS",
    description: "List all todos",
    inputSchema: z.object({}),
    outputSchema: z.object({
      todos: z.array(
        z.object({
          id: z.number(),
          title: z.string().nullable(),
          completed: z.boolean(),
        }),
      ),
    }),
    execute: async () => {
      const db = await getDb(env);
      const todos = await db.select().from(todosTable);
      return {
        todos: todos.map((todo) => ({
          ...todo,
          completed: todo.completed === 1,
        })),
      };
    },
  });

const TODO_GENERATION_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "The title of the todo",
    },
  },
  required: ["title"],
};

export const createGenerateTodoWithAITool = (env: Env) =>
  createPrivateTool({
    id: "GENERATE_TODO_WITH_AI",
    description: "Generate a todo with AI",
    inputSchema: z.object({}),
    outputSchema: z.object({
      todo: z.object({
        id: z.number(),
        title: z.string().nullable(),
        completed: z.boolean(),
      }),
    }),
    execute: async () => {
      const db = await getDb(env);
      const generatedTodo = await env.DECO_CHAT_WORKSPACE_API
        .AI_GENERATE_OBJECT({
          model: "openai:gpt-4.1-mini",
          messages: [
            {
              role: "user",
              content:
                "Generate a funny TODO title that i can add to my TODO list! Keep it short and sweet, a maximum of 10 words.",
            },
          ],
          temperature: 0.9,
          schema: TODO_GENERATION_SCHEMA,
        });

      const generatedTodoTitle = String(generatedTodo.object?.title);

      if (!generatedTodoTitle) {
        throw new Error("Failed to generate todo");
      }

      const todo = await db.insert(todosTable).values({
        title: generatedTodoTitle,
        completed: 0,
      }).returning({ id: todosTable.id });

      return {
        todo: {
          id: todo[0].id,
          title: generatedTodoTitle,
          completed: false,
        },
      };
    },
  });

export const createToggleTodoTool = (env: Env) =>
  createPrivateTool({
    id: "TOGGLE_TODO",
    description: "Toggle a todo's completion status",
    inputSchema: z.object({
      id: z.number(),
    }),
    outputSchema: z.object({
      todo: z.object({
        id: z.number(),
        title: z.string().nullable(),
        completed: z.boolean(),
      }),
    }),
    execute: async ({ context }) => {
      const db = await getDb(env);

      // First get the current todo
      const currentTodo = await db.select().from(todosTable).where(
        eq(todosTable.id, context.id),
      ).limit(1);

      if (currentTodo.length === 0) {
        throw new Error("Todo not found");
      }

      // Toggle the completed status
      const newCompletedStatus = currentTodo[0].completed === 1 ? 0 : 1;

      const updatedTodo = await db.update(todosTable)
        .set({ completed: newCompletedStatus })
        .where(eq(todosTable.id, context.id))
        .returning();

      return {
        todo: {
          id: updatedTodo[0].id,
          title: updatedTodo[0].title,
          completed: updatedTodo[0].completed === 1,
        },
      };
    },
  });

export const createDeleteTodoTool = (env: Env) =>
  createPrivateTool({
    id: "DELETE_TODO",
    description: "Delete a todo",
    inputSchema: z.object({
      id: z.number(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      deletedId: z.number(),
    }),
    execute: async ({ context }) => {
      const db = await getDb(env);

      // First check if the todo exists
      const existingTodo = await db.select().from(todosTable).where(
        eq(todosTable.id, context.id),
      ).limit(1);

      if (existingTodo.length === 0) {
        throw new Error("Todo not found");
      }

      // Delete the todo
      await db.delete(todosTable).where(eq(todosTable.id, context.id));

      return {
        success: true,
        deletedId: context.id,
      };
    },
  });

// Export all todo-related tools
export const todoTools = [
  createListTodosTool,
  createGenerateTodoWithAITool,
  createToggleTodoTool,
  createDeleteTodoTool,
];
