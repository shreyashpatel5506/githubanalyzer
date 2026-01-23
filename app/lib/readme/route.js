import { NextResponse } from "next/server";
import { scanRepository } from "@/app/lib/scanner/codeScanner.js";

/**
 * POST /api/smells/detect
 * Scan repository for code smells
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { owner, repo, branch, token, planTier = "free" } = body;

    // Validate required fields
    if (!owner) {
      console.log("owner not");
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: owner, repo",
        },
        { status: 400 },
      );
    }
    if (!repo) {
      console.log("repo not");
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: owner, repo",
        },
        { status: 400 },
      );
    }
    // Validate plan tier
    if (!["free", "pro", "pro_plus"].includes(planTier)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid planTier. Must be: free, pro, or enterprise",
        },
        { status: 400 },
      );
    }

    // Run scan
    const scanResults = await scanRepository(owner, repo, {
      branch: branch || null,
      token: token || null,
      planTier,
    });

    // Check for errors
    if (scanResults.errors && scanResults.errors.length > 0) {
      console.log(scanResults.errors);

      // Determine appropriate HTTP status code
      let statusCode = 400;
      if (scanResults.errors[0]?.includes("rate limit")) {
        statusCode = 429;
      } else if (scanResults.errors[0]?.includes("not found")) {
        statusCode = 404;
      }

      return NextResponse.json(
        {
          success: false,
          error: scanResults.errors[0],
          fullErrors: scanResults.errors,
        },
        { status: statusCode },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: scanResults,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Code smell detection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${error.message}`,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/smells/detect?owner=...&repo=...&branch=...
 * Scan repository (GET variant)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const branch = searchParams.get("branch");
    const token = searchParams.get("token");
    const planTier = searchParams.get("planTier") || "free";

    // Validate required fields
    if (!owner || !repo) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required params: owner, repo",
        },
        { status: 400 },
      );
    }

    // Run scan
    const scanResults = await scanRepository(owner, repo, {
      branch: branch || null,
      token: token || null,
      planTier,
    });

    // Check for errors
    if (scanResults.errors && scanResults.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: scanResults.errors[0],
          fullErrors: scanResults.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: scanResults,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Code smell detection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${error.message}`,
      },
      { status: 500 },
    );
  }
}
