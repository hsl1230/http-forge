/**
 * Suggest Assertions Module
 * Generates pm.test() snippet suggestions from a live HTTP response.
 * Pure client-side — no round-trip to the extension required.
 */

/**
 * Generate pm.test() assertion suggestions based on the observed response.
 * @param {number|string} status - HTTP status code (e.g. 200)
 * @param {string} [bodyText] - Raw response body string
 * @param {string} [contentType] - Content-Type header value
 * @returns {Array<{snippet: string, rationale: string}>}
 */
function generateAssertionSuggestions(status, bodyText, contentType) {
    const suggestions = [];
    const statusCode = Number(status);

    // 1. Status code assertion
    if (statusCode) {
        suggestions.push({
            snippet:
                `pm.test("Status code is ${statusCode}", function () {\n` +
                `  pm.response.to.have.status(${statusCode});\n` +
                `});`,
            rationale: `Observed status ${statusCode}.`
        });
    }

    // 2. Response time gate (CI-friendly)
    suggestions.push({
        snippet:
            `pm.test("Response time is under 2000ms", function () {\n` +
            `  pm.expect(pm.response.responseTime).to.be.below(2000);\n` +
            `});`,
        rationale: `Good practice to gate on response time in CI.`
    });

    // 3. JSON-specific assertions
    const isJson = (contentType && contentType.includes('application/json')) ||
        (bodyText && bodyText.trimStart().startsWith('{')) ||
        (bodyText && bodyText.trimStart().startsWith('['));

    if (isJson && bodyText) {
        try {
            const parsed = JSON.parse(bodyText);

            suggestions.push({
                snippet:
                    `pm.test("Content-Type is application/json", function () {\n` +
                    `  pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");\n` +
                    `});`,
                rationale: `Response body was valid JSON.`
            });

            // Field presence assertions for object responses
            const obj = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : parsed;
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                const fields = Object.keys(obj).slice(0, 4);
                const accessor = Array.isArray(parsed) ? `body[0]` : `body`;
                for (const field of fields) {
                    suggestions.push({
                        snippet:
                            `pm.test("Response has field '${field}'", function () {\n` +
                            `  const body = pm.response.json();\n` +
                            `  pm.expect(${accessor}).to.have.property("${field}");\n` +
                            `});`,
                        rationale: `Field "${field}" was present in the response.`
                    });
                }
            }

            // Array assertions
            if (Array.isArray(parsed)) {
                suggestions.push({
                    snippet:
                        `pm.test("Response is a non-empty array", function () {\n` +
                        `  const body = pm.response.json();\n` +
                        `  pm.expect(body).to.be.an("array").that.is.not.empty;\n` +
                        `});`,
                    rationale: `Response was a JSON array.`
                });
            }
        } catch {
            suggestions.push({
                snippet:
                    `pm.test("Response body is not empty", function () {\n` +
                    `  pm.expect(pm.response.text()).to.not.be.empty;\n` +
                    `});`,
                rationale: `Non-JSON response body.`
            });
        }
    } else if (bodyText && bodyText.trim().length > 0) {
        suggestions.push({
            snippet:
                `pm.test("Response body is not empty", function () {\n` +
                `  pm.expect(pm.response.text()).to.not.be.empty;\n` +
                `});`,
            rationale: `Non-empty response body observed.`
        });
    }

    return suggestions;
}

// ES Module export
export { generateAssertionSuggestions };
