# Linktree Daraz Link Scraper

An [Apify Actor](https://apify.com/actors) that opens a [Linktree](https://linktr.ee) profile and extracts its links. By default it returns only **Daraz** links (`daraz.com.np`, `s.daraz.com.np`, `click.daraz.com.np`), but you can change the filter to any domain — or return every link on the profile.

Results land in a [dataset](https://docs.apify.com/platform/storage/dataset) which you can **export as JSON, CSV, Excel, HTML, or XML** with one click (or via the API).

## Input

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `profileUrl` | string (required) | – | The Linktree URL, e.g. `https://linktr.ee/jasminemaharjan__` |
| `linkFilter` | string | `daraz` | Keep links whose **hostname** contains this text (case-insensitive). Leave **empty** to return every link. |
| `expandShortLinks` | boolean | `false` | Follow redirects on short links (e.g. `s.daraz.com.np`) to also capture the final product URL. Slower; best with proxy on. |
| `proxyConfiguration` | object | Apify Proxy on | Proxy settings. Recommended to avoid IP rate limits. |

Example input:

```json
{
  "profileUrl": "https://linktr.ee/jasminemaharjan__",
  "linkFilter": "daraz",
  "expandShortLinks": false,
  "proxyConfiguration": { "useApifyProxy": true }
}
```

## Output

Each dataset row is one link:

```json
{
  "profileUsername": "jasminemaharjan__",
  "title": "Dove Go Fresh Body Wash 550ml",
  "url": "https://s.daraz.com.np/s.I6Ow",
  "expandedUrl": null,
  "domain": "s.daraz.com.np",
  "type": "CLASSIC",
  "group": "BodyWASH",
  "position": 0,
  "scrapedAt": "2026-06-23T19:05:54.649Z"
}
```

| Field | Description |
|-------|-------------|
| `profileUsername` | The Linktree handle that was scraped |
| `title` | Link title as shown on the profile |
| `url` | The link's destination URL |
| `expandedUrl` | Final URL after following redirects (only when `expandShortLinks` is on; otherwise `null`) |
| `domain` | Hostname of the URL |
| `type` | Linktree link type (`CLASSIC`, `COMMERCE_PRODUCT`, `YOUTUBE_VIDEO`, etc.) |
| `group` | Title of the group/section the link sits under, if any |
| `position` | Order position on the profile |
| `scrapedAt` | ISO timestamp of the run |

### Getting JSON or CSV

On the run's **Storage → Dataset** tab, click **Export** and pick the format, or call:

```
https://api.apify.com/v2/datasets/<DATASET_ID>/items?format=csv
https://api.apify.com/v2/datasets/<DATASET_ID>/items?format=json
```

## How it works

1. `Actor.getInput()` reads the profile URL and options.
2. The profile page is fetched with browser-like headers (optionally via Apify Proxy), with retries.
3. Linktree is a Next.js app, so the link data lives in the page's embedded `__NEXT_DATA__` JSON. The Actor parses that and reads `account.links`.
4. Links are filtered by hostname (so `tiktok.com/@daraz_x` is **not** a false match) and pushed to the dataset.
5. A short `SUMMARY` is written to the key-value store.

## Notes

- If a profile doesn't exist, is private, or was renamed, Linktree returns a 404 and the Actor fails with a clear message. Double-check the exact username, including trailing characters like `_`.
- `expandShortLinks` depends on Daraz's short-link service following server-side redirects. When it can't resolve, `expandedUrl` stays `null` and the original short URL is preserved.
