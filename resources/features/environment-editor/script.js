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
    hasChanges: false
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

elements.addEnvVarBtn.addEventListener('click', () => addVariableRow(elements.envVariables, '', '', true));
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
 * Add a variable/header row to a container
 */
function addVariableRow(container, key, value, canRemove = true, isLocal = false) {
    const row = document.createElement('div');
    row.className = 'variable-row';
    row.dataset.isLocal = isLocal;

    row.innerHTML = `
        <input type="text" class="key" placeholder="Variable name" value="${escapeHtml(key)}">
        <input type="text" class="value" placeholder="${isLocal ? 'Secret value (not committed)' : 'Value'}" value="${escapeHtml(value)}">
        ${canRemove ? '<button class="icon-btn remove-btn" title="Remove">×</button>' : ''}
    `;

    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => markAsChanged());
    });

    const removeBtn = row.querySelector('.remove-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            row.remove();
            markAsChanged();
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

    // Render shared variables
    elements.envVariables.innerHTML = '';
    if (env.variables) {
        Object.entries(env.variables).forEach(([key, value]) => {
            addVariableRow(elements.envVariables, key, value, true);
        });
    }

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
            result[name] = {
                description: env.description,
                requiresConfirmation: env.requiresConfirmation,
                variables: getVariablesFromContainer(elements.envVariables)
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
 * Escape HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

        case 'saveSuccess':
            state.hasChanges = false;
            elements.footerStatus.textContent = `✓ ${message.configType} config saved`;
            setTimeout(() => {
                if (!state.hasChanges) {
                    elements.footerStatus.textContent = '';
                }
            }, 3000);
            break;

        case 'saveError':
            elements.footerStatus.textContent = `✗ Error saving ${message.configType}: ${message.error}`;
            break;
    }
});

// Request initial data
vscode.postMessage({ type: 'ready' });
