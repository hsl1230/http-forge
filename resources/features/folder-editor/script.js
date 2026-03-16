/**
 * Folder Editor Script
 * 
 * Handles UI interactions for the folder editor webview.
 */

const vscode = acquireVsCodeApi();
let folder = null;
let collectionName = '';
let preRequestEditor = null;
let postResponseEditor = null;
let isDirty = false;
let monacoReady = false;

// Determine VS Code theme
function getMonacoTheme() {
    const body = document.body;
    if (body.getAttribute('data-vscode-theme-kind') === 'vscode-light') {
        return 'vs';
    }
    return 'vs-dark';
}

// Set up tab switching immediately (doesn't depend on Monaco)
function setupTabs() {
    // Main tabs switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tabName).classList.add('active');

            // Trigger layout refresh for editors when Scripts tab becomes visible
            if (tabName === 'scripts') {
                setTimeout(() => {
                    if (preRequestEditor) preRequestEditor.layout();
                    if (postResponseEditor) postResponseEditor.layout();
                }, 50);
            }
        });
    });

    // Script tabs switching
    document.querySelectorAll('.script-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const scriptTab = tab.dataset.scriptTab;
            document.querySelectorAll('.script-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.script-tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            document.getElementById(scriptTab + '-script-panel').classList.add('active');

            // Trigger layout refresh for visible editor
            setTimeout(() => {
                if (scriptTab === 'pre-request' && preRequestEditor) {
                    preRequestEditor.layout();
                } else if (scriptTab === 'post-response' && postResponseEditor) {
                    postResponseEditor.layout();
                }
            }, 50);
        });
    });
}

// Set up other event listeners
function setupEventListeners() {
    document.querySelectorAll('.auth-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const authType = btn.dataset.auth;
            document.querySelectorAll('.auth-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderAuthConfig(authType);
            markDirty();
        });
    });

    // Save
    document.getElementById('btn-save')?.addEventListener('click', () => {
        const data = collectFormData();
        vscode.postMessage({ type: 'save', folder: data });
    });

    // Reset
    document.getElementById('btn-reset')?.addEventListener('click', () => {
        if (isDirty && !confirm('Discard unsaved changes?')) return;
        vscode.postMessage({ type: 'ready' }); // Re-fetch data
    });

    // Name change handler
    document.getElementById('folder-name')?.addEventListener('input', markDirty);
    document.getElementById('folder-description')?.addEventListener('input', markDirty);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupEventListeners();
    
    // Initialize Monaco using shared monaco-viewer.js
    if (typeof MonacoViewer !== 'undefined') {
        MonacoViewer.loadMonaco().then(() => {
            monacoReady = true;
            initEditors();
            // Request initial data from extension
            vscode.postMessage({ type: 'ready' });
        }).catch(err => {
            console.error('Monaco editor failed to load:', err);
            // Still request data even if Monaco fails
            vscode.postMessage({ type: 'ready' });
        });
    } else {
        console.warn('MonacoViewer not available');
        vscode.postMessage({ type: 'ready' });
    }
});

function initEditors() {
    const editorOptions = {
        language: 'javascript',
        theme: getMonacoTheme(),
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        fontSize: 13,
        tabSize: 2,
        wordWrap: 'on'
    };

    const preRequestContainer = document.getElementById('pre-request-editor');
    const postResponseContainer = document.getElementById('post-response-editor');

    // Get initial values from folder if already loaded
    const preScript = folder?.scripts?.preRequest || '// Pre-request script runs before every request in this folder\n';
    const postScript = folder?.scripts?.postResponse || '// Post-response script runs after every request in this folder\n';

    if (preRequestContainer && typeof monaco !== 'undefined') {
        preRequestEditor = monaco.editor.create(preRequestContainer, {
            ...editorOptions,
            value: preScript
        });
        preRequestEditor.onDidChangeModelContent(() => markDirty());
    }

    if (postResponseContainer && typeof monaco !== 'undefined') {
        postResponseEditor = monaco.editor.create(postResponseContainer, {
            ...editorOptions,
            value: postScript
        });
        postResponseEditor.onDidChangeModelContent(() => markDirty());
    }
}

function markDirty() {
    isDirty = true;
}

// Message handler
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'init':
            folder = message.folder;
            collectionName = message.collectionName || '';
            renderFolder();
            break;
        case 'saveSuccess':
            showStatus('Folder saved successfully', 'success');
            isDirty = false;
            break;
        case 'saveError':
            showStatus('Failed to save: ' + message.error, 'error');
            break;
    }
});

