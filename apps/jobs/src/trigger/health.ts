import { task } from "@trigger.dev/sdk/v3";

export const healthTask = task({
  id: "health",
  async run() {
    return { status: "ok", timestamp: new Date().toISOString() };
  },
});
