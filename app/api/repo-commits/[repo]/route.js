export async function POST(req, context) {
  try {
    const { username } = await req.json();

    // ✅ THIS IS REQUIRED IN NEXT 16
    const { repo } = await context.params;

    if (!username || !repo) {
      return Response.json(
        { success: false, weeks: [] },
        { status: 400 }
      );
    }

    const headers = {
      Accept: "application/vnd.github+json",
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${username}/${repo}/stats/commit_activity`,
      { headers }
    );

    // GitHub sometimes returns 202 (stats still generating)
    if (res.status === 202) {
      return Response.json({
        success: true,
        weeks: [],
        pending: true,
      });
    }

    if (!res.ok) {
      return Response.json({
        success: false,
        weeks: [],
      });
    }

    const data = await res.json();

    return Response.json({
      success: true,
      weeks: Array.isArray(data) ? data : [],
    });
  } catch (err) {
    console.error("repo-commits error:", err);
    return Response.json({
      success: false,
      weeks: [],
    });
  }
}
