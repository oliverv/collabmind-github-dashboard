/* CollabMind Repository Fabric - Main Application */

const USERNAME = "oliverv";
const DATA_PATH = "data/repos.json";

let allRepos = [];
let filteredRepos = [];
let currentFilter = 'all';
let currentSort = 'updated';
let currentView = 'grid';
let charts = {};

// Category detection based on repository naming patterns
function getRepoCategory(repo) {
  const name = repo.name.toLowerCase();
  const fullName = repo.full_name ? repo.full_name.toLowerCase() : name;
  const patterns = {
    'app': ['collabmind-apps-', 'oliverv/collabmind-apps-', 'collabmind-1panel', '1panel', 'auto-space', 'copilot'],
    'ai': ['collabmind-ai-', 'oliverv/collabmind-ai-', 'open-webui', 'ollama', 'lm-studio', 'text-generation-webui', 'oobabooga', 'anybolt', 'openwebui'],
    'mcp': ['collabmind-mcp-', 'oliverv/collabmind-mcp-', 'mcp-server', 'model-context-protocol'],
    'worker': ['collabmind-workers-', 'oliverv/collabmind-workers-', 'worker-', 'agent-'],
    'control': ['collabmind-control-', 'oliverv/collabmind-control-', 'control-plane', 'orchestrator'],
    'infra': ['collabmind-infra-', 'oliverv/collabmind-infra-', 'kubernetes', 'docker-', 'terraform', 'ansible', 'k3s', 'collabmind-kubernetes']
  };

  for (const [category, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => name.includes(kw) || fullName.includes(kw))) {
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
  
  if (!Array.isArray(repos) || !repos.length) {
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
  
  let upstreamInfo = '';
  let upstreamLink = '';
  if (isFork && repo.parent) {
    upstreamInfo = repo.parent.owner.login + '/' + repo.parent.name;
    upstreamLink = repo.parent.html_url;
  }

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
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
      }, 2000);
    }
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
  
  const counts = {};
  categories.forEach(cat => { counts[cat] = 0; });
  
  repos.forEach(repo => {
    const cat = getRepoCategory(repo);
    counts[cat] = (counts[cat] || 0) + 1;
  });

  let html = '';
  categories.forEach(cat => {
    const count = counts[cat];
    if (count > 0 || cat === 'all') {
      html += `<button class="filter-btn ${currentFilter === cat ? 'active' : ''}" data-filter="${cat}">${cat.toUpperCase()}${count > 0 ? ' ' + count : ''}</button>`;
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

// Get category distribution
function getCategoryDistribution(repos) {
  const counts = {};
  repos.forEach(repo => {
    const cat = getRepoCategory(repo);
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
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

// Render charts
function renderCharts(repos) {
  try {
    // Language Distribution (Doughnut)
    const langData = getLanguageDistribution(repos);
    const langCtx = document.getElementById('language-chart');
    if (langCtx) {
      if (charts.language) charts.language.destroy();
      charts.language = new Chart(langCtx.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(langData),
          datasets: [{
            data: Object.values(langData),
            backgroundColor: Object.keys(langData).map(() => '#00D4FF'),
            borderColor: '#151A2A',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    // Category Distribution (Bar)
    const catData = getCategoryDistribution(repos);
    const catCtx = document.getElementById('category-chart');
    if (catCtx) {
      if (charts.category) charts.category.destroy();
      charts.category = new Chart(catCtx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: Object.keys(catData),
          datasets: [{
            label: 'Count',
            data: Object.values(catData),
            backgroundColor: Object.keys(catData).map(l => {
              const cat = l.toLowerCase();
              return {
                'app': '#00D4FF', 'ai': '#8A2BE2', 'mcp': '#3CB371',
                'worker': '#FF8C00', 'control': '#8A2BE2', 'infra': '#00BF7F',
                'fork': '#FFD700', 'other': '#A6A6A6'
              }[cat] || '#A6A6A6';
            }),
            borderColor: '#151A2A',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { color: '#7A829E' }, grid: { color: '#1E2640' } },
            x: { ticks: { color: '#7A829E' }, grid: { display: false } }
          }
        }
      });
    }

    // Star Distribution (Bar)
    const starData = getStarDistribution(repos);
    const starCtx = document.getElementById('star-chart');
    if (starCtx) {
      if (charts.stars) charts.stars.destroy();
      charts.stars = new Chart(starCtx.getContext('2d'), {
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
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  } catch (error) {
    console.error('Chart error:', error);
  }
}

// Render graph view - simplified network visualization
function renderGraph(repos) {
  const container = document.getElementById('repos');
  
  const forks = repos.filter(r => r.fork && r.parent);
  
  if (!forks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Fork Relationships</h3>
        <p>No forked repositories with upstream parents found in this collection.</p>
      </div>
    `;
    return;
  }
  
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
            <a href="${f.parent.html_url}" target="_blank" rel="noopener">${f.parent.name}</a>
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

// Apply filters and sorting
function applyFiltersAndSort() {
  let result = Array.isArray(allRepos) ? [...allRepos] : [];
  
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
  const repos = await loadRepos();
  allRepos = repos || [];
  filteredRepos = allRepos;
  
  // Update stats and categories
  updateStats(allRepos);
  updateFilterButtons(allRepos);
  
  // Render charts first
  renderCharts(allRepos);
  
  // Show visualizations section
  document.querySelector('.visualizations-section').style.display = 'block';
  
  // Render initially
  applyFiltersAndSort();
  
  // Setup event listeners
  setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', () => {
    renderCharts(filteredRepos);
    applyFiltersAndSort();
  });
  
  document.getElementById('category-filters').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      searchInput.value = '';
      renderCharts(allRepos);
      applyFiltersAndSort();
    }
  });
  
  document.getElementById('sort-controls').addEventListener('click', (e) => {
    if (e.target.classList.contains('sort-btn')) {
      document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentSort = e.target.dataset.sort;
      renderCharts(filteredRepos);
      applyFiltersAndSort();
    }
  });
  
  document.getElementById('view-controls').addEventListener('click', (e) => {
    if (e.target.classList.contains('view-btn')) {
      document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentView = e.target.dataset.view;
      
      document.querySelectorAll('.viz-container, .repos-graph').forEach(el => el.classList.add('hidden'));
      
      if (currentView === 'graph') {
        renderGraph(allRepos);
        document.querySelector('.repos-graph').classList.remove('hidden');
      } else {
        applyFiltersAndSort();
        document.getElementById('repos').className = `repos-${currentView}`;
        document.querySelector('.viz-container').classList.remove('hidden');
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