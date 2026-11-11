#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NEON_API_BASE = 'https://console.neon.tech/api/v2';
const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_BACKUP_PROJECT_NAME = 'event-system-backup-secondary';
const SECRET_NAME = 'NEON_BACKUP_DATABASE_URL';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Parses CLI flags such as `--dry-run`, `--project-name=...`, or `--repo=...`.
 */
export function parseCliArgs(argv = []) {
  const args = {
    dryRun: false,
    help: false,
    includePrimary: false,
    method: 'auto',
    projectName: undefined,
    regionId: undefined,
    pgVersion: undefined,
    orgId: undefined,
    repo: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      args.dryRun = true;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token === '--include-primary') {
      args.includePrimary = true;
    } else if (token.startsWith('--project-name=')) {
      args.projectName = token.slice('--project-name='.length);
    } else if (token === '--project-name' && argv[i + 1]) {
      args.projectName = argv[++i];
    } else if (token.startsWith('--region=')) {
      args.regionId = token.slice('--region='.length);
    } else if (token === '--region' && argv[i + 1]) {
      args.regionId = argv[++i];
    } else if (token.startsWith('--pg-version=')) {
      args.pgVersion = token.slice('--pg-version='.length);
    } else if (token === '--pg-version' && argv[i + 1]) {
      args.pgVersion = argv[++i];
    } else if (token.startsWith('--org-id=')) {
      args.orgId = token.slice('--org-id='.length);
    } else if (token === '--org-id' && argv[i + 1]) {
      args.orgId = argv[++i];
    } else if (token.startsWith('--repo=')) {
      args.repo = token.slice('--repo='.length);
    } else if (token === '--repo' && argv[i + 1]) {
      args.repo = argv[++i];
    } else if (token.startsWith('--method=')) {
      args.method = token.slice('--method='.length);
    } else if (token === '--method' && argv[i + 1]) {
      args.method = argv[++i];
    }
  }

  return args;
}

/**
 * Extracts `owner/repo` from an HTTPS or SSH GitHub remote URL.
 */
export function parseGitHubRepoFromRemote(remoteUrl) {
  if (!remoteUrl || typeof remoteUrl !== 'string') return null;
  const trimmed = remoteUrl.trim();
  const match = trimmed.match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/i);
  return match ? match[1] : null;
}

/**
 * Resolves target `owner/repo` from explicit option, env vars, or `git remote get-url origin`.
 */
export function detectGitHubRepository(explicitRepo, repoRoot = REPO_ROOT) {
  const candidate = (explicitRepo || process.env.GITHUB_REPOSITORY || '').trim();
  if (candidate) {
    if (!/^[^/\s]+\/[^/\s]+$/.test(candidate)) {
      throw new Error(`Invalid GitHub repository format "${candidate}". Expected "owner/repo".`);
    }
    return candidate;
  }

  try {
    const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const parsed = parseGitHubRepoFromRemote(remoteUrl);
    if (parsed) return parsed;
  } catch {
    // Fall through to descriptive error below
  }

  throw new Error(
    'Unable to determine target GitHub repository. Pass --repo=owner/repo or set GITHUB_REPOSITORY.'
  );
}

/**
 * Masks credentials in a PostgreSQL connection string for safe terminal output.
 */
export function maskConnectionUri(rawUri) {
  try {
    const parsed = new URL(rawUri);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '[invalid-uri]';
  }
}

/**
 * Validates that a Neon URI uses a direct (non-pooled) endpoint and enforces `sslmode=require`.
 */
export function normalizeDirectNeonUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') {
    throw new Error('Neon connection URI is missing.');
  }

  const parsed = new URL(rawUri.trim());
  if (parsed.hostname.includes('-pooler.')) {
    throw new Error(
      `Expected a direct (non-pooled) Neon endpoint, but received pooled host "${parsed.hostname}".`
    );
  }

  if (!parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'require');
  }

  return {
    uri: parsed.toString(),
    masked: maskConnectionUri(parsed.toString()),
    host: parsed.hostname,
  };
}

/**
 * Calls the Neon Management REST API v2 and surfaces structured error messages.
 */
