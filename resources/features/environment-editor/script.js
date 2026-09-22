/**
 * Environment Editor - Webview Script
 * Manages environment configuration UI
 */

// VS Code API
const vscode = acquireVsCodeApi();

// State
let state = {
    sharedConfig: null,
    localConfig: null,
    selectedEnvironment: null,
    hasChanges: false,
    // Map of envName -> string[] of secret variable key names
    secretVariablesByEnv: {},
    // Map of envName -> { key: value } of script-set session overrides ("Current Values")
    sessionOverridesByEnv: {}
};

// DOM Elements
const elements = {
    envNameDisplay: document.getElementById('env-name-display'),
    envVariables: document.getElementById('env-variables'),
    envLocalVariables: document.getElementById('env-local-variables'),
    addEnvVarBtn: document.getElementById('add-env-var-btn'),
    addLocalVarBtn: document.getElementById('add-local-var-btn'),
    duplicateEnvBtn: document.getElementById('duplicate-env-btn'),
    deleteEnvBtn: document.getElementById('delete-env-btn'),
    resetOverridesBtn: document.getElementById('reset-overrides-btn'),
    globalVariables: document.getElementById('global-variables'),
    globalLocalVariables: document.getElementById('global-local-variables'),
    addGlobalVarBtn: document.getElementById('add-global-var-btn'),
    addGlobalLocalVarBtn: document.getElementById('add-global-local-var-btn'),
    defaultHeaders: document.getElementById('default-headers'),
    addDefaultHeaderBtn: document.getElementById('add-default-header-btn'),
    openEnvBtn: document.getElementById('open-env-btn'),
    openEnvLocalBtn: document.getElementById('open-env-local-btn'),
    openSharedBtn: document.getElementById('open-shared-btn'),
    openLocalBtn: document.getElementById('open-local-btn'),
    saveBtn: document.getElementById('save-btn'),
    footerStatus: document.getElementById('footer-status')
};

// Event Listeners

elements.duplicateEnvBtn.addEventListener('click', () => {
    if (state.selectedEnvironment) {
        vscode.postMessage({ type: 'duplicateEnvironment', environmentName: state.selectedEnvironment });
    }
});

elements.deleteEnvBtn.addEventListener('click', () => {
    if (state.selectedEnvironment) {
        vscode.postMessage({ type: 'deleteEnvironment', environmentName: state.selectedEnvironment });
    }
});

elements.resetOverridesBtn.addEventListener('click', () => {
    if (state.selectedEnvironment) {
        vscode.postMessage({ type: 'resetEnvironmentOverrides', environmentName: state.selectedEnvironment });
    }
});

elements.addEnvVarBtn.addEventListener('click', () => addVariableRow(elements.envVariables, '', '', true, false, false, true));
elements.addLocalVarBtn.addEventListener('click', () => addVariableRow(elements.envLocalVariables, '', '', true, true));
elements.addGlobalVarBtn.addEventListener('click', () => addVariableRow(elements.globalVariables, '', '', true));
elements.addGlobalLocalVarBtn.addEventListener('click', () => addVariableRow(elements.globalLocalVariables, '', '', true, true));
elements.addDefaultHeaderBtn.addEventListener('click', () => addVariableRow(elements.defaultHeaders, '', '', true));

elements.openEnvBtn.addEventListener('click', () => {
    if (state.selectedEnvironment) {
        vscode.postMessage({ type: 'openConfigFile', fileType: 'env', environmentName: state.selectedEnvironment });
    }
});

elements.openEnvLocalBtn.addEventListener('click', () => {
    if (state.selectedEnvironment) {
        vscode.postMessage({ type: 'openConfigFile', fileType: 'envLocal', environmentName: state.selectedEnvironment });
    }
});

elements.openSharedBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'openConfigFile', fileType: 'shared' });
});

elements.openLocalBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'openConfigFile', fileType: 'local' });
});

elements.saveBtn.addEventListener('click', saveAllChanges);

/**
 * Add a variable/header row to a container.
 * @param {boolean} isSecret - true when the value lives in SecretStorage (shown masked)
 * @param {boolean} showLockBtn - true only for env-scoped shared variable rows
 * @param {boolean} showRevertBtn - true when the row shows a script-set session
 *   override ("Current Value") that differs from the file value. Reverting
 *   drops the override; the row is excluded from file saves either way.
 */
