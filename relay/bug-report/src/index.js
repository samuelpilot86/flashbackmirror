/**
 * Relais Flashback Mirror : reçoit un signalement depuis l'app statique
 * et crée une issue GitHub (logs + capture sur la branche `reports`).
 *
 * Secrets Wrangler : GITHUB_TOKEN (issues:write + contents:write sur le dépôt)
 */

const REPORTS_BRANCH = 'reports';
const MAX_MESSAGE_CHARS = 4000;
const MAX_CONTACT_CHARS = 200;
const MAX_LOGS_CHARS = 450000;
const MAX_SCREENSHOT_CHARS = 900000;
const RATE_LIMIT_PER_HOUR = 8;

const rateBuckets = new Map();

function json(data, status, origin) {
    return new Response(JSON.stringify(data), {
        status,
        headers: corsHeaders(origin, { 'Content-Type': 'application/json' })
    });
}

function corsHeaders(origin, extra = {}) {
    const allow = originAllowed(origin) ? origin : 'https://samuelpilot86.github.io';
    return {
        'Access-Control-Allow-Origin': allow,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        ...extra
    };
}

function originAllowed(origin) {
    if (!origin) {
        return false;
    }
    // file:// sends Origin: null. Firefox testers often open docs/index.html directly.
    if (origin === 'https://samuelpilot86.github.io' || origin === 'null') {
        return true;
    }
    try {
        const url = new URL(origin);
        return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    } catch (e) {
        return false;
    }
}

function clientIp(request) {
    return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

function rateLimit(ip) {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const bucket = rateBuckets.get(ip) || [];
    const recent = bucket.filter(ts => now - ts < hour);
    if (recent.length >= RATE_LIMIT_PER_HOUR) {
        rateBuckets.set(ip, recent);
        return false;
    }
    recent.push(now);
    rateBuckets.set(ip, recent);
    return true;
}

function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
}

function parseScreenshot(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') {
        return null;
    }
    const match = dataUrl.match(/^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!match) {
        return null;
    }
    const b64 = match[2].replace(/\s/g, '');
    if (b64.length > MAX_SCREENSHOT_CHARS) {
        return null;
    }
    const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
    return { ext, b64 };
}

function cursorPrompt(repo, number) {
    return [
        `You are in the Flashback Mirror repository (${repo}).`,
        `Read GitHub issue ${repo}#${number} (user message, optional contact, current configuration, debugging logs, screenshot with the camera heavily blurred). Follow CLAUDE.md.`,
        '',
        '1) Say whether this is a real, relevant bug to fix in this repo (vs a setup, permission, or environment issue).',
        '2) If yes, propose a concrete fix plan (files and approach).',
        '3) Do not write or change any code until I explicitly confirm.'
    ].join('\n');
}

function cursorExamineUrl(repo, number) {
    const text = cursorPrompt(repo, number);
    return 'https://cursor.com/link/prompt?text=' + encodeURIComponent(text);
}

function sanitizeContact(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CONTACT_CHARS);
}

function sanitizeConfig(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }
    const keys = [
        'autoStartRecording', 'mirrorWhileRecording', 'showWaveform',
        'showPhotoTimeline', 'maxDurationSeconds', 'segmentDurationSeconds',
        'microphone', 'camera', 'audioOutput', 'mimeType'
    ];
    const out = {};
    for (const key of keys) {
        if (!(key in raw)) continue;
        const value = raw[key];
        if (typeof value === 'boolean' || typeof value === 'number') {
            out[key] = value;
        } else if (typeof value === 'string') {
            out[key] = value.slice(0, 200);
        }
    }
    return Object.keys(out).length ? out : null;
}

function issueMarkdown({ repo, id, message, contact, config, pageUrl, userAgent, state, logsPath, screenshotPath, issueNumber }) {
    const examine = issueNumber ? cursorExamineUrl(repo, issueNumber) : null;
    const rawBase = `https://raw.githubusercontent.com/${repo}/${REPORTS_BRANCH}/${id}`;
    const lines = [
        '## User report',
        '',
        message ? message : '_(no message)_',
        '',
        '## Contact (optional)',
        '',
        contact ? contact : '_(not provided)_',
        '',
        '## Examine in Cursor',
        '',
        examine
            ? `[Open Cursor with an analysis prompt](${examine}) — review the pre-filled prompt, send it, then wait for my confirmation before any code change.`
            : '_Link is added on the issue after creation._',
        '',
        '## Context',
        '',
        `- Page: ${pageUrl || '(unknown)'}`,
        `- App state: \`${state || '(unknown)'}\``,
        `- User-Agent: \`${(userAgent || '').replace(/`/g, "'")}\``,
        `- Files: [\`${id}/\`](https://github.com/${repo}/tree/${REPORTS_BRANCH}/${id})`,
        ''
    ];
    if (config) {
        lines.push('## Configuration', '');
        for (const [key, value] of Object.entries(config)) {
            lines.push(`- ${key}: \`${String(value).replace(/`/g, "'")}\``);
        }
        lines.push('');
    }
    if (screenshotPath) {
        lines.push('## Screenshot (camera blurred)', '', `![UI screenshot](${rawBase}/${screenshotPath})`, '');
    }
    if (logsPath) {
        lines.push('## Debugging logs', '', `[\`${logsPath}\`](${rawBase}/${logsPath})`, '');
    }
    return lines.join('\n');
}

