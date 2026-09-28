/* CollabMind Repository Fabric - Main Application */

const USERNAME = "oliverv";
const DATA_PATH = "data/repos.json";

let allRepos = [];
let filteredRepos = [];
let currentFilter = 'all';
let currentSort = 'updated';
let currentView = 'grid';
let charts = {};

// Color palette for categories
const categoryColors = {
  'app': '#00D4FF',
  'ai': '#8A2BE2',
  'mcp': '#3CB371',
  'worker': '#FF8C00',
  'control': '#8A2BE2',
  'infra': '#00BF7F',
  'fork': '#FFD700',
  'other': '#A6A6A6'
};

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

// Get language distribution
function getLanguageDistribution(repos) {
  const langs = {};
  repos.forEach(repo => {
    const lang = repo.language || 'Other';
    langs[lang] = (langs[lang] || 0) + 1;
  });
  return langs;
}

// Get star distribution
function getStarDistribution(repos) {
  const distribution = { '<10': 0, '10-100': 0, '100-1000': 0, '1000+': 0 };
  repos.forEach(repo => {
    const stars = repo.stargazers_count;
    if (stars < 10) distribution['<10']++;
    else if (stars < 100) distribution['10-100']++;
    else if (stars < 1000) distribution['100-1000']++;
    else distribution['1000+']++;
  });
  return distribution;
}

