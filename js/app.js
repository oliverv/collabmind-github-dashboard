/* CollabMind Repository Fabric - Main Application */

const USERNAME = "oliverv";
const DATA_PATH = "data/repos.json";

let allRepos = [];
let filteredRepos = [];
let currentFilter = 'all';
let currentSort = 'updated';
let currentView = 'grid';

// Category detection based on repository naming patterns
function getRepoCategory(repo) {
  const name = repo.name.toLowerCase();
  const patterns = {
    'app': ['collabmind-apps-', '1panel', 'auto-space', 'copilot'],
    'ai': ['collabmind-ai-', 'open-webui', 'ollama', 'lm-studio', 'text-generation-webui', 'oobabooga', 'anybolt'],
    'mcp': ['collabmind-mcp-', 'mcp-server', 'model-context-protocol'],
    'worker': ['collabmind-workers-', 'worker-', 'agent-'],
    'control': ['collabmind-control-', 'control-plane', 'orchestrator'],
    'infra': ['collabmind-infra-', 'kubernetes', 'docker-', 'terraform', 'ansible', 'k3s']
  };

  for (const [category, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => name.includes(kw))) {
      return category;
    }
  }

  // Check for forks
  if (repo.fork) return 'fork';

  return 'other';
}

// Load repositories from repos.json
async function loadRepos() {
  try {
    const response = await fetch(DATA_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load ${DATA_PATH}`);
    }
    const data = await response.json();
    return data.repos || [];
  } catch (error) {
    console.error('Error loading repos.json:', error.message);
    // Fallback to direct API
    return await fetchReposFromAPI();
  }
}

// Fallback: fetch directly from GitHub API
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

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return `${days}d ago`;
  }
}

// Render repository cards
function renderRepos(repos) {
  const container = document.getElementById('repos');
  
  if (!repos.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No repositories found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }

  container.innerHTML = repos.map(renderRepoCard).join('');
}

// Render a single repo card
function renderRepoCard(repo) {
  const category = getRepoCategory(repo);
  const isFork = repo.fork;
  const label = repo.language || '—';
  
  // Find upstream for forks
  let upstreamInfo = '';
  let upstreamLink = '';
  if (isFork && repo.parent) {
    upstreamInfo = repo.parent.owner.login + '/' + repo.parent.name;
    upstreamLink = repo.parent.html_url;
  }

  // Get user's fork URL
  const myForkLink = `https://github.com/${USERNAME}/${repo.name}`;
  const sourceLink = repo.html_url;
  const cloneUrl = repo.clone_url;

  return `
    <article class="repo-card" data-category="${category}" data-fork="${isFork}">
      <div class="repo-header">
        <h3 class="repo-name">
          <a href="${sourceLink}" target="_blank" rel="noopener">${repo.name}</a>
        </h3>
        ${isFork ? `<span class="tag fork">FORK</span>` : ''}
      </div>
      ${upstreamInfo ? `<div class="repo-upstream"><span class="upstream-label">↳ </span><a href="${upstreamLink}" target="_blank" rel="noopener">${upstreamInfo}</a></div>` : ''}
      <p class="repo-description">${repo.description || ''}</p>
      <div class="repo-stats">
        <span>${label}</span>
        <span>⭐ ${repo.stargazers_count}</span>
        <span>Updated ${formatDate(repo.updated_at)}</span>
      </div>
      <div class="repo-actions">
        <a href="${sourceLink}" class="action-btn source" target="_blank" rel="noopener">SOURCE</a>
        ${isFork 
          ? `<a href="${myForkLink}" class="action-btn" target="_blank" rel="noopener">MY FORK</a>`
          : `<a href="https://github.com/${USERNAME}/${repo.name}/fork" class="action-btn" target="_blank" rel="noopener">FORK</a>`
        }
        <button class="action-btn clone-btn" onclick="copyCloneUrl('${cloneUrl}', '${repo.name}')">CLONE</button>
      </div>
    </article>
  `;
}

// Copy clone URL to clipboard
function copyCloneUrl(url, name) {
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector(`.clone-btn[onclick*="${name}"]`);
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  });
}

// Update stats display
function updateStats(repos) {
  const countEl = document.getElementById('repo-count');
  countEl.textContent = `${repos.length.toLocaleString()} REPOS`;
}

// Update filter buttons
function updateFilterButtons(repos) {
  const container = document.getElementById('category-filters');
  const categories = ['all', 'app', 'ai', 'mcp', 'worker', 'control', 'infra', 'fork', 'other'];
  
  // Count by category
  const counts = {};
  categories.forEach(cat => {
    counts[cat] = 0;
  });
  
  repos.forEach(repo => {
    const cat = getRepoCategory(repo);
    counts[cat] = (counts[cat] || 0) + 1;
  });

  let html = '';
  categories.forEach(cat => {
    const label = cat.toUpperCase();
    const count = counts[cat];
    const active = cat === currentFilter ? ' active' : '';
    
    // Only show categories with repos
    if (count > 0 || cat === 'all') {
      html += `<button class="filter-btn${active}" data-filter="${cat}">${label} ${count > 0 ? count : ''}</button>`;
    }
  });
  
  container.innerHTML = html;
}

// Apply filters and sorting
function applyFiltersAndSort() {
  let result = [...allRepos];
  
  // Apply category filter
  if (currentFilter !== 'all') {
    if (currentFilter === 'fork') {
      result = result.filter(r => r.fork);
    } else if (currentFilter === 'other') {
      result = result.filter(r => getRepoCategory(r) === 'other');
    } else {
      result = result.filter(r => getRepoCategory(r) === currentFilter);
    }
  }
  
  // Apply search filter
  const searchTerm = document.getElementById('search').value.toLowerCase();
  if (searchTerm) {
    result = result.filter(r => 
      r.name.toLowerCase().includes(searchTerm) || 
      (r.description && r.description.toLowerCase().includes(searchTerm))
    );
  }
  
  // Apply sorting
  result.sort((a, b) => {
    switch (currentSort) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'stargazers':
        return b.stargazers_count - a.stargazers_count;
      case 'updated':
      default:
        return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });
  
  filteredRepos = result;
  updateStats(result);
  renderRepos(result);
}

// Initialize the application
async function init() {
  // Load repos
  const repos = await loadRepos();
  allRepos = repos;
  
  // Update stats and categories
  updateStats(repos);
  updateFilterButtons(repos);
  
  // Render initially
  applyFiltersAndSort();
  
  // Setup event listeners
  setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', () => {
    applyFiltersAndSort();
  });
  
  // Category filters
  document.getElementById('category-filters').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      // Reset search
      searchInput.value = '';
      applyFiltersAndSort();
    }
  });
  
  // Sort buttons
  document.getElementById('sort-controls').addEventListener('click', (e) => {
    if (e.target.classList.contains('sort-btn')) {
      document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentSort = e.target.dataset.sort;
      applyFiltersAndSort();
    }
  });
  
  // View buttons
  document.getElementById('view-controls').addEventListener('click', (e) => {
    if (e.target.classList.contains('view-btn')) {
      document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentView = e.target.dataset.view;
      document.getElementById('repos').className = `repos-${currentView}`;
      applyFiltersAndSort();
    }
  });
}

// Start the app
init().catch(error => {
  console.error('Failed to initialize:', error);
  document.getElementById('repos').innerHTML = `
    <div class="empty-state">
      <h3>Error Loading Repositories</h3>
      <p>Unable to load repository data. Please try again later.</p>
    </div>
  `;
});