export interface Repository {
    id: string;
    github_repo_id: string;
    owner_username: string;
    name: string;
    full_name: string;
    is_private: boolean;
    language: string;
    stars: number;
    forks: number;
    last_pushed_at: string;
    scanned: boolean;
    lastScanDate: string | null;
    scanStatus?: string;
    stats?: {
        code_smells: number;
        bugs: number;
        security_issues: number;
        has_readme: boolean;
    };
    description?: string;
    owner_user_id: string;
    created_at: string;
}

export interface ScanResult {
    id: string;
    repo_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    started_at: string | null;
    completed_at: string | null;
    error_message: string | null;
}