async function github(env, path, options = {}) {
    const res = await fetch('https://api.github.com' + path, {
        ...options,
        headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + env.GITHUB_TOKEN,
            'User-Agent': 'flashback-bug-report',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(options.headers || {})
        }
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
    if (!res.ok) {
        const err = new Error('GitHub ' + res.status);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

async function ensureReportsBranch(env, repo) {
    try {
        await github(env, `/repos/${repo}/git/ref/heads/${REPORTS_BRANCH}`);
        return;
    } catch (e) {
        if (e.status !== 404) {
            throw e;
        }
    }
    const repoInfo = await github(env, `/repos/${repo}`);
    const defaultBranch = repoInfo.default_branch || 'main';
    const ref = await github(env, `/repos/${repo}/git/ref/heads/${defaultBranch}`);
    const sha = ref && ref.object && ref.object.sha;
    if (!sha) {
        throw new Error('Could not read default branch SHA');
    }
    await github(env, `/repos/${repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${REPORTS_BRANCH}`, sha })
    });
}

async function putFile(env, repo, path, contentBase64, message) {
    return github(env, `/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
            message,
            content: contentBase64,
            branch: REPORTS_BRANCH
        })
    });
}

async function ensureLabel(env, repo) {
    try {
        await github(env, `/repos/${repo}/labels`, {
            method: 'POST',
            body: JSON.stringify({
                name: 'user-report',
                color: '7C3AED',
                description: 'In-app bug report from Flashback Mirror'
            })
        });
    } catch (e) {
        if (e.status !== 422) {
            throw e;
        }
    }
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }
        if (request.method === 'GET') {
            return json({ service: 'flashback-bug-report' }, 200, origin);
        }
        if (request.method !== 'POST') {
            return json({ error: 'Method not allowed' }, 405, origin);
        }
        if (!originAllowed(origin)) {
            return json({ error: 'Origin not allowed' }, 403, origin);
        }
        if (!env.GITHUB_TOKEN) {
            return json({ error: 'Relay is not configured' }, 503, origin);
        }
        const ip = clientIp(request);
        if (!rateLimit(ip)) {
            return json({ error: 'Too many reports, try later' }, 429, origin);
        }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return json({ error: 'Invalid JSON' }, 400, origin);
        }

        const message = String(body.message || '').trim().slice(0, MAX_MESSAGE_CHARS);
        const contact = sanitizeContact(body.contact);
        const config = sanitizeConfig(body.config);
        const logs = String(body.logs || '').slice(0, MAX_LOGS_CHARS);
        const pageUrl = String(body.pageUrl || '').slice(0, 500);
        const userAgent = String(body.userAgent || '').slice(0, 400);
        const state = String(body.state || '').slice(0, 40);
        const screenshot = parseScreenshot(body.screenshot);
        if (!logs) {
            return json({ error: 'Missing logs' }, 400, origin);
        }

        const repo = env.GITHUB_REPO || 'samuelpilot86/flashbackmirror';
        const id = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '-' + Math.random().toString(36).slice(2, 6);
        const logsPath = 'logs.txt';
        const screenshotPath = screenshot ? `screenshot.${screenshot.ext}` : null;

        try {
            await ensureReportsBranch(env, repo);
            await putFile(env, repo, `${id}/${logsPath}`, utf8ToBase64(logs), `bug report ${id}: logs`);
            if (screenshot) {
                await putFile(env, repo, `${id}/${screenshotPath}`, screenshot.b64, `bug report ${id}: screenshot`);
            }
            await ensureLabel(env, repo);

            const title = message
                ? ('[user-report] ' + message.replace(/\s+/g, ' ').slice(0, 70))
                : '[user-report] Bug report';

            const created = await github(env, `/repos/${repo}/issues`, {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    labels: ['user-report'],
                    body: issueMarkdown({
                        repo, id, message, contact, config, pageUrl, userAgent, state,
                        logsPath, screenshotPath, issueNumber: 0
                    })
                })
            });

            const number = created.number;
            const patchedBody = issueMarkdown({
                repo, id, message, contact, config, pageUrl, userAgent, state,
                logsPath, screenshotPath, issueNumber: number
            });
            await github(env, `/repos/${repo}/issues/${number}`, {
                method: 'PATCH',
                body: JSON.stringify({ body: patchedBody })
            });

            return json({ ok: true, number, url: created.html_url }, 201, origin);
        } catch (e) {
            return json({
                error: 'Could not create GitHub issue',
                detail: (e.data && (e.data.message || e.data.raw)) || e.message
            }, 502, origin);
        }
    }
};
