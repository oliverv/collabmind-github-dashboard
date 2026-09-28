const USERNAME = "oliverv";
const REPO_NAME = "collabmind-github-dashboard";

async function loadRepos() {
  try {
    const response = await fetch('repos.json');
    if (!response.ok) {
      throw new Error('Failed to load repos.json - it may not exist yet');
    }
    return await response.json();
  } catch (error) {
    // Fallback to direct GitHub API if repos.json doesn't exist
    console.log('repos.json not found, fetching from GitHub API...');
    return await fetchReposFromAPI();
  }
}

async function fetchReposFromAPI() {
  let repos = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&sort=updated`
    );
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}`);
    }
    const batch = await res.json();
    if (!batch.length) break;
    repos.push(...batch);
    page++;
  }
  return repos;
}

function getRepoCategory(repo) {
  const name = repo.name.toLowerCase();
  if (name.includes('1panel')) return 'app';
  if (name.includes('open-webui') || name.includes('openwebui') || name.includes('llm')) return 'ai';
  if (name.includes('mcp')) return 'mcp';
  if (name.includes('tool')) return 'tools';
  return 'app';
}

function formatRepoItem(repo) {
  const isFork = repo.fork;
  const category = getRepoCategory(repo);
  const primaryLang = repo.language || '—';

  // Find the parent repo name for forks
  let upstreamInfo = '';
  if (isFork && repo.parent) {
    upstreamInfo = ` | ${repo.parent.owner.login}/${repo.parent.name}`;
  }

  // Generate clone command
  const cloneCmd = isFork
    ? `gh repo clone ${repo.owner.login}/${repo.name}`
    : `gh repo clone ${USERNAME}/${repo.name}`;

  return `
    <article class="repo-card" data-category="${category}" data-fork="${isFork}">
      <div class="repo-header">
        <h3 class="repo-name">
          <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
        </h3>
        ${isFork ? '<span class="fork-badge">Fork</span>' : ''}
      </div>
      ${upstreamInfo ? `<div class="upstream-info">${upstreamInfo}</div>` : ''}
      <p class="repo-description">${repo.description || ''}</p>
      <div class="repo-stats">
        <span class="lang">${primaryLang}</span>
        <span class="forks">⭐ ${repo.stargazers_count}</span>
        <span class="updated">Updated ${new Date(repo.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="repo-actions">
        <a href="${repo.html_url}" class="action-link source-link" target="_blank" rel="noopener">SOURCE</a>
        ${isFork
          ? `<a href="https://github.com/oliverv/${repo.name}" class="action-link fork-link" target="_blank" rel="noopener">MY FORK</a>`
          : `<a href="https://github.com/${USERNAME}/${repo.name}/fork" class="action-link fork-link" target="_blank" rel="noopener">FORK</a>`
        }
        <button class="action-link clone-btn" onclick="navigator.clipboard.writeText('${repo.clone_url}')">CLONE COMMAND</button>
      </div>
    </article>
  `;
}

function renderRepos(repos) {
  const container = document.querySelector('#repos');
  const countEl = document.querySelector('#repo-count');
  countEl.textContent = repos.length;

  container.innerHTML = repos.map(formatRepoItem).join('');
}

function setupSearch(repos) {
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', function() {
    const term = this.value.toLowerCase();
    filterAndDisplay(repos, term, 'all');
  });
}

function setupFilters(repos) {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active button
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const filter = this.dataset.filter;
      filterAndDisplay(repos, '', filter);
    });
  });
}

function filterAndDisplay(repos, searchTerm, filter) {
  let filtered = repos;

  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(repo =>
      repo.name.toLowerCase().includes(searchTerm) ||
      (repo.description && repo.description.toLowerCase().includes(searchTerm))
    );
  }

  // Apply category filter
  if (filter !== 'all') {
    if (filter === 'fork') {
      filtered = filtered.filter(repo => repo.fork);
    } else if (filter === 'original') {
      filtered = filtered.filter(repo => !repo.fork);
    } else {
      filtered = filtered.filter(repo => getRepoCategory(repo) === filter);
    }
  }

  document.querySelector('#repos').innerHTML = filtered.map(formatRepoItem).join('');
}

// Initialize
loadRepos()
  .then(repos => {
    renderRepos(repos);
    setupSearch(repos);
    setupFilters(repos);
  })
  .catch(error => {
    document.querySelector('#repos').innerHTML = `
      <p class="error">Error loading repositories: ${error.message}</p>
      <p>Make sure repos.json exists in this repository.</p>
    `;
    console.error(error);
  });