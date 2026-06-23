// Apify SDK - toolkit for building Apify Actors (https://docs.apify.com/sdk/js/).
import { Actor, log } from 'apify';
// Axios - Promise based HTTP client for node.js (https://axios-http.com/docs/intro).
import axios from 'axios';
// Agent for routing axios requests through an HTTP(S) proxy.
import { HttpsProxyAgent } from 'https-proxy-agent';

await Actor.init();

/** Shape of the Actor input, defined in .actor/input_schema.json */
interface Input {
    profileUrl: string;
    linkFilter?: string;
    expandShortLinks?: boolean;
    proxyConfiguration?: {
        useApifyProxy?: boolean;
        apifyProxyGroups?: string[];
        proxyUrls?: string[];
    };
}

/** One raw link as it appears inside Linktree's embedded __NEXT_DATA__ JSON. */
interface LinktreeLink {
    id: number;
    type: string;
    title: string;
    url: string;
    position: number;
    parent?: { id: number } | null;
}

/** One row we push to the dataset. */
interface OutputLink {
    profileUsername: string;
    title: string;
    url: string;
    expandedUrl: string | null;
    domain: string;
    type: string;
    group: string;
    position: number;
    scrapedAt: string;
}

const input = await Actor.getInput<Input>();
if (!input) throw new Error('Input is missing!');

const {
    profileUrl,
    linkFilter = 'daraz',
    expandShortLinks = false,
    proxyConfiguration: proxyInput,
} = input;

if (!profileUrl || !/^https?:\/\/(www\.)?linktr\.ee\/.+/i.test(profileUrl.trim())) {
    throw new Error(
        `"profileUrl" must be a valid Linktree URL like https://linktr.ee/username. Received: ${profileUrl}`,
    );
}

const cleanUrl = profileUrl.trim().split('?')[0].replace(/\/+$/, '');
const filterTerm = linkFilter.trim().toLowerCase();

// Configure proxy (recommended on the Apify platform to avoid IP rate limits).
const proxyConfiguration = await Actor.createProxyConfiguration(proxyInput);

/** Pick a hostname out of a URL, lower-cased; returns '' if not parseable. */
function hostnameOf(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

/** Fetch the profile HTML with browser-like headers, retrying with backoff. */
async function fetchHtml(url: string): Promise<string> {
    const headers = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    };

    const maxAttempts = 4;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
            const res = await axios.get<string>(url, {
                headers,
                timeout: 30_000,
                responseType: 'text',
                // Route through Apify proxy when configured.
                ...(proxyUrl ? { proxy: false as const, ...buildProxyAgent(proxyUrl) } : {}),
                // We want to inspect non-2xx ourselves rather than throw.
                validateStatus: () => true,
            });
            if (res.status >= 200 && res.status < 300 && typeof res.data === 'string') {
                return res.data;
            }
            throw new Error(`Unexpected HTTP status ${res.status}`);
        } catch (err) {
            lastError = err;
            log.warning(`Fetch attempt ${attempt}/${maxAttempts} failed: ${(err as Error).message}`);
            if (attempt < maxAttempts) {
                await new Promise((r) => {
                    setTimeout(r, attempt * 2_000);
                });
            }
        }
    }
    throw new Error(`Failed to fetch ${url} after ${maxAttempts} attempts: ${(lastError as Error)?.message}`);
}

/** Build an https-proxy-agent config object for axios from a proxy URL. */
function buildProxyAgent(proxyUrl: string) {
    const agent = new HttpsProxyAgent(proxyUrl);
    return { httpAgent: agent, httpsAgent: agent };
}

/** Extract and parse the __NEXT_DATA__ JSON blob from a Linktree page. */
function parseNextData(html: string): Record<string, unknown> {
    const match = html.match(
        /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!match) throw new Error('Could not find __NEXT_DATA__ on the page. Linktree may have changed its markup.');
    try {
        return JSON.parse(match[1]);
    } catch {
        throw new Error('Found __NEXT_DATA__ but failed to parse it as JSON.');
    }
}

