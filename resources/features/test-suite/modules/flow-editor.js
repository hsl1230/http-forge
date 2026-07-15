/**
 * Flow Editor – manages suite.nodes (if, for, while, switch, block, script, request).
 *
 * Node path addressing:
 *   Root-level index           → "2"
 *   Branch child               → "2-then-0"
 *   Switch case child          → "1-cases-0-nodes-2"
 */

import { state, vscode } from './state.js';
import { closeAllMenus, setDirty } from './suite-editor.js';
import { escapeHtml } from './utils.js';

// ─── Node type catalogue ────────────────────────────────────────────────────

export const NODE_TYPES = [
    { type: 'request', label: 'Request',    icon: '🌐', color: '#4caf50', description: 'Run a request from a collection' },
    { type: 'script',  label: 'Script',     icon: '⚡', color: '#9c27b0', description: 'Run a script (pm.variables, pm.environment …)' },
    { type: 'if',      label: 'If / Else',  icon: '◇',  color: '#2196f3', description: 'Conditional branch on a JS expression' },
    { type: 'for',     label: 'For Loop',   icon: '↻',  color: '#ff9800', description: 'Init / condition / update loop' },
    { type: 'while',   label: 'While Loop', icon: '↺',  color: '#ff5722', description: 'Loop while a JS expression is true' },
    { type: 'switch',  label: 'Switch',     icon: '⇌',  color: '#009688', description: 'Multi-branch switch on a JS expression' },
    { type: 'block',   label: 'Block',      icon: '▣',  color: '#607d8b', description: 'Group nodes together' },
];

const NODE_COLOR = {
    script: '#9c27b0', if: '#2196f3', for: '#ff9800',
    while: '#ff5722', switch: '#009688', block: '#607d8b', request: '#4caf50'
};

function _normalizeType(type) {
    if (type === 'forLoop' || type === 'for-loop' || type === 'for_loop') return 'for';
    if (type === 'whileLoop' || type === 'while-loop' || type === 'while_loop') return 'while';
    return type;
}

// ─── Module state ───────────────────────────────────────────────────────────

let _pendingAddCtx   = null; // { pathKey, branch } for child adds
let _editingPathKey  = null; // path of node open in editor
let _editingCaseCtx  = null; // { pathKey, caseIndex } for switch-case editor
let _editingElseIfCtx = null; // { pathKey, branchIndex } for else-if editor
const _collapsedNodeKeys = new Set();
const _collapsedBranchKeys = new Set();

// ─── Render ─────────────────────────────────────────────────────────────────