function addVariableRow(container, key, value, canRemove = true, isLocal = false, isSecret = false, showLockBtn = false, showRevertBtn = false) {
    const row = document.createElement('div');
    row.className = 'variable-row' + (isSecret ? ' secret-row' : '') + (showRevertBtn ? ' overridden-row' : '');
    row.dataset.isLocal = isLocal;
    row.dataset.isSecret = isSecret;
    row.dataset.isOverridden = showRevertBtn;

    const lockBtn = showLockBtn
        ? `<button class="icon-btn lock-btn ${isSecret ? 'locked' : ''}" title="${isSecret ? 'Stored in OS keychain — click to move back to plaintext' : 'Click to store in OS keychain (SecretStorage)'}">🔒</button>`
        : '';
    const revertBtn = showRevertBtn
        ? `<button class="icon-btn revert-btn" title="Set by script (current value) — click to revert to the file value">↩</button>`
        : '';
    const valueTitle = showRevertBtn ? ' title="Set by script (current value) — revert first to edit the file value"' : '';
    const valueInput = isSecret
        ? `<input type="password" class="value secret-value" placeholder="Stored in keychain" value="${escapeHtml(value)}">`
        : `<input type="text" class="value" placeholder="${isLocal ? 'Local value (not committed)' : 'Value'}" value="${escapeHtml(value)}"${valueTitle}${showRevertBtn ? ' readonly' : ''}>`;

    row.innerHTML = `
        <input type="text" class="key" placeholder="Variable name" value="${escapeHtml(key)}">
        ${valueInput}
        ${lockBtn}
        ${revertBtn}
        ${canRemove ? '<button class="icon-btn remove-btn" title="Remove">×</button>' : ''}
    `;

    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => markAsChanged());
    });

    const removeBtn = row.querySelector('.remove-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            if (row.dataset.isOverridden === 'true') {
                // Overridden rows: × reverts the session override (the file
                // key must survive) — same as the ↩ button
                const currentKey = row.querySelector('.key').value.trim();
                if (currentKey && state.selectedEnvironment) {
                    vscode.postMessage({
                        type: 'revertEnvironmentVariable',
                        environmentName: state.selectedEnvironment,
                        key: currentKey
                    });
                }
                return;
            }
            if (row.dataset.isSecret === 'true') {
                // Secret rows: delete from keychain immediately; DOM removal happens via secretDeleted response
                const currentKey = row.querySelector('.key').value.trim();
                if (currentKey) {
                    vscode.postMessage({
                        type: 'deleteSecretVariable',
                        environmentName: state.selectedEnvironment,
                        key: currentKey
                    });
                } else {
                    // Key was never saved — just remove the row
                    row.remove();
                }
            } else {
                row.remove();
                markAsChanged();
            }
        });
    }

    // Revert toggle (session override → file value)
    const revertBtnEl = row.querySelector('.revert-btn');
    if (revertBtnEl) {
        revertBtnEl.addEventListener('click', () => {
            const currentKey = row.querySelector('.key').value.trim();
            if (!currentKey || !state.selectedEnvironment) return;
            vscode.postMessage({
                type: 'revertEnvironmentVariable',
                environmentName: state.selectedEnvironment,
                key: currentKey
            });
        });
    }

    // Lock/unlock toggle
    const lockBtnEl = row.querySelector('.lock-btn');
    if (lockBtnEl) {
        lockBtnEl.addEventListener('click', () => {
            const currentKey = row.querySelector('.key').value.trim();
            const currentValue = row.querySelector('.value').value;
            const currentlySecret = row.dataset.isSecret === 'true';
            if (!currentKey) return;

            if (currentlySecret) {
                // Demote: move from SecretStorage back to plaintext
                vscode.postMessage({
                    type: 'demoteFromSecret',
                    environmentName: state.selectedEnvironment,
                    key: currentKey
                });
            } else {
                // Promote: move from plaintext to SecretStorage
                vscode.postMessage({
                    type: 'promoteToSecret',
                    environmentName: state.selectedEnvironment,
                    key: currentKey,
                    value: currentValue
                });
            }
        });
    }

    container.appendChild(row);
}

/**
 * Get variables from a container
 */
function getVariablesFromContainer(container) {
    const variables = {};
    container.querySelectorAll('.variable-row').forEach(row => {
        const key = row.querySelector('.key').value.trim();
        const value = row.querySelector('.value').value;
        if (key) {
            variables[key] = value;
        }
    });
    return variables;
}

/**
 * Mark state as having unsaved changes
 */
function markAsChanged() {
    state.hasChanges = true;
    elements.footerStatus.textContent = '● Unsaved changes';
}

/**
 * Select an environment to edit
 */
