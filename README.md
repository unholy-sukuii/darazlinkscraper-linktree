# Linktree Daraz Link Scraper

<<<<<<< HEAD
An [Apify Actor](https://apify.com/actors) that opens a [Linktree](https://linktr.ee) profile, extracts its links, and — optionally — visits each Daraz product to pull the **price** and **image gallery**.

By default it returns only **Daraz** links (`daraz.com.np`, `s.daraz.com.np`, `click.daraz.com.np`), but the filter can be any domain, or empty to return every link.
=======
An [Apify Actor](https://apify.com/actors) that opens a [Linktree](https://linktr.ee) profile and extracts its links. By default it returns only **Daraz** links (`daraz.com.np`, `s.daraz.com.np`, `click.daraz.com.np`), but you can change the filter to any domain — or return every link on the profile.
>>>>>>> ea8e858809e441f3685f49724a7f4a21452e0175

Results land in a [dataset](https://docs.apify.com/platform/storage/dataset) which you can **export as JSON, CSV, Excel, HTML, or XML** with one click (or via the API).

## Input

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `profileUrl` | string (required) | – | The Linktree URL, e.g. `https://linktr.ee/jasminemaharjan__` |
| `linkFilter` | string | `daraz` | Keep links whose **hostname** contains this text (case-insensitive). Leave **empty** to return every link. |
<<<<<<< HEAD
| `scrapeProductDetails` | boolean | `false` | For each Daraz link, also fetch the product page to extract price, original price and image gallery. |
| `expandShortLinks` | boolean | `false` | Resolve short links to their final product URL only (no price/images). Ignored when `scrapeProductDetails` is on. |
| `maxConcurrency` | integer | `5` | How many links to process in parallel. |
| `proxyConfiguration` | object | Apify Proxy on | Proxy settings. For product scraping, use **RESIDENTIAL** proxies in **Nepal (NP)**. |
=======
| `expandShortLinks` | boolean | `false` | Follow redirects on short links (e.g. `s.daraz.com.np`) to also capture the final product URL. Slower; best with proxy on. |
| `proxyConfiguration` | object | Apify Proxy on | Proxy settings. Recommended to avoid IP rate limits. |
>>>>>>> ea8e858809e441f3685f49724a7f4a21452e0175

Example input:

```json
{
  "profileUrl": "https://linktr.ee/jasminemaharjan__",
  "linkFilter": "daraz",
<<<<<<< HEAD
  "scrapeProductDetails": true,
  "maxConcurrency": 5,
  "proxyConfiguration": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"], "apifyProxyCountry": "NP" }
=======
  "expandShortLinks": false,
  "proxyConfiguration": { "useApifyProxy": true }
>>>>>>> ea8e858809e441f3685f49724a7f4a21452e0175
}
```

## Output

<<<<<<< HEAD
Each dataset row is one link. With `scrapeProductDetails` on, the product fields are populated:
=======
Each dataset row is one link:
>>>>>>> ea8e858809e441f3685f49724a7f4a21452e0175

```json
{
  "profileUsername": "jasminemaharjan__",
<<<<<<< HEAD
  "title": "ULTIMA DARAZ 11:11 DEALS",
  "url": "https://s.daraz.com.np/s.qGoh",
  "expandedUrl": "https://www.daraz.com.np/products/ultima-prime-10-anc-earbuds-...-i...html",
  "productName": "Ultima Prime 1.0 ANC Earbuds with App Support",
  "price": "Rs.3,499",
  "originalPrice": "Rs.4,499",
  "images": [
    "https://img.drz.lazcdn.com/static/np/p/8a072958ea0c4d6d77aa3f38c7de004a.png_720x720q80.png",
    "https://np-live-21.slatic.net/kf/Se8a4a1fcf5e149d18acbd2d202e00180X.png"
  ],
  "domain": "s.daraz.com.np",
  "type": "CLASSIC",
  "group": "ULTIMA DARAZ 11:11 DEALS",
  "position": 0,
  "detailStatus": "ok",
  "scrapedAt": "2026-06-24T10:05:54.649Z"
=======
  "title": "Dove Go Fresh Body Wash 550ml",
  "url": "https://s.daraz.com.np/s.I6Ow",
  "expandedUrl": null,
  "domain": "s.daraz.com.np",
  "type": "CLASSIC",
  "group": "BodyWASH",
  "position": 0,
  "scrapedAt": "2026-06-23T19:05:54.649Z"
>>>>>>> ea8e858809e441f3685f49724a7f4a21452e0175
}
```

| Field | Description |
|-------|-------------|
<<<<<<< HEAD
| `title` | Link title shown on the Linktree profile |
| `productName` | Product name from the Daraz page (when scraping details) |
| `price` | Selling price (the discounted price if there is one) |
| `originalPrice` | Original/list price, when the item is discounted |
| `images` | Array of product image URLs (gallery) |
| `url` | The Linktree link (often a short link) |
| `expandedUrl` | The resolved Daraz product URL |
| `domain` | Hostname of the link |
| `type` | Linktree link type (`CLASSIC`, etc.) |
| `group` | Title of the section the link sits under |
| `detailStatus` | `ok`, `blocked`, `no-data`, `http-404`, etc. |
=======
| `profileUsername` | The Linktree handle that was scraped |
| `title` | Link title as shown on the profile |
| `url` | The link's destination URL |
| `expandedUrl` | Final URL after following redirects (only when `expandShortLinks` is on; otherwise `null`) |
| `domain` | Hostname of the URL |
| `type` | Linktree link type (`CLASSIC`, `COMMERCE_PRODUCT`, `YOUTUBE_VIDEO`, etc.) |
| `group` | Title of the group/section the link sits under, if any |
| `position` | Order position on the profile |
>>>>>>> ea8e858809e441f3685f49724a7f4a21452e0175
| `scrapedAt` | ISO timestamp of the run |

### Getting JSON or CSV

On the run's **Storage → Dataset** tab, click **Export** and pick the format, or call:

```
https://api.apify.com/v2/datasets/<DATASET_ID>/items?format=csv
https://api.apify.com/v2/datasets/<DATASET_ID>/items?format=json
```

## How it works

<<<<<<< HEAD
1. The Linktree profile is fetched and its links read from the embedded `__NEXT_DATA__` JSON, then filtered by hostname.
2. With `scrapeProductDetails` on, each Daraz link is visited as a two-step process:
   - The short link (`s.daraz.com.np/...`) returns a small **preview page** that carries the **price** and **original price** (in its meta description) plus the main image.
   - That preview contains a `c.daraz.com.np` tracking redirect, which is followed to the **real product page** to read the full **image gallery** and the canonical product URL.
3. Everything is pushed to the dataset.

## Important notes on Daraz

- **Bot protection.** Daraz (Lazada/Alibaba infrastructure) actively blocks datacenter IPs. For reliable product scraping, enable **Apify Proxy → RESIDENTIAL → country NP**. Without it, expect a share of rows to come back `blocked`.
- **Price source.** Daraz no longer embeds the price in the product page's initial HTML (it is loaded by JavaScript), so the price is read from the share/preview page instead. If Daraz changes the preview format, the price parser may need a small update; images are read from the product page itself.
- **Non-product links.** Campaign/deal links (`click.daraz.com.np/e/...`) are not single products, so they will usually have no price and few or no images (`detailStatus: no-data`).
- **Profiles that 404.** If the profile doesn't exist, is private, or was renamed, the Actor fails with a clear message. Check the exact username, including trailing characters like `_`.
=======
1. `Actor.getInput()` reads the profile URL and options.
2. The profile page is fetched with browser-like headers (optionally via Apify Proxy), with retries.
3. Linktree is a Next.js app, so the link data lives in the page's embedded `__NEXT_DATA__` JSON. The Actor parses that and reads `account.links`.
4. Links are filtered by hostname (so `tiktok.com/@daraz_x` is **not** a false match) and pushed to the dataset.
5. A short `SUMMARY` is written to the key-value store.

## Notes

- If a profile doesn't exist, is private, or was renamed, Linktree returns a 404 and the Actor fails with a clear message. Double-check the exact username, including trailing characters like `_`.
- `expandShortLinks` depends on Daraz's short-link service following server-side redirects. When it can't resolve, `expandedUrl` stays `null` and the original short URL is preserved.
# darazlinkscraper-linktree
>>>>>>> ea8e858809e441f3685f49724a7f4a21452e0175
