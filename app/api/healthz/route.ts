import { version } from "@/package.json";

export function GET() {
  return Response.json({ status: "ok", version });
}
