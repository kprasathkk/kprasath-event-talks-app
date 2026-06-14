// App State
let allNotes = [];
let selectedNote = null;
let activeFilter = 'all';
let searchQuery = '';

// DOM Elements
const notesFeed = document.getElementById('notes-feed');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const refreshText = document.getElementById('refresh-text');
const searchInput = document.getElementById('search-input');
const categoryFilters = document.getElementById('category-filters');
const syncDot = document.getElementById('sync-dot');
const syncStatus = document.getElementById('sync-status');
const syncTime = document.getElementById('sync-time');

// Tweet Drawer Elements
const tweetDrawer = document.getElementById('tweet-drawer');
const tweetDrawerOverlay = document.getElementById('tweet-drawer-overlay');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const previewBadge = document.getElementById('preview-badge');
const previewDate = document.getElementById('preview-date');
const previewHtmlContent = document.getElementById('preview-html-content');
const tweetTextarea = document.getElementById('tweet-textarea');
const tweetTemplate = document.getElementById('tweet-template');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const shareTweetBtn = document.getElementById('share-tweet-btn');
const tweetLinkCard = document.getElementById('tweet-link-card');
const tweetLinkDomain = document.getElementById('tweet-link-domain');

// Circular Progress Elements
const charProgressCircle = document.getElementById('char-progress-circle');
const charCount = document.getElementById('char-count');

// Constants
const TWITTER_CHAR_LIMIT = 280;
const CIRCLE_RADIUS = 10;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~62.83

// Initialize circular progress stroke
if (charProgressCircle) {
    charProgressCircle.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
    charProgressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

// ----------------------------------------------------
// Toast Notification Utility
// ----------------------------------------------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <div class="toast-content">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ----------------------------------------------------
// Data Fetching & Caching
// ----------------------------------------------------
async function fetchReleaseNotes(forceRefresh = false) {
    // Show Loading state
    notesFeed.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    skeletonLoader.classList.remove('hidden');
    
    // Loading button state
    refreshBtn.disabled = true;
    refreshIcon.classList.add('spin');
    refreshText.textContent = forceRefresh ? 'Refreshing...' : 'Loading...';
    
    syncDot.className = 'status-dot orange pulsing';
    syncStatus.textContent = forceRefresh ? 'Fetching live feed...' : 'Loading feed...';

    try {
        const response = await fetch(`/api/release-notes?refresh=${forceRefresh}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            allNotes = result.data;
            
            // Update counts in sidebar
            updateSidebarCounts();
            
            // Update last sync UI
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            syncTime.textContent = `Synced at ${timeStr}`;
            
            if (result.from_cache) {
                syncDot.className = 'status-dot green';
                syncStatus.textContent = 'Synced (Cached)';
                if (forceRefresh) {
                     showToast('Feed refreshed from cache (offline fallback)', 'info');
                }
            } else {
                syncDot.className = 'status-dot green';
                syncStatus.textContent = 'Synced (Live)';
                showToast('Release notes loaded from live feed!', 'success');
            }
            
            // Render
            filterAndRenderNotes();
        } else {
            throw new Error(result.message || 'API returned failure status');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        skeletonLoader.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorMessage.textContent = error.message || 'Unknown network error. Check connection.';
        
        syncDot.className = 'status-dot orange';
        syncStatus.textContent = 'Sync failed';
        showToast('Failed to load release notes.', 'error');
    } finally {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spin');
        refreshText.textContent = 'Refresh';
        skeletonLoader.classList.add('hidden');
    }
}

// ----------------------------------------------------
// Formatting & Rendering UI
// ----------------------------------------------------
function updateSidebarCounts() {
    const counts = {
        all: allNotes.length,
        Feature: 0,
        Deprecation: 0,
        Bug: 0,
        Notice: 0,
        General: 0
    };
    
    allNotes.forEach(note => {
        const type = note.type;
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        } else {
            counts.General++;
        }
    });
    
    // Set counts in UI
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.Feature;
    document.getElementById('count-deprecation').textContent = counts.Deprecation;
    document.getElementById('count-bug').textContent = counts.Bug;
    document.getElementById('count-notice').textContent = counts.Notice;
    document.getElementById('count-general').textContent = counts.General;
}

function filterAndRenderNotes() {
    let filtered = allNotes;
    
    // Apply Category Filter
    if (activeFilter !== 'all') {
        filtered = filtered.filter(note => note.type === activeFilter);
    }
    
    // Apply Search Query Filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(note => 
            note.date.toLowerCase().includes(query) ||
            note.type.toLowerCase().includes(query) ||
            note.clean_text.toLowerCase().includes(query)
        );
    }
    
    // Render Cards
    notesFeed.innerHTML = '';
    
    if (filtered.length === 0) {
        notesFeed.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    notesFeed.classList.remove('hidden');
    
    filtered.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        const badgeClass = `badge-${note.type.toLowerCase()}`;
        
        card.innerHTML = `
            <div class="note-header">
                <div class="note-meta">
                    <span class="badge ${badgeClass}">${note.type}</span>
                    <span class="note-date">${note.date}</span>
                </div>
                ${note.link ? `<a href="${note.link}" target="_blank" class="note-card-link" title="Open original release note page"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
            </div>
            <div class="note-body">
                ${note.html_content}
            </div>
            <div class="note-footer">
                <button class="btn-card-copy" data-id="${note.id}">
                    <i class="fa-solid fa-copy"></i> Copy note
                </button>
                <button class="btn-card-tweet" data-id="${note.id}">
                    <i class="fa-brands fa-twitter"></i> Tweet update
                </button>
            </div>
        `;
        
        notesFeed.appendChild(card);
    });
    
    // Add Event Listeners for the Tweet button
    document.querySelectorAll('.btn-card-tweet').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = e.currentTarget.getAttribute('data-id');
            openTweetDrawer(noteId);
        });
    });

    // Add Event Listeners for the Copy note button
    document.querySelectorAll('.btn-card-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = e.currentTarget.getAttribute('data-id');
            const note = allNotes.find(n => n.id === noteId);
            if (note) {
                navigator.clipboard.writeText(note.clean_text)
                    .then(() => showToast('Release note text copied!', 'success'))
                    .catch(() => showToast('Failed to copy text', 'error'));
            }
        });
    });
}