export function renderFlowNodes() {
    const container = document.getElementById('flow-nodes-list');
    if (!container) return;

    const nodes = state.suite?.nodes || [];

    if (!nodes.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No flow nodes yet</p>
                <p class="hint">Click "+ Add Node" to start</p>
            </div>`;
        return;
    }

    container.innerHTML = _renderList(nodes, '');
    _bindEvents(container);
}

function _renderList(nodes, prefix) {
    return nodes.map((node, i) => {
        const key = prefix ? `${prefix}-${i}` : `${i}`;
        return _renderNode(node, key, prefix.split('-').length - (prefix ? 0 : 1));
    }).join('');
}

function _renderNode(node, pathKey, depth) {
    const type   = _normalizeType(node?.type) || 'unknown';
    const color  = NODE_COLOR[type] || '#888';
    const icon   = (NODE_TYPES.find(t => t.type === type) || {}).icon || '?';
    const label  = node.name && node.name !== type ? escapeHtml(node.name) : '';
    const summary = _nodeSummary(node);
    const enabled = node.enabled !== false;
    const canCollapse = _isBlockNode(type);
    const isCollapsed = canCollapse && _collapsedNodeKeys.has(pathKey);

    const children = isCollapsed ? '' : _renderChildren(node, pathKey);
    const actionsMenu = _renderNodeActionsMenu(node, pathKey);

    return `
    <div class="flow-node${enabled ? '' : ' disabled'}" data-path="${pathKey}" data-type="${type}">
        <div class="flow-node-header" style="--node-depth:0">
            <span class="drag-handle" title="Drag to reorder">☰</span>
            ${canCollapse
                ? `<button class="btn-icon collapse-node-btn" data-path="${pathKey}" title="${isCollapsed ? 'Expand block' : 'Collapse block'}">${isCollapsed ? '▸' : '▾'}</button>`
                : '<span class="collapse-node-spacer"></span>'}
            <span class="node-badge" style="background:${color}" title="${type}">${icon}</span>
            ${label ? `<span class="node-label">${label}</span>` : ''}
            <span class="node-summary" title="${escapeHtml(summary)}">${escapeHtml(summary)}</span>
            ${actionsMenu}
        </div>
        ${children}
    </div>`;
}

function _decodePathSegment(value) {
    if (typeof value !== 'string' || !value) return value || '';
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function _renderNodeActionsMenu(node, pathKey) {
    const enabled = node?.enabled !== false;
    const requestItems = _normalizeType(node?.type) === 'request' ? `
        <button class="menu-item node-action-btn" data-path="${pathKey}" data-action="open-original">↗ Open Original</button>
        <button class="menu-item node-action-btn" data-path="${pathKey}" data-action="reset">↺ Reset to Collection</button>
    ` : '';

    return `
        <div class="request-actions-menu node-actions-menu">
            <button class="menu-trigger node-menu-trigger" title="Actions">⋯</button>
            <div class="menu-dropdown node-menu-dropdown">
                <button class="menu-item node-action-btn" data-path="${pathKey}" data-action="edit">✎ Edit</button>
                ${requestItems}
                <button class="menu-item node-action-btn" data-path="${pathKey}" data-action="toggle">${enabled ? '○ Disable' : '● Enable'}</button>
                <button class="menu-item node-action-btn danger" data-path="${pathKey}" data-action="remove">× Remove</button>
            </div>
        </div>`;
}

function _nodeSummary(node) {
    switch (_normalizeType(node?.type)) {
        case 'script':
            if (node.scriptRef) return `ref → ${node.scriptRef}`;
            const src = typeof node.script === 'string' ? node.script : (node.script || []).join('\n');
            return src.trim().split('\n')[0].trim() || '(empty)';
        case 'if':      return node.if || node.condition || '(no condition)';
        case 'for':     return `cond: ${node.loopCondition ?? node.condition ?? 'true'}${node.maxIterations ? `, max ${node.maxIterations}` : ''}`;
        case 'while':   return `${node.while || node.condition || 'false'}${node.maxIterations ? `, max ${node.maxIterations}` : ''}`;
        case 'switch':  return `switch(${node.expression || '?'})`;
        case 'block':   return `${(node.nodes || []).length} node(s)`;
        case 'request': {
            const req = node.request || {};
            const parts = [_decodePathSegment(req.collectionName), _decodePathSegment(req.folderPath)].filter(Boolean);
            return parts.length ? parts.join(' › ') : (req.method || '');
        }
        default:        return '';
    }
}

function _renderChildren(node, pathKey) {
    const type = _normalizeType(node?.type);
    if (!['if', 'for', 'while', 'switch', 'block'].includes(type)) return '';

    let html = '<div class="flow-node-children">';

    if (type === 'if') {
        html += _branch('then', node.then || [], pathKey, 'then');
        const elseIfBranches = Array.isArray(node.elseif) ? node.elseif : [];
        elseIfBranches.forEach((branch, idx) => {
            const label = `else if: ${branch?.condition || 'true'}`;
            html += _branch(
                label,
                branch?.nodes || [],
                pathKey,
                `elseif-${idx}-nodes`,
                `<button class="btn-icon edit-elseif-btn" data-path="${pathKey}" data-elseif-index="${idx}" title="Edit">✎</button>
                <button class="btn-icon remove-elseif-btn danger" data-path="${pathKey}" data-elseif-index="${idx}" title="Remove else-if">×</button>`
            );
        });
        html += `
            <div class="add-case-row">
                <button class="btn-link add-elseif-btn" data-path="${pathKey}" title="Add an else-if branch">+ Add Else If</button>
            </div>`;
        if (Array.isArray(node.else)) {
            html += _branch(
                'else',
                node.else,
                pathKey,
                'else',
                `<button class="btn-icon remove-else-btn danger" data-path="${pathKey}" title="Remove else">×</button>`
            );
        } else {
            html += `
                <div class="add-case-row">
                    <button class="btn-link add-else-btn" data-path="${pathKey}" title="Add an else branch">+ Add Else</button>
                </div>`;
        }
    } else if (type === 'switch') {
        const cases = node.cases || [];
        cases.forEach((c, ci) => {
            const caseLabel = c.equals !== undefined
                ? `case ${JSON.stringify(c.equals)}`
                : c.condition ? `when: ${c.condition}` : 'default';
            html += _branch(
                caseLabel,
                c.nodes || [],
                pathKey,
                `cases-${ci}-nodes`,
                `<button class="btn-icon edit-case-btn" data-path="${pathKey}" data-case-index="${ci}" title="Edit">✎</button>
                <button class="btn-icon remove-case-btn danger" data-path="${pathKey}" data-case-index="${ci}" title="Remove case">×</button>`
            );
        });
        html += `
            <div class="add-case-row">
                <button class="btn-link add-case-btn" data-path="${pathKey}" title="Add a new case">+ Add Case</button>
            </div>`;
        if (node.default !== undefined) {
            html += _branch(
                'default',
                node.default || [],
                pathKey,
                'default',
                `<button class="btn-icon remove-default-btn danger" data-path="${pathKey}" title="Remove default">×</button>`
            );
        } else {
            html += `<button class="btn-link add-default-btn" data-path="${pathKey}">+ Add Default</button>`;
        }
    } else {
        // for, while, block
        html += _branch('body', node.nodes || [], pathKey, 'nodes');
    }

    html += '</div>';
    return html;
}

function _branch(label, nodes, parentPathKey, branch, actionsHtml = '') {
    const branchKey = branch.replace(/-/g, '-'); // keep as-is for path building
    const collapseKey = `${parentPathKey}::${branchKey}`;
    const isCollapsed = _collapsedBranchKeys.has(collapseKey);
    return `
    <div class="node-branch">
        <div class="branch-header">
        <span class="drag-handle" title="Drag to reorder"></span>
        <button class="btn-icon collapse-branch-btn" data-collapse-key="${collapseKey}" title="${isCollapsed ? 'Expand section' : 'Collapse section'}">${isCollapsed ? '▸' : '▾'}</button>
            <span class="branch-label">${label}</span>
            ${actionsHtml}
            <button class="btn-link add-child-btn" data-path="${parentPathKey}" data-branch="${branchKey}">+ Add</button>
        </div>
        <div class="branch-body${isCollapsed ? ' collapsed' : ''}" data-parent-path="${parentPathKey}" data-branch="${branchKey}">
            <div class="branch-drop-hint">Drop to move inside</div>
            ${isCollapsed
                ? ''
                : (nodes.length
                ? _renderList(nodes, `${parentPathKey}-${branchKey}`)
                : '<span class="empty-branch">empty</span>')}
        </div>
    </div>`;
}

function _isBlockNode(type) {
    return ['if', 'for', 'while', 'switch', 'block'].includes(_normalizeType(type));
}

// ─── Event binding ──────────────────────────────────────────────────────────

function _bindEvents(container) {
    container.querySelectorAll('.collapse-node-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const key = btn.dataset.path;
            if (!key) return;
            if (_collapsedNodeKeys.has(key)) _collapsedNodeKeys.delete(key);
            else _collapsedNodeKeys.add(key);
            renderFlowNodes();
        })
    );
    container.querySelectorAll('.collapse-branch-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const key = btn.dataset.collapseKey;
            if (!key) return;
            if (_collapsedBranchKeys.has(key)) _collapsedBranchKeys.delete(key);
            else _collapsedBranchKeys.add(key);
            renderFlowNodes();
        })
    );
    container.querySelectorAll('.node-menu-trigger').forEach(trigger =>
        trigger.addEventListener('click', e => {
            e.stopPropagation();
            const menu = trigger.nextElementSibling;
            const wasOpen = menu?.classList.contains('open');
            closeAllMenus();
            if (!wasOpen) {
                menu?.classList.add('open');
            }
        })
    );
    container.querySelectorAll('.node-action-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const path = btn.dataset.path;
            const action = btn.dataset.action;
            closeAllMenus();
            if (!path || !action) return;

            if (action === 'edit') {
                openNodeEditor(path);
                return;
            }

            if (action === 'toggle') {
                toggleNode(path);
                return;
            }

            if (action === 'remove') {
                removeNode(path);
                return;
            }

            if (action === 'open-original') {
                const slug = _getRequestSlug(_get(path));
                if (slug) {
                    vscode.postMessage({ command: 'openOriginalRequest', slug });
                }
                return;
            }

            if (action === 'reset') {
                const slug = _getRequestSlug(_get(path));
                if (slug && confirm('Reset to collection version? Your suite customizations will be lost.')) {
                    vscode.postMessage({ command: 'resetSuiteRequest', slug });
                }
            }
        })
    );
    container.querySelectorAll('.add-child-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            _pendingAddCtx = { pathKey: btn.dataset.path, branch: btn.dataset.branch };
            openTypePicker();
        })
    );
    container.querySelectorAll('.add-case-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            addSwitchCase(btn.dataset.path);
        })
    );
    container.querySelectorAll('.add-elseif-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            addElseIfBranch(btn.dataset.path);
        })
    );
    container.querySelectorAll('.add-else-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            addElseBranch(btn.dataset.path);
        })
    );
    container.querySelectorAll('.edit-elseif-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            editElseIfBranch(btn.dataset.path, parseInt(btn.dataset.elseifIndex || '-1', 10));
        })
    );
    container.querySelectorAll('.remove-elseif-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            removeElseIfBranch(btn.dataset.path, parseInt(btn.dataset.elseifIndex || '-1', 10));
        })
    );
    container.querySelectorAll('.remove-else-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            removeElseBranch(btn.dataset.path);
        })
    );
    container.querySelectorAll('.edit-case-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            editSwitchCase(btn.dataset.path, parseInt(btn.dataset.caseIndex || '-1', 10));
        })
    );
    container.querySelectorAll('.remove-case-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            removeSwitchCase(btn.dataset.path, parseInt(btn.dataset.caseIndex || '-1', 10));
        })
    );
    container.querySelectorAll('.add-default-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            addSwitchDefault(btn.dataset.path);
        })
    );
    container.querySelectorAll('.remove-default-btn').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            removeSwitchDefault(btn.dataset.path);
        })
    );
    // Drag-and-drop reordering
    _bindDragAndDrop(container);
    // edit-suite-request/open-original/reset now handled by node action menu
}

function _getRequestSlug(node) {
    if (!node || node.type !== 'request') return undefined;
    if (node.request?.slug) return node.request.slug;

    const req = node.request || {};
    const found = (state.suite?.requests || []).find(r =>
        r.collectionId === req.collectionId && r.requestId === req.requestId
    );
    return found?.slug;
}

// ─── Path utilities ─────────────────────────────────────────────────────────

function _resolve(nodes, pathKey) {
    // Returns { parent, key } so caller can do parent[key]
    if (!pathKey && pathKey !== 0) return { parent: null, key: null };
    const segs = String(pathKey).split('-');
    let current = nodes;
    for (let i = 0; i < segs.length - 1; i++) {
        const s = segs[i];
        current = current[isNaN(s) ? s : parseInt(s)];
        if (!current) return { parent: null, key: null };
    }
    const last = segs[segs.length - 1];
    return { parent: current, key: isNaN(last) ? last : parseInt(last) };
}

function _get(pathKey) {
    const nodes = state.suite?.nodes || [];
    const { parent, key } = _resolve(nodes, pathKey);
    return parent ? parent[key] : null;
}

function _set(pathKey, value) {
    const nodes = state.suite?.nodes || [];
    const { parent, key } = _resolve(nodes, pathKey);
    if (parent !== null && key !== null) parent[key] = value;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function removeNode(pathKey) {
    if (!state.suite?.nodes) return;
    const { parent, key } = _resolve(state.suite.nodes, pathKey);
    if (parent === null || key === null) return;

    if (Array.isArray(parent)) {
        const idx = typeof key === 'number' ? key : parseInt(String(key), 10);
        if (Number.isNaN(idx) || idx < 0 || idx >= parent.length) return;
        parent.splice(idx, 1);
    } else if (typeof parent === 'object') {
        delete parent[key];
    } else {
        return;
    }

    _commit();
}

function toggleNode(pathKey) {
    const node = _get(pathKey);
    if (!node) return;
    node.enabled = node.enabled === false ? undefined : false;
    _commit();
}

function _bindDragAndDrop(container) {
    let _dragPath = null;

    const clearDropHighlights = () => {
        container.querySelectorAll('.flow-node').forEach(n => n.classList.remove('drag-over'));
        container.querySelectorAll('.flow-node').forEach(n => n.classList.remove('drag-copy'));
        container.querySelectorAll('.branch-body').forEach(n => {
            n.classList.remove('drag-over');
            n.classList.remove('drag-copy');
            const hint = n.querySelector('.branch-drop-hint');
            if (hint) hint.textContent = 'Drop to move inside';
        });
    };

    const isCopyDrag = (event) => !!(event?.ctrlKey || event?.metaKey);
    const resolveCopyMode = (event) => isCopyDrag(event) || event?.dataTransfer?.dropEffect === 'copy';

    const getArrayAtPath = (arrayPath) => {
        let cursor = state.suite?.nodes;
        if (!Array.isArray(cursor)) return null;
        if (!arrayPath) return cursor;

        const parts = String(arrayPath).split('-').filter(Boolean);
        for (const part of parts) {
            const key = isNaN(part) ? part : parseInt(part, 10);
            cursor = cursor?.[key];
            if (cursor === undefined || cursor === null) return null;
        }
        return Array.isArray(cursor) ? cursor : null;
    };

    const isInvalidDestination = (fromPath, destinationArrayPath, copyMode = false) => {
        if (copyMode) return false;
        if (!destinationArrayPath) return false;
        return destinationArrayPath === fromPath || destinationArrayPath.startsWith(`${fromPath}-`);
    };

    const moveDraggedNode = (destinationArrayPath, destinationIndex = null, copyMode = false) => {
        if (!_dragPath) return;

        const fromSegments = _dragPath.split('-');
        const fromIndex = parseInt(fromSegments[fromSegments.length - 1], 10);
        const fromArrayPath = fromSegments.slice(0, -1).join('-');
        if (Number.isNaN(fromIndex)) return;
        if (isInvalidDestination(_dragPath, destinationArrayPath, copyMode)) return;

        const fromArray = getArrayAtPath(fromArrayPath);
        const toArray = getArrayAtPath(destinationArrayPath);
        if (!Array.isArray(fromArray) || !Array.isArray(toArray)) return;
        if (fromIndex < 0 || fromIndex >= fromArray.length) return;

        let item;
        if (copyMode) {
            item = JSON.parse(JSON.stringify(fromArray[fromIndex]));
        } else {
            [item] = fromArray.splice(fromIndex, 1);
        }
        if (!item) return;

        let insertIndex = destinationIndex == null ? toArray.length : Math.max(0, Math.min(destinationIndex, toArray.length));

        // Keep same-array reordering behavior stable when dragging downward.
        if (!copyMode && fromArray === toArray && destinationIndex != null && fromIndex < destinationIndex) {
            insertIndex = Math.max(0, insertIndex - 1);
        }

        toArray.splice(insertIndex, 0, item);
        _commit();
    };

    container.querySelectorAll('.flow-node').forEach(el => {
        const pathKey = el.dataset.path;
        // Dragging is disabled by default; mousedown on the handle enables it for that gesture.
        el.draggable = false;

        // :scope limits to the DIRECT .flow-node-header child, not nested nodes.
        const handle = el.querySelector(':scope > .flow-node-header > .drag-handle');
        handle?.addEventListener('mousedown', () => {
            el.draggable = true;
        });

        el.addEventListener('dragstart', e => {
            _dragPath = pathKey;
            el.classList.add('dragging');
            // Allow OS/webview to switch between move and copy with Ctrl/Cmd during drag.
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('text/plain', pathKey);
            e.stopPropagation();
        });

        el.addEventListener('dragend', () => {
            el.draggable = false;
            el.classList.remove('dragging');
            clearDropHighlights();
            _dragPath = null;
        });

        el.addEventListener('dragover', e => {
            if (!_dragPath || _dragPath === pathKey) return;
            const dragSegs = _dragPath.split('-');
            const overSegs = pathKey.split('-');
            const destinationArrayPath = overSegs.slice(0, -1).join('-');
            const copyMode = isCopyDrag(e);
            if (isInvalidDestination(_dragPath, destinationArrayPath, copyMode)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = copyMode ? 'copy' : 'move';
            clearDropHighlights();
            el.classList.add('drag-over');
            if (copyMode) el.classList.add('drag-copy');
            e.stopPropagation();
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over');
        });

        el.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.remove('drag-over');
            if (!_dragPath || _dragPath === pathKey) return;

            const toSegs   = pathKey.split('-');
            const toIdx   = parseInt(toSegs[toSegs.length - 1]);
            if (Number.isNaN(toIdx)) return;

            const destinationArrayPath = toSegs.slice(0, -1).join('-');
            moveDraggedNode(destinationArrayPath, toIdx, resolveCopyMode(e));
        });
    });

    // Allow dropping directly into any branch body (append to branch array).
    container.querySelectorAll('.branch-body').forEach(branchBody => {
        branchBody.addEventListener('dragover', e => {
            if (!_dragPath) return;
            const parentPath = branchBody.dataset.parentPath || '';
            const branchKey = branchBody.dataset.branch || '';
            const destinationArrayPath = [parentPath, branchKey].filter(Boolean).join('-');
            const copyMode = isCopyDrag(e);
            if (isInvalidDestination(_dragPath, destinationArrayPath, copyMode)) return;

            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = copyMode ? 'copy' : 'move';
            clearDropHighlights();
            branchBody.classList.add('drag-over');
            if (copyMode) {
                branchBody.classList.add('drag-copy');
            }
            const hint = branchBody.querySelector('.branch-drop-hint');
            if (hint) hint.textContent = copyMode ? 'Drop to copy inside' : 'Drop to move inside';
        });

        branchBody.addEventListener('dragleave', () => {
            branchBody.classList.remove('drag-over');
        });

        branchBody.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            branchBody.classList.remove('drag-over');
            if (!_dragPath) return;

            const parentPath = branchBody.dataset.parentPath || '';
            const branchKey = branchBody.dataset.branch || '';
            const destinationArrayPath = [parentPath, branchKey].filter(Boolean).join('-');
            moveDraggedNode(destinationArrayPath, null, resolveCopyMode(e));
        });
    });
}

function addSwitchCase(pathKey) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'switch') return;
    if (!node.cases) node.cases = [];

    // Keep Add Case one-click and deterministic in webview contexts.
    const newCase = { condition: 'true', nodes: [] };
    node.cases.push(newCase);
    _commit();
}

function addElseIfBranch(pathKey) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'if') return;
    if (!Array.isArray(node.elseif)) node.elseif = [];
    node.elseif.push({ condition: 'true', nodes: [] });
    _commit();
}

function addElseBranch(pathKey) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'if') return;
    if (Array.isArray(node.else)) return;
    node.else = [];
    _commit();
}

function removeElseIfBranch(pathKey, branchIndex) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'if') return;
    if (!Array.isArray(node.elseif) || branchIndex < 0 || branchIndex >= node.elseif.length) return;
    node.elseif.splice(branchIndex, 1);
    _commit();
}

function removeElseBranch(pathKey) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'if') return;
    if (!Array.isArray(node.else)) return;
    delete node.else;
    _commit();
}

function editElseIfBranch(pathKey, branchIndex) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'if') return;
    if (!Array.isArray(node.elseif) || branchIndex < 0 || branchIndex >= node.elseif.length) return;

    const branch = node.elseif[branchIndex] || { condition: 'true', nodes: [] };
    const modal = document.getElementById('node-editor-modal');
    if (!modal) return;

    _editingPathKey = null;
    _editingCaseCtx = null;
    _editingElseIfCtx = { pathKey, branchIndex };

    document.getElementById('node-editor-title').textContent = 'Edit else-if branch';
    document.getElementById('node-editor-body').innerHTML = `
        <div class="nef-field">
            <label>Else-if Condition <span class="nef-hint-text">(JS expression)</span></label>
            <textarea id="nef-elseif-condition" rows="4" placeholder="pm.variables.get('status') === 'ready'">${escapeHtml(String(branch.condition || 'true'))}</textarea>
        </div>
        <p class="nef-info">This condition is evaluated after the main <strong>if</strong> condition and before <strong>else</strong>.</p>
    `;

    modal.classList.remove('hidden');
}

function addSwitchDefault(pathKey) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'switch') return;
    node.default = [];
    _commit();
}

function removeSwitchDefault(pathKey) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'switch') return;
    if (node.default === undefined) return;
    delete node.default;
    _commit();
}

function removeSwitchCase(pathKey, caseIndex) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'switch') return;
    if (!Array.isArray(node.cases) || caseIndex < 0 || caseIndex >= node.cases.length) return;

    node.cases.splice(caseIndex, 1);
    _commit();
}

function editSwitchCase(pathKey, caseIndex) {
    const node = _get(pathKey);
    if (!node || _normalizeType(node.type) !== 'switch') return;
    if (!Array.isArray(node.cases) || caseIndex < 0 || caseIndex >= node.cases.length) return;

    const targetCase = node.cases[caseIndex] || {};

    _editingPathKey = null;
    _editingElseIfCtx = null;
    _editingCaseCtx = { pathKey, caseIndex };

    const modal = document.getElementById('node-editor-modal');
    if (!modal) return;

    const isEquals = targetCase.equals !== undefined;
    const initialType = isEquals ? 'equals' : 'condition';
    const initialValue = isEquals
        ? String(targetCase.equals ?? '')
        : String(targetCase.condition || 'true');

    document.getElementById('node-editor-title').textContent = 'Edit switch case';
    document.getElementById('node-editor-body').innerHTML = `
        <div class="nef-field">
            <label>Matcher Type</label>
            <select id="nef-case-type">
                <option value="condition" ${initialType === 'condition' ? 'selected' : ''}>when condition</option>
                <option value="equals" ${initialType === 'equals' ? 'selected' : ''}>equals value</option>
            </select>
        </div>
        <div class="nef-field">
            <label>Matcher</label>
            <textarea id="nef-case-value" rows="4" placeholder="e.g. pm.variables.get('status') === 'ready'">${escapeHtml(initialValue)}</textarea>
        </div>
        <p class="nef-info">Use <strong>when condition</strong> for JS expressions, or <strong>equals value</strong> for direct value matching against the switch expression.</p>
    `;

    modal.classList.remove('hidden');
}

function _insertNode(newNode) {
    if (!state.suite) return null;
    if (!state.suite.nodes) state.suite.nodes = [];

    let insertedPath = null;

    if (!_pendingAddCtx) {
        state.suite.nodes.push(newNode);
        insertedPath = String(state.suite.nodes.length - 1);
    } else {
        const { pathKey, branch } = _pendingAddCtx;
        const parent = _get(pathKey);
        if (!parent) {
            state.suite.nodes.push(newNode);
            insertedPath = String(state.suite.nodes.length - 1);
        } else {
            // branch can be nested like "cases-0-nodes"
            const parts = branch.split('-');
            let target = parent;
            for (const p of parts) {
                const key = isNaN(p) ? p : parseInt(p);
                if (!target[key]) target[key] = [];
                target = target[key];
            }
            if (Array.isArray(target)) {
                target.push(newNode);
                insertedPath = `${pathKey}-${branch}-${target.length - 1}`;
            }
        }
    }
    _pendingAddCtx = null;
    _commit();
    return insertedPath;
}

/**
 * Insert multiple request nodes, respecting any pending branch context
 * Called by addSelectedRequests in suite-editor
 */
export function insertRequestNodes(requestArray) {
    if (!requestArray?.length) return;
    if (!state.suite) return;
    if (!state.suite.nodes) state.suite.nodes = [];

    const newNodes = requestArray.map(req => ({
        type: 'request',
        name: req.name,
        request: {
            slug: req.slug,
            collectionId: req.collectionId,
            requestId: req.requestId,
            name: req.name,
            collectionName: req.collectionName,
            method: req.method,
            folderPath: req.folderPath || '',
            enabled: true
        },
        enabled: true
    }));

    if (!_pendingAddCtx) {
        state.suite.nodes.push(...newNodes);
        _commit();
        return;
    }

    const { pathKey, branch } = _pendingAddCtx;
    const parent = _get(pathKey);

    if (!parent) {
        state.suite.nodes.push(...newNodes);
    } else {
        // branch can be nested like "cases-0-nodes"
        const parts = branch.split('-');
        let target = parent;
        for (const p of parts) {
            const key = isNaN(p) ? p : parseInt(p);
            if (!target[key]) target[key] = [];
            target = target[key];
        }
        if (Array.isArray(target)) {
            target.push(...newNodes);
        } else {
            state.suite.nodes.push(...newNodes);
        }
    }

    _pendingAddCtx = null;
    _commit();
}

function _commit() {
    setDirty(true);
    renderFlowNodes();
    vscode.postMessage({ type: 'updateFlowNodes', nodes: state.suite?.nodes || [] });
}

// ─── Type picker ─────────────────────────────────────────────────────────────

export function openTypePicker() {
    document.getElementById('node-type-picker-modal')?.classList.remove('hidden');
}

export function closeTypePicker(preservePendingContext = false) {
    document.getElementById('node-type-picker-modal')?.classList.add('hidden');
    if (!preservePendingContext) {
        _pendingAddCtx = null;
    }
}

export function onTypePicked(type) {
    if (type === 'request') {
        // Keep branch context then open multi-select picker instead of empty node
        closeTypePicker(true);
        // Dynamically import to avoid circular deps (suite-editor imports flow-editor)
        import('./suite-editor.js').then(m => m.openAddRequestModal());
        return;
    }
    // Keep branch context long enough for insertion, then clear in _insertNode.
    closeTypePicker(true);
    const insertedPath = _insertNode(_defaultNode(type));
    // Immediately open the editor so the user can configure the new node.
    if (insertedPath !== null) {
        openNodeEditor(insertedPath);
    }
}

function _defaultNode(type) {
    switch (type) {
        case 'request': return { type: 'request', name: 'Request', request: {} };
        case 'script': return { type: 'script', name: 'Script', script: '' };
        case 'if':     return { type: 'if',     name: 'If',     if: '',    then: [], elseif: [], else: [] };
        case 'for':    return { type: 'for',    name: 'For',    condition: 'true', nodes: [], maxIterations: 100 };
        case 'while':  return { type: 'while',  name: 'While',  while: 'false',    nodes: [], maxIterations: 100 };
        case 'switch': return { type: 'switch', name: 'Switch', expression: '',    cases: [] };
        case 'block':  return { type: 'block',  name: 'Block',  nodes: [] };
        default:       return { type };
    }
}



export function openNodeEditor(pathKey) {
    _editingCaseCtx = null;
    _editingElseIfCtx = null;
    _editingPathKey = pathKey;
    const node = _get(pathKey);
    if (!node) return;

    const modal = document.getElementById('node-editor-modal');
    if (!modal) return;

    document.getElementById('node-editor-title').textContent =
        `Edit ${node.type || 'node'} node`;
    document.getElementById('node-editor-body').innerHTML = _buildForm(node);

    // For request nodes, keep full request editing accessible from the same edit flow.
    if (node.type === 'request') {
        const openBtn = document.getElementById('nef-open-suite-request-editor');
        openBtn?.addEventListener('click', () => {
            const slug = _getRequestSlug(node);
            if (slug) {
                vscode.postMessage({ command: 'editSuiteRequest', slug });
            }
        });
    }

    modal.classList.remove('hidden');
}

export function closeNodeEditor() {
    document.getElementById('node-editor-modal')?.classList.add('hidden');
    _editingPathKey = null;
    _editingCaseCtx = null;
    _editingElseIfCtx = null;
}

export function saveNodeEditor() {
    if (_editingElseIfCtx) {
        const node = _get(_editingElseIfCtx.pathKey);
        if (!node || _normalizeType(node.type) !== 'if') return;
        if (!Array.isArray(node.elseif) || _editingElseIfCtx.branchIndex < 0 || _editingElseIfCtx.branchIndex >= node.elseif.length) return;

        const condition = (document.getElementById('nef-elseif-condition')?.value || '').trim() || 'true';
        const branch = node.elseif[_editingElseIfCtx.branchIndex] || { condition: 'true', nodes: [] };
        branch.condition = condition;
        if (!Array.isArray(branch.nodes)) branch.nodes = [];
        node.elseif[_editingElseIfCtx.branchIndex] = branch;

        closeNodeEditor();
        _commit();
        return;
    }

    if (_editingCaseCtx) {
        const node = _get(_editingCaseCtx.pathKey);
        if (!node || _normalizeType(node.type) !== 'switch') return;
        if (!Array.isArray(node.cases) || _editingCaseCtx.caseIndex < 0 || _editingCaseCtx.caseIndex >= node.cases.length) return;

        const matcherType = document.getElementById('nef-case-type')?.value || 'condition';
        const matcherValue = (document.getElementById('nef-case-value')?.value || '').trim();

        const targetCase = node.cases[_editingCaseCtx.caseIndex] || { nodes: [] };
        if (matcherType === 'equals') {
            targetCase.equals = matcherValue;
            delete targetCase.condition;
        } else {
            targetCase.condition = matcherValue || 'true';
            delete targetCase.equals;
        }
        if (!Array.isArray(targetCase.nodes)) targetCase.nodes = [];

        node.cases[_editingCaseCtx.caseIndex] = targetCase;
        closeNodeEditor();
        _commit();
        return;
    }

    if (!_editingPathKey) return;
    const node = _get(_editingPathKey);
    if (!node) return;

    const g = id => document.getElementById(id);

    node.name      = g('nef-name')?.value.trim() || undefined;
    node.condition = g('nef-condition')?.value.trim() || undefined;

    switch (_normalizeType(node.type)) {
        case 'script': {
            node.script    = g('nef-script')?.value || undefined;
            node.scriptRef = g('nef-script-ref')?.value.trim() || undefined;
            node.phase     = g('nef-phase')?.value || 'pre';
            break;
        }
        case 'if': {
            node.if = g('nef-if')?.value.trim() || '';
            break;
        }
        case 'for': {
            node.init        = g('nef-for-init')?.value.trim() || undefined;
            // loopCondition is the dedicated field; do NOT overwrite node.condition (the guard)
            node.loopCondition = g('nef-for-cond')?.value.trim() || 'true';
            node.update      = g('nef-for-update')?.value.trim() || undefined;
            node.maxIterations = parseInt(g('nef-max-iter')?.value) || 100;
            break;
        }
        case 'while': {
            node.while         = g('nef-while')?.value.trim() || 'false';
            node.maxIterations = parseInt(g('nef-max-iter')?.value) || 100;
            break;
        }
        case 'switch': {
            node.expression = g('nef-switch-expr')?.value.trim() || '';
            break;
        }
    }

    _set(_editingPathKey, node);
    closeNodeEditor();
    _commit();
}

function _buildForm(node) {
    const v = s => escapeHtml(s || '');
    const ta = (id, val, rows = 5, ph = '') =>
        `<textarea id="${id}" rows="${rows}" placeholder="${ph}">${v(val)}</textarea>`;
    const inp = (id, val, ph = '', type = 'text') =>
        `<input type="${type}" id="${id}" value="${v(val)}" placeholder="${ph}">`;

    const common = `
        <div class="nef-field">
            <label>Label</label>
            ${inp('nef-name', node.name, 'Optional display name')}
        </div>
        <div class="nef-field">
            <label>Guard Condition <span class="nef-hint-text">(skip if false)</span></label>
            ${inp('nef-condition', node.condition, "pm.variables.get('skip') !== 'true'")}
        </div>`;

    let extra = '';

    switch (_normalizeType(node.type)) {
        case 'script': {
            const src = typeof node.script === 'string' ? node.script : (node.script || []).join('\n');
            extra = `
                <div class="nef-field">
                    <label>Script Ref <span class="nef-hint-text">(key from suite.scripts library)</span></label>
                    ${inp('nef-script-ref', node.scriptRef, 'e.g. mySetup')}
                </div>
                <div class="nef-field">
                    <label>Inline Script</label>
                    ${ta('nef-script', src, 8, "pm.variables.set('key', 'value');")}
                </div>
                <div class="nef-field">
                    <label>Phase</label>
                    <select id="nef-phase">
                        <option value="pre"  ${node.phase !== 'post' ? 'selected' : ''}>pre-request</option>
                        <option value="post" ${node.phase === 'post' ? 'selected' : ''}>post-response</option>
                    </select>
                </div>`;
            break;
        }
        case 'if': {
            extra = `
                <div class="nef-field">
                    <label>Condition <span class="nef-hint-text">(JS expression → truthy/falsy)</span></label>
                    ${inp('nef-if', node.if, "pm.variables.get('role') === 'admin'")}
                </div>
                <p class="nef-info">Manage <strong>then</strong> and <strong>else</strong> branches in the flow tree.</p>`;
            break;
        }
        case 'for': {
            const init   = typeof node.init   === 'string' ? node.init   : (node.init   || []).join('\n');
            const update = typeof node.update === 'string' ? node.update : (node.update || []).join('\n');
            // loopCondition is canonical; fall back to legacy condition field for old data
            const loopCond = node.loopCondition ?? node.condition ?? '';
            extra = `
                <div class="nef-field">
                    <label>Init Script <span class="nef-hint-text">(runs once before loop)</span></label>
                    ${ta('nef-for-init', init, 3, "pm.variables.set('i', 0);")}
                </div>
                <div class="nef-field">
                    <label>Loop Condition</label>
                    ${inp('nef-for-cond', loopCond, "Number(pm.variables.get('i')) < 5")}
                </div>
                <div class="nef-field">
                    <label>Update <span class="nef-hint-text">(runs after each body)</span></label>
                    ${ta('nef-for-update', update, 3, "pm.variables.set('i', Number(pm.variables.get('i')) + 1);")}
                </div>
                <div class="nef-field">
                    <label>Max Iterations</label>
                    ${inp('nef-max-iter', node.maxIterations ?? 100, '', 'number')}
                </div>
                <p class="nef-info">Add loop <strong>body</strong> nodes in the flow tree.</p>`;
            break;
        }
        case 'while': {
            extra = `
                <div class="nef-field">
                    <label>Loop While <span class="nef-hint-text">(JS expression, continues while truthy)</span></label>
                    ${inp('nef-while', node.while, "pm.variables.get('retry') === 'true'")}
                </div>
                <div class="nef-field">
                    <label>Max Iterations</label>
                    ${inp('nef-max-iter', node.maxIterations ?? 100, '', 'number')}
                </div>
                <p class="nef-info">Add loop <strong>body</strong> nodes in the flow tree.</p>`;
            break;
        }
        case 'switch': {
            extra = `
                <div class="nef-field">
                    <label>Switch Expression <span class="nef-hint-text">(JS expression evaluated once)</span></label>
                    ${inp('nef-switch-expr', node.expression, "pm.variables.get('status')")}
                </div>
                <p class="nef-info">Manage <strong>cases</strong> and <strong>default</strong> in the flow tree using <strong>+ Add Case</strong> and <strong>+ Add Default</strong>.</p>`;
            break;
        }
        case 'block': {
            extra = `<p class="nef-info">Group node – add children in the flow tree.</p>`;
            break;
        }
        case 'request': {
            const req = node.request || {};
            extra = `
                <p class="nef-info">Request nodes reference collection requests.
                Use "+ Add Node" and choose <strong>Request</strong> in the Flow panel.</p>
                <div class="nef-field">
                    <button type="button" id="nef-open-suite-request-editor" class="btn primary">
                        Open Request Tester Editor
                    </button>
                </div>
                <div class="nef-field"><label>Collection</label>
                    <input type="text" value="${v(req.collectionId)}" readonly class="readonly-field">
                </div>
                <div class="nef-field"><label>Request ID</label>
                    <input type="text" value="${v(req.requestId)}" readonly class="readonly-field">
                </div>
                <div class="nef-field"><label>Name</label>
                    <input type="text" value="${v(req.name)}" readonly class="readonly-field">
                </div>`;
            break;
        }
    }

    return common + extra;
}

// ─── Called from outside: sync nodes state into the editor ──────────────────

/**
 * Migrate legacy suite.requests to suite.nodes (backward compatibility)
 * If suite.nodes is empty, convert suite.requests array to request nodes
 */
function _migrateRequestsToNodes() {
    if (!state.suite) return;
    
    // If nodes already exist, no migration needed
    if (state.suite.nodes && state.suite.nodes.length > 0) {
        return;
    }
    
    // If no requests, nothing to migrate
    if (!state.suite.requests || state.suite.requests.length === 0) {
        state.suite.nodes = [];
        return;
    }
    
    // Convert legacy requests to request nodes
    state.suite.nodes = state.suite.requests.map(req => ({
        type: 'request',
        name: req.name,
        request: {
            slug: req.slug,
            collectionId: req.collectionId,
            requestId: req.requestId,
            name: req.name,
            collectionName: req.collectionName,
            method: req.method,
            folderPath: req.folderPath || '',
            enabled: req.enabled !== false
        },
        enabled: req.enabled !== false
    }));
}

function _hydrateNodeSlugsFromRequests() {
    if (!state.suite?.nodes || !state.suite?.requests?.length) return;

    const visit = (nodes) => {
        for (const node of nodes) {
            if (node?.type === 'request' && node.request) {
                const found = state.suite.requests.find(r =>
                    r.collectionId === node.request.collectionId && r.requestId === node.request.requestId
                );
                if (found?.slug && !node.request.slug) {
                    node.request.slug = found.slug;
                }
            }
            if (Array.isArray(node?.nodes)) visit(node.nodes);
            if (Array.isArray(node?.then)) visit(node.then);
            if (Array.isArray(node?.elseif)) {
                for (const branch of node.elseif) {
                    if (Array.isArray(branch?.nodes)) visit(branch.nodes);
                }
            }
            if (Array.isArray(node?.else)) visit(node.else);
            if (Array.isArray(node?.default)) visit(node.default);
            if (Array.isArray(node?.cases)) {
                for (const c of node.cases) {
                    if (Array.isArray(c?.nodes)) visit(c.nodes);
                }
            }
        }
    };

    visit(state.suite.nodes);
}

export function applyIncomingFlowNodes(nodes) {
    if (!state.suite) return;
    
    // If no nodes provided, try to migrate from legacy requests
    if (!nodes || nodes.length === 0) {
        _migrateRequestsToNodes();
    } else {
        state.suite.nodes = nodes;
    }

    _hydrateNodeSlugsFromRequests();

    // Flow view is the only mode now; always render after applying nodes.
    renderFlowNodes();
}
