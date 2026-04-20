import { createAdminClient } from './supabase'

const GITHUB_API = "https://api.github.com"

export async function upsertRepository(owner: string, name: string, token?: string) {
    const supabase = createAdminClient()
    const headers: any = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "claritycode-ai"
    }
    if (token) headers["Authorization"] = `Bearer ${token}`

    // 1. Fetch latest details from GitHub
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${name}`, { headers })

    if (!res.ok) {
        throw new Error(`GitHub Repo not found: ${owner}/${name}`)
    }

    const repo = await res.json()

    // 2. Map to Table Schema
    // Table: repositories (id, github_repo_id, owner_username, name, full_name, is_private, ...)
    const payload = {
        github_repo_id: repo.id.toString(),
        owner_username: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
        is_private: repo.private,
        is_fork: repo.fork,
        default_branch: repo.default_branch,
        language: repo.language,
        size_kb: repo.size,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        last_pushed_at: repo.pushed_at,
        archived: repo.archived,
        updated_at: new Date().toISOString() // refresh timestamp
    }

    // 3. Upsert
    // We need to return the ID. 
    // constraint: repositories_github_repo_id_key (unique)
    const { data, error } = await supabase
        .from('repositories')
        .upsert(payload, { onConflict: 'github_repo_id' })
        .select('id')
        .single()

    if (error) {
        console.error("Repo upsert failed:", error)
        throw new Error("Failed to register repository in database")
    }

    return data.id
}
