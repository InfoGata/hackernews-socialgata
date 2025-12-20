# Hacker News Plugin for SocialGata

A SocialGata plugin that provides access to Hacker News stories, comments, and user profiles.

## Features

- Browse multiple feed types: Top, New, Best, Ask HN, Show HN, Jobs
- View story comments with nested replies
- View user profiles and their activity
- Search stories via Algolia
- No authentication required

## Installation

### From URL (Recommended)

Install the plugin in SocialGata by providing the manifest URL:
```
https://cdn.jsdelivr.net/gh/InfoGata/hackernews-socialgata@latest/manifest.json
```

### Manual Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. In SocialGata, add the plugin from the `dist/` folder

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Output

- `dist/index.js` - Main plugin script

## Plugin API Methods

| Method | Description |
|--------|-------------|
| `onGetFeed` | Get stories from various feed types with pagination |
| `onGetComments` | Get comments for a story with nested replies |
| `onGetUser` | Get a user's posts and comments |
| `onSearch` | Search Hacker News stories |
| `onGetPlatformType` | Returns "forum" |

## Feed Types

| Feed | Description |
|------|-------------|
| Top | Top stories ranked by score |
| New | Newest stories |
| Best | Best stories of all time |
| Ask HN | Ask HN discussion posts |
| Show HN | Show HN project posts |
| Jobs | Job postings |

## License

MIT
