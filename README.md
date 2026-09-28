# CollabMind Repository Fabric

A static GitHub Pages dashboard displaying all your public GitHub repositories with CollabMind visuals.

![Dashboard](https://github.com/oliverv/collabmind-github-dashboard/raw/main/screenshot.png)

## Features

- **Live repository catalog**: Shows all public repositories from your GitHub account
- **Search & filtering**: Quickly find repos by name or description
- **Category organization**: Auto-categorizes repos into APP, AI, MCP, WORKER, CONTROL, INFRA, FORK, OTHER
- **Fork tracking**: Shows upstream repositories for forks
- **GitHub Actions integration**: Automatically updates the repository list daily
- **CollabMind visual identity**: Uses the distinctive dark theme with cyan accents

## Architecture

```
GitHub ──► GitHub Action ──► data/repos.json ──► GitHub Pages
```

- **GitHub Action** runs daily to fetch your public repositories and generate `data/repos.json`
- **GitHub Pages** serves the static HTML/CSS/JS from the `main` branch
- **No backend required**: Everything is static and hosted for free

## Project Structure

```
collabmind-repository-fabric/
├── index.html           # Main page
├── assets/
│   ├── favicon.svg      # Browser favicon
│   └── collabmind.svg   # Logo
├── css/
│   └── collabmind.css   # Styles
├── js/
│   └── app.js           # Application logic
├── data/
│   └── repos.json       # Generated repository data
├── .github/
│   └── workflows/
│       └── sync-repos.yml  # GitHub Action
└── README.md
```

## Usage

1. Clone this repository
2. Update `USERNAME` in `js/app.js` if needed (default: `oliverv`)
3. Push to GitHub
4. Enable GitHub Pages in repository Settings

### Enabling GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Build and deployment**:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
3. Click **Save**

Your dashboard will be available at:
```
https://oliverv.github.io/collabmind-github-dashboard/
```

## Category Detection

Repositories are automatically categorized by name patterns:

| Pattern | Category |
|---------|----------|
| `collabmind-apps-*` | APP |
| `collabmind-ai-*` | AI |
| `collabmind-mcp-*` | MCP |
| `collabmind-workers-*` | WORKER |
| `collabmind-control-*` | CONTROL |
| `collabmind-infra-*` | INFRA |
| `collabmind-tools-*` | TOOLS |
| `collabminds-*` | TOOLS |
| Forks | FORK |
| Everything else | OTHER |

## Visualizations

The dashboard includes three interactive charts:
- **Language Distribution**: Doughnut chart showing programming languages used
- **Category Breakdown**: Bar chart showing repo counts by category
- **Star Distribution**: Bar chart showing repos by star count ranges

## Development

### Local Development

```bash
# Open index.html in your browser
# No server needed - just double-click the file
```

### Manual Update

To regenerate `repos.json` manually:

```bash
node -e "
const fetch = require('node-fetch');
const fs = require('fs');

async function getRepos() {
  const repos = [];
  let page = 1;
  while (true) {
    const res = await fetch(\`https://api.github.com/users/oliverv/repos?per_page=100&page=\${page}&sort=updated\`);
    const batch = await res.json();
    if (!batch.length) break;
    repos.push(...batch);
    page++;
  }
  const output = {
    generated: new Date().toISOString(),
    count: repos.length,
    username: 'oliverv',
    repos: repos
  };
  fs.writeFileSync('data/repos.json', JSON.stringify(output, null, 2));
}
getRepos();
"
```

## API Rate Limits

- GitHub REST API: 60 requests/hour per IP (anonymous)
- GitHub Action with `GITHUB_TOKEN`: 1,000 requests/hour per repository

Since we fetch repos in pages of 100, even 1000+ repositories fit within a single request.

## Visual Design

Uses CollabMind's signature visual identity:
- Background: Pure black `#000000`
- Card background: Dark slate `#0A1220`
- Text primary: Light gray `#E6EDF3` (high contrast)
- Text secondary: Medium gray `#8B949E`
- Accent cyan: `#00D4FF` for links, buttons, and highlights
- Clean sans-serif (Inter) for all text
- Monospace styling for tech specs (repo names, stats)

## License

MIT