function selectEnvironment(name) {
    state.selectedEnvironment = name;
    
    // Show/hide environment-specific buttons based on selection
    if (name) {
        elements.openEnvBtn.style.display = 'inline-flex';
        elements.openEnvLocalBtn.style.display = 'inline-flex';
    } else {
        elements.openEnvBtn.style.display = 'none';
        elements.openEnvLocalBtn.style.display = 'none';
    }
    
    renderEnvironmentDetails();
}

/**
 * Render the selected environment's details
 */
function renderEnvironmentDetails() {
    // environments is an object, access by key
    const env = state.sharedConfig?.environments?.[state.selectedEnvironment];

    if (!env) {
        elements.envNameDisplay.textContent = 'Select an environment';
        elements.envVariables.innerHTML = '';
        elements.envLocalVariables.innerHTML = '';
        return;
    }

    elements.envNameDisplay.textContent = state.selectedEnvironment;

    const secretKeys = state.secretVariablesByEnv[state.selectedEnvironment] || [];

    // Session overrides ("Current Values" from pm.environment.set) for this env
    const overrides = state.sessionOverridesByEnv[state.selectedEnvironment] || {};

    // Render shared variables (plaintext) — overridden rows show the current
    // value with a revert button instead of the file value
    elements.envVariables.innerHTML = '';
    const renderedKeys = new Set();
    if (env.variables) {
        Object.entries(env.variables).forEach(([key, value]) => {
            const overridden = Object.prototype.hasOwnProperty.call(overrides, key);
            addVariableRow(elements.envVariables, key, overridden ? overrides[key] : value, true, false, false, true, overridden);
            renderedKeys.add(key);
        });
    }
    // Overrides for keys with no file entry (script-added) render as session-only rows
    Object.entries(overrides).forEach(([key, value]) => {
        if (!renderedKeys.has(key) && !secretKeys.includes(key)) {
            addVariableRow(elements.envVariables, key, value, true, false, false, false, true);
        }
    });
    // Render secret variable placeholders (value comes from keychain)
    secretKeys.forEach(key => {
        addVariableRow(elements.envVariables, key, '', true, false, true, true);
    });

    // Render local variables
    elements.envLocalVariables.innerHTML = '';
    // localConfig.credentials is keyed by environment name
    const localEnv = state.localConfig?.credentials?.[state.selectedEnvironment];
    if (localEnv?.variables) {
        Object.entries(localEnv.variables).forEach(([key, value]) => {
            addVariableRow(elements.envLocalVariables, key, value, true, true);
        });
    }
}

/**
 * Render global variables
 */
function renderGlobalVariables() {
    // Shared global variables
    elements.globalVariables.innerHTML = '';
    if (state.sharedConfig?.globalVariables) {
        Object.entries(state.sharedConfig.globalVariables).forEach(([key, value]) => {
            addVariableRow(elements.globalVariables, key, value, true);
        });
    }

    // Local global variables (uses 'variables' not 'globalVariables')
    elements.globalLocalVariables.innerHTML = '';
    if (state.localConfig?.variables) {
        Object.entries(state.localConfig.variables).forEach(([key, value]) => {
            addVariableRow(elements.globalLocalVariables, key, value, true, true);
        });
    }
}

/**
 * Render default headers
 */
function renderDefaultHeaders() {
    elements.defaultHeaders.innerHTML = '';
    if (state.sharedConfig?.defaultHeaders) {
        Object.entries(state.sharedConfig.defaultHeaders).forEach(([key, value]) => {
            addVariableRow(elements.defaultHeaders, key, value, true);
        });
    }
}

/**
 * Save all changes
 */
async function saveAllChanges() {
    // Collect shared config changes
    const sharedConfig = {
        environments: collectEnvironments(),
        globalVariables: getVariablesFromContainer(elements.globalVariables),
        defaultHeaders: getVariablesFromContainer(elements.defaultHeaders)
    };

    // Collect local config changes (uses credentials structure)
    const localConfig = {
        credentials: collectLocalEnvironments(),
        variables: getVariablesFromContainer(elements.globalLocalVariables)
    };

    // Collect secret variable values typed into the UI (only rows with a non-empty value)
    // Secret values are never included in sharedConfig — they go to SecretStorage via the host
    if (state.selectedEnvironment) {
        const secrets = {};
        elements.envVariables.querySelectorAll('.variable-row[data-is-secret="true"]').forEach(row => {
            const key = row.querySelector('.key').value.trim();
            const value = row.querySelector('.value').value;
            if (key && value) {
                secrets[key] = value;
            }
        });
        if (Object.keys(secrets).length > 0) {
            vscode.postMessage({ type: 'saveSecretVariables', environmentName: state.selectedEnvironment, secrets });
        }
    }

    // Save both
    vscode.postMessage({ type: 'saveSharedConfig', config: sharedConfig });
    vscode.postMessage({ type: 'saveLocalConfig', config: localConfig });
}