// Helper to extract domain name from URL
function getDomainName(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace('www.', '');
    } catch {
        return 'cloud.google.com';
    }
}

// ----------------------------------------------------
// Tweet Composer & Twitter Integration
// ----------------------------------------------------
function openTweetDrawer(noteId) {
    selectedNote = allNotes.find(note => note.id === noteId);
    if (!selectedNote) return;
    
    // Populate drawer info
    previewBadge.className = `badge badge-${selectedNote.type.toLowerCase()}`;
    previewBadge.textContent = selectedNote.type;
    previewDate.textContent = selectedNote.date;
    previewHtmlContent.innerHTML = selectedNote.html_content;
    
    // Set up Link Preview in mock tweet
    if (selectedNote.link) {
        tweetLinkCard.classList.remove('hidden');
        tweetLinkDomain.textContent = getDomainName(selectedNote.link);
        tweetLinkCard.onclick = () => window.open(selectedNote.link, '_blank');
    } else {
        tweetLinkCard.classList.add('hidden');
    }
    
    // Reset Template Selection to Hype
    tweetTemplate.value = 'hype';
    
    // Populate textarea based on template
    applyTweetTemplate();
    
    // Open drawer
    tweetDrawer.classList.add('active');
    tweetDrawerOverlay.classList.add('active');
    
    // Focus textarea
    setTimeout(() => tweetTextarea.focus(), 150);
}

function closeTweetDrawer() {
    tweetDrawer.classList.remove('active');
    tweetDrawerOverlay.classList.remove('active');
    selectedNote = null;
}

// Generate the Tweet Text based on Selected Template
function applyTweetTemplate() {
    if (!selectedNote) return;
    
    const templateType = tweetTemplate.value;
    const date = selectedNote.date;
    const type = selectedNote.type;
    const desc = selectedNote.clean_text;
    const link = selectedNote.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    
    // Keep description short for tweet template
    // Target length is around 140 chars so the whole tweet easily fits 280
    const maxDescLen = 140;
    const cleanDesc = desc.length > maxDescLen ? desc.substring(0, maxDescLen) + '...' : desc;
    
    let tweetText = '';
    
    if (templateType === 'hype') {
        tweetText = `🚀 New BigQuery Update! [${type}]\n\n${cleanDesc}\n\nRead more here 👇\n${link}\n\n#BigQuery #GCP #DataWarehouse`;
    } else if (templateType === 'formal') {
        tweetText = `Google Cloud Platform Release Notes:\n\nBigQuery Update - ${date}\nType: ${type}\n\n${cleanDesc}\n\nDetails: ${link}`;
    } else if (templateType === 'short') {
        tweetText = `BigQuery [${type}]: ${cleanDesc} ${link} #BigQuery #GCP`;
    } else if (templateType === 'quote') {
        tweetText = `"${cleanDesc}"\n\n- BigQuery Release Note (${date})\nDetails: ${link}`;
    }
    
    tweetTextarea.value = tweetText;
    updateCharCount();
}