// Create visualizations
function createCharts(repos) {
  const vizContainer = document.querySelector('.visualization-toggle');
  if (!vizContainer) return;
  
  // Create visualization toggle
  vizContainer.innerHTML = `
    <button class="viz-btn active" data-viz="charts">CHARTS</button>
    <button class="viz-btn" data-viz="graph">NETWORK</button>
  `;
  
  // Render charts
  renderCharts(repos);
  
  // Setup viz toggle
  document.querySelector('.visualization-toggle').addEventListener('click', (e) => {
    if (e.target.classList.contains('viz-btn')) {
      document.querySelectorAll('.viz-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      const viz = e.target.dataset.viz;
      
      document.querySelectorAll('.viz-container, .repos-graph').forEach(el => el.classList.add('hidden'));
      if (viz === 'charts') {
        document.querySelector('.viz-container').classList.remove('hidden');
      } else {
        document.querySelector('.repos-graph').classList.remove('hidden');
      }
    }
  });
}

// Render chart visualization
function renderCharts(repos) {
  // Language Distribution (Doughnut)
  const langData = getLanguageDistribution(repos);
  const langCtx = document.getElementById('language-chart').getContext('2d');
  
  if (charts.language) charts.language.destroy();
  charts.language = new Chart(langCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(langData),
      datasets: [{
        data: Object.values(langData),
        backgroundColor: Object.keys(langData).map(l => {
          if (['Go', 'TypeScript', 'Shell', 'Python', 'JavaScript', 'Rust', 'JSON', 'YAML', 'Dockerfile'].includes(l)) {
            return categoryColors.app;
          } else if (['Python', 'JavaScript', 'TypeScript'].includes(l)) {
            return categoryColors.ai;
          } else if (l === 'Other' || !l) {
            return categoryColors.other;
          }
          return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        }),
        borderColor: '#151A2A',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: false }
      }
    }
  });
  
  // Category Distribution (Bar)
  const categoryCounts = {};
  ['app', 'ai', 'mcp', 'worker', 'control', 'infra', 'fork', 'other'].forEach(cat => {
    categoryCounts[cat.toUpperCase()] = repos.filter(r => getRepoCategory(r) === cat).length;
  });
  
  const catCtx = document.getElementById('category-chart').getContext('2d');
  
  if (charts.category) charts.category.destroy();
  charts.category = new Chart(catCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [{
        label: 'Count',
        data: Object.values(categoryCounts),
        backgroundColor: Object.keys(categoryCounts).map(cat => categoryColors[cat.toLowerCase()] || categoryColors.other),
        borderColor: '#151A2A',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { color: '#7A829E' },
          grid: { color: '#1E2640' }
        },
        x: { 
          ticks: { color: '#7A829E' },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
  
  // Star Distribution (Bar)
  const starData = getStarDistribution(repos);
  const starCtx = document.getElementById('star-chart').getContext('2d');
  
  if (charts.stars) charts.stars.destroy();
  charts.stars = new Chart(starCtx, {
    type: 'bar',
    data: {
      labels: ['<10', '10-100', '100-1k', '1k+'],
      datasets: [{
        label: 'Repos',
        data: Object.values(starData),
        backgroundColor: '#00D4FF',
        borderColor: '#151A2A',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: { legend: { display: false } }
    }
  });
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

// Render graph view - simplified network visualization
function renderGraph(repos) {
  const container = document.getElementById('repos');
  
  // Find forks with parents
  const forks = repos.filter(r => r.fork && r.parent).map(r => ({
    fork: r,
    parent: r.parent
  }));
  
  if (!forks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Fork Relationships</h3>
        <p>No forked repositories with upstream parents found in this collection.</p>
      </div>
    `;
    return;
  }
  
  // Simple grid layout for fork relationships
  container.innerHTML = `
    <div class="repos-grid">
      ${forks.map(f => `
        <article class="repo-card">
          <div class="repo-header">
            <h3 class="repo-name">
              <a href="${f.fork.html_url}" target="_blank" rel="noopener">${f.fork.name}</a>
            </h3>
            <span class="tag fork">FORK</span>
          </div>
          <div class="repo-upstream">
            <span class="upstream-label">↳ </span>
            <a href="${f.parent.html_url}" target="_blank" rel="noopener">${f.parent.full_name}</a>
          </div>
          <div class="repo-stats">
            <span>⭐ ${f.fork.stargazers_count}</span>
            <span>Updated ${formatDate(f.fork.updated_at)}</span>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

// Initialize the application
async function init() {
  // Load repos
  const repos = await loadRepos();
  allRepos = repos;
  
  // Update stats and categories
  updateStats(repos);
  updateFilterButtons(repos);
  
  // Create charts
  createCharts(repos);
  
  // Render initially (based on default view)
  if (currentView === 'graph') {
    renderGraph(repos);
  } else {
    applyFiltersAndSort();
  }
  
  // Setup event listeners
  setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', () => {
    // When charts are visible, we need to re-render them
    if (document.querySelector('.visualization-toggle .viz-btn.active').dataset.viz) {
      const viz = document.querySelector('.visualization-toggle .viz-btn.active').dataset.viz;
      if (viz === 'charts') {
        renderCharts(filteredRepos.length ? filteredRepos : allRepos);
      }
    }
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
      if (document.querySelector('.visualization-toggle .viz-btn.active').dataset.viz === 'charts') {
        renderCharts(filteredRepos.length ? filteredRepos : allRepos);
      }
      applyFiltersAndSort();
    }
  });
  
  // Sort buttons
  document.getElementById('sort-controls').addEventListener('click', (e) => {
    if (e.target.classList.contains('sort-btn')) {
      document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentSort = e.target.dataset.sort;
      if (document.querySelector('.visualization-toggle .viz-btn.active').dataset.viz === 'charts') {
        renderCharts(filteredRepos.length ? filteredRepos : allRepos);
      }
      applyFiltersAndSort();
    }
  });
  
  // View buttons
  document.getElementById('view-controls').addEventListener('click', (e) => {
    if (e.target.classList.contains('view-btn')) {
      document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentView = e.target.dataset.view;
      
      // Hide charts/graph container
      document.querySelector('.viz-container').classList.add('hidden');
      document.querySelector('.repos-graph').classList.add('hidden');
      
      if (currentView === 'graph') {
        renderGraph(allRepos);
        document.querySelector('.repos-graph').classList.remove('hidden');
      } else {
        applyFiltersAndSort();
        document.getElementById('repos').className = `repos-${currentView}`;
      }
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