/**
 * Collect environments from UI
 */
function collectEnvironments() {
    if (!state.sharedConfig?.environments) return {};

    // Build a new environments object with updated values for selected env
    const result = {};
    Object.entries(state.sharedConfig.environments).forEach(([name, env]) => {
        if (name === state.selectedEnvironment) {
            // Collect only non-secret, non-overridden rows — secret rows are saved
            // separately via SecretStorage, and overridden rows show session
            // ("Current") values that must never leak into the committed file
            const secretKeys = state.secretVariablesByEnv[name] || [];
            const plainVars = {};
            elements.envVariables.querySelectorAll('.variable-row').forEach(row => {
                if (row.dataset.isSecret === 'true' || row.dataset.isOverridden === 'true') return;
                const key = row.querySelector('.key').value.trim();
                const value = row.querySelector('.value').value;
                if (key && !secretKeys.includes(key)) plainVars[key] = value;
            });
            result[name] = {
                description: env.description,
                requiresConfirmation: env.requiresConfirmation,
                variables: plainVars,
                // Preserve secretVariables list; updated by promoteToSecret/demoteFromSecret
                secretVariables: env.secretVariables
            };
        } else {
            result[name] = env;
        }
    });
    return result;
}

/**
 * Collect local environments from UI (uses credentials structure)
 */
function collectLocalEnvironments() {
    // Start with existing credentials
    const credentials = { ...(state.localConfig?.credentials || {}) };

    if (state.selectedEnvironment) {
        const localVars = getVariablesFromContainer(elements.envLocalVariables);
        if (Object.keys(localVars).length > 0) {
            // Store local variables under credentials for the selected environment
            credentials[state.selectedEnvironment] = {
                ...(credentials[state.selectedEnvironment] || {}),
                variables: localVars
            };
        } else {
            // Remove if no local variables
            delete credentials[state.selectedEnvironment];
        }
    }

    return credentials;
}

/**
 * Escape HTML, including quotes so values are safe inside `value="..."` attributes
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Handle messages from extension
 */
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type) {
        case 'init':
            state.sharedConfig = message.data.sharedConfig;
            state.localConfig = message.data.localConfig;
            state.secretVariablesByEnv = message.data.secretVariablesByEnv || {};
            state.sessionOverridesByEnv = message.data.sessionOverridesByEnv || {};

            renderGlobalVariables();
            renderDefaultHeaders();

            // Select environment: use provided one, or first available
            const envNames = Object.keys(state.sharedConfig?.environments || {});
            const targetEnv = message.data.selectedEnvironment && envNames.includes(message.data.selectedEnvironment)
                ? message.data.selectedEnvironment
                : envNames[0];

            if (targetEnv) {
                selectEnvironment(targetEnv);
            }
            break;

        case 'secretDeleted':
            // Remove the deleted key from local state and re-render
            if (message.environmentName && message.key) {
                const envSecrets = state.secretVariablesByEnv[message.environmentName] || [];
                state.secretVariablesByEnv[message.environmentName] = envSecrets.filter(k => k !== message.key);
                if (message.environmentName === state.selectedEnvironment) {
                    renderEnvironmentDetails();
                }
            }
            elements.footerStatus.textContent = `🔓 Secret '${message.key}' removed from keychain`;
            setTimeout(() => { if (!state.hasChanges) elements.footerStatus.textContent = ''; }, 3000);
            break;

        case 'saveSuccess':
            state.hasChanges = false;
            elements.footerStatus.textContent = `✓ ${message.configType} saved`;
            setTimeout(() => {
                if (!state.hasChanges) {
                    elements.footerStatus.textContent = '';
                }
            }, 3000);
            if (message.configType === 'secrets') {
                // Clear typed values from secret inputs — values are now in the keychain
                elements.envVariables.querySelectorAll('.variable-row[data-is-secret="true"] .value').forEach(input => {
                    input.value = '';
                });
            } else if (message.configType === 'promote' || message.configType === 'demote') {
                // Re-request full state so secretVariablesByEnv reflects the change
                vscode.postMessage({ type: 'ready' });
            }
            break;

        case 'saveError':
            elements.footerStatus.textContent = `✗ Error saving ${message.configType}: ${message.error}`;
            break;
    }
});

// Request initial data
vscode.postMessage({ type: 'ready' });