export async function neonRequest(apiKey, apiPath, options = {}, fetcher = fetch) {
  const { method = 'GET', body, allowErrorStatuses = [] } = options;
  const response = await fetcher(`${NEON_API_BASE}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (!response.ok) {
    if (allowErrorStatuses.includes(response.status)) {
      return { ok: false, status: response.status, data: json };
    }
    const detail = json?.message || json?.error || response.statusText;
    throw new Error(`Neon API ${method} ${apiPath} failed (${response.status}): ${detail}`);
  }

  return { ok: true, status: response.status, data: json };
}

/**
 * Resolves the Neon `org_id` needed for Personal API keys while staying compatible with Organization API keys.
 */
export async function resolveNeonOrgId(apiKey, explicitOrgId, fetcher = fetch) {
  if (explicitOrgId && explicitOrgId.trim()) {
    return explicitOrgId.trim();
  }

  const res = await neonRequest(
    apiKey,
    '/users/me/organizations',
    { allowErrorStatuses: [401, 403, 404] },
    fetcher
  );

  // Organization API keys cannot query /users/me/organizations and infer org_id automatically
  if (!res.ok) {
    return undefined;
  }

  const orgs = Array.isArray(res.data?.organizations) ? res.data.organizations : [];
  if (orgs.length === 0) {
    return undefined;
  }
  if (orgs.length === 1) {
    return orgs[0].id;
  }

  const available = orgs.map((org) => `${org.id} (${org.name})`).join(', ');
  throw new Error(
    `Multiple Neon organizations found [${available}]. Set NEON_ORG_ID or pass --org-id=<id>.`
  );
}

/**
 * Queries Neon's direct (`pooled=false`) connection URI endpoint for a given project.
 */
async function fetchDirectConnectionUri(apiKey, projectId, params = {}, fetcher = fetch) {
  const query = new URLSearchParams({ pooled: 'false' });
  if (params.databaseName) query.set('database_name', params.databaseName);
  if (params.roleName) query.set('role_name', params.roleName);
  if (params.branchId) query.set('branch_id', params.branchId);
  if (params.endpointId) query.set('endpoint_id', params.endpointId);

  const res = await neonRequest(
    apiKey,
    `/projects/${encodeURIComponent(projectId)}/connection_uri?${query.toString()}`,
    {},
    fetcher
  );

  return res.data?.uri;
}

/**
 * Ensures the secondary Neon backup project exists and returns its direct connection string.
 */
export async function ensureSecondaryNeonProject(config, fetcher = fetch) {
  const {
    apiKey,
    orgId,
    projectName = DEFAULT_BACKUP_PROJECT_NAME,
    regionId,
    pgVersion,
    dryRun = false,
  } = config;

  const listQuery = new URLSearchParams({
    search: projectName,
    limit: '100',
  });
  if (orgId) listQuery.set('org_id', orgId);

  const listRes = await neonRequest(apiKey, `/projects?${listQuery.toString()}`, {}, fetcher);
  const existingProjects = Array.isArray(listRes.data?.projects) ? listRes.data.projects : [];
  const existing = existingProjects.find((proj) => proj.name === projectName);

  if (existing) {
    const branchesRes = await neonRequest(
      apiKey,
      `/projects/${encodeURIComponent(existing.id)}/branches`,
      {},
      fetcher
    );
    const branches = Array.isArray(branchesRes.data?.branches) ? branchesRes.data.branches : [];
    const primaryBranch = branches.find((b) => b.default || b.primary || b.is_primary) || branches[0];
    const branchId = primaryBranch?.id;

    let databaseName = 'neondb';
    let roleName = 'neondb_owner';

    if (branchId) {
      const [dbRes, roleRes] = await Promise.all([
        neonRequest(
          apiKey,
          `/projects/${encodeURIComponent(existing.id)}/branches/${encodeURIComponent(branchId)}/databases`,
          {},
          fetcher
        ),
        neonRequest(
          apiKey,
          `/projects/${encodeURIComponent(existing.id)}/branches/${encodeURIComponent(branchId)}/roles`,
          {},
          fetcher
        ),
      ]);

      const dbs = Array.isArray(dbRes.data?.databases) ? dbRes.data.databases : [];
      const roles = Array.isArray(roleRes.data?.roles) ? roleRes.data.roles : [];
      if (dbs[0]?.name) databaseName = dbs[0].name;
      const matchedOwner = roles.find((r) => r.name === dbs[0]?.owner) || roles[0];
      if (matchedOwner?.name) roleName = matchedOwner.name;
    }

    const rawUri = await fetchDirectConnectionUri(
      apiKey,
      existing.id,
      { databaseName, roleName, branchId },
      fetcher
    );

    const normalized = normalizeDirectNeonUri(rawUri);
    return {
      created: false,
      projectId: existing.id,
      projectName: existing.name,
      regionId: existing.region_id,
      pgVersion: existing.pg_version,
      ...normalized,
    };
  }

  const createPayload = {
    ...(orgId ? { org_id: orgId } : {}),
    project: {
      name: projectName,
      ...(regionId ? { region_id: regionId } : {}),
      ...(pgVersion ? { pg_version: Number(pgVersion) } : {}),
    },
  };

  if (dryRun) {
    return {
      created: true,
      dryRun: true,
      projectId: 'dry-run-project-id',
      projectName,
      regionId: regionId || 'neon-default',
      pgVersion: pgVersion || 'neon-default',
      uri: `postgresql://neondb_owner:***@ep-dry-run.neon.tech/neondb?sslmode=require`,
      masked: `postgresql://neondb_owner:***@ep-dry-run.neon.tech/neondb?sslmode=require`,
      host: 'ep-dry-run.neon.tech',
      payloadPreview: createPayload,
    };
  }

  const createRes = await neonRequest(
    apiKey,
    '/projects',
    { method: 'POST', body: createPayload },
    fetcher
  );

  const createdData = createRes.data || {};
  const project = createdData.project;
  if (!project?.id) {
    throw new Error('Neon POST /projects response did not contain a created project object.');
  }

  // Prefer direct non-pooled URI directly returned from project creation response
  const uriList = Array.isArray(createdData.connection_uris) ? createdData.connection_uris : [];
  let directUri = uriList.find((entry) => {
    const candidate = entry?.connection_uri;
    if (!candidate) return false;
    try {
      return !new URL(candidate).hostname.includes('-pooler.');
    } catch {
      return false;
    }
  })?.connection_uri;

  if (!directUri) {
    const branchId = createdData.branch?.id;
    const databaseName = createdData.databases?.[0]?.name || 'neondb';
    const roleName =
      createdData.roles?.[0]?.name || createdData.databases?.[0]?.owner || 'neondb_owner';
    directUri = await fetchDirectConnectionUri(
      apiKey,
      project.id,
      { branchId, databaseName, roleName },
      fetcher
    );
  }

  const normalized = normalizeDirectNeonUri(directUri);
  return {
    created: true,
    projectId: project.id,
    projectName: project.name,
    regionId: project.region_id,
    pgVersion: project.pg_version,
    ...normalized,
  };
}

