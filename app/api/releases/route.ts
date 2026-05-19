import { Octokit } from "@octokit/rest";

const octokit = new Octokit();

export async function GET() {
  try {
    const { data } = await octokit.repos.listReleases({
      owner: "copperline-ai",
      repo: "typelens",
      per_page: 20,
    });

    return Response.json(
      data.map((r) => ({
        tag_name: r.tag_name,
        name: r.name,
        body: r.body ?? null,
        published_at: r.published_at ?? null,
        html_url: r.html_url,
      })),
    );
  } catch {
    return Response.json({ error: "Failed to fetch releases" }, { status: 500 });
  }
}