function renderFolder() {
    if (!folder) {
        console.error('No folder data to render');
        return;
    }

    // Name
    const nameInput = document.getElementById('folder-name');
    if (nameInput) {
        nameInput.value = folder.name || '';
    }

    // Collection name display
    const collectionDisplay = document.getElementById('collection-name-display');
    if (collectionDisplay) {
        collectionDisplay.textContent = collectionName || '—';
    }

    // Description
    const descInput = document.getElementById('folder-description');
    if (descInput) {
        descInput.value = folder.description || '';
    }

    // Stats
    const statRequests = document.getElementById('stat-requests');
    const statFolders = document.getElementById('stat-folders');
    
    if (statRequests) statRequests.textContent = folder.requestCount || 0;
    if (statFolders) statFolders.textContent = folder.folderCount || 0;

    // Auth
    renderAuth();

    // Scripts - only update if editors exist and have different content
    if (preRequestEditor) {
        const preScript = folder.scripts?.preRequest || '';
        if (preRequestEditor.getValue() !== preScript) {
            preRequestEditor.setValue(preScript);
        }
    }
    if (postResponseEditor) {
        const postScript = folder.scripts?.postResponse || '';
        if (postResponseEditor.getValue() !== postScript) {
            postResponseEditor.setValue(postScript);
        }
    }

    isDirty = false;
}

// Auth rendering
function renderAuth() {
    const authType = folder?.auth?.type || 'none';
    document.querySelectorAll('.auth-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.auth === authType);
    });
    renderAuthConfig(authType);
}

function renderAuthConfig(authType) {
    const container = document.getElementById('auth-config');
    if (!container) return;
    
    const auth = folder?.auth || {};

    switch (authType) {
        case 'none':
            container.innerHTML = '<p style="color: var(--text-secondary);">No authentication will be used for requests in this folder.</p>';
            break;
        case 'inherit':
            container.innerHTML = '<p style="color: var(--text-secondary);">Requests will inherit authentication from the parent (collection or parent folder).</p>';
            break;
        case 'bearer':
            container.innerHTML = 
                '<div class="form-group">' +
                    '<label>Token</label>' +
                    '<input type="text" id="auth-bearer-token" value="' + escapeHtml(auth.token || '') + '" placeholder="Enter bearer token or {{variable}}">' +
                '</div>';
            document.getElementById('auth-bearer-token')?.addEventListener('input', markDirty);
            break;
        case 'basic':
            container.innerHTML = 
                '<div class="form-group">' +
                    '<label>Username</label>' +
                    '<input type="text" id="auth-basic-username" value="' + escapeHtml(auth.username || '') + '" placeholder="Username">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Password</label>' +
                    '<input type="password" id="auth-basic-password" value="' + escapeHtml(auth.password || '') + '" placeholder="Password">' +
                '</div>';
            document.getElementById('auth-basic-username')?.addEventListener('input', markDirty);
            document.getElementById('auth-basic-password')?.addEventListener('input', markDirty);
            break;
        case 'apikey':
            container.innerHTML = 
                '<div class="form-group">' +
                    '<label>Key</label>' +
                    '<input type="text" id="auth-apikey-key" value="' + escapeHtml(auth.key || '') + '" placeholder="Header name (e.g., X-API-Key)">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Value</label>' +
                    '<input type="text" id="auth-apikey-value" value="' + escapeHtml(auth.value || '') + '" placeholder="API key value">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Add to</label>' +
                    '<select id="auth-apikey-in">' +
                        '<option value="header"' + (auth.in === 'header' ? ' selected' : '') + '>Header</option>' +
                        '<option value="query"' + (auth.in === 'query' ? ' selected' : '') + '>Query Params</option>' +
                    '</select>' +
                '</div>';
            document.getElementById('auth-apikey-key')?.addEventListener('input', markDirty);
            document.getElementById('auth-apikey-value')?.addEventListener('input', markDirty);
            document.getElementById('auth-apikey-in')?.addEventListener('change', markDirty);
            break;
    }
}

// Collect form data
function collectFormData() {
    // Auth
    const activeAuthBtn = document.querySelector('.auth-type-btn.active');
    const authType = activeAuthBtn?.dataset.auth || 'none';
    let auth = { type: authType };

    switch (authType) {
        case 'bearer':
            auth.token = document.getElementById('auth-bearer-token')?.value || '';
            break;
        case 'basic':
            auth.username = document.getElementById('auth-basic-username')?.value || '';
            auth.password = document.getElementById('auth-basic-password')?.value || '';
            break;
        case 'apikey':
            auth.key = document.getElementById('auth-apikey-key')?.value || '';
            auth.value = document.getElementById('auth-apikey-value')?.value || '';
            auth.in = document.getElementById('auth-apikey-in')?.value || 'header';
            break;
    }

    // Scripts
    const scripts = {
        preRequest: preRequestEditor?.getValue() || '',
        postResponse: postResponseEditor?.getValue() || ''
    };

    return {
        name: document.getElementById('folder-name')?.value?.trim() || '',
        description: document.getElementById('folder-description')?.value?.trim() || '',
        auth,
        scripts
    };
}

function showStatus(message, type) {
    const el = document.getElementById('status-message');
    if (!el) return;
    
    el.textContent = message;
    el.className = 'status-message ' + type;
    setTimeout(() => {
        el.className = 'status-message';
    }, 3000);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