/**
 * Checks whether the GitHub CLI (`gh`) is installed on PATH.
 */
function hasGhCli() {
  const probe = spawnSync('gh', ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
}

/**
 * Sets a GitHub repository Actions secret via `gh secret set` using stdin to avoid CLI argument exposure.
 */
export function pushSecretViaGhCli(repo, secretName, secretValue, githubToken) {
  const env = { ...process.env };
  if (githubToken) {
    env.GH_TOKEN = githubToken;
  }

  const result = spawnSync('gh', ['secret', 'set', secretName, '--repo', repo], {
    input: secretValue,
    encoding: 'utf8',
    env,
  });

  if (result.status !== 0) {
    const errText = (result.stderr || result.stdout || '').trim();
    throw new Error(`gh secret set failed (${result.status}): ${errText}`);
  }
}

/**
 * Encrypts a secret value with the GitHub repository's libsodium public key (`crypto_box_seal`).
 */
export async function encryptSecretWithSodium(publicKeyBase64, secretValue, sodiumOverride) {
  let loaded = sodiumOverride;
  if (!loaded) {
    try {
      loaded = await import('libsodium-wrappers');
    } catch (err) {
      throw new Error(
        `Unable to load "libsodium-wrappers" (${err.message}). Run "npm install" at the repository root or install and authenticate the GitHub CLI ("gh").`
      );
    }
  }
  const sodiumModule = loaded.default?.ready ? loaded.default : loaded;
  await sodiumModule.ready;
  const keyBytes = sodiumModule.from_base64(publicKeyBase64, sodiumModule.base64_variants.ORIGINAL);
  const msgBytes = sodiumModule.from_string(secretValue);
  const encryptedBytes = sodiumModule.crypto_box_seal(msgBytes, keyBytes);
  return sodiumModule.to_base64(encryptedBytes, sodiumModule.base64_variants.ORIGINAL);
}

/**
 * Pushes a GitHub Actions repository secret via GitHub REST API v3 using LibSodium sealed-box encryption.
 */
export async function pushSecretViaGitHubApi(
  repo,
  secretName,
  secretValue,
  githubToken,
  fetcher = fetch,
  sodiumOverride
) {
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN (or GH_TOKEN) is required to configure secrets via GitHub REST API.');
  }

  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'event-management-system-neon-backup-setup',
  };

  const keyRes = await fetcher(`${GITHUB_API_BASE}/repos/${repo}/actions/secrets/public-key`, {
    method: 'GET',
    headers,
  });
  const keyText = await keyRes.text();
  if (!keyRes.ok) {
    throw new Error(
      `GitHub API failed fetching repository public key (${keyRes.status}): ${keyText || keyRes.statusText}`
    );
  }

  const { key_id: keyId, key: publicKey } = JSON.parse(keyText);
  if (!keyId || !publicKey) {
    throw new Error('GitHub public key response is missing key_id or key.');
  }

  const encryptedValue = await encryptSecretWithSodium(publicKey, secretValue, sodiumOverride);

  const putRes = await fetcher(`${GITHUB_API_BASE}/repos/${repo}/actions/secrets/${secretName}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      encrypted_value: encryptedValue,
      key_id: keyId,
    }),
  });

  if (!putRes.ok) {
    const putText = await putRes.text();
    throw new Error(
      `GitHub API failed updating secret ${secretName} (${putRes.status}): ${putText || putRes.statusText}`
    );
  }
}

/**
 * Configures the target GitHub repository secret using `gh` CLI when available or GitHub REST API otherwise.
 */
export async function configureGitHubSecret(options) {
  const {
    repo,
    secretName,
    secretValue,
    githubToken,
    method = 'auto',
    dryRun = false,
    fetcher = fetch,
    ghAvailable = hasGhCli(),
  } = options;

  if (dryRun) {
    return {
      method: method === 'api' || (!ghAvailable && githubToken) ? 'github-api' : 'gh-cli',
      dryRun: true,
    };
  }

  const useCli =
    method === 'gh' || (method === 'auto' && ghAvailable);

  if (useCli) {
    try {
      pushSecretViaGhCli(repo, secretName, secretValue, githubToken);
      return { method: 'gh-cli', dryRun: false };
    } catch (cliErr) {
      if (method === 'gh' || !githubToken) {
        throw cliErr;
      }
      console.warn(`gh CLI attempt failed (${cliErr.message}); falling back to GitHub REST API...`);
    }
  }

  if (!githubToken) {
    throw new Error(
      'Unable to upload GitHub secret: neither an authenticated `gh` CLI nor GITHUB_TOKEN/GH_TOKEN was found.'
    );
  }

  await pushSecretViaGitHubApi(repo, secretName, secretValue, githubToken, fetcher);
  return { method: 'github-api', dryRun: false };
}

/**
 * Verifies that `.github/workflows/neon-db-backup.yml` exists and expects `NEON_BACKUP_DATABASE_URL`.
 */
export function verifyWorkflowIntegration(repoRoot = REPO_ROOT) {
  const workflowPath = path.join(repoRoot, '.github', 'workflows', 'neon-db-backup.yml');
  if (!fs.existsSync(workflowPath)) {
    return {
      present: false,
      path: workflowPath,
      reason: 'Workflow file .github/workflows/neon-db-backup.yml was not found.',
    };
  }

  const content = fs.readFileSync(workflowPath, 'utf8');
  const usesBackupSecret = content.includes(SECRET_NAME);
  const usesPgDump = content.includes('pg_dump');

  return {
    present: true,
    configured: usesBackupSecret && usesPgDump,
    path: workflowPath,
  };
}

function printHelp() {
  console.log(`Usage: node scripts/setup-neon-backup.js [options]

Provision a secondary Neon PostgreSQL backup project ("${DEFAULT_BACKUP_PROJECT_NAME}")
and push its direct (non-pooled) connection URI to GitHub Actions secret ${SECRET_NAME}.

Environment variables:
  NEON_API_KEY         Required. Neon Personal or Organization API key.
  GITHUB_TOKEN         GitHub Personal Access Token with repo/Actions secrets write access
  (or GH_TOKEN)        (optional if \`gh\` CLI is already authenticated locally).
  NEON_ORG_ID          Optional. Required only if NEON_API_KEY belongs to multiple Neon orgs.
  NEON_REGION_ID       Optional. Neon region ID (e.g., aws-us-east-2).
  NEON_PG_VERSION      Optional. PostgreSQL major version (e.g., 16, 17).
  GITHUB_REPOSITORY    Optional. Target "owner/repo" (defaults to git origin remote).
  DATABASE_URL         Optional. Only pushed if --include-primary is passed.

Options:
  --project-name=NAME  Secondary Neon project name (default: ${DEFAULT_BACKUP_PROJECT_NAME})
  --org-id=ID          Explicit Neon organization ID
  --region=REGION_ID   Neon deployment region
  --pg-version=VER     PostgreSQL major version
  --repo=OWNER/REPO    Target GitHub repository
  --method=auto|gh|api Force secret upload method
  --include-primary    Also set DATABASE_URL GitHub secret from local env
  --dry-run            Preview API actions without creating projects or writing secrets
  --help, -h           Show this help text`);
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const neonApiKey = (process.env.NEON_API_KEY || '').trim();
  if (!neonApiKey) {
    throw new Error('Missing NEON_API_KEY environment variable. Generate one in Neon Console -> Account Settings -> API keys.');
  }

  const githubToken = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = detectGitHubRepository(args.repo, REPO_ROOT);
  const projectName =
    args.projectName || process.env.NEON_BACKUP_PROJECT_NAME || DEFAULT_BACKUP_PROJECT_NAME;
  const regionId = args.regionId || process.env.NEON_REGION_ID;
  const pgVersion = args.pgVersion || process.env.NEON_PG_VERSION;
  const explicitOrgId = args.orgId || process.env.NEON_ORG_ID;

  console.log(`[1/4] Checking workflow integration in ${repo}...`);
  const workflowStatus = verifyWorkflowIntegration(REPO_ROOT);
  if (!workflowStatus.present || !workflowStatus.configured) {
    console.warn(`[WARN] ${workflowStatus.reason || 'Backup workflow missing expected secret/pg_dump config.'}`);
  } else {
    console.log(`      Verified workflow: .github/workflows/neon-db-backup.yml`);
  }

  console.log(`[2/4] Resolving Neon organization and provisioning "${projectName}"...`);
  const orgId = args.dryRun && explicitOrgId
    ? explicitOrgId
    : await resolveNeonOrgId(neonApiKey, explicitOrgId);

  const backupProject = await ensureSecondaryNeonProject({
    apiKey: neonApiKey,
    orgId,
    projectName,
    regionId,
    pgVersion,
    dryRun: args.dryRun,
  });

  console.log(
    `      ${backupProject.created ? 'Created' : 'Reused existing'} Neon project "${backupProject.projectName}" (id=${backupProject.projectId}, region=${backupProject.regionId}, pg=${backupProject.pgVersion})`
  );
  console.log(`      Direct URI retrieved: ${backupProject.masked}`);

  console.log(`[3/4] Configuring GitHub Actions secret ${SECRET_NAME} on ${repo}...`);
  const secretResult = await configureGitHubSecret({
    repo,
    secretName: SECRET_NAME,
    secretValue: backupProject.uri,
    githubToken,
    method: args.method,
    dryRun: args.dryRun,
  });
  console.log(
    `      ${args.dryRun ? '[DRY RUN] Would upload' : 'Uploaded'} ${SECRET_NAME} via ${secretResult.method}.`
  );

  if (args.includePrimary) {
    const primaryUrl = (process.env.DATABASE_URL || '').trim();
    if (!primaryUrl) {
      throw new Error('--include-primary was set, but DATABASE_URL is empty in the environment.');
    }
    const primaryResult = await configureGitHubSecret({
      repo,
      secretName: 'DATABASE_URL',
      secretValue: primaryUrl,
      githubToken,
      method: args.method,
      dryRun: args.dryRun,
    });
    console.log(
      `      ${args.dryRun ? '[DRY RUN] Would upload' : 'Uploaded'} DATABASE_URL via ${primaryResult.method}.`
    );
  }

  console.log('[4/4] Setup complete.');
  console.log(
    `      Next: verify DATABASE_URL is also present in ${repo} Actions secrets, then run "Neon Secondary Database Backup" in GitHub Actions.`
  );
}

const isDirectExecution =
  Boolean(process.argv[1]) &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  main().catch((err) => {
    console.error(`\n[ERROR] ${err.message}`);
    process.exitCode = 1;
  });
}