// Calculate Twitter Character Length
// (Twitter counts any URL as exactly 23 characters)
function calculateTwitterLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    // Remove urls from text to count base characters
    const textWithoutUrls = text.replace(urlRegex, '');
    
    // Each URL counts as 23 characters
    return textWithoutUrls.length + (urls.length * 23);
}

// Update Character Count Circular progress
function updateCharCount() {
    const text = tweetTextarea.value;
    const count = calculateTwitterLength(text);
    
    const remaining = TWITTER_CHAR_LIMIT - count;
    charCount.textContent = remaining;
    
    // Progress Percentage (capped at 1)
    const percent = Math.min(count / TWITTER_CHAR_LIMIT, 1);
    const offset = CIRCLE_CIRCUMFERENCE * (1 - percent);
    
    if (charProgressCircle) {
        charProgressCircle.style.strokeDashoffset = offset;
    }
    
    // Alert colors for count and stroke
    const circularText = document.querySelector('.circular-progress-svg');
    
    if (remaining < 0) {
        charCount.className = 'char-text-count danger';
        if (charProgressCircle) charProgressCircle.style.stroke = 'var(--accent-bug)';
        shareTweetBtn.disabled = true;
    } else if (remaining <= 20) {
        charCount.className = 'char-text-count warning';
        if (charProgressCircle) charProgressCircle.style.stroke = 'var(--accent-deprecation)';
        shareTweetBtn.disabled = false;
    } else {
        charCount.className = 'char-text-count';
        if (charProgressCircle) charProgressCircle.style.stroke = 'var(--twitter-blue)';
        shareTweetBtn.disabled = false;
    }
}

// ----------------------------------------------------
// Event Listeners & Bootstrapping
// ----------------------------------------------------
function exportFilteredNotesToCSV() {
    let filtered = allNotes;
    
    if (activeFilter !== 'all') {
        filtered = filtered.filter(note => note.type === activeFilter);
    }
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(note => 
            note.date.toLowerCase().includes(query) ||
            note.type.toLowerCase().includes(query) ||
            note.clean_text.toLowerCase().includes(query)
        );
    }
    
    if (filtered.length === 0) {
        showToast('No notes available to export', 'error');
        return;
    }
    
    // Header
    let csvRows = ["Date,Type,Link,Description"];
    
    // Rows
    filtered.forEach(note => {
        const dateVal = `"${note.date.replace(/"/g, '""')}"`;
        const typeVal = `"${note.type.replace(/"/g, '""')}"`;
        const linkVal = `"${(note.link || '').replace(/"/g, '""')}"`;
        const descVal = `"${note.clean_text.replace(/"/g, '""')}"`;
        csvRows.push(`${dateVal},${typeVal},${linkVal},${descVal}`);
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filterName = activeFilter.toLowerCase();
    const filename = `bigquery_release_notes_${filterName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully exported ${filtered.length} notes to CSV!`, 'success');
}

function setupEventListeners() {
    // Refresh button click
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });
    
    // Retry button click
    retryBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });
    
    // Export CSV click
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportFilteredNotesToCSV);
    }
    
    // Search input change
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        filterAndRenderNotes();
    });
    
    // Category filter click
    categoryFilters.addEventListener('click', (e) => {
        const item = e.target.closest('.filter-item');
        if (!item) return;
        
        // Remove active class from all filters
        document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
        
        // Add active class to clicked filter
        item.classList.add('active');
        
        activeFilter = item.getAttribute('data-type');
        filterAndRenderNotes();
    });
    
    // Close Drawer
    closeDrawerBtn.addEventListener('click', closeTweetDrawer);
    tweetDrawerOverlay.addEventListener('click', closeTweetDrawer);
    
    // Textarea input
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Template selection change
    tweetTemplate.addEventListener('change', applyTweetTemplate);
    
    // Copy Tweet action
    copyTweetBtn.addEventListener('click', () => {
        tweetTextarea.select();
        tweetTextarea.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            navigator.clipboard.writeText(tweetTextarea.value);
            showToast('Tweet copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            try {
                document.execCommand('copy');
                showToast('Tweet copied to clipboard!', 'success');
            } catch (fallbackErr) {
                showToast('Failed to copy text. Please select manually.', 'error');
            }
        }
    });
    
    // Share Tweet action (Twitter Web Intent)
    shareTweetBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterIntentUrl, '_blank');
        showToast('Opened Twitter composer in new tab!', 'info');
        closeTweetDrawer();
    });
}

// Initial Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleaseNotes(false); // Fetch on load (uses cache first if available, otherwise live)
});
