# Media Catalog Provider API

Public read-only provider for normalized catalog data.

## Base URL

After Vercel deployment:

`https://<your-project>.vercel.app/api`

## Endpoints

### Provider info
`GET /api`

### Health
`GET /api/health`

### Stats
`GET /api/stats`

### Movies
`GET /api/movies?page=1&limit=24`
`GET /api/movies?q=resident&genre=اكشن`
`GET /api/movies?id=movie_xxx`

### Series
`GET /api/series?page=1&limit=24`
`GET /api/series?id=series_xxx`

Series detail includes the full normalized episode list.

### Anime episodes
`GET /api/anime?page=1&limit=24`
`GET /api/anime?id=episode_xxx`

### Search
`GET /api/search?q=resident&type=all&page=1&limit=24`

Supported type values: `all`, `movie`, `series`, `anime`.

### Categories
`GET /api/categories?type=movie`

### Latest / source order
`GET /api/latest?type=movie&limit=20`

The upstream source does not provide reliable publication timestamps, so this endpoint returns the first items in current source order rather than claiming a real release date.

## Response shape

```json
{
  "ok": true,
  "type": "movie",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 1545,
    "pages": 65,
    "has_more": true
  }
}
```

## Notes

- Maximum page size: 100.
- CORS is enabled for public read-only access.
- Upstream JSON is cached in function memory for five minutes.
- CDN responses use cache headers with stale-while-revalidate.
- Video files are not proxied or re-hosted; the API returns the original source URL.
- Ensure you have the rights to use and distribute any content exposed through your applications.
