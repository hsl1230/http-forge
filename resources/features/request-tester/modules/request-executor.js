/**
 * Request Executor Module
 * Single Responsibility: Orchestrate the request/response flow
 * 
 * Shared between endpoint-tester and http-api-tester
 */

/**
 * Create a request executor instance
 * @param {Object} options
 * @param {Object} options.vscode - VS Code API
 * @param {Object} options.state - Application state
 * @param {Object} options.requestBuilder - Request builder instance
 * @param {Object} options.responseHandler - Response handler instance
 * @param {Object} options.testResultsManager - Test results manager instance
 * @param {Function} [options.onBeforeSend] - Callback before sending (for UI updates)
 * @param {Function} [options.onAfterResponse] - Callback after response (for UI updates)
 * @param {Function} [options.onError] - Callback on error
 * @returns {Object} Request executor interface
 */
function createRequestExecutor({
    vscode,
    state,
    requestBuilder,
    responseHandler,
    testResultsManager,
    onBeforeSend,
    onAfterResponse,
    onError
}) {
    let isRequestInProgress = false;

    /**
     * Execute a request with the full flow
     * @param {Object} [overrides] - Optional request data overrides
     * @returns {Promise<void>}
     */
    async function execute(overrides = {}) {
        // Handle cancel if request in progress
        if (isRequestInProgress) {
            cancel();
            return;
        }

        isRequestInProgress = true;

        // Callback for UI updates before sending
        if (onBeforeSend) {
            onBeforeSend();
        }

        // Clear previous outputs
        testResultsManager.clear();

        // Build request
        let request = requestBuilder.buildRequest();

        // Apply any overrides
        if (overrides.method) request.method = overrides.method;
        if (overrides.url) request.url = overrides.url;
        if (overrides.headers) request.headers = { ...request.headers, ...overrides.headers };
        if (overrides.body !== undefined) request.body = overrides.body;

        // Note: Script execution now happens on the backend (extension side)
        // Pre-request and post-response scripts are executed by ScriptExecutor in request-execution-handler
        // This ensures better security (vm2 sandbox) and consistency with collection runner

        // Note: Variable resolution (both {{variable}} and {{$dynamicVariable}}) happens on the backend
        // Webview sends raw request with patterns unchanged; backend's VariableReplacer resolves them
        // This ensures security (all logic in sandbox) and consistency across all execution paths

        // Send request to extension
        vscode.postMessage({
            command: 'sendRequest',
            type: 'sendRequest',
            request: request
        });
    }

    /**
     * Handle response from extension
     * @param {Object} response - Response object
     */
    async function handleResponse(response, scriptResults = {}) {
        isRequestInProgress = false;

        // Callback for UI updates after response
        if (onAfterResponse) {
            onAfterResponse();
        }

        // Handle error response
        if (response.error) {
            if (onError) {
                onError(response.error);
            }
            return;
        }

        // Console output is now logged directly to VS Code Output channel
        // No need to display in webview

        // Display test results from backend script execution
        if (response.testResults && response.testResults.length > 0) {
            response.testResults.forEach(result => {
                testResultsManager.addResult(result);
            });
        }

        // Display response using response handler - pass scriptResults with test results
        await responseHandler.handleResponse(response, scriptResults);
    }

    /**
     * Handle error
     * @param {string} message - Error message
     */
    function handleError(message) {
        isRequestInProgress = false;

        if (onAfterResponse) {
            onAfterResponse();
        }

        if (onError) {
            onError(message);
        }
    }

    /**
     * Cancel the current request
     */
    function cancel() {
        if (isRequestInProgress) {
            vscode.postMessage({ type: 'cancelRequest', command: 'cancelRequest' });
            isRequestInProgress = false;

            if (onAfterResponse) {
                onAfterResponse();
            }
        }
    }

    /**
     * Check if a request is in progress
     * @returns {boolean}
     */
    function isInProgress() {
        return isRequestInProgress;
    }

    /**
     * Reset the executor state
     */
    function reset() {
        isRequestInProgress = false;
    }

    return {
        execute,
        handleResponse,
        handleError,
        cancel,
        isInProgress,
        reset
    };
}

// ES Module export
export { createRequestExecutor };

