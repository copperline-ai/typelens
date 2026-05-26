import { Octokit } from "@octokit/rest";

const octokit = new Octokit();

export async function GET() {
  try {
    const { data } = await octokit.repos.listReleases({
      owner: "copperline-ai",
      repo: "typelens",
      per_page: 20,
    });

    const releases = data
      .map((r) => ({
        tag_name: r.tag_name,
        name: r.name,
        body: r.body ?? null,
        published_at: r.published_at ?? null,
        html_url: r.html_url,
        docker_url: `https://github.com/copperline-ai/typelens/pkgs/container/typelens/${r.tag_name.replace(/^typelens-v/, "")}`,
      }))
      .sort((a, b) => {
        if (!a.published_at && !b.published_at) return 0;
        if (!a.published_at) return 1;
        if (!b.published_at) return -1;
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      });

    return Response.json(releases);
  } catch {
    return Response.json({ error: "Failed to fetch releases" }, { status: 500 });
  }
}