/** Best-effort resolution of a short link to its final destination URL. */
async function resolveFinalUrl(url: string): Promise<string | null> {
    try {
        const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
        const res = await axios.get(url, {
            timeout: 20_000,
            maxRedirects: 10,
            validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinktreeDarazScraper/1.0)' },
            ...(proxyUrl ? { proxy: false, ...buildProxyAgent(proxyUrl) } : {}),
        });
        const finalUrl: string | undefined = res.request?.res?.responseUrl;
        return finalUrl && finalUrl !== url ? finalUrl : null;
    } catch (err) {
        log.debug(`Could not expand ${url}: ${(err as Error).message}`);
        return null;
    }
}

// ---- Main flow ------------------------------------------------------------

log.info(`Fetching Linktree profile: ${cleanUrl}`);
const html = await fetchHtml(cleanUrl);
const nextData = parseNextData(html);

const pageProps = ((nextData.props as Record<string, unknown>)?.pageProps ??
    {}) as Record<string, unknown>;

// Linktree returns statusCode 404 in pageProps for missing/renamed/private profiles.
const statusCode = pageProps.statusCode as number | undefined;
if (statusCode && statusCode !== 200) {
    throw new Error(
        `Linktree returned status ${statusCode} for ${cleanUrl}. ` +
            `The profile may not exist, may be private, or may have been renamed. ` +
            `Double-check the username (including any trailing characters like "_").`,
    );
}

const account = (pageProps.account ?? {}) as Record<string, unknown>;
const username = (pageProps.username as string) || (account.username as string) || '';

// Collect links from the main list plus any pinned links, de-duplicated by id.
const rawLinks: LinktreeLink[] = [
    ...((account.links as LinktreeLink[]) ?? []),
    ...((account.pinnedLinks as LinktreeLink[]) ?? []),
    ...((pageProps.links as LinktreeLink[]) ?? []),
];
const byId = new Map<number, LinktreeLink>();
for (const l of rawLinks) if (l && typeof l.id === 'number') byId.set(l.id, l);
const links = [...byId.values()];

// Map GROUP ids -> group title so we can label which section a link sits under.
const groupTitleById = new Map<number, string>();
for (const l of links) {
    if (l.type === 'GROUP') groupTitleById.set(l.id, l.title || '');
}

const filterMsg = filterTerm
    ? `Filtering by hostname containing "${filterTerm}".`
    : 'Returning ALL links.';
log.info(`Found ${links.length} total links on @${username}. ${filterMsg}`);

// Build output rows: keep only real (non-GROUP) links that have a URL and match the filter.
const scrapedAt = new Date().toISOString();
const output: OutputLink[] = [];

for (const l of links) {
    if (l.type === 'GROUP') continue;
    const url = (l.url || '').trim();
    if (!url) continue;

    const domain = hostnameOf(url);
    // Match against the hostname so e.g. tiktok.com/@daraz_x is NOT a false positive.
    if (filterTerm && !domain.includes(filterTerm)) continue;

    let expandedUrl: string | null = null;
    if (expandShortLinks) {
        expandedUrl = await resolveFinalUrl(url);
    }

    output.push({
        profileUsername: username,
        title: l.title || '',
        url,
        expandedUrl,
        domain,
        type: l.type,
        group: l.parent?.id ? groupTitleById.get(l.parent.id) ?? '' : '',
        position: l.position ?? 0,
        scrapedAt,
    });
}

// Stable order: by position as shown on the page.
output.sort((a, b) => a.position - b.position);

log.info(`Matched ${output.length} link(s). Pushing to dataset.`);
await Actor.pushData(output);

// Save a small run summary to the default key-value store for convenience.
await Actor.setValue('SUMMARY', {
    profileUrl: cleanUrl,
    username,
    totalLinksOnProfile: links.filter((l) => l.type !== 'GROUP' && l.url).length,
    filter: filterTerm || '(none)',
    matchedLinks: output.length,
    scrapedAt,
});

log.info(
    `Done. ${output.length} link(s) saved. Open the dataset and use "Export" to download as JSON, CSV, Excel, etc.`,
);

await Actor.exit();
