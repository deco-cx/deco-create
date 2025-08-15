/**
 * This is where you define your workflows.
 *
 * Workflows are a way to encode complex flows of steps
 * reusing your tools and with built-in observability
 * on the Deco project dashboard. They can also do much more!
 *
 * When exported, they will be available on the MCP server
 * via built-in tools for starting, resuming and cancelling
 * them.
 *
 * @see https://docs.deco.page/en/guides/building-workflows/
 */
import {
  createStepFromTool,
  createWorkflow,
} from "@deco/workers-runtime/mastra";
import { z } from "zod";
import { Env } from "./main";
// import { createMyTool } from "./tools";

const createMyWorkflow = (env: Env) => {
  // const step = createStepFromTool(createMyTool(env));

  // return createWorkflow({
  //   id: "MY_WORKFLOW",
  //   inputSchema: z.object({ name: z.string() }),
  //   outputSchema: z.object({ message: z.string() }),
  // })
  //   .then(step)
  //   .commit();
};

export const workflows = [];
