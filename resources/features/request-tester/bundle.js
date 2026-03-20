"use strict";
(() => {
  // resources/features/request-tester/modules/elements.js
  function initElements() {
    return {
      // Request section - Unified (single set of elements)
      methodSelect: document.getElementById("method-select"),
      requestPathInput: document.getElementById("request-path-input"),
      btnSave: document.getElementById("btn-save"),
      // Common request elements
      urlPreview: document.getElementById("url-preview"),
      sendBtn: document.getElementById("send-btn"),
      loadingOverlay: document.getElementById("loading-overlay"),
      errorMessage: document.getElementById("error-message"),
      // Environment
      envSelector: document.getElementById("env-selector"),
      envLoading: document.getElementById("env-loading"),
      // Tabs (request tabs in .tab-bar)
      tabButtons: document.querySelectorAll(".tab-bar .tab"),
      tabPanels: document.querySelectorAll(".tab-content .tab-panel"),
      // Parameters
      pathParams: document.getElementById("path-params"),
      queryParams: document.getElementById("query-params"),
      addQueryBtn: document.getElementById("add-query-param"),
      // Headers
      headersList: document.getElementById("headers-list"),
      addHeaderBtn: document.getElementById("add-header"),
      // Body - Type selector and panels
      bodyEditor: document.getElementById("body-editor"),
      bodyTypeRadios: document.querySelectorAll('input[name="body-type"]'),
      rawFormatSelector: document.getElementById("raw-format-selector"),
      rawFormatSelect: document.getElementById("raw-format"),
      graphqlToolbar: document.getElementById("graphql-toolbar"),
      bodyNone: document.getElementById("body-none"),
      bodyFormData: document.getElementById("body-form-data"),
      bodyUrlencoded: document.getElementById("body-urlencoded"),
      bodyRaw: document.getElementById("body-raw"),
      bodyBinary: document.getElementById("body-binary"),
      bodyGraphql: document.getElementById("body-graphql"),
      formDataList: document.getElementById("form-data-list"),
      addFormDataBtn: document.getElementById("add-form-data"),
      urlencodedList: document.getElementById("urlencoded-list"),
      addUrlencodedBtn: document.getElementById("add-urlencoded"),
      binaryFileInput: document.getElementById("binary-file-input"),
      selectFileBtn: document.getElementById("select-file-btn"),
      selectedFileName: document.getElementById("selected-file-name"),
      graphqlQueryEditor: document.getElementById("graphql-query-editor"),
      graphqlVariablesEditor: document.getElementById("graphql-variables-editor"),
      // Auth
      authType: document.getElementById("auth-type"),
      bearerTokenSection: document.getElementById("bearer-token-section"),
      bearerToken: document.getElementById("bearer-token"),
      basicAuthSection: document.getElementById("basic-auth-section"),
      basicUsername: document.getElementById("basic-username"),
      basicPassword: document.getElementById("basic-password"),
      apiKeySection: document.getElementById("apikey-section"),
      apiKeyKey: document.getElementById("apikey-key"),
      apiKeyValue: document.getElementById("apikey-value"),
      apiKeyIn: document.getElementById("apikey-in"),
      // OAuth2
      oauth2Section: document.getElementById("oauth2-section"),
      oauth2GrantType: document.getElementById("oauth2-grant-type"),
      oauth2AuthUrl: document.getElementById("oauth2-auth-url"),
      oauth2CallbackUrl: document.getElementById("oauth2-callback-url"),
      oauth2Pkce: document.getElementById("oauth2-pkce"),
      oauth2AuthcodeFields: document.getElementById("oauth2-authcode-fields"),
      oauth2TokenUrl: document.getElementById("oauth2-token-url"),
      oauth2ClientId: document.getElementById("oauth2-client-id"),
      oauth2ClientSecret: document.getElementById("oauth2-client-secret"),
      oauth2Scope: document.getElementById("oauth2-scope"),
      oauth2PasswordFields: document.getElementById("oauth2-password-fields"),
      oauth2Username: document.getElementById("oauth2-username"),
      oauth2Password: document.getElementById("oauth2-password"),
      oauth2Audience: document.getElementById("oauth2-audience"),
      oauth2TokenPrefix: document.getElementById("oauth2-token-prefix"),
      oauth2TokenField: document.getElementById("oauth2-token-field"),
      oauth2ClientAuth: document.getElementById("oauth2-client-auth"),
      oauth2GetToken: document.getElementById("oauth2-get-token"),
      oauth2RefreshToken: document.getElementById("oauth2-refresh-token"),
      oauth2ClearToken: document.getElementById("oauth2-clear-token"),
      oauth2TokenInfo: document.getElementById("oauth2-token-info"),
      oauth2TokenPreview: document.getElementById("oauth2-token-preview"),
      oauth2TokenExpires: document.getElementById("oauth2-token-expires"),
      oauth2TokenError: document.getElementById("oauth2-token-error"),
      // Settings
      settingTimeout: document.getElementById("setting-timeout"),
      settingFollowRedirects: document.getElementById("setting-follow-redirects"),
      settingOriginalMethod: document.getElementById("setting-original-method"),
      settingAuthHeader: document.getElementById("setting-auth-header"),
      settingMaxRedirects: document.getElementById("setting-max-redirects"),
      settingStrictSSL: document.getElementById("setting-strict-ssl"),
      settingDecompress: document.getElementById("setting-decompress"),
      settingIncludeCookies: document.getElementById("setting-include-cookies"),
      cookiePreview: document.getElementById("cookie-preview"),
      cookiePreviewList: document.getElementById("cookie-preview-list"),
      clearAllCookiesBtn: document.getElementById("clear-all-cookies-btn"),
      redirectOptions: document.getElementById("redirect-options"),
      saveResponseCheckbox: document.getElementById("save-response-checkbox"),
      // Scripts
      preRequestScriptEditor: document.getElementById("pre-request-editor"),
      postResponseScriptEditor: document.getElementById("post-response-editor"),
      // Response section
      responseStatus: document.getElementById("response-status"),
      responseTime: document.getElementById("response-time"),
      responseBodyEditor: document.getElementById("response-body-editor"),
      responseBodyToolbar: document.getElementById("response-body-toolbar"),
      responseViewRawBtn: document.getElementById("response-view-raw"),
      responseViewPreviewBtn: document.getElementById("response-view-preview"),
      responseHtmlPreview: document.getElementById("response-html-preview"),
      responsePreviewIframe: document.getElementById("response-preview-iframe"),
      responseHeadersTable: document.querySelector("#response-headers-table tbody"),
      responseCookiesTable: document.querySelector("#response-cookies-table tbody"),
      responsePlaceholder: document.getElementById("response-placeholder"),
      responseTabButtons: document.querySelectorAll(".response-tabs .tab"),
      responseTabPanels: document.querySelectorAll(".response-content .response-panel"),
      // Test results (in response section)
      testResultsSummary: document.getElementById("test-results-summary"),
      testResultsList: document.getElementById("test-results-list"),
      testCount: document.getElementById("test-count"),
      clearTestsBtn: document.getElementById("clear-tests-btn"),
      // Visualizer (in response section)
      visualizeTabBtn: document.getElementById("visualize-tab-btn"),
      visualizerPlaceholder: document.getElementById("visualizer-placeholder"),
      visualizerIframe: document.getElementById("visualizer-iframe"),
      // Sent Request (in response section)
      sentRequestUrl: document.getElementById("sent-request-url"),
      sentRequestParamsTable: document.querySelector("#sent-request-params-table tbody"),
      sentRequestParamsSection: document.getElementById("sent-request-params-section"),
      sentRequestQueryTable: document.querySelector("#sent-request-query-table tbody"),
      sentRequestQuerySection: document.getElementById("sent-request-query-section"),
      sentRequestHeadersTable: document.querySelector("#sent-request-headers-table tbody"),
      sentRequestBody: document.getElementById("sent-request-body"),
      sentRequestBodySection: document.getElementById("sent-request-body-section"),
      sentRequestBodyType: document.getElementById("sent-request-body-type"),
      sentRequestPlaceholder: document.getElementById("sent-request-placeholder"),
      // History
      historyList: document.getElementById("history-list"),
      historyEnv: document.getElementById("history-env"),
      historySidebar: document.getElementById("history-sidebar"),
      sidebarToggle: document.getElementById("sidebar-toggle"),
      collapseSidebarBtn: document.getElementById("collapse-sidebar-btn"),
      expandSidebarBtn: document.getElementById("expand-sidebar-btn"),
      sidebarResizeHandle: document.getElementById("sidebar-resize-handle"),
      // Environment
      envSettingsBtn: document.getElementById("env-settings-btn"),
      // Layout
      requestSection: document.querySelector(".request-section"),
      responseSection: document.querySelector(".response-section"),
      mainContent: document.querySelector(".main-content"),
      resizeHandle: document.getElementById("resize-handle")
    };
  }

  // resources/features/request-tester/modules/state.js
  function createState() {
    return {
      /** Original request data received from backend */
      requestData: null,
      selectedEnvironment: "",
      /** Current request path/URL */
      requestPath: "",
      /** Base URL without query string (for two-way sync) */
      baseUrl: "",
      pathParams: {},
      /** @type {QueryParam[]} */
      queryParams: [],
      /**
       * Parallel metadata maps for OpenAPI extended fields.
       * Keyed by param/header name. Stores: type, required, description, format, enum, deprecated.
       * These are populated during initial load and re-attached when building save data.
       * @type {Object<string, Object>}
       */
      _headersMeta: {},
      /** @type {Object<string, Object>} */
      _queryMeta: {},
      /** @type {Object<string, Object>} */
      _paramsMeta: {},
      // Body state - enhanced to support multiple types like Postman
      body: "",
      bodyType: "none",
      // 'none', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary', 'graphql'
      rawFormat: "json",
      // 'json', 'text', 'xml', 'html', 'javascript'
      formData: [],
      // Array of {key, value, type, enabled} - type can be 'text' or 'file'
      urlEncodedData: [],
      // Array of {key, value, enabled}
      binaryFile: null,
      // File object for binary upload
      graphql: {
        query: "",
        variables: "",
        operationName: ""
      },
      authType: "inherit",
      bearerToken: "",
      basicAuth: { username: "", password: "" },
      apiKey: { key: "", value: "", in: "header" },
      oauth2: null,
      // OAuth2Config object or null
      activeHistoryEntryId: null,
      /** Readonly mode - method/URL are not editable */
      readonly: false,
      /** @type {RequestSettings} */
      settings: {
        timeout: 3e4,
        followRedirects: true,
        followOriginalMethod: false,
        followAuthHeader: false,
        maxRedirects: 10,
        strictSSL: true,
        decompress: true,
        includeCookies: true
      },
      /** @type {Scripts} */
      scripts: {
        preRequest: "",
        postResponse: ""
      },
      lastResponse: null,
      /** Sent request data in backend format - used for Sent Request tab display */
      lastSentRequest: null,
      resolvedEnvironment: null,
      /** Global variables from environments.json → globalVariables */
      globalVariables: {},
      /** Session variables from workspaceState (persisted) */
      sessionVariables: {},
      /** Collection variables from collection JSON → variables */
      collectionVariables: {},
      /** Collection ID for variable persistence */
      collectionId: null,
      /** Collection name for display */
      collectionName: null,
      /** Dirty state - tracks if there are unsaved changes */
      isDirty: false,
      /** Original request snapshot for comparison */
      originalRequest: null
    };
  }

  // resources/features/request-tester/modules/url-builder.js
  function buildPathFromPattern(pattern, params) {
    const paramRegex = /:(\w+)(?:\([^)]*\))?(\?)?/g;
    let result = pattern.replace(paramRegex, (match, paramName, isOptional) => {
      const value = params[paramName];
      if (value !== void 0 && value !== "") {
        return encodeURIComponent(value);
      }
      if (isOptional) {
        return "";
      }
      return `:${paramName}`;
    });
    result = result.replace(/\/+/g, "/");
    if (result.length > 1 && result.endsWith("/")) {
      result = result.slice(0, -1);
    }
    return result;
  }
  function buildQueryString(queryParams) {
    const params = new URLSearchParams();
    queryParams.forEach(({ key, value, enabled }) => {
      if (key && value && enabled) {
        params.append(key, value);
      }
    });
    return params.toString();
  }
  function buildUrlPreview(pattern, pathParams, queryParams) {
    let path = buildPathFromPattern(pattern, pathParams);
    const queryString = buildQueryString(queryParams);
    return queryString ? `${path}?${queryString}` : path;
  }

  // resources/features/request-tester/modules/utils.js
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString(void 0, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  function formatDuration(ms) {
    return ms.toLocaleString() + "ms";
  }
  function createCaseInsensitiveMap() {
    const map = /* @__PURE__ */ new Map();
    return {
      set(key, value) {
        const lowerKey = key.toLowerCase();
        map.set(lowerKey, { originalKey: key, value });
        return this;
      },
      has(key) {
        return map.has(key.toLowerCase());
      },
      get(key) {
        return map.get(key.toLowerCase())?.value;
      },
      delete(key) {
        return map.delete(key.toLowerCase());
      },
      keys() {
        return Array.from(map.values()).map((v) => v.originalKey);
      },
      forEach(callback) {
        map.forEach(({ originalKey, value }) => {
          callback(value, originalKey);
        });
      },
      size() {
        return map.size;
      }
    };
  }
  function isHtmlResponse(resp) {
    if (!resp) return false;
    const body = resp.body;
    const headers = resp.headers || {};
    if (!body) return false;
    const contentType = (headers["content-type"] || headers["Content-Type"] || headers["Content-type"] || "") + "";
    if (typeof contentType === "string" && contentType.toLowerCase().includes("html")) return true;
    if (typeof body === "string" && body.trim().startsWith("<")) return true;
    return false;
  }

  // resources/features/request-tester/modules/body-type-manager.js
  var BODY_TYPES = Object.freeze({
    NONE: "none",
    FORM_DATA: "form-data",
    URL_ENCODED: "x-www-form-urlencoded",
    RAW: "raw",
    BINARY: "binary",
    GRAPHQL: "graphql"
  });
  var RAW_FORMATS = Object.freeze({
    JSON: "json",
    TEXT: "text",
    XML: "xml",
    HTML: "html",
    JAVASCRIPT: "javascript"
  });
  var PANEL_MAP = Object.freeze({
    [BODY_TYPES.NONE]: "body-none",
    [BODY_TYPES.FORM_DATA]: "body-form-data",
    [BODY_TYPES.URL_ENCODED]: "body-urlencoded",
    [BODY_TYPES.RAW]: "body-raw",
    [BODY_TYPES.BINARY]: "body-binary",
    [BODY_TYPES.GRAPHQL]: "body-graphql"
  });
  function createBodyTypeManager({ state, elements, editorsManager, onTypeChange }) {
    function switchPanel(bodyType) {
      Object.values(PANEL_MAP).forEach((id) => {
        const panel = document.getElementById(id);
        if (panel) {
          panel.classList.remove("active");
          panel.classList.add("hidden");
        }
      });
      const targetPanel = document.getElementById(PANEL_MAP[bodyType]);
      if (targetPanel) {
        targetPanel.classList.remove("hidden");
        targetPanel.classList.add("active");
      }
      if (elements.rawFormatSelector) {
        elements.rawFormatSelector.classList.toggle("hidden", bodyType !== BODY_TYPES.RAW);
      }
      if (elements.graphqlToolbar) {
        elements.graphqlToolbar.classList.toggle("hidden", bodyType !== BODY_TYPES.GRAPHQL);
      }
      requestAnimationFrame(() => {
        if (bodyType === BODY_TYPES.RAW && editorsManager) {
          editorsManager.layout("body");
        }
        if (bodyType === BODY_TYPES.GRAPHQL && editorsManager) {
          editorsManager.layout("graphqlQuery");
          editorsManager.layout("graphqlVariables");
        }
      });
    }
    function setType(bodyType) {
      if (!Object.values(BODY_TYPES).includes(bodyType)) {
        console.warn(`[BodyTypeManager] Invalid body type: ${bodyType}`);
        bodyType = BODY_TYPES.NONE;
      }
      state.bodyType = bodyType;
      switchPanel(bodyType);
      elements.bodyTypeRadios?.forEach((radio) => {
        radio.checked = radio.value === bodyType;
      });
      if (onTypeChange) {
        onTypeChange(bodyType);
      }
    }
    function getType() {
      return state.bodyType || BODY_TYPES.NONE;
    }
    function setRawFormat(format) {
      if (!Object.values(RAW_FORMATS).includes(format)) {
        console.warn(`[BodyTypeManager] Invalid raw format: ${format}`);
        format = RAW_FORMATS.JSON;
      }
      state.rawFormat = format;
      if (elements.rawFormatSelect) {
        elements.rawFormatSelect.value = format;
      }
      if (editorsManager) {
        editorsManager.updateRawEditorLanguage(format);
      }
    }
    function getRawFormat() {
      return state.rawFormat || RAW_FORMATS.JSON;
    }
    function reset() {
      state.body = "";
      state.bodyType = BODY_TYPES.NONE;
      state.rawFormat = RAW_FORMATS.JSON;
      state.formData = [];
      state.urlEncodedData = [];
      state.graphql = { query: "", variables: "", operationName: "" };
      state.binaryFile = null;
      if (editorsManager) {
        editorsManager.setBodyValue("");
        editorsManager.setGraphqlQuery("");
        editorsManager.setGraphqlVariables("");
      }
      if (elements.formDataList) {
        elements.formDataList.innerHTML = "";
      }
      if (elements.urlencodedList) {
        elements.urlencodedList.innerHTML = "";
      }
      if (elements.selectedFileName) {
        elements.selectedFileName.textContent = "No file selected";
        elements.selectedFileName.classList.remove("selected");
      }
      if (elements.rawFormatSelect) {
        elements.rawFormatSelect.value = RAW_FORMATS.JSON;
      }
      switchPanel(BODY_TYPES.NONE);
      elements.bodyTypeRadios?.forEach((radio) => {
        radio.checked = radio.value === BODY_TYPES.NONE;
      });
    }
    function addFormDataRow(key = "", value = "", type = "text", enabled = true) {
      const row = document.createElement("div");
      row.className = `param-row form-data-row ${type === "file" ? "file-type" : ""}`;
      row.innerHTML = `
            <input type="checkbox" class="param-checkbox" ${enabled ? "checked" : ""} title="Include in request">
            <input type="text" class="key" placeholder="Key" value="${escapeHtml(key)}">
            <select class="type-select">
                <option value="text" ${type === "text" ? "selected" : ""}>Text</option>
                <option value="file" ${type === "file" ? "selected" : ""}>File</option>
            </select>
            <input type="text" class="value text-value" placeholder="Value" value="${escapeHtml(value)}">
            <div class="file-value">
                <input type="file" class="file-input">
                <button class="secondary select-file-btn" type="button">Select</button>
                <span class="file-name">No file selected</span>
            </div>
            <button class="icon-btn remove-btn" title="Remove">\xD7</button>
        `;
      const typeSelect = row.querySelector(".type-select");
      typeSelect.addEventListener("change", () => {
        row.classList.toggle("file-type", typeSelect.value === "file");
        updateFormDataState();
      });
      const fileInput = row.querySelector(".file-input");
      const selectFileBtn = row.querySelector(".select-file-btn");
      const fileName = row.querySelector(".file-name");
      selectFileBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
          fileName.textContent = fileInput.files[0].name;
          updateFormDataState();
        }
      });
      row.querySelector(".remove-btn").addEventListener("click", () => {
        row.remove();
        updateFormDataState();
      });
      row.querySelector(".param-checkbox").addEventListener("change", updateFormDataState);
      row.querySelector(".key").addEventListener("input", updateFormDataState);
      row.querySelector(".value.text-value").addEventListener("input", updateFormDataState);
      elements.formDataList?.appendChild(row);
    }
    function updateFormDataState() {
      state.formData = [];
      elements.formDataList?.querySelectorAll(".param-row").forEach((row) => {
        const enabled = row.querySelector(".param-checkbox")?.checked ?? true;
        const key = row.querySelector(".key")?.value || "";
        const type = row.querySelector(".type-select")?.value || "text";
        const textValue = row.querySelector(".value.text-value")?.value || "";
        const fileInput = row.querySelector(".file-input");
        const file = fileInput?.files?.[0] || null;
        if (key) {
          state.formData.push({
            key,
            value: type === "file" ? file : textValue,
            type,
            enabled
          });
        }
      });
      if (onTypeChange) {
        onTypeChange(state.bodyType);
      }
    }
    function addUrlencodedRow(key = "", value = "", enabled = true) {
      const row = document.createElement("div");
      row.className = "param-row";
      row.innerHTML = `
            <input type="checkbox" class="param-checkbox" ${enabled ? "checked" : ""} title="Include in request">
            <input type="text" class="key" placeholder="Key" value="${escapeHtml(key)}">
            <input type="text" class="value" placeholder="Value" value="${escapeHtml(value)}">
            <button class="icon-btn remove-btn" title="Remove">\xD7</button>
        `;
      row.querySelector(".remove-btn").addEventListener("click", () => {
        row.remove();
        updateUrlencodedState();
      });
      row.querySelector(".param-checkbox").addEventListener("change", updateUrlencodedState);
      row.querySelector(".key").addEventListener("input", updateUrlencodedState);
      row.querySelector(".value").addEventListener("input", updateUrlencodedState);
      elements.urlencodedList?.appendChild(row);
    }
    function updateUrlencodedState() {
      state.urlEncodedData = [];
      elements.urlencodedList?.querySelectorAll(".param-row").forEach((row) => {
        const enabled = row.querySelector(".param-checkbox")?.checked ?? true;
        const key = row.querySelector(".key")?.value || "";
        const value = row.querySelector(".value")?.value || "";
        if (key) {
          state.urlEncodedData.push({ key, value, enabled });
        }
      });
      if (onTypeChange) {
        onTypeChange(state.bodyType);
      }
    }
    function initEventListeners() {
      elements.bodyTypeRadios?.forEach((radio) => {
        radio.addEventListener("change", () => {
          if (radio.checked) {
            setType(radio.value);
          }
        });
      });
      if (elements.rawFormatSelect) {
        elements.rawFormatSelect.addEventListener("change", () => {
          setRawFormat(elements.rawFormatSelect.value);
          if (onTypeChange) onTypeChange(state.bodyType);
        });
      }
      if (elements.addFormDataBtn) {
        elements.addFormDataBtn.addEventListener("click", () => {
          addFormDataRow();
        });
      }
      if (elements.addUrlencodedBtn) {
        elements.addUrlencodedBtn.addEventListener("click", () => {
          addUrlencodedRow();
        });
      }
      if (elements.selectFileBtn && elements.binaryFileInput) {
        elements.selectFileBtn.addEventListener("click", () => {
          elements.binaryFileInput.click();
        });
        elements.binaryFileInput.addEventListener("change", () => {
          if (elements.binaryFileInput.files.length > 0) {
            state.binaryFile = elements.binaryFileInput.files[0];
            if (elements.selectedFileName) {
              elements.selectedFileName.textContent = state.binaryFile.name;
              elements.selectedFileName.classList.add("selected");
            }
            if (onTypeChange) {
              onTypeChange(state.bodyType);
            }
          }
        });
      }
    }
    function applyFromRequest(bodyData) {
      if (!bodyData || typeof bodyData !== "object") {
        reset();
        return;
      }
      const bodyType = bodyData.type || BODY_TYPES.RAW;
      const rawFormat = bodyData.format;
      const bodyContent = bodyData.content;
      if (bodyType === BODY_TYPES.RAW) {
        setType(BODY_TYPES.RAW);
        setRawFormat(rawFormat || RAW_FORMATS.JSON);
        const content = typeof bodyContent === "string" ? bodyContent : JSON.stringify(bodyContent, null, 2);
        state.body = content;
        if (editorsManager) {
          editorsManager.setBodyValue(content);
        }
      } else if (bodyType === BODY_TYPES.FORM_DATA) {
        setType(BODY_TYPES.FORM_DATA);
        state.formData = Array.isArray(bodyContent) ? bodyContent : [];
        if (elements.formDataList) {
          elements.formDataList.innerHTML = "";
        }
        state.formData.forEach((item) => {
          addFormDataRow(item.key, item.value, item.type || "text", item.enabled !== false);
        });
      } else if (bodyType === BODY_TYPES.URL_ENCODED) {
        setType(BODY_TYPES.URL_ENCODED);
        if (Array.isArray(bodyContent)) {
          state.urlEncodedData = bodyContent;
        } else if (typeof bodyContent === "string" && bodyContent) {
          state.urlEncodedData = bodyContent.split("&").map((pair) => {
            const [key, value] = pair.split("=");
            return {
              key: decodeURIComponent(key || ""),
              value: decodeURIComponent(value || ""),
              enabled: true
            };
          }).filter((item) => item.key);
        } else {
          state.urlEncodedData = [];
        }
        if (elements.urlencodedList) {
          elements.urlencodedList.innerHTML = "";
        }
        state.urlEncodedData.forEach((item) => {
          addUrlencodedRow(item.key, item.value, item.enabled !== false);
        });
      } else if (bodyType === BODY_TYPES.GRAPHQL) {
        setType(BODY_TYPES.GRAPHQL);
        if (typeof bodyContent === "object") {
          state.graphql = {
            query: bodyContent.query || "",
            variables: bodyContent.variables || ""
          };
          if (editorsManager) {
            editorsManager.setGraphqlQuery(state.graphql.query);
            editorsManager.setGraphqlVariables(
              typeof state.graphql.variables === "string" ? state.graphql.variables : JSON.stringify(state.graphql.variables, null, 2)
            );
          }
        }
      } else if (bodyType === BODY_TYPES.BINARY) {
        setType(BODY_TYPES.BINARY);
        state.binaryFile = null;
        if (elements.selectedFileName) {
          elements.selectedFileName.textContent = "No file selected";
          elements.selectedFileName.classList.remove("selected");
        }
      } else if (bodyType === BODY_TYPES.NONE) {
        setType(BODY_TYPES.NONE);
      } else {
        setType(bodyType);
      }
    }
    function getBodyForSave() {
      switch (state.bodyType) {
        case BODY_TYPES.NONE:
          return null;
        case BODY_TYPES.RAW:
          return {
            type: BODY_TYPES.RAW,
            format: state.rawFormat,
            content: state.body
          };
        case BODY_TYPES.GRAPHQL:
          return {
            type: BODY_TYPES.GRAPHQL,
            content: {
              query: state.graphql.query,
              variables: state.graphql.variables,
              operationName: state.graphql.operationName || void 0
            }
          };
        case BODY_TYPES.FORM_DATA:
          return {
            type: BODY_TYPES.FORM_DATA,
            content: state.formData
          };
        case BODY_TYPES.URL_ENCODED:
          return {
            type: BODY_TYPES.URL_ENCODED,
            content: state.urlEncodedData
          };
        default:
          return { type: state.bodyType, content: state.body };
      }
    }
    return {
      BODY_TYPES,
      RAW_FORMATS,
      switchPanel,
      setType,
      getType,
      setRawFormat,
      getRawFormat,
      reset,
      addFormDataRow,
      addUrlencodedRow,
      updateFormDataState,
      updateUrlencodedState,
      initEventListeners,
      applyFromRequest,
      getBodyForSave
    };
  }

  // resources/features/request-tester/modules/message-handler.js
  function createMessageHandler({ handlers = {} } = {}) {
    const handlerRegistry = new Map(Object.entries(handlers));
    let messageListener = null;
    function registerHandler(command, handler) {
      if (typeof handler !== "function") {
        console.error(`[MessageHandler] Invalid handler for command: ${command}`);
        return;
      }
      handlerRegistry.set(command, handler);
    }
    function unregisterHandler(command) {
      handlerRegistry.delete(command);
    }
    function handleMessage(event) {
      const message = event.data;
      const cmd = message.command || message.type;
      if (!cmd) {
        console.warn("[MessageHandler] Message without command:", message);
        return;
      }
      const handler = handlerRegistry.get(cmd);
      if (handler) {
        try {
          handler(message);
        } catch (error) {
          console.error(`[MessageHandler] Error handling ${cmd}:`, error);
        }
      } else {
        console.debug(`[MessageHandler] No handler for command: ${cmd}`);
      }
    }
    function startListening() {
      if (messageListener) {
        console.warn("[MessageHandler] Already listening");
        return;
      }
      messageListener = handleMessage;
      window.addEventListener("message", messageListener);
    }
    function stopListening() {
      if (messageListener) {
        window.removeEventListener("message", messageListener);
        messageListener = null;
      }
    }
    function getRegisteredCommands() {
      return Array.from(handlerRegistry.keys());
    }
    function hasHandler(command) {
      return handlerRegistry.has(command);
    }
    return {
      registerHandler,
      unregisterHandler,
      handleMessage,
      startListening,
      stopListening,
      getRegisteredCommands,
      hasHandler
    };
  }

  // resources/shared/graphql-language.js
  function registerGraphQLLanguage(monaco2) {
    const languages = monaco2.languages.getLanguages();
    if (languages.some((l) => l.id === "graphql")) return;
    monaco2.languages.register({
      id: "graphql",
      extensions: [".graphql", ".gql"],
      aliases: ["GraphQL", "graphql"],
      mimetypes: ["application/graphql"]
    });
    monaco2.languages.setMonarchTokensProvider("graphql", {
      keywords: [
        "query",
        "mutation",
        "subscription",
        "fragment",
        "on",
        "type",
        "interface",
        "union",
        "enum",
        "input",
        "scalar",
        "extend",
        "implements",
        "directive",
        "schema",
        "true",
        "false",
        "null"
      ],
      typeKeywords: ["Int", "Float", "String", "Boolean", "ID"],
      operators: ["!", "=", ":", "|", "&", "..."],
      // Symbol patterns
      symbols: /[=!:@|&]+/,
      // Escape sequences for strings
      escapes: /\\(?:["\\/bfnrt]|u[0-9A-Fa-f]{4})/,
      tokenizer: {
        root: [
          // Comments (# to end of line)
          [/#.*$/, "comment"],
          // Block strings (triple-quoted)
          [/"""/, "string", "@blockString"],
          // Regular strings
          [/"/, "string", "@string"],
          // Numbers
          [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],
          // Variables ($name)
          [/\$[a-zA-Z_]\w*/, "variable"],
          // Directives (@name)
          [/@[a-zA-Z_]\w*/, "annotation"],
          // Spread operator
          [/\.\.\./, "delimiter"],
          // Type references (PascalCase identifiers)
          [/[A-Z][a-zA-Z_0-9]*/, {
            cases: {
              "@typeKeywords": "type",
              "@default": "type.identifier"
            }
          }],
          // Keywords and field names (camelCase/lowercase identifiers)
          [/[a-z_]\w*/, {
            cases: {
              "@keywords": "keyword",
              "@default": "identifier"
            }
          }],
          // Brackets and punctuation
          [/[{}()\[\]]/, "@brackets"],
          [/[!:=|&]/, "delimiter"],
          // Whitespace
          [/\s+/, "white"]
        ],
        string: [
          [/[^"\\]+/, "string"],
          [/@escapes/, "string.escape"],
          [/\\./, "string.escape.invalid"],
          [/"/, "string", "@pop"]
        ],
        blockString: [
          [/"""/, "string", "@pop"],
          [/./, "string"]
        ]
      }
    });
    monaco2.languages.setLanguageConfiguration("graphql", {
      comments: {
        lineComment: "#"
      },
      brackets: [
        ["{", "}"],
        ["(", ")"],
        ["[", "]"]
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "(", close: ")" },
        { open: "[", close: "]" },
        { open: '"', close: '"', notIn: ["string"] },
        { open: '"""', close: '"""', notIn: ["string"] }
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "(", close: ")" },
        { open: "[", close: "]" },
        { open: '"', close: '"' }
      ],
      folding: {
        markers: {
          start: /^\s*#\s*region\b/,
          end: /^\s*#\s*endregion\b/
        }
      },
      indentationRules: {
        increaseIndentPattern: /^\s*.*\{\s*$/,
        decreaseIndentPattern: /^\s*\}/
      },
      onEnterRules: [
        {
          // After opening brace, indent
          beforeText: /^\s*.*\{\s*$/,
          afterText: /^\s*\}/,
          action: { indentAction: monaco2.languages.IndentAction.IndentOutdent }
        },
        {
          // After opening brace without closing
          beforeText: /^\s*.*\{\s*$/,
          action: { indentAction: monaco2.languages.IndentAction.Indent }
        }
      ]
    });
  }

  // resources/features/request-tester/modules/script-completion-provider.js
  var ROOT_MEMBERS = [
    // Variable scopes
    { label: "variables", detail: "Merged variable scope (cascading lookup)", kind: "Module", doc: "Cascading variable access: environment \u2192 collection \u2192 global \u2192 session.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`, `replaceIn(str)`" },
    { label: "environment", detail: "Environment variables", kind: "Module", doc: "Current environment variables.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`\nProperty: `name`" },
    { label: "session", detail: "Session variables (persisted across requests)", kind: "Module", doc: "Session variables persisted in workspace state.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`" },
    { label: "globals", detail: "Global variables", kind: "Module", doc: "Global variables from environments.json.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`" },
    { label: "collectionVariables", detail: "Collection-scoped variables", kind: "Module", doc: "Variables scoped to the current collection.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`" },
    { label: "request", detail: "Request object (modifiable in pre-request)", kind: "Module", doc: "The HTTP request being sent.\nProperties: `url`, `method`, `headers`, `body`\nModifiable in pre-request scripts." },
    { label: "response", detail: "Response object (available in post-response)", kind: "Module", doc: "The HTTP response received.\nProperties: `status`, `code`, `statusText`, `headers`, `body`, `cookies`, `responseTime`, `responseSize`\nMethods: `json()`, `text()`, `reason()`, `getHeader(name)`, `getCookie(name)`" },
    { label: "cookies", detail: "Cookie management", kind: "Module", doc: "Domain-aware cookie operations.\nMethods: `get(name)`, `set(name, value)`, `has(name)`, `list()`, `jar()`, `remove(name)`, `clear()`" },
    { label: "test", detail: "Define a test assertion", kind: "Function", insertText: "test('${1:Test name}', () => {\n    ${2:// assertions}\n});", snippet: true, doc: "Define a named test:\n```js\nhf.test('Status is 200', () => {\n    hf.expect(hf.response.status).to.equal(200);\n});\n```" },
    { label: "expect", detail: "Chai-style expect assertion", kind: "Function", insertText: "expect(${1:value})", snippet: true, doc: "Chai-style assertion chain:\n```js\nhf.expect(value).to.equal(expected);\nhf.expect(arr).to.include(item);\nhf.expect(obj).to.have.property('key');\n```" },
    { label: "sendRequest", detail: "Send an HTTP request from script", kind: "Function", insertText: "sendRequest(${1:urlOrOptions})", snippet: true, doc: "Send an HTTP request:\n```js\nhf.sendRequest('https://api.example.com/data', (err, res) => {\n    console.log(res.json());\n});\n// or with options:\nhf.sendRequest({ url, method: 'POST', headers: {}, body: {} });\n```" },
    { label: "info", detail: "Request execution info", kind: "Module", doc: "Execution metadata.\nProperties: `eventName`, `requestName`, `requestId`, `iteration`, `iterationCount`" }
  ];
  var VARIABLE_SCOPE_MEMBERS = [
    { label: "get", detail: "Get variable value", insertText: "get('${1:key}')", snippet: true, doc: "Get a variable by key. Returns `undefined` if not found." },
    { label: "set", detail: "Set variable value", insertText: "set('${1:key}', ${2:value})", snippet: true, doc: "Set a variable key-value pair." },
    { label: "has", detail: "Check if variable exists", insertText: "has('${1:key}')", snippet: true, doc: "Returns `true` if the key exists in this scope." },
    { label: "unset", detail: "Remove a variable", insertText: "unset('${1:key}')", snippet: true, doc: "Remove a variable by key." },
    { label: "clear", detail: "Remove all variables", insertText: "clear()", doc: "Clear all variables in this scope." },
    { label: "toObject", detail: "Get all variables as object", insertText: "toObject()", doc: "Returns a plain object `{ key: value, ... }` of all variables." }
  ];
  var MERGED_SCOPE_EXTRAS = [
    { label: "replaceIn", detail: "Resolve {{}} templates in a string", insertText: "replaceIn('${1:string with {{vars}}}')", snippet: true, doc: "Replace `{{variable}}` placeholders in a string using the cascading variable lookup.\nSupports filters, dynamic vars, and JS expressions." }
  ];
  var ENVIRONMENT_EXTRAS = [
    { label: "name", detail: "Current environment name", kind: "Property", doc: "The name of the currently selected environment." }
  ];
  var REQUEST_MEMBERS = [
    { label: "url", detail: "Request URL", kind: "Property", doc: "The full request URL. Modifiable in pre-request scripts." },
    { label: "method", detail: "HTTP method (GET, POST, \u2026)", kind: "Property", doc: "The HTTP method. Modifiable in pre-request scripts." },
    { label: "headers", detail: "Request headers", kind: "Module", doc: "Request headers object.\nMethods: `add({key, value})`, `get(name)`, `has(name)`, `remove(name)`, `update({key, value})`, `upsert({key, value})`" },
    { label: "body", detail: "Request body", kind: "Module", doc: "Request body object.\nProperties: `mode` (raw/formdata/urlencoded/file/graphql/none), `raw`, `formdata`, `urlencoded`, `graphql`" },
    { label: "params", detail: "Path parameters", kind: "Property", doc: "Path parameters object `{ paramName: value }`." },
    { label: "query", detail: "Query parameters", kind: "Property", doc: "Query parameters object `{ key: value }`." }
  ];
  var REQUEST_HEADERS_MEMBERS = [
    { label: "add", detail: "Add a header", insertText: "add({ key: '${1:name}', value: '${2:value}' })", snippet: true, doc: "Add a new header to the request." },
    { label: "get", detail: "Get header value", insertText: "get('${1:name}')", snippet: true, doc: "Get header value (case-insensitive lookup)." },
    { label: "has", detail: "Check if header exists", insertText: "has('${1:name}')", snippet: true, doc: "Check if a header exists (case-insensitive)." },
    { label: "remove", detail: "Remove a header", insertText: "remove('${1:name}')", snippet: true, doc: "Remove a header (case-insensitive)." },
    { label: "update", detail: "Update existing header", insertText: "update({ key: '${1:name}', value: '${2:value}' })", snippet: true, doc: "Update an existing header (no-op if not found)." },
    { label: "upsert", detail: "Update or insert header", insertText: "upsert({ key: '${1:name}', value: '${2:value}' })", snippet: true, doc: "Update header if exists, otherwise insert it." }
  ];
  var REQUEST_BODY_MEMBERS = [
    { label: "mode", detail: "Body type (raw, formdata, urlencoded, \u2026)", kind: "Property", doc: "Body mode: `raw`, `formdata`, `urlencoded`, `file`, `graphql`, `none`." },
    { label: "raw", detail: "Raw body content", kind: "Property", doc: 'The raw body string (when mode is "raw").' },
    { label: "formdata", detail: "Form data entries", kind: "Property", doc: "Array of `{ key, value, type, enabled }` for multipart form data." },
    { label: "urlencoded", detail: "URL-encoded form data", kind: "Property", doc: "Array of `{ key, value, enabled }` for URL-encoded form data." },
    { label: "graphql", detail: "GraphQL query and variables", kind: "Property", doc: "Object with `query` and `variables` strings." }
  ];
  var RESPONSE_MEMBERS = [
    { label: "status", detail: "HTTP status code", kind: "Property", doc: "The HTTP status code (e.g. 200, 404)." },
    { label: "code", detail: "HTTP status code (alias)", kind: "Property", doc: "Alias for `status`." },
    { label: "statusText", detail: "HTTP status text", kind: "Property", doc: 'The status text (e.g. "OK", "Not Found").' },
    { label: "headers", detail: "Response headers", kind: "Property", doc: "Response headers as `{ name: value }` object." },
    { label: "body", detail: "Response body", kind: "Property", doc: "The response body (string or parsed object)." },
    { label: "cookies", detail: "Response cookies", kind: "Property", doc: "Cookies from the response as `{ name: value }` object." },
    { label: "responseTime", detail: "Response time in ms", kind: "Property", doc: "How long the request took in milliseconds." },
    { label: "responseSize", detail: "Response size in bytes", kind: "Property", doc: "Size of the response body in bytes." },
    { label: "json", detail: "Parse body as JSON", insertText: "json()", doc: "Parse the response body as JSON. Returns the parsed object." },
    { label: "text", detail: "Get body as text", insertText: "text()", doc: "Get the response body as a string." },
    { label: "reason", detail: "Get status text", insertText: "reason()", doc: "Returns the status text (alias for `statusText`)." },
    { label: "getHeader", detail: "Get response header", insertText: "getHeader('${1:name}')", snippet: true, doc: "Get a response header value (case-insensitive)." },
    { label: "getCookie", detail: "Get response cookie", insertText: "getCookie('${1:name}')", snippet: true, doc: "Get a cookie value by name." },
    { label: "cookie", detail: "Get response cookie (alias)", insertText: "cookie('${1:name}')", snippet: true, doc: "Alias for `getCookie(name)`." },
    { label: "hasCookie", detail: "Check if cookie exists", insertText: "hasCookie('${1:name}')", snippet: true, doc: "Returns `true` if the named cookie exists." },
    { label: "to", detail: "Response assertions", kind: "Module", doc: 'Response assertion chain.\n`to.have.status(200)`, `to.have.header("Content-Type")`, `to.be.ok()`' }
  ];
  var RESPONSE_TO_MEMBERS = [
    { label: "have", detail: "Assertion: have", kind: "Module", doc: "Chain to `have.status()`, `have.header()`, `have.body()`, `have.jsonBody()`." },
    { label: "be", detail: "Assertion: be", kind: "Module", doc: "Chain to `be.ok()`, `be.error()`, `be.clientError()`, `be.serverError()`." }
  ];
  var RESPONSE_TO_HAVE_MEMBERS = [
    { label: "status", detail: "Assert status code", insertText: "status(${1:200})", snippet: true, doc: "Assert the response has a specific status code." },
    { label: "header", detail: "Assert header exists", insertText: "header('${1:name}')", snippet: true, doc: "Assert a response header exists (optionally with a specific value)." },
    { label: "body", detail: "Assert body content", insertText: "body(${1})", snippet: true, doc: "Assert the response body matches." },
    { label: "jsonBody", detail: "Assert JSON body", insertText: "jsonBody(${1})", snippet: true, doc: "Assert the response JSON body matches." }
  ];
  var RESPONSE_TO_BE_MEMBERS = [
    { label: "ok", detail: "Assert 2xx status", insertText: "ok()", doc: "Assert the response is OK (status 200-299)." },
    { label: "error", detail: "Assert 4xx/5xx status", insertText: "error()", doc: "Assert the response is an error (status 400+)." },
    { label: "clientError", detail: "Assert 4xx status", insertText: "clientError()", doc: "Assert the response is a client error (status 400-499)." },
    { label: "serverError", detail: "Assert 5xx status", insertText: "serverError()", doc: "Assert the response is a server error (status 500-599)." }
  ];
  var COOKIES_MEMBERS = [
    { label: "get", detail: "Get cookie value", insertText: "get('${1:name}')", snippet: true, doc: "Get a cookie value by name." },
    { label: "set", detail: "Set a cookie", insertText: "set('${1:name}', '${2:value}')", snippet: true, doc: "Set a cookie for the current domain." },
    { label: "has", detail: "Check if cookie exists", insertText: "has('${1:name}')", snippet: true, doc: "Returns `true` if the named cookie exists." },
    { label: "list", detail: "List all cookies", insertText: "list()", doc: "Returns array of `{ name, value }` for all cookies." },
    { label: "jar", detail: "Get all cookies as object", insertText: "jar()", doc: "Returns a plain object `{ name: value, ... }` of all cookies." },
    { label: "remove", detail: "Remove a cookie", insertText: "remove('${1:name}')", snippet: true, doc: "Remove a cookie by name." },
    { label: "clear", detail: "Clear all cookies", insertText: "clear()", doc: "Clear all cookies." }
  ];
  var EXPECT_CHAIN_MEMBERS = [
    { label: "to", detail: "Chain: to", kind: "Property", doc: "Chain for readability: `expect(x).to.equal(y)`" },
    { label: "be", detail: "Chain: be", kind: "Property", doc: "Chain for readability: `expect(x).to.be.ok`" },
    { label: "have", detail: "Chain: have", kind: "Property", doc: 'Chain for readability: `expect(x).to.have.property("key")`' },
    { label: "not", detail: "Negate assertion", kind: "Property", doc: "Negate the assertion: `expect(x).to.not.equal(y)`" },
    { label: "equal", detail: "Assert strict equality", insertText: "equal(${1:expected})", snippet: true, doc: "Assert strict equality (`===`)." },
    { label: "eql", detail: "Assert deep equality", insertText: "eql(${1:expected})", snippet: true, doc: "Assert deep equality." },
    { label: "property", detail: "Assert property exists", insertText: "property('${1:name}')", snippet: true, doc: "Assert the value has a property with the given name." },
    { label: "include", detail: "Assert inclusion", insertText: "include(${1:value})", snippet: true, doc: "Assert the value includes the given value (string/array)." },
    { label: "oneOf", detail: "Assert is one of values", insertText: "oneOf([${1}])", snippet: true, doc: "Assert the value is one of the given values." },
    { label: "match", detail: "Assert regex match", insertText: "match(/${1}/)", snippet: true, doc: "Assert the value matches the given regex." },
    { label: "above", detail: "Assert greater than", insertText: "above(${1:number})", snippet: true, doc: "Assert the value is above (>) the given number." },
    { label: "below", detail: "Assert less than", insertText: "below(${1:number})", snippet: true, doc: "Assert the value is below (<) the given number." },
    { label: "greaterThan", detail: "Assert greater than (alias)", insertText: "greaterThan(${1:number})", snippet: true, doc: "Alias for `above()`." },
    { label: "lessThan", detail: "Assert less than (alias)", insertText: "lessThan(${1:number})", snippet: true, doc: "Alias for `below()`." },
    { label: "within", detail: "Assert within range", insertText: "within(${1:start}, ${2:end})", snippet: true, doc: "Assert the value is within the given range [start, end]." },
    { label: "length", detail: "Assert length", insertText: "length(${1:len})", snippet: true, doc: "Assert the length of the value." },
    { label: "ok", detail: "Assert truthy", kind: "Property", doc: "Assert the value is truthy." },
    { label: "true", detail: "Assert true", kind: "Property", doc: "Assert the value is strictly `true`." },
    { label: "false", detail: "Assert false", kind: "Property", doc: "Assert the value is strictly `false`." },
    { label: "null", detail: "Assert null", kind: "Property", doc: "Assert the value is `null`." },
    { label: "undefined", detail: "Assert undefined", kind: "Property", doc: "Assert the value is `undefined`." },
    { label: "empty", detail: "Assert empty", kind: "Property", doc: "Assert the value is empty (empty string, array, or object)." }
  ];
  var INFO_MEMBERS = [
    { label: "eventName", detail: "Current event (prerequest/test)", kind: "Property", doc: 'The script event: `"prerequest"` or `"test"`.' },
    { label: "requestName", detail: "Name of the request", kind: "Property", doc: "The name of the current request." },
    { label: "requestId", detail: "Request ID", kind: "Property", doc: "The unique ID of the current request." },
    { label: "iteration", detail: "Current iteration index", kind: "Property", doc: "The current iteration index (0-based)." },
    { label: "iterationCount", detail: "Total iteration count", kind: "Property", doc: "Total number of iterations." }
  ];
  function parseApiPath(textUntilPosition) {
    const regex = /\b(hf|pm|ctx)((?:\.[a-zA-Z_]\w*)*)\.\s*(\w*)$/;
    const match = textUntilPosition.match(regex);
    if (match) {
      const root = match[1];
      const middle = match[2];
      const partial = match[3] || "";
      const segments = middle ? middle.split(".").filter(Boolean) : [];
      return { root, segments, partial };
    }
    const dotOnly = textUntilPosition.match(/\b(hf|pm|ctx)\.$/);
    if (dotOnly) {
      return { root: dotOnly[1], segments: [], partial: "" };
    }
    return null;
  }
  function resolveMemberList(segments) {
    if (segments.length === 0) {
      return ROOT_MEMBERS;
    }
    const first = segments[0];
    if (["globals", "collectionVariables", "session"].includes(first)) {
      return VARIABLE_SCOPE_MEMBERS;
    }
    if (first === "variables") {
      return [...VARIABLE_SCOPE_MEMBERS, ...MERGED_SCOPE_EXTRAS];
    }
    if (first === "environment") {
      return [...VARIABLE_SCOPE_MEMBERS, ...ENVIRONMENT_EXTRAS];
    }
    if (first === "request") {
      if (segments.length === 1) return REQUEST_MEMBERS;
      if (segments[1] === "headers") return REQUEST_HEADERS_MEMBERS;
      if (segments[1] === "body") return REQUEST_BODY_MEMBERS;
      return [];
    }
    if (first === "response") {
      if (segments.length === 1) return RESPONSE_MEMBERS;
      if (segments[1] === "to") {
        if (segments.length === 2) return RESPONSE_TO_MEMBERS;
        if (segments[2] === "have") return RESPONSE_TO_HAVE_MEMBERS;
        if (segments[2] === "be") return RESPONSE_TO_BE_MEMBERS;
        return [];
      }
      return [];
    }
    if (first === "cookies") {
      return COOKIES_MEMBERS;
    }
    if (first === "info") {
      return INFO_MEMBERS;
    }
    return [];
  }
  function parseExpectChain(textUntilPosition) {
    const regex = /\b(?:hf|pm|ctx)?\.?expect\([^)]*\)((?:\.[a-zA-Z_]\w*)*)\.\s*(\w*)$/;
    const match = textUntilPosition.match(regex);
    if (match) {
      return { partial: match[2] || "" };
    }
    return null;
  }
  function buildCompletionItems(members, partial, range) {
    return members.map((m, i) => {
      const isSnippet = !!m.snippet;
      const kindMap = {
        "Module": monaco.languages.CompletionItemKind.Module,
        "Property": monaco.languages.CompletionItemKind.Property,
        "Function": monaco.languages.CompletionItemKind.Function,
        "Snippet": monaco.languages.CompletionItemKind.Snippet,
        "Variable": monaco.languages.CompletionItemKind.Variable,
        "Method": monaco.languages.CompletionItemKind.Method
      };
      const kind = kindMap[m.kind] || monaco.languages.CompletionItemKind.Method;
      return {
        label: m.label,
        kind,
        insertText: m.insertText || m.label,
        insertTextRules: isSnippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : void 0,
        detail: m.detail || "",
        documentation: m.doc ? { value: m.doc } : void 0,
        range,
        sortText: String(i).padStart(3, "0")
      };
    });
  }
  function createScriptCompletionProvider() {
    return {
      triggerCharacters: ["."],
      provideCompletionItems(model, position) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        const expectPath = parseExpectChain(textUntilPosition);
        if (expectPath) {
          const range2 = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column - expectPath.partial.length,
            endColumn: position.column
          };
          return { suggestions: buildCompletionItems(EXPECT_CHAIN_MEMBERS, expectPath.partial, range2) };
        }
        const apiPath = parseApiPath(textUntilPosition);
        if (!apiPath) {
          return { suggestions: [] };
        }
        const members = resolveMemberList(apiPath.segments);
        if (members.length === 0) {
          return { suggestions: [] };
        }
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column - apiPath.partial.length,
          endColumn: position.column
        };
        return { suggestions: buildCompletionItems(members, apiPath.partial, range) };
      }
    };
  }
  function registerScriptCompletionProviders() {
    const provider = createScriptCompletionProvider();
    const disposables = [];
    try {
      disposables.push(
        monaco.languages.registerCompletionItemProvider("javascript", provider)
      );
    } catch (e) {
      console.warn('[ScriptCompletion] Could not register for "javascript":', e.message);
    }
    return disposables;
  }

  // resources/features/request-tester/modules/template-completion-provider.js
  var DYNAMIC_VARIABLE_COMPLETIONS = [
    { name: "$guid", description: "Generate a UUID v4" },
    { name: "$uuid", description: "Generate a UUID v4" },
    { name: "$randomUUID", description: "Generate a UUID v4" },
    { name: "$randomInt", description: "Random integer (0-999), or $randomInt(min, max)", snippet: "\\$randomInt($1, $2)" },
    { name: "$timestamp", description: "Current Unix timestamp in milliseconds" },
    { name: "$timestamp_s", description: "Current Unix timestamp in seconds" },
    { name: "$isoTimestamp", description: "Current ISO 8601 timestamp" },
    { name: "$datetime", description: "Current ISO 8601 datetime" },
    { name: "$date", description: "Current date (YYYY-MM-DD)" },
    { name: "$time", description: "Current time (HH:mm:ss)" },
    { name: "$randomString", description: "Random alphanumeric string (default 10 chars)", snippet: "\\$randomString($1)" },
    { name: "$randomHexadecimal", description: "Random hex string (default 10 chars)", snippet: "\\$randomHexadecimal($1)" },
    { name: "$randomEmail", description: "Random email address" },
    { name: "$randomBoolean", description: "Random true/false" },
    { name: "$base64Encode", description: "Base64 encode text", snippet: "\\$base64Encode($1)" },
    { name: "$base64Decode", description: "Base64 decode text", snippet: "\\$base64Decode($1)" },
    { name: "$urlEncode", description: "URL encode text", snippet: "\\$urlEncode($1)" },
    { name: "$urlDecode", description: "URL decode text", snippet: "\\$urlDecode($1)" }
  ];
  var FILTER_COMPLETIONS = [
    // String filters
    { name: "upper", description: "Convert to UPPERCASE", category: "String" },
    { name: "lower", description: "Convert to lowercase", category: "String" },
    { name: "trim", description: "Remove leading/trailing whitespace", category: "String" },
    { name: "length", description: "Get string or array length", category: "String" },
    { name: "substring", description: "Extract substring(start, end)", snippet: "substring($1, $2)", category: "String" },
    { name: "replace", description: 'Replace all occurrences: replace("search", "replacement")', snippet: 'replace("$1", "$2")', category: "String" },
    { name: "split", description: 'Split into array: split(",")', snippet: 'split("$1")', category: "String" },
    { name: "join", description: 'Join array to string: join(",")', snippet: 'join("$1")', category: "String" },
    { name: "removeQuotes", description: "Remove all quote characters", category: "String" },
    { name: "removeSpaces", description: "Remove all whitespace", category: "String" },
    { name: "format", description: 'Format template: format("Hello {0}")', snippet: 'format("$1")', category: "String" },
    // Math filters
    { name: "add", description: "Add number: add(5)", snippet: "add($1)", category: "Math" },
    { name: "subtract", description: "Subtract number: subtract(5)", snippet: "subtract($1)", category: "Math" },
    { name: "multiply", description: "Multiply by number: multiply(2)", snippet: "multiply($1)", category: "Math" },
    { name: "abs", description: "Absolute value", category: "Math" },
    // Encoding filters
    { name: "btoa", description: "Base64 encode", category: "Encoding" },
    { name: "atob", description: "Base64 decode", category: "Encoding" },
    { name: "urlEncode", description: "URL encode (percent-encoding)", category: "Encoding" },
    { name: "urlDecode", description: "URL decode", category: "Encoding" },
    // Hash filters
    { name: "hash", description: 'Hash: hash("md5"|"sha256", "hex"|"base64")', snippet: 'hash("$1")', category: "Hash" },
    { name: "hmac", description: 'HMAC: hmac("secret", "sha256", "base64")', snippet: 'hmac("$1")', category: "Hash" },
    // Array filters
    { name: "first", description: "First element of array", category: "Array" },
    { name: "last", description: "Last element of array", category: "Array" },
    { name: "at", description: "Element at index: at(0)", snippet: "at($1)", category: "Array" },
    { name: "slice", description: "Slice array: slice(start, end)", snippet: "slice($1, $2)", category: "Array" },
    { name: "unique", description: "Remove duplicate values", category: "Array" },
    { name: "filter", description: "Filter array: filter(field>value)", snippet: "filter($1)", category: "Array" },
    { name: "map", description: 'Extract fields: map("field")', snippet: 'map("$1")', category: "Array" },
    // Object filters
    { name: "prop", description: 'Get property: prop("key") or prop("a.b.c")', snippet: 'prop("$1")', category: "Object" },
    { name: "parseJSON", description: "Parse JSON string to object", category: "Object" },
    { name: "stringify", description: "Convert to JSON string", category: "Object" },
    // Validation filters
    { name: "isEmail", description: "Check if value is a valid email", category: "Validation" },
    { name: "isUrl", description: "Check if value is a valid URL", category: "Validation" }
  ];
  function createTemplateCompletionProvider(state) {
    return {
      triggerCharacters: ["{", "$", "|", " "],
      provideCompletionItems(model, position) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        const lastOpen = textUntilPosition.lastIndexOf("{{");
        const lastClose = textUntilPosition.lastIndexOf("}}");
        const insideTemplate = lastOpen !== -1 && lastOpen > lastClose;
        const rangeFor = (len) => ({
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column - len,
          endColumn: position.column
        });
        if (textUntilPosition.endsWith("{{")) {
          const range2 = rangeFor(0);
          return {
            suggestions: [
              ...buildVariableSuggestions(state, range2),
              ...buildDynamicVarSuggestions(range2),
              buildAtSnippet(range2)
            ]
          };
        }
        if (!insideTemplate) {
          return { suggestions: [] };
        }
        const templateContent = textUntilPosition.substring(lastOpen + 2);
        const pipeMatch = templateContent.match(/\|\s*(\w*)$/);
        if (pipeMatch) {
          const partial = pipeMatch[1];
          const range2 = rangeFor(partial.length);
          return { suggestions: buildFilterSuggestions(range2) };
        }
        const dollarMatch = templateContent.match(/\$(\w*)$/);
        if (dollarMatch) {
          const partial = dollarMatch[1];
          const range2 = rangeFor(partial.length + 1);
          return { suggestions: buildDynamicVarSuggestions(range2) };
        }
        const word = model.getWordUntilPosition(position);
        const range = rangeFor(word.word.length);
        return {
          suggestions: [
            ...buildVariableSuggestions(state, range),
            ...buildDynamicVarSuggestions(range)
          ]
        };
      }
    };
  }
  function buildVariableSuggestions(state, range) {
    const suggestions = [];
    const seen = /* @__PURE__ */ new Set();
    const addScope = (vars, scopeLabel, sortPrefix) => {
      if (!vars || typeof vars !== "object") return;
      for (const [key, value] of Object.entries(vars)) {
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push({
          label: key,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: key,
          detail: `(${scopeLabel}) ${truncate(String(value ?? ""), 60)}`,
          documentation: {
            value: `**${key}**  
Scope: *${scopeLabel}*  
Value: \`${String(value ?? "")}\``
          },
          range,
          sortText: sortPrefix + key.toLowerCase()
        });
      }
    };
    addScope(state.resolvedEnvironment?.variables, "env", "a");
    addScope(state.collectionVariables, "collection", "b");
    addScope(state.globalVariables, "global", "c");
    addScope(state.sessionVariables, "session", "d");
    return suggestions;
  }
  function buildDynamicVarSuggestions(range) {
    return DYNAMIC_VARIABLE_COMPLETIONS.map((dv, i) => {
      const hasSnippet = !!dv.snippet;
      return {
        label: dv.name,
        kind: monaco.languages.CompletionItemKind.Constant,
        insertText: hasSnippet ? dv.snippet : dv.name,
        insertTextRules: hasSnippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : void 0,
        detail: dv.description,
        documentation: { value: `**${dv.name}**  
${dv.description}` },
        range,
        sortText: "e" + String(i).padStart(2, "0")
      };
    });
  }
  function buildFilterSuggestions(range) {
    return FILTER_COMPLETIONS.map((f, i) => {
      const hasSnippet = !!f.snippet;
      return {
        label: f.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: hasSnippet ? f.snippet : f.name,
        insertTextRules: hasSnippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : void 0,
        detail: `[${f.category}] ${f.description}`,
        documentation: { value: `**${f.name}**  
Category: *${f.category}*  
${f.description}` },
        range,
        sortText: String(i).padStart(2, "0")
      };
    });
  }
  function buildAtSnippet(range) {
    return {
      label: "@ | filter",
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: "@ | ${1:filterName}",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: "No-input filter expression",
      documentation: { value: "Insert a no-input filter expression: `{{@ | filterName}}`" },
      range,
      sortText: "zz"
    };
  }
  function truncate(str, maxLen) {
    return str.length <= maxLen ? str : str.substring(0, maxLen - 1) + "\u2026";
  }
  function registerTemplateCompletionProviders(state) {
    const provider = createTemplateCompletionProvider(state);
    const languages = ["json", "plaintext", "xml", "html", "javascript"];
    const disposables = [];
    for (const lang of languages) {
      try {
        disposables.push(
          monaco.languages.registerCompletionItemProvider(lang, provider)
        );
      } catch (e) {
        console.warn(`[TemplateCompletion] Could not register for "${lang}":`, e.message);
      }
    }
    return disposables;
  }

  // resources/features/request-tester/modules/monaco-editors-manager.js
  var DEFAULT_EDITOR_CONFIG = {
    theme: "vs-dark",
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    lineNumbers: "on",
    fontSize: 13
  };
  function safeSetEditorValue(editor, value) {
    if (!editor) return;
    const stringValue = value == null ? "" : String(value);
    editor.setValue(stringValue);
  }
  function createMonacoEditorsManager({
    elements,
    state,
    onBodyChange,
    onScriptChange,
    getDefaultPreRequestScript: getDefaultPreRequestScript2,
    getDefaultPostResponseScript: getDefaultPostResponseScript2
  }) {
    let requestBodyEditor = null;
    let responseBodyEditor = null;
    let preRequestScriptEditor = null;
    let postResponseScriptEditor = null;
    let graphqlQueryEditor = null;
    let graphqlVariablesEditor = null;
    let pendingBodyData = null;
    let pendingScripts = null;
    let isReady = false;
    let onReadyCallbacks = [];
    function initialize() {
      const isMonacoReady = () => {
        return typeof monaco !== "undefined" && monaco.editor && typeof monaco.editor.create === "function";
      };
      const MAX_RETRIES = 50;
      let retryCount = 0;
      const waitForMonaco = () => {
        if (isMonacoReady()) {
          createEditors();
        } else if (retryCount++ < MAX_RETRIES) {
          setTimeout(waitForMonaco, 100);
        } else {
          console.error("[MonacoEditorsManager] Monaco failed to load after 5 seconds");
        }
      };
      if (typeof MonacoViewer !== "undefined" && MonacoViewer.whenMonacoReady) {
        MonacoViewer.whenMonacoReady(() => {
          if (isMonacoReady()) {
            createEditors();
          } else {
            waitForMonaco();
          }
        });
      } else {
        waitForMonaco();
      }
    }
    let createEditorRetries = 0;
    const MAX_CREATE_RETRIES = 10;
    const mustacheDecorationIdsByModel = /* @__PURE__ */ new Map();
    const modelsWithDisposeAttached = /* @__PURE__ */ new WeakSet();
    function ensureMustacheStyles() {
      if (typeof document === "undefined") return;
      if (document.getElementById("hf-mustache-styles")) return;
      const style = document.createElement("style");
      style.id = "hf-mustache-styles";
      style.textContent = `
            .hf-mustache-variable { color: #d19a66 !important; font-weight: 600; }
            .hf-mustache-section { color: #61afef !important; font-weight: 700; }
            .hf-mustache-section-end { color: #61afef !important; font-weight: 700; opacity: 0.9; }
            .hf-mustache-inverse { color: #61afef !important; font-weight: 700; }
            .hf-mustache-comment { color: #5c6370 !important; font-style: italic; }
            .hf-mustache-partial { color: #98c379 !important; }
            .hf-mustache-unescaped { color: #e06c75 !important; font-weight: 600; }
        `;
      document.head.appendChild(style);
    }
    function applyMustacheDecorations(editor) {
      if (!editor) return;
      ensureMustacheStyles();
      const model = editor.getModel();
      if (!model) return;
      const text = model.getValue();
      const newDecorations = [];
      const regex = /{{{[\s\S]*?}}}|{{[\s\S]*?}}/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const matched = match[0];
        const startIndex = match.index;
        const endIndex = startIndex + matched.length;
        const startPos = model.getPositionAt(startIndex);
        const endPos = model.getPositionAt(endIndex);
        const inner = matched.replace(/^{{{?\s?/, "").replace(/\s?}}}?$/, "").trim();
        let cls = "hf-mustache-variable";
        if (/^#/.test(inner)) cls = "hf-mustache-section";
        else if (/^\//.test(inner)) cls = "hf-mustache-section-end";
        else if (/^\^/.test(inner)) cls = "hf-mustache-inverse";
        else if (/^!/.test(inner)) cls = "hf-mustache-comment";
        else if (/^>/.test(inner)) cls = "hf-mustache-partial";
        else if (/^&/.test(inner) || /^\{/.test(matched)) cls = "hf-mustache-unescaped";
        newDecorations.push({
          range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
          options: { inlineClassName: cls }
        });
      }
      const key = model.uri.toString();
      const oldIds = mustacheDecorationIdsByModel.get(key) || [];
      const newIds = editor.deltaDecorations(oldIds, newDecorations);
      mustacheDecorationIdsByModel.set(key, newIds);
      if (!modelsWithDisposeAttached.has(model)) {
        modelsWithDisposeAttached.add(model);
        model.onWillDispose(() => {
          mustacheDecorationIdsByModel.delete(key);
        });
      }
    }
    function createEditors() {
      try {
        if (typeof monaco === "undefined" || !monaco.editor || typeof monaco.editor.create !== "function") {
          console.error(
            "[MonacoEditorsManager] Monaco editor not fully loaded. monaco:",
            typeof monaco,
            "monaco.editor:",
            typeof monaco?.editor,
            "monaco.editor.create:",
            typeof monaco?.editor?.create
          );
          if (createEditorRetries++ < MAX_CREATE_RETRIES) {
            setTimeout(createEditors, 200);
          } else {
            console.error("[MonacoEditorsManager] Failed to create editors after max retries");
          }
          return;
        }
        if (elements.bodyEditor) {
          requestBodyEditor = monaco.editor.create(elements.bodyEditor, {
            ...DEFAULT_EDITOR_CONFIG,
            value: "{}",
            language: "json"
          });
          requestBodyEditor.onDidChangeModelContent(() => {
            state.body = requestBodyEditor.getValue();
            if (onBodyChange) onBodyChange();
          });
          requestBodyEditor.onDidChangeModelContent(() => applyMustacheDecorations(requestBodyEditor));
          requestBodyEditor.onDidChangeModel(() => applyMustacheDecorations(requestBodyEditor));
          applyMustacheDecorations(requestBodyEditor);
        }
        if (elements.graphqlQueryEditor) {
          graphqlQueryEditor = monaco.editor.create(elements.graphqlQueryEditor, {
            ...DEFAULT_EDITOR_CONFIG,
            value: "",
            language: "graphql"
          });
          graphqlQueryEditor.onDidChangeModelContent(() => {
            state.graphql.query = graphqlQueryEditor.getValue();
            if (onBodyChange) onBodyChange();
          });
        }
        if (elements.graphqlVariablesEditor) {
          graphqlVariablesEditor = monaco.editor.create(elements.graphqlVariablesEditor, {
            ...DEFAULT_EDITOR_CONFIG,
            value: "{\n  \n}",
            language: "json"
          });
          graphqlVariablesEditor.onDidChangeModelContent(() => {
            state.graphql.variables = graphqlVariablesEditor.getValue();
            if (onBodyChange) onBodyChange();
          });
          graphqlVariablesEditor.onDidChangeModelContent(() => applyMustacheDecorations(graphqlVariablesEditor));
          graphqlVariablesEditor.onDidChangeModel(() => applyMustacheDecorations(graphqlVariablesEditor));
          applyMustacheDecorations(graphqlVariablesEditor);
        }
        if (elements.responseBodyEditor) {
          responseBodyEditor = monaco.editor.create(elements.responseBodyEditor, {
            ...DEFAULT_EDITOR_CONFIG,
            value: "",
            language: "json",
            readOnly: true
          });
        }
        if (elements.preRequestScriptEditor) {
          preRequestScriptEditor = monaco.editor.create(elements.preRequestScriptEditor, {
            ...DEFAULT_EDITOR_CONFIG,
            value: "",
            language: "javascript"
          });
          preRequestScriptEditor.onDidChangeModelContent(() => {
            state.scripts.preRequest = preRequestScriptEditor.getValue();
            if (onScriptChange) onScriptChange("preRequest");
          });
        }
        if (elements.postResponseScriptEditor) {
          postResponseScriptEditor = monaco.editor.create(elements.postResponseScriptEditor, {
            ...DEFAULT_EDITOR_CONFIG,
            value: "",
            language: "javascript"
          });
          postResponseScriptEditor.onDidChangeModelContent(() => {
            state.scripts.postResponse = postResponseScriptEditor.getValue();
            if (onScriptChange) onScriptChange("postResponse");
          });
        }
        registerGraphQLLanguage(monaco);
        registerTemplateCompletionProviders(state);
        registerScriptCompletionProviders();
        requestAnimationFrame(() => {
          isReady = true;
          if (pendingBodyData) {
            applyPendingBodyData();
          }
          if (pendingScripts) {
            applyPendingScripts();
          }
          onReadyCallbacks.forEach((cb) => cb());
          onReadyCallbacks = [];
        });
      } catch (error) {
        console.error("[MonacoEditorsManager] Failed to create editors:", error);
        console.error(
          "[MonacoEditorsManager] Monaco state - monaco:",
          typeof monaco,
          "editor:",
          typeof monaco?.editor,
          "create:",
          typeof monaco?.editor?.create
        );
        throw error;
      }
    }
    function applyPendingBodyData() {
      if (!pendingBodyData || !requestBodyEditor) return;
      if (pendingBodyData.bodyContent !== void 0) {
        safeSetEditorValue(requestBodyEditor, pendingBodyData.bodyContent);
        state.body = pendingBodyData.bodyContent;
      }
      pendingBodyData = null;
    }
    function applyPendingScripts() {
      if (!pendingScripts) return;
      if (pendingScripts.preRequest !== void 0 && preRequestScriptEditor) {
        safeSetEditorValue(preRequestScriptEditor, pendingScripts.preRequest);
        state.scripts.preRequest = pendingScripts.preRequest;
      }
      if (pendingScripts.postResponse !== void 0 && postResponseScriptEditor) {
        safeSetEditorValue(postResponseScriptEditor, pendingScripts.postResponse);
        state.scripts.postResponse = pendingScripts.postResponse;
      }
      pendingScripts = null;
    }
    function setPendingBodyData(data) {
      if (isReady && requestBodyEditor) {
        if (data.bodyContent !== void 0) {
          safeSetEditorValue(requestBodyEditor, data.bodyContent);
          state.body = data.bodyContent;
        }
      } else {
        pendingBodyData = data;
      }
    }
    function onReady(callback) {
      if (isReady) {
        callback();
      } else {
        onReadyCallbacks.push(callback);
      }
    }
    function getRequestBodyEditor() {
      return requestBodyEditor;
    }
    function getResponseBodyEditor() {
      return responseBodyEditor;
    }
    function getPreRequestScriptEditor() {
      return preRequestScriptEditor;
    }
    function getPostResponseScriptEditor() {
      return postResponseScriptEditor;
    }
    function getGraphqlQueryEditor() {
      return graphqlQueryEditor;
    }
    function getGraphqlVariablesEditor() {
      return graphqlVariablesEditor;
    }
    function setBodyValue(value) {
      if (requestBodyEditor) {
        safeSetEditorValue(requestBodyEditor, value || "");
        state.body = value || "";
      } else {
        setPendingBodyData({ bodyContent: value });
      }
    }
    function getBodyValue() {
      return requestBodyEditor?.getValue() || state.body || "";
    }
    function setResponseValue(value, language = "json") {
      if (responseBodyEditor) {
        const model = responseBodyEditor.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, language);
        }
        safeSetEditorValue(responseBodyEditor, value || "");
      }
    }
    function clearResponse() {
      if (responseBodyEditor) {
        safeSetEditorValue(responseBodyEditor, "");
      }
    }
    function setPreRequestScript(value) {
      const scriptValue = value || "";
      if (isReady && preRequestScriptEditor) {
        safeSetEditorValue(preRequestScriptEditor, scriptValue);
        state.scripts.preRequest = scriptValue;
      } else {
        if (!pendingScripts) pendingScripts = {};
        pendingScripts.preRequest = scriptValue;
        state.scripts.preRequest = scriptValue;
      }
    }
    function setPostResponseScript(value) {
      const scriptValue = value || "";
      if (isReady && postResponseScriptEditor) {
        safeSetEditorValue(postResponseScriptEditor, scriptValue);
        state.scripts.postResponse = scriptValue;
      } else {
        if (!pendingScripts) pendingScripts = {};
        pendingScripts.postResponse = scriptValue;
        state.scripts.postResponse = scriptValue;
      }
    }
    function setGraphqlQuery(value) {
      if (graphqlQueryEditor) {
        safeSetEditorValue(graphqlQueryEditor, value || "");
        state.graphql.query = value || "";
      }
    }
    function setGraphqlVariables(value) {
      if (graphqlVariablesEditor) {
        safeSetEditorValue(graphqlVariablesEditor, value || "");
        state.graphql.variables = value || "";
      }
    }
    function updateRawEditorLanguage(format) {
      if (!requestBodyEditor) return;
      const languageMap = {
        "json": "json",
        "text": "plaintext",
        "xml": "xml",
        "html": "html",
        "javascript": "javascript"
      };
      const model = requestBodyEditor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, languageMap[format] || "plaintext");
        applyMustacheDecorations(requestBodyEditor);
      }
    }
    function layoutAll() {
      requestBodyEditor?.layout();
      responseBodyEditor?.layout();
      preRequestScriptEditor?.layout();
      postResponseScriptEditor?.layout();
      graphqlQueryEditor?.layout();
      graphqlVariablesEditor?.layout();
    }
    function layout(editorName) {
      switch (editorName) {
        case "body":
          requestBodyEditor?.layout();
          break;
        case "response":
          responseBodyEditor?.layout();
          break;
        case "preRequest":
          preRequestScriptEditor?.layout();
          break;
        case "postResponse":
          postResponseScriptEditor?.layout();
          break;
        case "graphqlQuery":
          graphqlQueryEditor?.layout();
          break;
        case "graphqlVariables":
          graphqlVariablesEditor?.layout();
          break;
      }
    }
    function clearAll() {
      if (requestBodyEditor) safeSetEditorValue(requestBodyEditor, "");
      if (graphqlQueryEditor) safeSetEditorValue(graphqlQueryEditor, "");
      if (graphqlVariablesEditor) safeSetEditorValue(graphqlVariablesEditor, "");
      if (responseBodyEditor) safeSetEditorValue(responseBodyEditor, "");
    }
    return {
      initialize,
      onReady,
      isReady: () => isReady,
      setPendingBodyData,
      // Editor getters
      getRequestBodyEditor,
      getResponseBodyEditor,
      getPreRequestScriptEditor,
      getPostResponseScriptEditor,
      getGraphqlQueryEditor,
      getGraphqlVariablesEditor,
      // Value setters/getters
      setBodyValue,
      getBodyValue,
      setResponseValue,
      clearResponse,
      setPreRequestScript,
      setPostResponseScript,
      setGraphqlQuery,
      setGraphqlVariables,
      updateRawEditorLanguage,
      // Layout
      layoutAll,
      layout,
      clearAll
    };
  }

  // resources/features/request-tester/modules/path-variables-manager.js
  function createPathVariablesManager({ state, elements, formManager }) {
    const PARAM_REGEX = /:([a-zA-Z_][a-zA-Z0-9_]*)(?:\(([^)]*)\))?/g;
    function parseConstraint(constraint) {
      if (!constraint) return { options: null, pattern: null };
      const isSimpleOptions = /^[a-zA-Z0-9_.]+(\|[a-zA-Z0-9_.]+)*$/.test(constraint);
      if (isSimpleOptions) {
        return { options: constraint.split("|"), pattern: null };
      }
      return { options: null, pattern: constraint };
    }
    function extractVariables(path) {
      if (!path) return [];
      const variables = [];
      let match;
      PARAM_REGEX.lastIndex = 0;
      while ((match = PARAM_REGEX.exec(path)) !== null) {
        const name = match[1];
        const constraint = match[2] || null;
        const { options, pattern } = parseConstraint(constraint);
        variables.push({ name, constraint, options, pattern });
      }
      return variables;
    }
    function updateFromPath(path) {
      const variables = extractVariables(path);
      const currentValues = { ...state.pathParams };
      if (elements.pathParams) {
        elements.pathParams.innerHTML = "";
      }
      state.pathParams = {};
      variables.forEach(({ name: paramName, options, pattern }) => {
        const existingValue = currentValues[paramName] || "";
        state.pathParams[paramName] = existingValue;
        formManager.addParamRow("path", paramName, existingValue, false, true, true, options, pattern);
      });
    }
    function applyEnvironmentDefaults(envVariables) {
      if (!envVariables) return;
      Object.keys(state.pathParams).forEach((paramName) => {
        if (envVariables[paramName] && !state.pathParams[paramName]) {
          state.pathParams[paramName] = envVariables[paramName];
          updateInputValue(paramName, envVariables[paramName]);
        }
      });
    }
    function applyParams(params) {
      if (!params) return;
      Object.entries(params).forEach(([paramName, rawValue]) => {
        if (paramName in state.pathParams) {
          let displayValue;
          if (rawValue && typeof rawValue === "object" && "value" in rawValue) {
            displayValue = rawValue.value || "";
            const { value: _v, ...meta } = rawValue;
            if (Object.keys(meta).length > 0) {
              state._paramsMeta[paramName] = meta;
            }
          } else {
            displayValue = rawValue || "";
          }
          if (displayValue) {
            state.pathParams[paramName] = displayValue;
            updateInputValue(paramName, displayValue);
          }
        }
      });
    }
    function updateInputValue(paramName, value) {
      if (!elements.pathParams) return;
      const row = elements.pathParams.querySelector(`[data-key="${paramName}"]`);
      if (!row) return;
      const valueElement = row.querySelector("input.value, select.value");
      if (valueElement) {
        valueElement.value = value;
      }
    }
    function getParams() {
      return { ...state.pathParams };
    }
    function setParam(key, value) {
      state.pathParams[key] = value;
    }
    function clear() {
      if (elements.pathParams) {
        elements.pathParams.innerHTML = "";
      }
      state.pathParams = {};
    }
    function buildPath(pattern, params = state.pathParams) {
      if (!pattern) return "/";
      let result = pattern;
      Object.entries(params).forEach(([key, value]) => {
        const paramPattern = new RegExp(`:${key}(?:\\([^)]*\\))?\\??`, "g");
        result = result.replace(paramPattern, value || "");
      });
      result = result.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)(?:\([^)]*\))?\?/g, "");
      return result;
    }
    return {
      extractVariables,
      updateFromPath,
      applyEnvironmentDefaults,
      applyParams,
      getParams,
      setParam,
      clear,
      buildPath
    };
  }

  // resources/features/request-tester/modules/query-params-manager.js
  function createQueryParamsManager({ state, elements, formManager, updateUrlPreview }) {
    function parseUrl(fullUrl) {
      if (!fullUrl) {
        return { baseUrl: "", params: [] };
      }
      const params = [];
      let baseUrl = fullUrl;
      const queryIndex = fullUrl.indexOf("?");
      if (queryIndex === -1) {
        return { baseUrl, params };
      }
      baseUrl = fullUrl.substring(0, queryIndex);
      const queryString = fullUrl.substring(queryIndex + 1);
      try {
        const urlParams = new URLSearchParams(queryString);
        urlParams.forEach((value, key) => {
          params.push({ key, value, enabled: true });
        });
      } catch (e) {
        console.warn("[QueryParamsManager] Failed to parse query string:", e);
      }
      return { baseUrl, params };
    }
    function buildFullUrl(baseUrl, params, enabledOnly = true) {
      if (!baseUrl) return "";
      const filteredParams = enabledOnly ? params.filter((p) => p.enabled && p.key) : params.filter((p) => p.key);
      if (filteredParams.length === 0) {
        return baseUrl;
      }
      const queryString = filteredParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || "")}`).join("&");
      return `${baseUrl}?${queryString}`;
    }
    function mergeParams(existing, parsed) {
      const result = [];
      const parsedKeys = new Set(parsed.map((p) => p.key));
      const existingMap = new Map(existing.map((p) => [p.key, p]));
      for (const p of parsed) {
        const existingParam = existingMap.get(p.key);
        if (existingParam) {
          result.push({ key: p.key, value: p.value, enabled: true });
          existingMap.delete(p.key);
        } else {
          result.push({ key: p.key, value: p.value, enabled: true });
        }
      }
      for (const [key, param] of existingMap) {
        result.push({ key: param.key, value: param.value, enabled: false });
      }
      return result;
    }
    function handleUrlChange(fullUrl, setPath, keyEditable = true) {
      const { baseUrl, params: parsedParams } = parseUrl(fullUrl);
      state.baseUrl = baseUrl;
      const mergedParams = mergeParams(state.queryParams, parsedParams);
      state.queryParams = mergedParams;
      if (elements.queryParams) {
        elements.queryParams.innerHTML = "";
      }
      mergedParams.forEach((param) => {
        formManager.addParamRow("query", param.key, param.value, true, keyEditable, param.enabled);
      });
      if (updateUrlPreview) {
        updateUrlPreview();
      }
    }
    function handleTableChange(getPath, setPath) {
      const currentUrl = getPath();
      const baseUrl = state.baseUrl || getUrlWithoutQuery(currentUrl);
      const newUrl = buildFullUrl(baseUrl, state.queryParams, true);
      if (currentUrl !== newUrl) {
        setPath(newUrl);
      }
      if (updateUrlPreview) {
        updateUrlPreview();
      }
    }
    function getUrlWithoutQuery(url) {
      if (url && url.includes("?")) {
        return url.split("?")[0];
      }
      return url || "";
    }
    function buildQueryString2() {
      const params = new URLSearchParams();
      state.queryParams.forEach(({ key, value, enabled }) => {
        if (key && enabled) {
          params.append(key, value || "");
        }
      });
      return params.toString();
    }
    function buildQueryObject() {
      return state.queryParams.reduce((acc, { key, value, enabled }) => {
        if (key && enabled) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }
    function hasSavedQueryParams(request) {
      return request?.query && Array.isArray(request.query) && request.query.length > 0;
    }
    function applyFromCollection(baseUrl, queryParams, setPath, keyEditable = true) {
      state.baseUrl = baseUrl || "";
      state.queryParams = Array.isArray(queryParams) ? [...queryParams] : [];
      state._queryMeta = {};
      if (elements.queryParams) {
        elements.queryParams.innerHTML = "";
      }
      state.queryParams.forEach((param) => {
        const { key, value, enabled, ...meta } = param;
        if (key && Object.keys(meta).length > 0) {
          state._queryMeta[key] = meta;
        }
        formManager.addParamRow("query", param.key, param.value, true, keyEditable, param.enabled !== false);
      });
      const fullUrl = buildFullUrl(state.baseUrl, state.queryParams, true);
      if (setPath) {
        setPath(fullUrl);
      }
      if (updateUrlPreview) {
        updateUrlPreview();
      }
    }
    function getDataForSave() {
      return {
        baseUrl: state.baseUrl || "",
        query: state.queryParams.map((p) => ({
          key: p.key,
          value: p.value,
          enabled: p.enabled
        }))
      };
    }
    function clear() {
      if (elements.queryParams) {
        elements.queryParams.innerHTML = "";
      }
      state.queryParams = [];
      state.baseUrl = "";
    }
    return {
      parseUrl,
      buildFullUrl,
      mergeParams,
      handleUrlChange,
      handleTableChange,
      getUrlWithoutQuery,
      buildQueryString: buildQueryString2,
      buildQueryObject,
      hasSavedQueryParams,
      applyFromCollection,
      getDataForSave,
      clear
    };
  }

  // resources/features/request-tester/modules/request-loader.js
  function createRequestLoader({
    state,
    getMethod,
    setMethod,
    getPath,
    setPath,
    queryParamsManager,
    pathVariablesManager,
    bodyTypeManager,
    editorsManager,
    formManager,
    elements,
    updateUrlPreview,
    markClean,
    oauth2Manager
  }) {
    function loadCollectionRequest(request) {
      setMethod(request.method || "GET");
      formManager.clearForm();
      const baseUrl = request.url || request.path || "/";
      const hasQueryArray = queryParamsManager.hasSavedQueryParams(request);
      const keyEditable = !state.readonly;
      if (hasQueryArray) {
        const cleanBaseUrl = queryParamsManager.getUrlWithoutQuery(baseUrl);
        queryParamsManager.applyFromCollection(
          cleanBaseUrl,
          request.query,
          setPath,
          keyEditable
        );
      } else {
        const { baseUrl: parsedBase, params } = queryParamsManager.parseUrl(baseUrl);
        queryParamsManager.applyFromCollection(
          parsedBase,
          params,
          setPath,
          keyEditable
        );
      }
      state.requestPath = getPath() || baseUrl;
      const pathForVariables = state.baseUrl || queryParamsManager.getUrlWithoutQuery(baseUrl);
      pathVariablesManager.updateFromPath(pathForVariables);
      const requestHeaders = request.headers || {};
      if (typeof requestHeaders === "object" && !Array.isArray(requestHeaders)) {
        Object.entries(requestHeaders).forEach(([key, value]) => {
          formManager.addHeaderRow(key, value, true, true);
        });
      }
      bodyTypeManager.reset();
      const bodyData = request.body;
      if (bodyData && typeof bodyData === "object") {
        bodyTypeManager.applyFromRequest(bodyData);
      } else if (typeof bodyData === "string" && bodyData) {
        state.body = bodyData;
        bodyTypeManager.setType("raw");
        bodyTypeManager.setRawFormat("json");
        if (editorsManager) {
          editorsManager.setBodyValue(bodyData);
        }
      }
      state.authType = "inherit";
      state.bearerToken = "";
      state.basicAuth = { username: "", password: "" };
      state.apiKey = { key: "", value: "", in: "header" };
      state.oauth2 = null;
      if (elements.authType) {
        elements.authType.value = "inherit";
      }
      if (elements.bearerToken) {
        elements.bearerToken.value = "";
      }
      if (elements.bearerTokenSection) {
        elements.bearerTokenSection.classList.add("hidden");
      }
      if (elements.basicAuthSection) {
        elements.basicAuthSection.classList.add("hidden");
      }
      if (elements.basicUsername) {
        elements.basicUsername.value = "";
      }
      if (elements.basicPassword) {
        elements.basicPassword.value = "";
      }
      if (elements.oauth2Section) {
        elements.oauth2Section.classList.add("hidden");
      }
      if (request.auth) {
        const auth = request.auth;
        state.authType = auth.type || "inherit";
        state.bearerToken = auth.bearerToken || "";
        state.basicAuth = auth.basicAuth ? { ...auth.basicAuth } : { username: "", password: "" };
        state.apiKey = auth.apikey ? { ...auth.apikey } : { key: "", value: "", in: "header" };
        state.oauth2 = auth.oauth2 ? { ...auth.oauth2 } : null;
        if (elements.authType) elements.authType.value = state.authType;
        if (elements.bearerToken) elements.bearerToken.value = state.bearerToken;
        if (elements.bearerTokenSection) elements.bearerTokenSection.classList.toggle("hidden", state.authType !== "bearer");
        if (elements.basicAuthSection) elements.basicAuthSection.classList.toggle("hidden", state.authType !== "basic");
        if (elements.basicUsername) elements.basicUsername.value = state.basicAuth.username || "";
        if (elements.basicPassword) elements.basicPassword.value = state.basicAuth.password || "";
        if (elements.apiKeySection) elements.apiKeySection.classList.toggle("hidden", state.authType !== "apikey");
        if (elements.apiKeyKey) elements.apiKeyKey.value = state.apiKey.key || "";
        if (elements.apiKeyValue) elements.apiKeyValue.value = state.apiKey.value || "";
        if (elements.apiKeyIn) elements.apiKeyIn.value = state.apiKey.in || "header";
        if (elements.oauth2Section) elements.oauth2Section.classList.toggle("hidden", state.authType !== "oauth2");
        if (state.authType === "oauth2" && oauth2Manager && state.oauth2) {
          oauth2Manager.loadConfig(state.oauth2);
        }
      }
      state.scripts.preRequest = "";
      state.scripts.postResponse = "";
      if (editorsManager) {
        editorsManager.setPreRequestScript("");
        editorsManager.setPostResponseScript("");
      }
      if (request.scripts) {
        if (request.scripts.preRequest) {
          state.scripts.preRequest = request.scripts.preRequest;
          if (editorsManager) {
            editorsManager.setPreRequestScript(request.scripts.preRequest);
          }
        }
        if (request.scripts.postResponse) {
          state.scripts.postResponse = request.scripts.postResponse;
          if (editorsManager) {
            editorsManager.setPostResponseScript(request.scripts.postResponse);
          }
        }
      }
      const defaultSettings = {
        timeout: 3e4,
        followRedirects: true,
        followOriginalMethod: false,
        followAuthHeader: false,
        maxRedirects: 10,
        strictSSL: true,
        decompress: true,
        includeCookies: true
      };
      Object.assign(state.settings, defaultSettings);
      if (request.settings) {
        Object.assign(state.settings, request.settings);
      }
      applySettingsToUI(state.settings);
      if (editorsManager) {
        editorsManager.clearResponse();
      }
      if (elements.responsePlaceholder) {
        elements.responsePlaceholder.classList.add("hidden");
      }
      updateUrlPreview();
      if (markClean) {
        markClean();
      }
    }
    function applySettingsToUI(settings) {
      if (elements.settingTimeout && settings.timeout !== void 0) {
        elements.settingTimeout.value = settings.timeout;
      }
      if (elements.settingFollowRedirects && settings.followRedirects !== void 0) {
        elements.settingFollowRedirects.checked = settings.followRedirects;
        if (elements.redirectOptions) {
          elements.redirectOptions.classList.toggle("hidden", !settings.followRedirects);
        }
      }
      if (elements.settingOriginalMethod && settings.followOriginalMethod !== void 0) {
        elements.settingOriginalMethod.checked = settings.followOriginalMethod;
      }
      if (elements.settingAuthHeader && settings.followAuthHeader !== void 0) {
        elements.settingAuthHeader.checked = settings.followAuthHeader;
      }
      if (elements.settingMaxRedirects && settings.maxRedirects !== void 0) {
        elements.settingMaxRedirects.value = settings.maxRedirects;
      }
      if (elements.settingStrictSSL && settings.strictSSL !== void 0) {
        elements.settingStrictSSL.checked = settings.strictSSL;
      }
      if (elements.settingDecompress && settings.decompress !== void 0) {
        elements.settingDecompress.checked = settings.decompress;
      }
      if (elements.settingIncludeCookies && settings.includeCookies !== void 0) {
        elements.settingIncludeCookies.checked = settings.includeCookies;
      }
    }
    function applyHistoryEntry(entry, fullResponse, responseHandler) {
      const originalConfig = entry.originalConfig || {};
      const historyParams = originalConfig.params || {};
      const historyQuery = originalConfig.query || {};
      const historyHeaders = originalConfig.headers || {};
      const historyBody = originalConfig.body ?? null;
      state.lastSentRequest = entry.sentRequest || {};
      elements.pathParams?.querySelectorAll(".param-row").forEach((row) => {
        const key = row.dataset.key;
        const valueInput = row.querySelector(".value");
        if (key && valueInput) {
          const newValue = historyParams[key] ?? "";
          valueInput.value = newValue;
          state.pathParams[key] = newValue;
        }
      });
      elements.queryParams?.querySelectorAll(".param-row").forEach((row) => {
        const keyInput = row.querySelector(".key");
        const valueInput = row.querySelector(".value");
        const checkbox = row.querySelector(".param-checkbox");
        const key = keyInput?.value;
        if (key) {
          const historyKey = Object.keys(historyQuery).find((k) => k.toLowerCase() === key.toLowerCase());
          if (historyKey !== void 0) {
            if (valueInput) valueInput.value = historyQuery[historyKey];
            if (checkbox) checkbox.checked = true;
          } else {
            if (valueInput) valueInput.value = "";
            if (checkbox) checkbox.checked = false;
          }
        }
      });
      elements.headersList?.querySelectorAll(".param-row").forEach((row) => {
        const keyInput = row.querySelector(".key");
        const valueInput = row.querySelector(".value");
        const checkbox = row.querySelector(".param-checkbox");
        const key = keyInput?.value;
        if (key) {
          const historyKey = Object.keys(historyHeaders).find((k) => k.toLowerCase() === key.toLowerCase());
          if (historyKey !== void 0) {
            if (valueInput) valueInput.value = historyHeaders[historyKey];
            if (checkbox) checkbox.checked = true;
          } else {
            if (valueInput) valueInput.value = "";
            if (checkbox) checkbox.checked = false;
          }
        }
      });
      if (bodyTypeManager && historyBody && typeof historyBody === "object" && historyBody.type) {
        bodyTypeManager.applyFromRequest(historyBody);
      }
      if (entry.auth) {
        const auth = entry.auth;
        state.authType = auth.type || "inherit";
        state.bearerToken = auth.bearerToken || "";
        state.basicAuth = auth.basicAuth ? { ...auth.basicAuth } : { username: "", password: "" };
        state.apiKey = auth.apikey ? { ...auth.apikey } : { key: "", value: "", in: "header" };
        state.oauth2 = auth.oauth2 ? { ...auth.oauth2 } : null;
        if (elements.authType) elements.authType.value = state.authType;
        if (elements.bearerTokenSection) elements.bearerTokenSection.classList.toggle("hidden", state.authType !== "bearer");
        if (elements.basicAuthSection) elements.basicAuthSection.classList.toggle("hidden", state.authType !== "basic");
        if (elements.bearerToken) elements.bearerToken.value = state.bearerToken;
        if (elements.basicUsername) elements.basicUsername.value = state.basicAuth.username || "";
        if (elements.basicPassword) elements.basicPassword.value = state.basicAuth.password || "";
        if (elements.apiKeySection) elements.apiKeySection.classList.toggle("hidden", state.authType !== "apikey");
        if (elements.apiKeyKey) elements.apiKeyKey.value = state.apiKey.key || "";
        if (elements.apiKeyValue) elements.apiKeyValue.value = state.apiKey.value || "";
        if (elements.apiKeyIn) elements.apiKeyIn.value = state.apiKey.in || "header";
        if (elements.oauth2Section) elements.oauth2Section.classList.toggle("hidden", state.authType !== "oauth2");
        if (state.authType === "oauth2" && oauth2Manager && state.oauth2) {
          oauth2Manager.loadConfig(state.oauth2);
        }
      }
      if (entry.scripts && editorsManager) {
        if (entry.scripts.preRequest) {
          editorsManager.setPreRequestScript(entry.scripts.preRequest);
          state.scripts.preRequest = entry.scripts.preRequest;
        }
        if (entry.scripts.postResponse) {
          editorsManager.setPostResponseScript(entry.scripts.postResponse);
          state.scripts.postResponse = entry.scripts.postResponse;
        }
      }
      const defaultSettings = {
        timeout: 3e4,
        followRedirects: true,
        followOriginalMethod: false,
        followAuthHeader: false,
        maxRedirects: 10,
        strictSSL: true,
        decompress: true,
        includeCookies: true
      };
      Object.assign(state.settings, defaultSettings);
      if (entry.settings) {
        Object.assign(state.settings, entry.settings);
      }
      applySettingsToUI(state.settings);
      updateUrlPreview();
      if (fullResponse && responseHandler) {
        responseHandler.handleResponse(fullResponse);
      } else if (responseHandler) {
        responseHandler.clearResponse();
      }
      if (responseHandler && responseHandler.updateSentRequestTab) {
        responseHandler.updateSentRequestTab(state.lastSentRequest);
      }
    }
    return {
      loadCollectionRequest,
      applyHistoryEntry,
      applySettingsToUI
    };
  }

  // resources/features/request-tester/modules/request-saver.js
  function createRequestSaver({
    vscode: vscode2,
    state,
    getMethod,
    getPath,
    queryParamsManager,
    bodyTypeManager,
    getHeaders,
    getSchemaDataForSave
  }) {
    function buildBody() {
      const bodyType = state.bodyType || "none";
      switch (bodyType) {
        case "none":
          return { type: "none", content: null };
        case "raw":
          return {
            type: "raw",
            format: state.rawFormat || "json",
            content: state.body || ""
          };
        case "form-data":
          return {
            type: "form-data",
            content: state.formData || []
          };
        case "x-www-form-urlencoded":
          return {
            type: "x-www-form-urlencoded",
            content: state.urlEncodedData || []
          };
        case "binary":
          return {
            type: "binary",
            content: state.binaryFile || null
          };
        case "graphql":
          return {
            type: "graphql",
            content: state.graphql || { query: "", variables: "" }
          };
        default:
          return { type: "none", content: null };
      }
    }
    function buildAuth() {
      const authType = state.authType || "none";
      if (authType === "none") return { type: "none" };
      if (authType === "inherit") return { type: "inherit" };
      if (authType === "bearer") return { type: "bearer", bearerToken: state.bearerToken || "" };
      if (authType === "basic") return { type: "basic", basicAuth: { username: state.basicAuth?.username || "", password: state.basicAuth?.password || "" } };
      if (authType === "apikey") return { type: "apikey", apikey: { key: state.apiKey?.key || "", value: state.apiKey?.value || "", in: state.apiKey?.in || "header" } };
      if (authType === "oauth2" && state.oauth2) return { type: "oauth2", oauth2: { ...state.oauth2 } };
      return { type: authType };
    }
    function buildRequestData() {
      const currentPath = getPath();
      const headers = getHeaders();
      const urlWithoutQuery = queryParamsManager.getUrlWithoutQuery(currentPath);
      const params = {};
      Object.entries(state.pathParams).forEach(([key, value]) => {
        if (state._paramsMeta && state._paramsMeta[key] && Object.keys(state._paramsMeta[key]).length > 0) {
          params[key] = { value: value || "", ...state._paramsMeta[key] };
        } else {
          params[key] = value;
        }
      });
      const query = (state.queryParams || []).map((entry) => {
        const fresh = { key: entry.key, value: entry.value, enabled: entry.enabled };
        if (state._queryMeta && state._queryMeta[entry.key]) {
          Object.assign(fresh, state._queryMeta[entry.key]);
        }
        return fresh;
      });
      return {
        // Include ID and name from original request data for updates
        id: state.requestData?.id,
        name: state.requestData?.name,
        collectionId: state.collectionId,
        method: getMethod(),
        url: urlWithoutQuery,
        path: urlWithoutQuery,
        params,
        query,
        headers,
        // Body in unified RequestBody format: { type, format?, content }
        body: buildBody(),
        auth: buildAuth(),
        settings: state.settings,
        scripts: state.scripts,
        // Preserve OpenAPI metadata — prefer live editor data over original
        deprecated: state.requestData?.deprecated,
        description: state.requestData?.description,
        responseSchema: getSchemaDataForSave?.()?.responseSchema ?? state.requestData?.responseSchema,
        bodySchema: getSchemaDataForSave?.()?.bodySchema ?? state.requestData?.bodySchema
      };
    }
    function saveRequest() {
      const requestData = buildRequestData();
      vscode2.postMessage({
        command: "saveRequest",
        request: requestData
      });
    }
    function takeSnapshot() {
      return {
        method: getMethod(),
        path: getPath(),
        pathParams: JSON.stringify(state.pathParams),
        queryParams: JSON.stringify(state.queryParams),
        headers: JSON.stringify(getHeaders()),
        // Use unified body format for snapshot comparison
        body: JSON.stringify(buildBody()),
        authType: state.authType,
        bearerToken: state.bearerToken,
        basicAuth: JSON.stringify(state.basicAuth || {}),
        apiKey: JSON.stringify(state.apiKey || {}),
        oauth2: JSON.stringify(state.oauth2 || {}),
        scripts: JSON.stringify(state.scripts),
        settings: JSON.stringify(state.settings),
        // Include OpenAPI metadata maps for dirty detection
        paramsMeta: JSON.stringify(state._paramsMeta || {}),
        queryMeta: JSON.stringify(state._queryMeta || {}),
        headersMeta: JSON.stringify(state._headersMeta || {}),
        // Include schema editor data for dirty detection
        schemaData: JSON.stringify(getSchemaDataForSave?.() || {})
      };
    }
    function hasChangedFrom(snapshot) {
      if (!snapshot) return true;
      const current = takeSnapshot();
      return current.method !== snapshot.method || current.path !== snapshot.path || current.pathParams !== snapshot.pathParams || current.queryParams !== snapshot.queryParams || current.headers !== snapshot.headers || current.body !== snapshot.body || current.authType !== snapshot.authType || current.bearerToken !== snapshot.bearerToken || current.basicAuth !== snapshot.basicAuth || current.apiKey !== snapshot.apiKey || current.oauth2 !== snapshot.oauth2 || current.scripts !== snapshot.scripts || current.settings !== snapshot.settings || current.paramsMeta !== snapshot.paramsMeta || current.queryMeta !== snapshot.queryMeta || current.headersMeta !== snapshot.headersMeta || current.schemaData !== snapshot.schemaData;
    }
    return {
      buildRequestData,
      saveRequest,
      takeSnapshot,
      hasChangedFrom
    };
  }

  // resources/features/request-tester/modules/schema-editor-manager.js
  function createSchemaEditorManager({ vscode: vscode2, state, editorsManager, markDirty }) {
    let bodySchemaEditor = null;
    let responseSchemaEditor = null;
    let responseSchemaData = {};
    let responseSchemaComponents = null;
    let activeStatusCode = null;
    let bodySchemaData = null;
    let initialized = false;
    function init() {
      if (initialized) return;
      editorsManager.onReady(() => {
        const bodyContainer = document.getElementById("body-schema-editor");
        const responseContainer = document.getElementById("response-schema-editor");
        if (bodyContainer && window.MonacoViewer?.createEditor) {
          bodySchemaEditor = window.MonacoViewer.createEditor(bodyContainer, {
            language: "json",
            value: "",
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2
          });
          bodySchemaEditor.onDidChangeModelContent(() => {
            if (markDirty) markDirty();
          });
        }
        if (responseContainer && window.MonacoViewer?.createEditor) {
          responseSchemaEditor = window.MonacoViewer.createEditor(responseContainer, {
            language: "json",
            value: "",
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2
          });
          responseSchemaEditor.onDidChangeModelContent(() => {
            if (markDirty) markDirty();
          });
        }
        initialized = true;
        setupToolbarListeners();
      });
    }
    function setupToolbarListeners() {
      document.getElementById("infer-body-schema-btn")?.addEventListener("click", () => {
        const collectionId = state.collectionId;
        const requestId = state.requestData?.id;
        if (!collectionId || !requestId) {
          setStatus("body-schema-status", "Save request first", "error");
          return;
        }
        setStatus("body-schema-status", "Inferring\u2026", "info");
        const sentBody = state.lastSentRequest?.body || null;
        const bodyType = state.bodyType || "none";
        const bodyFormat = state.rawFormat || "json";
        let bodyContent = state.body || "";
        if (bodyType === "form-data") {
          bodyContent = state.formData || [];
        } else if (bodyType === "x-www-form-urlencoded") {
          bodyContent = state.urlEncodedData || [];
        }
        vscode2.postMessage({
          command: "inferBodySchema",
          collectionId,
          requestId,
          sentBody,
          body: { type: bodyType, format: bodyFormat, content: bodyContent }
        });
      });
      document.getElementById("generate-example-body-btn")?.addEventListener("click", () => {
        const collectionId = state.collectionId;
        const requestId = state.requestData?.id;
        const bodySchema = getBodySchemaFromEditor();
        setStatus("body-schema-status", "Generating\u2026", "info");
        vscode2.postMessage({ command: "generateExampleBody", collectionId, requestId, bodySchema });
      });
      document.getElementById("validate-body-btn")?.addEventListener("click", () => {
        const collectionId = state.collectionId;
        const requestId = state.requestData?.id;
        if (!collectionId || !requestId) {
          setStatus("body-schema-status", "Save request first", "error");
          return;
        }
        setStatus("body-schema-status", "Validating\u2026", "info");
        const sentBody = state.lastSentRequest?.body || null;
        const bodyType = state.bodyType || "none";
        const bodyFormat = state.rawFormat || "json";
        let bodyContent = state.body || "";
        if (bodyType === "form-data") {
          bodyContent = state.formData || [];
        } else if (bodyType === "x-www-form-urlencoded") {
          bodyContent = state.urlEncodedData || [];
        }
        vscode2.postMessage({
          command: "validateBody",
          collectionId,
          requestId,
          sentBody,
          body: { type: bodyType, format: bodyFormat, content: bodyContent }
        });
      });
      document.getElementById("infer-response-schema-btn")?.addEventListener("click", () => {
        const collectionId = state.collectionId;
        const requestId = state.requestData?.id;
        if (!collectionId || !requestId) {
          setStatus("response-schema-status", "Save request first", "error");
          return;
        }
        setStatus("response-schema-status", "Inferring\u2026", "info");
        vscode2.postMessage({ command: "inferResponseSchema", collectionId, requestId });
      });
      document.getElementById("capture-response-btn")?.addEventListener("click", () => {
        const collectionId = state.collectionId;
        const requestId = state.requestData?.id;
        if (!collectionId || !requestId) {
          setStatus("response-schema-status", "Save request first", "error");
          return;
        }
        const lastResponse = state.lastResponse;
        if (!lastResponse) {
          setStatus("response-schema-status", "No response to capture", "error");
          return;
        }
        setStatus("response-schema-status", "Capturing\u2026", "info");
        vscode2.postMessage({
          command: "captureResponse",
          collectionId,
          requestId,
          response: {
            statusCode: lastResponse.status ?? lastResponse.statusCode,
            body: lastResponse.body,
            headers: lastResponse.headers
          }
        });
      });
      document.getElementById("generate-example-response-btn")?.addEventListener("click", () => {
        const collectionId = state.collectionId;
        const requestId = state.requestData?.id;
        const responseSchema = getResponseSchemaFromEditor();
        if (responseSchemaComponents) {
          responseSchema.components = responseSchemaComponents;
        }
        setStatus("response-schema-status", "Generating\u2026", "info");
        vscode2.postMessage({ command: "generateExampleResponse", collectionId, requestId, responseSchema, statusCode: activeStatusCode });
      });
    }
    function setStatus(elementId, text, type = "") {
      const el = document.getElementById(elementId);
      if (!el) return;
      el.textContent = text;
      el.className = "schema-status" + (type ? ` ${type}` : "");
      if (text) {
        setTimeout(() => {
          if (el.textContent === text) {
            el.textContent = "";
            el.className = "schema-status";
          }
        }, 5e3);
      }
    }
    function loadSchemas() {
      if (state.requestData?.bodySchema) {
        applyBodySchema(state.requestData.bodySchema);
      }
      if (state.requestData?.responseSchema) {
        applyResponseSchema(state.requestData.responseSchema);
      }
      const collectionId = state.collectionId;
      const requestId = state.requestData?.id;
      if (collectionId && requestId && !state.requestData?.bodySchema && !state.requestData?.responseSchema) {
        vscode2.postMessage({ command: "getBodySchema", collectionId, requestId });
        vscode2.postMessage({ command: "getResponseSchema", collectionId, requestId });
      }
    }
    function applyBodySchema(schema) {
      bodySchemaData = schema;
      if (bodySchemaEditor) {
        const content = schema ? JSON.stringify(schema, null, 2) : "";
        const currentValue = bodySchemaEditor.getValue();
        if (currentValue !== content) {
          bodySchemaEditor.setValue(content);
        }
      }
      const bodyTab = document.querySelector('.tab[data-tab="body"]');
      if (bodyTab) {
        bodyTab.classList.toggle("has-schema", !!schema);
      }
    }
    function applyResponseSchema(schema) {
      responseSchemaData = schema?.responses || {};
      responseSchemaComponents = schema?.components || null;
      const tabsContainer = document.getElementById("response-status-tabs");
      if (tabsContainer) {
        tabsContainer.innerHTML = "";
        const statusCodes = Object.keys(responseSchemaData).sort();
        if (statusCodes.length === 0) {
          activeStatusCode = null;
          if (responseSchemaEditor) {
            responseSchemaEditor.setValue('// No response schemas defined yet.\n// Use "Infer from History" or "Capture Last Response" to create one.');
          }
          return;
        }
        statusCodes.forEach((code, index) => {
          const tab = document.createElement("button");
          tab.className = "schema-status-tab" + (index === 0 ? " active" : "");
          tab.dataset.status = code;
          tab.textContent = code;
          tab.addEventListener("click", () => selectStatusCode(code));
          tabsContainer.appendChild(tab);
        });
        selectStatusCode(statusCodes[0]);
      }
    }
    function selectStatusCode(code) {
      activeStatusCode = code;
      document.querySelectorAll(".schema-status-tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.status === code);
      });
      const schemaEntry = responseSchemaData[code];
      if (responseSchemaEditor && schemaEntry) {
        responseSchemaEditor.setValue(JSON.stringify(schemaEntry, null, 2));
      }
    }
    function getBodySchemaFromEditor() {
      if (!bodySchemaEditor) return null;
      const val = bodySchemaEditor.getValue().trim();
      if (!val || val.startsWith("//")) return null;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    function getResponseSchemaFromEditor() {
      if (!responseSchemaEditor || !activeStatusCode) return null;
      const val = responseSchemaEditor.getValue().trim();
      if (!val || val.startsWith("//")) return null;
      try {
        const parsed = JSON.parse(val);
        responseSchemaData[activeStatusCode] = parsed;
        return { responses: responseSchemaData };
      } catch {
        return null;
      }
    }
    function getMessageHandlers() {
      return {
        bodySchemaLoaded: (msg) => {
          applyBodySchema(msg.schema);
        },
        responseSchemaLoaded: (msg) => {
          applyResponseSchema(msg.schema);
        },
        bodySchemaInferred: (msg) => {
          if (msg.schema) {
            applyBodySchema(msg.schema);
            setStatus("body-schema-status", "Schema inferred", "success");
          } else {
            setStatus("body-schema-status", "Could not infer schema", "error");
          }
        },
        responseSchemaInferred: (msg) => {
          if (msg.schema) {
            applyResponseSchema(msg.schema);
            setStatus("response-schema-status", "Schema inferred", "success");
          } else {
            setStatus("response-schema-status", "Could not infer schema", "error");
          }
        },
        bodyValidationResult: (msg) => {
          if (msg.valid) {
            setStatus("body-schema-status", "\u2713 Body is valid", "success");
          } else {
            const errorCount = msg.errors?.length || 0;
            setStatus("body-schema-status", `\u2717 ${errorCount} validation error${errorCount !== 1 ? "s" : ""}`, "error");
          }
        },
        exampleBodyGenerated: (msg) => {
          if (msg.example) {
            editorsManager.setBodyValue(msg.example);
            setStatus("body-schema-status", "Example generated \u2014 applied to Body", "success");
          } else {
            setStatus("body-schema-status", "Could not generate example", "error");
          }
        },
        responseSchemaSaved: () => {
          setStatus("response-schema-status", "Schema saved", "success");
        },
        bodySchemaSaved: () => {
          setStatus("body-schema-status", "Schema saved", "success");
        }
      };
    }
    function getSchemaDataForSave() {
      return {
        bodySchema: getBodySchemaFromEditor(),
        responseSchema: getResponseSchemaFromEditor()
      };
    }
    function layout() {
      if (bodySchemaEditor) bodySchemaEditor.layout();
      if (responseSchemaEditor) responseSchemaEditor.layout();
    }
    return {
      init,
      loadSchemas,
      applyBodySchema,
      applyResponseSchema,
      getMessageHandlers,
      getSchemaDataForSave,
      layout
    };
  }

  // resources/features/request-tester/modules/oauth2-manager.js
  function createOAuth2Manager({ state, elements, vscode: vscode2, markDirty }) {
    let currentTokenInfo = null;
    function switchGrantType(grantType) {
      const authCodeFields = elements.oauth2AuthcodeFields;
      const passwordFields = elements.oauth2PasswordFields;
      if (authCodeFields) {
        authCodeFields.classList.toggle("hidden", grantType !== "authorization_code" && grantType !== "implicit");
      }
      if (passwordFields) {
        passwordFields.classList.toggle("hidden", grantType !== "password");
      }
      if (elements.oauth2Pkce) {
        const pkceRow = elements.oauth2Pkce.closest(".oauth2-toggle");
        if (pkceRow) {
          pkceRow.classList.toggle("hidden", grantType !== "authorization_code");
        }
      }
      if (elements.oauth2TokenUrl) {
        const tokenUrlLabel = elements.oauth2TokenUrl.previousElementSibling;
        if (grantType === "implicit") {
          elements.oauth2TokenUrl.classList.add("hidden");
          if (tokenUrlLabel?.tagName === "LABEL") tokenUrlLabel.classList.add("hidden");
        } else {
          elements.oauth2TokenUrl.classList.remove("hidden");
          if (tokenUrlLabel?.tagName === "LABEL") tokenUrlLabel.classList.remove("hidden");
        }
      }
    }
    function getConfig() {
      const grantType = elements.oauth2GrantType?.value || "authorization_code";
      const existing = state.oauth2 || {};
      const config = {
        ...existing,
        grantType,
        tokenUrl: elements.oauth2TokenUrl?.value || "",
        clientId: elements.oauth2ClientId?.value || "",
        clientSecret: elements.oauth2ClientSecret?.value || "",
        scope: elements.oauth2Scope?.value || ""
      };
      if (grantType === "authorization_code" || grantType === "implicit") {
        config.authUrl = elements.oauth2AuthUrl?.value || "";
        config.usePkce = elements.oauth2Pkce?.checked ?? true;
        config.pkceMethod = existing.pkceMethod || "S256";
      } else {
        delete config.authUrl;
        delete config.usePkce;
        delete config.pkceMethod;
      }
      if (grantType === "password") {
        config.username = elements.oauth2Username?.value || "";
        config.password = elements.oauth2Password?.value || "";
      } else {
        delete config.username;
        delete config.password;
      }
      const audience = elements.oauth2Audience?.value;
      if (audience) {
        config.audience = audience;
      } else {
        delete config.audience;
      }
      const tokenPrefix = elements.oauth2TokenPrefix?.value;
      if (tokenPrefix) {
        config.tokenPrefix = tokenPrefix;
      } else {
        delete config.tokenPrefix;
      }
      const tokenField = elements.oauth2TokenField?.value;
      if (tokenField) {
        config.tokenField = tokenField;
      } else {
        delete config.tokenField;
      }
      const clientAuth = elements.oauth2ClientAuth?.value;
      if (clientAuth) {
        config.clientAuthentication = clientAuth;
      } else {
        delete config.clientAuthentication;
      }
      if (currentTokenInfo?.accessToken) {
        config.accessToken = currentTokenInfo.accessToken;
      } else {
        delete config.accessToken;
      }
      return config;
    }
    function loadConfig(oauth2Config) {
      if (!oauth2Config) return;
      if (elements.oauth2GrantType) {
        elements.oauth2GrantType.value = oauth2Config.grantType || "authorization_code";
        switchGrantType(elements.oauth2GrantType.value);
      }
      if (elements.oauth2AuthUrl) elements.oauth2AuthUrl.value = oauth2Config.authUrl || "";
      if (elements.oauth2TokenUrl) elements.oauth2TokenUrl.value = oauth2Config.tokenUrl || "";
      if (elements.oauth2ClientId) elements.oauth2ClientId.value = oauth2Config.clientId || "";
      if (elements.oauth2ClientSecret) elements.oauth2ClientSecret.value = oauth2Config.clientSecret || "";
      if (elements.oauth2Scope) elements.oauth2Scope.value = oauth2Config.scope || "";
      if (elements.oauth2Pkce) elements.oauth2Pkce.checked = oauth2Config.usePkce !== false;
      if (elements.oauth2Username) elements.oauth2Username.value = oauth2Config.username || "";
      if (elements.oauth2Password) elements.oauth2Password.value = oauth2Config.password || "";
      if (elements.oauth2Audience) elements.oauth2Audience.value = oauth2Config.audience || "";
      if (elements.oauth2TokenPrefix) elements.oauth2TokenPrefix.value = oauth2Config.tokenPrefix || "";
      if (elements.oauth2TokenField) elements.oauth2TokenField.value = oauth2Config.tokenField || "";
      if (elements.oauth2ClientAuth) elements.oauth2ClientAuth.value = oauth2Config.clientAuthentication || "body";
      if (oauth2Config.accessToken) {
        onTokenReceived({
          accessToken: oauth2Config.accessToken,
          tokenType: oauth2Config.tokenPrefix || "Bearer"
        });
      }
    }
    function requestToken() {
      const config = getConfig();
      delete config.accessToken;
      if (elements.oauth2GetToken) {
        elements.oauth2GetToken.textContent = "Requesting...";
        elements.oauth2GetToken.disabled = true;
      }
      hideError();
      vscode2.postMessage({
        command: "oauth2GetToken",
        oauth2Config: config
      });
    }
    function refreshToken() {
      if (!currentTokenInfo?.refreshToken) return;
      const config = getConfig();
      delete config.accessToken;
      vscode2.postMessage({
        command: "oauth2RefreshToken",
        oauth2Config: config,
        refreshToken: currentTokenInfo.refreshToken
      });
    }
    function clearToken() {
      const config = getConfig();
      vscode2.postMessage({
        command: "oauth2ClearToken",
        cacheKey: {
          tokenUrl: config.tokenUrl,
          clientId: config.clientId,
          scope: config.scope,
          grantType: config.grantType
        }
      });
      currentTokenInfo = null;
      updateTokenUI(null);
      state.oauth2 = getConfig();
      markDirty();
    }
    function onTokenReceived(tokenInfo) {
      currentTokenInfo = tokenInfo;
      updateTokenUI(tokenInfo);
      if (elements.oauth2GetToken) {
        elements.oauth2GetToken.textContent = "Get New Token";
        elements.oauth2GetToken.disabled = false;
      }
      state.oauth2 = getConfig();
      markDirty();
    }
    function onTokenError(errorMessage) {
      if (elements.oauth2GetToken) {
        elements.oauth2GetToken.textContent = "Get New Token";
        elements.oauth2GetToken.disabled = false;
      }
      showError(errorMessage);
    }
    function updateTokenUI(tokenInfo) {
      const infoEl = elements.oauth2TokenInfo;
      const previewEl = elements.oauth2TokenPreview;
      const expiresEl = elements.oauth2TokenExpires;
      const refreshBtn = elements.oauth2RefreshToken;
      const clearBtn = elements.oauth2ClearToken;
      if (!tokenInfo) {
        if (infoEl) infoEl.classList.add("hidden");
        if (refreshBtn) refreshBtn.classList.add("hidden");
        if (clearBtn) clearBtn.classList.add("hidden");
        return;
      }
      if (infoEl) infoEl.classList.remove("hidden");
      if (previewEl) {
        const token = tokenInfo.accessToken || "";
        previewEl.textContent = token.length > 40 ? token.substring(0, 40) + "..." : token;
      }
      if (expiresEl && tokenInfo.expiresAt) {
        const expiresDate = new Date(tokenInfo.expiresAt);
        const now = Date.now();
        const remainingSec = Math.max(0, Math.floor((tokenInfo.expiresAt - now) / 1e3));
        expiresEl.textContent = remainingSec > 0 ? `Expires in ${remainingSec}s (${expiresDate.toLocaleTimeString()})` : "Expired";
      } else if (expiresEl) {
        expiresEl.textContent = "";
      }
      if (refreshBtn) refreshBtn.classList.toggle("hidden", !tokenInfo.refreshToken);
      if (clearBtn) clearBtn.classList.remove("hidden");
      hideError();
    }
    function showError(message) {
      const errorEl = elements.oauth2TokenError;
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove("hidden");
      }
    }
    function hideError() {
      const errorEl = elements.oauth2TokenError;
      if (errorEl) {
        errorEl.classList.add("hidden");
      }
    }
    function initListeners() {
      function syncState() {
        state.oauth2 = getConfig();
      }
      if (elements.oauth2GrantType) {
        elements.oauth2GrantType.addEventListener("change", () => {
          switchGrantType(elements.oauth2GrantType.value);
          syncState();
          markDirty();
        });
      }
      if (elements.oauth2GetToken) {
        elements.oauth2GetToken.addEventListener("click", () => requestToken());
      }
      if (elements.oauth2RefreshToken) {
        elements.oauth2RefreshToken.addEventListener("click", () => refreshToken());
      }
      if (elements.oauth2ClearToken) {
        elements.oauth2ClearToken.addEventListener("click", () => clearToken());
      }
      const inputFields = [
        elements.oauth2AuthUrl,
        elements.oauth2TokenUrl,
        elements.oauth2ClientId,
        elements.oauth2ClientSecret,
        elements.oauth2Scope,
        elements.oauth2Username,
        elements.oauth2Password,
        elements.oauth2Audience,
        elements.oauth2TokenPrefix,
        elements.oauth2TokenField
      ];
      inputFields.forEach((el) => {
        if (el) {
          el.addEventListener("input", () => {
            syncState();
            markDirty();
          });
        }
      });
      [elements.oauth2Pkce, elements.oauth2ClientAuth].forEach((el) => {
        if (el) {
          el.addEventListener("change", () => {
            syncState();
            markDirty();
          });
        }
      });
    }
    function getCurrentAccessToken() {
      return currentTokenInfo?.accessToken || null;
    }
    function getMessageHandlers() {
      return {
        "oauth2TokenReceived": (msg) => onTokenReceived(msg.tokenInfo),
        "oauth2TokenError": (msg) => onTokenError(msg.error),
        "oauth2TokenCleared": () => {
          currentTokenInfo = null;
          updateTokenUI(null);
        }
      };
    }
    return {
      switchGrantType,
      getConfig,
      loadConfig,
      requestToken,
      refreshToken,
      clearToken,
      onTokenReceived,
      onTokenError,
      getCurrentAccessToken,
      getMessageHandlers,
      initListeners
    };
  }

  // resources/features/request-tester/modules/graphql-manager.js
  function createGraphQLSchemaManager({ state, elements, vscode: vscode2, editorsManager, getRequestUrl, getHeaders }) {
    let schemaData = null;
    let completionDisposable = null;
    let schemaEndpointUrl = null;
    let isFetching = false;
    const fetchSchemaBtn = document.getElementById("graphql-fetch-schema");
    const operationSelect = document.getElementById("graphql-operation-select");
    const schemaStatus = document.getElementById("graphql-schema-status");
    const toggleExplorerBtn = document.getElementById("graphql-toggle-explorer");
    const explorerPanel = document.getElementById("graphql-explorer");
    const typeSearch = document.getElementById("graphql-type-search");
    const typeTree = document.getElementById("graphql-type-tree");
    function initialize() {
      fetchSchemaBtn?.addEventListener("click", () => fetchSchema());
      toggleExplorerBtn?.addEventListener("click", () => {
        if (explorerPanel) {
          const isHidden = explorerPanel.classList.contains("hidden");
          explorerPanel.classList.toggle("hidden");
          toggleExplorerBtn.classList.toggle("active");
          if (isHidden) {
            document.querySelectorAll(".graphql-tab-vertical").forEach((t) => {
              t.classList.remove("active");
              t.setAttribute("aria-selected", "false");
            });
            document.querySelectorAll(".graphql-tab-panel").forEach((p) => p.classList.remove("active"));
            const queryTab = document.querySelector('.graphql-tab-vertical[data-graphql-tab="query"]');
            if (queryTab) {
              queryTab.classList.add("active");
              queryTab.setAttribute("aria-selected", "true");
            }
            document.getElementById("graphql-query-panel")?.classList.add("active");
          }
          requestAnimationFrame(() => {
            editorsManager.layout("graphqlQuery");
          });
        }
      });
      typeSearch?.addEventListener("input", () => {
        filterExplorerTree(typeSearch.value.trim());
      });
      operationSelect?.addEventListener("change", () => {
        state.graphql.operationName = operationSelect.value || "";
      });
      editorsManager.onReady(() => {
        const queryEditor = editorsManager.getGraphqlQueryEditor();
        if (queryEditor) {
          queryEditor.onDidChangeModelContent(() => {
            updateOperationSelector();
          });
        }
      });
    }
    function fetchSchema() {
      if (isFetching) return;
      const endpointUrl = getRequestUrl();
      if (!endpointUrl) {
        setStatus("\u26A0 Enter a URL first", "warning");
        return;
      }
      isFetching = true;
      setStatus("\u27F3 Fetching schema...", "loading");
      if (fetchSchemaBtn) fetchSchemaBtn.disabled = true;
      const headers = getHeaders() || {};
      const headerObj = Array.isArray(headers) ? headers.reduce((acc, h) => {
        if (h.enabled !== false && h.key) acc[h.key] = h.value || "";
        return acc;
      }, {}) : headers;
      const hasAuthHeader = Object.keys(headerObj).some((k) => k.toLowerCase() === "authorization");
      if (!hasAuthHeader) {
        const authType = state.authType || "none";
        if (authType === "bearer" && state.bearerToken) {
          headerObj["Authorization"] = `Bearer ${state.bearerToken}`;
        } else if (authType === "basic" && state.basicAuth) {
          const user = state.basicAuth.username || "";
          const pass = state.basicAuth.password || "";
          headerObj["Authorization"] = `Basic ${btoa(user + ":" + pass)}`;
        } else if (authType === "apikey" && state.apiKey) {
          const addTo = state.apiKey.in || "header";
          if (addTo === "header" && state.apiKey.key) {
            headerObj[state.apiKey.key] = state.apiKey.value || "";
          }
        } else if (authType === "oauth2" && state.oauth2?.accessToken) {
          const prefix = state.oauth2.tokenPrefix || "Bearer";
          headerObj["Authorization"] = `${prefix} ${state.oauth2.accessToken}`;
        }
      }
      vscode2.postMessage({
        command: "graphqlFetchSchema",
        endpointUrl,
        headers: headerObj
      });
    }
    function onSchemaReceived(msg) {
      isFetching = false;
      if (fetchSchemaBtn) fetchSchemaBtn.disabled = false;
      schemaData = msg.schema;
      schemaEndpointUrl = msg.endpointUrl;
      const typeCount = msg.typeCount || 0;
      const parts = [];
      if (msg.hasQuery) parts.push("Query");
      if (msg.hasMutation) parts.push("Mutation");
      if (msg.hasSubscription) parts.push("Subscription");
      setStatus(`\u2713 ${typeCount} types (${parts.join(", ")})`, "success");
      registerCompletions();
      renderExplorer();
      updateOperationSelector();
    }
    function onSchemaError(msg) {
      isFetching = false;
      if (fetchSchemaBtn) fetchSchemaBtn.disabled = false;
      setStatus(`\u2717 ${msg.error}`, "error");
    }
    function registerCompletions() {
      if (completionDisposable) {
        completionDisposable.dispose();
        completionDisposable = null;
      }
      if (!schemaData || typeof monaco === "undefined") return;
      completionDisposable = monaco.languages.registerCompletionItemProvider("graphql", {
        triggerCharacters: ["{", "(", " ", "\n", "@", ".", ":"],
        provideCompletionItems(model, position) {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });
          const offset = textUntilPosition.length;
          const fullDocument = model.getValue();
          const items = computeCompletionsLocally(fullDocument, offset);
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn
          };
          return {
            suggestions: items.map((item, index) => ({
              label: item.label,
              kind: mapCompletionKind(item.kind),
              detail: item.detail || "",
              documentation: item.description || "",
              insertText: item.insertText || item.label,
              insertTextRules: item.insertText && item.insertText.includes("$") ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : void 0,
              range,
              sortText: String(item.sortOrder ?? index).padStart(4, "0"),
              deprecated: item.deprecated || false
            }))
          };
        }
      });
    }
    function computeCompletionsLocally(document2, offset) {
      if (!schemaData) return [];
      const types = schemaData.types || {};
      const textBefore = document2.slice(0, offset);
      const prefixMatch = textBefore.match(/([a-zA-Z_]\w*)$/);
      const prefix = prefixMatch ? prefixMatch[1] : "";
      const cleaned = textBefore.replace(/"""[\s\S]*?"""/g, '""').replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/#[^\n]*/g, "");
      let braceDepth = 0;
      let parenDepth = 0;
      for (const ch of cleaned) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
        else if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth--;
      }
      if (braceDepth <= 0) {
        return getRootCompletions(prefix);
      }
      if (parenDepth > 0) {
        return getArgumentCompletionsLocal(cleaned, prefix);
      }
      const parentTypeName = resolveParentType(cleaned);
      const parentType = parentTypeName ? types[parentTypeName] : null;
      if (parentType && (parentType.kind === "OBJECT" || parentType.kind === "INTERFACE")) {
        return getFieldCompletions(parentType, prefix);
      }
      return [];
    }
    function getRootCompletions(prefix) {
      const items = [];
      const keywords = ["query", "mutation", "subscription", "fragment"];
      const snippets = {
        query: "query ${1:Name} {\n  $0\n}",
        mutation: "mutation ${1:Name} {\n  $0\n}",
        subscription: "subscription ${1:Name} {\n  $0\n}",
        fragment: "fragment ${1:Name} on ${2:Type} {\n  $0\n}"
      };
      for (const kw of keywords) {
        if (kw === "mutation" && !schemaData.mutationType) continue;
        if (kw === "subscription" && !schemaData.subscriptionType) continue;
        if (!prefix || kw.startsWith(prefix.toLowerCase())) {
          items.push({
            label: kw,
            kind: "keyword",
            detail: `${kw.charAt(0).toUpperCase() + kw.slice(1)} operation`,
            insertText: snippets[kw],
            sortOrder: 0
          });
        }
      }
      return items;
    }
    function getFieldCompletions(parentType, prefix) {
      const items = [];
      const fields = parentType.fields || [];
      for (const field of fields) {
        if (!prefix || field.name.toLowerCase().startsWith(prefix.toLowerCase())) {
          const baseType = (field.type || "").replace(/[!\[\]]/g, "");
          const typeObj = schemaData.types[baseType];
          const isObject = typeObj && (typeObj.kind === "OBJECT" || typeObj.kind === "INTERFACE" || typeObj.kind === "UNION");
          let insertText = field.name;
          const requiredArgs = (field.args || []).filter((a) => (a.type || "").endsWith("!"));
          if (requiredArgs.length > 0) {
            const argSnippets = requiredArgs.map((a, i) => `${a.name}: \${${i + 1}}`).join(", ");
            insertText = `${field.name}(${argSnippets})`;
          }
          if (isObject) {
            insertText += " {\n  $0\n}";
          }
          items.push({
            label: field.name,
            kind: "field",
            detail: field.type,
            description: field.description || "",
            insertText,
            deprecated: field.isDeprecated,
            sortOrder: 1
          });
        }
      }
      if (!prefix || "__typename".startsWith(prefix.toLowerCase())) {
        items.push({
          label: "__typename",
          kind: "field",
          detail: "String!",
          description: "The name of the current object type",
          sortOrder: 10
        });
      }
      return items;
    }
    function getArgumentCompletionsLocal(cleaned, prefix) {
      if (!schemaData) return [];
      const types = schemaData.types || {};
      let depth = 0;
      let fieldName = null;
      for (let i = cleaned.length - 1; i >= 0; i--) {
        if (cleaned[i] === ")") depth++;
        else if (cleaned[i] === "(") {
          if (depth === 0) {
            const before = cleaned.slice(0, i).trimEnd();
            const m = before.match(/(\w+)$/);
            fieldName = m ? m[1] : null;
            break;
          }
          depth--;
        }
      }
      if (!fieldName) return [];
      const parentTypeName = resolveParentType(cleaned);
      const parentType = parentTypeName ? types[parentTypeName] : null;
      if (!parentType) return [];
      const field = (parentType.fields || []).find((f) => f.name === fieldName);
      if (!field || !field.args) return [];
      const items = [];
      for (const arg of field.args) {
        if (!prefix || arg.name.toLowerCase().startsWith(prefix.toLowerCase())) {
          items.push({
            label: arg.name,
            kind: "argument",
            detail: arg.type,
            description: arg.description || "",
            insertText: `${arg.name}: `,
            sortOrder: 0
          });
        }
      }
      return items;
    }
    function resolveParentType(cleaned) {
      if (!schemaData) return null;
      const types = schemaData.types || {};
      let rootTypeName = schemaData.queryType || "Query";
      const opMatch = cleaned.match(/\b(query|mutation|subscription)\b/);
      if (opMatch) {
        if (opMatch[1] === "mutation" && schemaData.mutationType) rootTypeName = schemaData.mutationType;
        else if (opMatch[1] === "subscription" && schemaData.subscriptionType) rootTypeName = schemaData.subscriptionType;
      }
      const tokens = [];
      const tokenRegex = /([a-zA-Z_]\w*|[{}(),:=@!\[\].]|\.\.\.|"[^"]*"|\d+)/g;
      let m;
      while ((m = tokenRegex.exec(cleaned)) !== null) {
        tokens.push(m[1]);
      }
      const typePath = [rootTypeName];
      let currentType = types[rootTypeName];
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === "{") continue;
        if (token === "}") {
          typePath.pop();
          currentType = typePath.length > 0 ? types[typePath[typePath.length - 1]] : null;
          continue;
        }
        let nextIdx = i + 1;
        if (nextIdx < tokens.length && tokens[nextIdx] === "(") {
          let pd = 1;
          nextIdx++;
          while (nextIdx < tokens.length && pd > 0) {
            if (tokens[nextIdx] === "(") pd++;
            else if (tokens[nextIdx] === ")") pd--;
            nextIdx++;
          }
        }
        if (nextIdx < tokens.length && tokens[nextIdx] === "{") {
          if (currentType) {
            const field = (currentType.fields || []).find((f) => f.name === token);
            if (field) {
              const resolvedName = (field.type || "").replace(/[!\[\]]/g, "");
              typePath.push(resolvedName);
              currentType = types[resolvedName] || null;
            }
          }
        }
      }
      return typePath.length > 0 ? typePath[typePath.length - 1] : null;
    }
    function mapCompletionKind(kind) {
      if (typeof monaco === "undefined") return 0;
      const map = {
        "field": monaco.languages.CompletionItemKind.Field,
        "keyword": monaco.languages.CompletionItemKind.Keyword,
        "argument": monaco.languages.CompletionItemKind.Property,
        "enum": monaco.languages.CompletionItemKind.EnumMember,
        "type": monaco.languages.CompletionItemKind.Class,
        "directive": monaco.languages.CompletionItemKind.Function,
        "fragment": monaco.languages.CompletionItemKind.Reference,
        "snippet": monaco.languages.CompletionItemKind.Snippet
      };
      return map[kind] || monaco.languages.CompletionItemKind.Text;
    }
    function updateOperationSelector() {
      if (!operationSelect) return;
      const queryEditor = editorsManager.getGraphqlQueryEditor();
      if (!queryEditor) return;
      const gqlText = queryEditor.getValue();
      const operations = extractOperations(gqlText);
      operationSelect.innerHTML = '<option value="">All operations</option>';
      for (const op of operations) {
        const opt = document.createElement("option");
        opt.value = op.name;
        opt.textContent = `${op.type}: ${op.name}`;
        operationSelect.appendChild(opt);
      }
      operationSelect.classList.toggle("hidden", operations.length <= 1);
      if (state.graphql.operationName) {
        operationSelect.value = state.graphql.operationName;
      }
    }
    function extractOperations(gqlDocument) {
      const operations = [];
      const lines = gqlDocument.split("\n");
      const regex = /^\s*(query|mutation|subscription)\s+(\w+)/;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(regex);
        if (match) {
          operations.push({
            type: match[1],
            name: match[2],
            line: i + 1
          });
        }
      }
      return operations;
    }
    function renderExplorer() {
      if (!typeTree || !schemaData) return;
      const types = schemaData.types || {};
      let html = "";
      const rootTypes = [
        { label: "Query", name: schemaData.queryType },
        { label: "Mutation", name: schemaData.mutationType },
        { label: "Subscription", name: schemaData.subscriptionType }
      ].filter((r) => r.name && types[r.name]);
      for (const root of rootTypes) {
        html += renderTypeNode(root.label, types[root.name], true);
      }
      const enums = [];
      const inputTypes = [];
      const interfaces = [];
      const unions = [];
      const objectTypes = [];
      const scalars = [];
      for (const [name, type] of Object.entries(types)) {
        if (rootTypes.some((r) => r.name === name)) continue;
        if (["String", "Int", "Float", "Boolean", "ID"].includes(name)) continue;
        switch (type.kind) {
          case "ENUM":
            enums.push(type);
            break;
          case "INPUT_OBJECT":
            inputTypes.push(type);
            break;
          case "INTERFACE":
            interfaces.push(type);
            break;
          case "UNION":
            unions.push(type);
            break;
          case "SCALAR":
            scalars.push(type);
            break;
          case "OBJECT":
            objectTypes.push(type);
            break;
        }
      }
      if (enums.length > 0) {
        html += renderCategory("Enums", enums.map((t) => renderEnumNode(t)));
      }
      if (inputTypes.length > 0) {
        html += renderCategory("Input Types", inputTypes.map((t) => renderInputTypeNode(t)));
      }
      if (interfaces.length > 0) {
        html += renderCategory("Interfaces", interfaces.map((t) => renderTypeNode(t.name, t, false)));
      }
      if (unions.length > 0) {
        html += renderCategory("Unions", unions.map((t) => renderUnionNode(t)));
      }
      if (objectTypes.length > 0) {
        html += renderCategory("Types", objectTypes.map((t) => renderTypeNode(t.name, t, false)));
      }
      if (scalars.length > 0) {
        html += renderCategory("Scalars", scalars.map((t) => `<div class="explorer-leaf" data-type="${esc(t.name)}"><span class="explorer-scalar">${esc(t.name)}</span></div>`));
      }
      typeTree.innerHTML = html;
      typeTree.querySelectorAll(".explorer-toggle").forEach((toggle) => {
        toggle.addEventListener("click", (e) => {
          e.stopPropagation();
          const node = toggle.closest(".explorer-node");
          if (node) node.classList.toggle("collapsed");
        });
      });
      typeTree.querySelectorAll(".explorer-field-name").forEach((fieldEl) => {
        fieldEl.addEventListener("click", () => {
          const fieldName = fieldEl.getAttribute("data-field");
          if (fieldName) insertFieldIntoEditor(fieldName);
        });
      });
    }
    function renderTypeNode(label, type, expanded) {
      if (!type) return "";
      const fields = type.fields || [];
      const collapsedClass = expanded ? "" : "collapsed";
      let html = `<div class="explorer-node ${collapsedClass}" data-type="${esc(type.name)}">`;
      html += `<div class="explorer-toggle"><span class="explorer-icon">\u25B6</span> <span class="explorer-type-name">${esc(label)}</span>`;
      if (type.description) html += ` <span class="explorer-desc" title="${esc(type.description)}">\u2139</span>`;
      html += `</div>`;
      html += `<div class="explorer-children">`;
      for (const field of fields) {
        const deprecated = field.isDeprecated ? " deprecated" : "";
        html += `<div class="explorer-field${deprecated}">`;
        html += `<span class="explorer-field-name" data-field="${esc(field.name)}">${esc(field.name)}</span>`;
        if (field.args && field.args.length > 0) {
          const argsStr = field.args.map((a) => `${a.name}: ${a.type}`).join(", ");
          html += `<span class="explorer-args">(${esc(argsStr)})</span>`;
        }
        html += `<span class="explorer-field-type">: ${esc(field.type)}</span>`;
        if (field.description) html += ` <span class="explorer-desc" title="${esc(field.description)}">\u2139</span>`;
        if (field.isDeprecated) html += ` <span class="explorer-deprecated" title="${esc(field.deprecationReason || "Deprecated")}">\u26A0</span>`;
        html += `</div>`;
      }
      html += `</div></div>`;
      return html;
    }
    function renderEnumNode(type) {
      const values = type.enumValues || [];
      let html = `<div class="explorer-node collapsed" data-type="${esc(type.name)}">`;
      html += `<div class="explorer-toggle"><span class="explorer-icon">\u25B6</span> <span class="explorer-enum-name">${esc(type.name)}</span></div>`;
      html += `<div class="explorer-children">`;
      for (const v of values) {
        html += `<div class="explorer-enum-value">${esc(v.name)}</div>`;
      }
      html += `</div></div>`;
      return html;
    }
    function renderInputTypeNode(type) {
      const fields = type.inputFields || [];
      let html = `<div class="explorer-node collapsed" data-type="${esc(type.name)}">`;
      html += `<div class="explorer-toggle"><span class="explorer-icon">\u25B6</span> <span class="explorer-input-name">${esc(type.name)}</span></div>`;
      html += `<div class="explorer-children">`;
      for (const field of fields) {
        html += `<div class="explorer-field">`;
        html += `<span class="explorer-field-name">${esc(field.name)}</span>`;
        html += `<span class="explorer-field-type">: ${esc(field.type)}</span>`;
        html += `</div>`;
      }
      html += `</div></div>`;
      return html;
    }
    function renderUnionNode(type) {
      const possible = type.possibleTypes || [];
      let html = `<div class="explorer-node collapsed" data-type="${esc(type.name)}">`;
      html += `<div class="explorer-toggle"><span class="explorer-icon">\u25B6</span> <span class="explorer-union-name">${esc(type.name)}</span></div>`;
      html += `<div class="explorer-children">`;
      for (const t of possible) {
        html += `<div class="explorer-leaf">${esc(t)}</div>`;
      }
      html += `</div></div>`;
      return html;
    }
    function renderCategory(title, childrenHtml) {
      let html = `<div class="explorer-category">`;
      html += `<div class="explorer-category-header">${esc(title)}</div>`;
      html += childrenHtml.join("");
      html += `</div>`;
      return html;
    }
    function filterExplorerTree(query) {
      if (!typeTree) return;
      const nodes = typeTree.querySelectorAll(".explorer-node, .explorer-leaf");
      nodes.forEach((node) => {
        const typeName = node.getAttribute("data-type") || "";
        const text = node.textContent || "";
        const matches = !query || typeName.toLowerCase().includes(query.toLowerCase()) || text.toLowerCase().includes(query.toLowerCase());
        node.style.display = matches ? "" : "none";
      });
    }
    function insertFieldIntoEditor(fieldName) {
      const queryEditor = editorsManager.getGraphqlQueryEditor();
      if (!queryEditor) return;
      const position = queryEditor.getPosition();
      if (!position) return;
      queryEditor.executeEdits("graphql-explorer", [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text: fieldName + "\n"
      }]);
      queryEditor.focus();
    }
    function setStatus(text, type) {
      if (!schemaStatus) return;
      schemaStatus.textContent = text;
      schemaStatus.className = "graphql-status";
      if (type) schemaStatus.classList.add(`graphql-status-${type}`);
    }
    function esc(str) {
      if (!str) return "";
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function getMessageHandlers() {
      return {
        "graphqlSchemaReceived": (msg) => onSchemaReceived(msg),
        "graphqlSchemaError": (msg) => onSchemaError(msg),
        "graphqlSchemaCacheCleared": () => {
          schemaData = null;
          schemaEndpointUrl = null;
          setStatus("Cache cleared", "info");
          if (typeTree) typeTree.innerHTML = "";
        }
      };
    }
    function dispose() {
      if (completionDisposable) {
        completionDisposable.dispose();
        completionDisposable = null;
      }
      schemaData = null;
    }
    return {
      initialize,
      fetchSchema,
      getMessageHandlers,
      dispose,
      getSchemaData: () => schemaData,
      hasSchema: () => schemaData !== null
    };
  }

  // resources/features/request-tester/modules/cookie-manager.js
  function createCookieManager({ postMessage }) {
    let cookieCache = {};
    return {
      /**
       * Load cookies from flat array into domain-keyed cache
       * Called when cookies are received from the extension
       * @param {Array} cookies - Array of cookie objects with domain property
       */
      loadCookies(cookies) {
        cookieCache = {};
        if (!Array.isArray(cookies)) {
          cookieCache = cookies || {};
          return;
        }
        for (const cookie of cookies) {
          const domain = cookie.domain || "_default";
          if (!cookieCache[domain]) {
            cookieCache[domain] = [];
          }
          cookieCache[domain].push(cookie);
        }
      },
      /**
       * Get a cookie value by name
       * @param {string} name - Cookie name
       * @param {string} [domain] - Optional domain filter
       * @returns {string|undefined}
       */
      get(name, domain) {
        if (domain && cookieCache[domain]) {
          const cookie = cookieCache[domain].find((c) => c.name === name);
          return cookie?.value;
        }
        for (const cookies of Object.values(cookieCache)) {
          const cookie = cookies.find((c) => c.name === name);
          if (cookie) return cookie.value;
        }
        return void 0;
      },
      /**
       * Set a cookie
       * @param {string} name - Cookie name
       * @param {string} value - Cookie value
       * @param {Object} [options] - Cookie options
       * @param {string} [options.domain] - Cookie domain
       * @param {string} [options.path] - Cookie path
       * @param {number} [options.expires] - Expiry timestamp
       * @param {boolean} [options.httpOnly] - HTTP only flag
       * @param {boolean} [options.secure] - Secure flag
       */
      set(name, value, options = {}) {
        const cookie = {
          name,
          value,
          domain: options.domain || "",
          path: options.path || "/",
          expires: options.expires,
          httpOnly: options.httpOnly || false,
          secure: options.secure || false
        };
        const domain = cookie.domain || "_default";
        if (!cookieCache[domain]) {
          cookieCache[domain] = [];
        }
        const idx = cookieCache[domain].findIndex((c) => c.name === name);
        if (idx >= 0) {
          cookieCache[domain][idx] = cookie;
        } else {
          cookieCache[domain].push(cookie);
        }
        postMessage({
          command: "setCookie",
          cookie
        });
      },
      /**
       * Check if a cookie exists
       * @param {string} name - Cookie name
       * @param {string} [domain] - Optional domain filter
       * @returns {boolean}
       */
      has(name, domain) {
        return this.get(name, domain) !== void 0;
      },
      /**
       * Get all cookies
       * @param {string} [domain] - Optional domain filter
       * @returns {Array}
       */
      getAll(domain) {
        if (domain) {
          return cookieCache[domain] || [];
        }
        const all = [];
        for (const cookies of Object.values(cookieCache)) {
          all.push(...cookies);
        }
        return all;
      },
      /**
       * Delete a cookie
       * @param {string} name - Cookie name
       * @param {string} [domain] - Optional domain filter
       */
      delete(name, domain) {
        if (domain && cookieCache[domain]) {
          cookieCache[domain] = cookieCache[domain].filter((c) => c.name !== name);
        } else {
          for (const d of Object.keys(cookieCache)) {
            cookieCache[d] = cookieCache[d].filter((c) => c.name !== name);
          }
        }
        postMessage({
          command: "deleteCookie",
          name,
          domain
        });
      },
      /**
       * Clear all cookies
       * @param {string} [domain] - Optional domain filter
       */
      clear(domain) {
        if (domain) {
          delete cookieCache[domain];
        } else {
          cookieCache = {};
        }
        postMessage({
          command: "clearCookies",
          domain
        });
      },
      /**
       * Get the raw cookie cache
       * @returns {Object}
       */
      getRawCache() {
        return { ...cookieCache };
      }
    };
  }

  // resources/features/request-tester/modules/form-manager.js
  function createFormManager({ elements, state, escapeHtml: escapeHtml2, updateUrlPreview, syncUrlWithQueryParams, markDirty }) {
    const TYPE_OPTIONS = ["string", "integer", "number", "boolean", "array"];
    const FORMAT_SUGGESTIONS = {
      string: ["date-time", "date", "time", "email", "uri", "uuid", "hostname", "ipv4", "ipv6", "byte", "binary", "password"],
      integer: ["int32", "int64"],
      number: ["float", "double"]
    };
    function buildMetaDetailHtml(meta = {}) {
      const typeOptions = TYPE_OPTIONS.map(
        (t) => `<option value="${t}" ${meta.type === t ? "selected" : ""}>${t}</option>`
      ).join("");
      const enumTags = (meta.enum || []).map(
        (v) => `<span class="enum-tag">${escapeHtml2(v)}<span class="remove-enum" title="Remove">\xD7</span></span>`
      ).join("");
      return `
            <div class="meta-field">
                <label>Type</label>
                <select class="meta-type">
                    <option value="">\u2014</option>
                    ${typeOptions}
                </select>
            </div>
            <div class="meta-field">
                <label>Format</label>
                <input type="text" class="meta-format" placeholder="e.g. date-time, int32" value="${escapeHtml2(meta.format || "")}" list="format-suggestions">
            </div>
            <div class="meta-field full-width">
                <label>Description</label>
                <textarea class="meta-description" placeholder="Parameter description" rows="1">${escapeHtml2(meta.description || "")}</textarea>
            </div>
            <div class="meta-toggles">
                <label class="meta-toggle-label">
                    <input type="checkbox" class="meta-required" ${meta.required ? "checked" : ""}>
                    Required
                </label>
                <label class="meta-toggle-label">
                    <input type="checkbox" class="meta-deprecated" ${meta.deprecated ? "checked" : ""}>
                    Deprecated
                </label>
            </div>
            <div class="enum-editor">
                <label style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--vscode-descriptionForeground,#808080);font-weight:600;">Enum Values</label>
                <div class="enum-tags">${enumTags}</div>
                <div class="enum-input-row">
                    <input type="text" class="enum-new-value" placeholder="Add enum value">
                    <button class="enum-add-btn" type="button">+</button>
                </div>
            </div>
        `;
    }
    function hasMetaContent(meta) {
      if (!meta) return false;
      return !!(meta.type || meta.required || meta.description || meta.format || meta.enum && meta.enum.length > 0 || meta.deprecated);
    }
    function readMetaFromPanel(detailEl) {
      const meta = {};
      const typeVal = detailEl.querySelector(".meta-type")?.value;
      if (typeVal) meta.type = typeVal;
      const formatVal = detailEl.querySelector(".meta-format")?.value?.trim();
      if (formatVal) meta.format = formatVal;
      const descVal = detailEl.querySelector(".meta-description")?.value?.trim();
      if (descVal) meta.description = descVal;
      const reqCheck = detailEl.querySelector(".meta-required");
      if (reqCheck?.checked) meta.required = true;
      const depCheck = detailEl.querySelector(".meta-deprecated");
      if (depCheck?.checked) meta.deprecated = true;
      const enumVals = [];
      detailEl.querySelectorAll(".enum-tag").forEach((tag) => {
        const text = tag.childNodes[0]?.textContent?.trim();
        if (text) enumVals.push(text);
      });
      if (enumVals.length > 0) meta.enum = enumVals;
      return meta;
    }
    function attachMetaListeners(detailEl, row, metaMapKey, itemKey, toggleBtn) {
      const updateMeta = () => {
        const meta = readMetaFromPanel(detailEl);
        if (!state[metaMapKey]) state[metaMapKey] = {};
        state[metaMapKey][itemKey] = meta;
        row.classList.toggle("is-deprecated", !!meta.deprecated);
        row.classList.toggle("is-required", !!meta.required);
        toggleBtn.classList.toggle("has-meta", hasMetaContent(meta));
        if (markDirty) markDirty();
      };
      detailEl.querySelector(".meta-type")?.addEventListener("change", updateMeta);
      detailEl.querySelector(".meta-format")?.addEventListener("input", updateMeta);
      detailEl.querySelector(".meta-description")?.addEventListener("input", updateMeta);
      detailEl.querySelector(".meta-required")?.addEventListener("change", updateMeta);
      detailEl.querySelector(".meta-deprecated")?.addEventListener("change", updateMeta);
      const enumAddBtn = detailEl.querySelector(".enum-add-btn");
      const enumInput = detailEl.querySelector(".enum-new-value");
      const enumTagsContainer = detailEl.querySelector(".enum-tags");
      const addEnumValue = () => {
        const val = enumInput?.value?.trim();
        if (!val) return;
        const tag = document.createElement("span");
        tag.className = "enum-tag";
        tag.innerHTML = `${escapeHtml2(val)}<span class="remove-enum" title="Remove">\xD7</span>`;
        tag.querySelector(".remove-enum").addEventListener("click", () => {
          tag.remove();
          updateMeta();
        });
        enumTagsContainer.appendChild(tag);
        enumInput.value = "";
        updateMeta();
      };
      enumAddBtn?.addEventListener("click", addEnumValue);
      enumInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addEnumValue();
        }
      });
      detailEl.querySelectorAll(".enum-tag .remove-enum").forEach((btn) => {
        btn.addEventListener("click", () => {
          btn.parentElement.remove();
          updateMeta();
        });
      });
    }
    function wrapRowWithMeta(row, type, key, metaMapKey) {
      const meta = state[metaMapKey] && state[metaMapKey][key] || {};
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "schema-toggle" + (hasMetaContent(meta) ? " has-meta" : "");
      toggleBtn.type = "button";
      toggleBtn.title = "Edit OpenAPI schema metadata";
      toggleBtn.textContent = "{}";
      const removeBtn = row.querySelector(".remove-btn");
      if (removeBtn) {
        row.insertBefore(toggleBtn, removeBtn);
      } else {
        row.appendChild(toggleBtn);
      }
      const detailEl = document.createElement("div");
      detailEl.className = "param-meta-detail";
      detailEl.innerHTML = buildMetaDetailHtml(meta);
      const wrapper = document.createElement("div");
      wrapper.className = "param-row-wrapper";
      wrapper.dataset.type = type;
      wrapper.appendChild(row);
      wrapper.appendChild(detailEl);
      if (meta.deprecated) row.classList.add("is-deprecated");
      if (meta.required) row.classList.add("is-required");
      toggleBtn.addEventListener("click", () => {
        const isOpen = detailEl.classList.toggle("open");
        toggleBtn.classList.toggle("active", isOpen);
      });
      attachMetaListeners(detailEl, row, metaMapKey, key, toggleBtn);
      return wrapper;
    }
    function addParamRow(type, key, value, isNew = false, keyDisabled = false, enabled = true, options = null, pattern = null) {
      const container = type === "path" ? elements.pathParams : elements.queryParams;
      const row = document.createElement("div");
      row.className = "param-row";
      row.dataset.type = type;
      row.dataset.key = key;
      const checkboxHtml = type === "query" ? `<input type="checkbox" class="param-checkbox" ${enabled ? "checked" : ""} title="Include in request">` : "";
      let valueHtml;
      let effectiveValue = value;
      if (options && options.length > 0) {
        if (!value || !options.includes(value)) {
          effectiveValue = options[0];
          if (type === "path") {
            state.pathParams[key] = effectiveValue;
          }
        }
        const optionsHtml = options.map(
          (opt) => `<option value="${escapeHtml2(opt)}" ${opt === effectiveValue ? "selected" : ""}>${escapeHtml2(opt)}</option>`
        ).join("");
        valueHtml = `<select class="value">${optionsHtml}</select>`;
      } else {
        const patternHint = pattern ? ` title="Must match: ${escapeHtml2(pattern)}"` : "";
        valueHtml = `<input type="text" class="value" placeholder="Value or {{variable}}" value="${escapeHtml2(value)}"${patternHint}>`;
      }
      row.innerHTML = `
            ${checkboxHtml}
            <input type="text" class="key" placeholder="Key" value="${escapeHtml2(key)}" ${keyDisabled ? "disabled" : ""}>
            ${valueHtml}
            ${isNew ? '<button class="icon-btn remove-btn" title="Remove">\xD7</button>' : ""}
        `;
      const checkbox = row.querySelector(".param-checkbox");
      const keyInput = row.querySelector(".key");
      const valueElement = row.querySelector(".value");
      const removeBtn = row.querySelector(".remove-btn");
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          updateQueryParamsState();
          if (syncUrlWithQueryParams) syncUrlWithQueryParams();
          if (markDirty) markDirty();
          updateUrlPreview();
        });
      }
      keyInput.addEventListener("input", () => {
        if (type === "query") {
          updateQueryParamsState();
          if (syncUrlWithQueryParams) syncUrlWithQueryParams();
        }
        if (markDirty) markDirty();
        updateUrlPreview();
      });
      const valueEventType = valueElement.tagName === "SELECT" ? "change" : "input";
      valueElement.addEventListener(valueEventType, () => {
        if (type === "path") {
          state.pathParams[key] = valueElement.value;
        } else if (type === "query") {
          updateQueryParamsState();
          if (syncUrlWithQueryParams) syncUrlWithQueryParams();
        }
        if (markDirty) markDirty();
        updateUrlPreview();
      });
      if (pattern && valueElement.tagName === "INPUT") {
        valueElement.addEventListener("blur", () => {
          const val = valueElement.value;
          if (!val || val.startsWith("{{")) {
            valueElement.classList.remove("invalid");
            return;
          }
          try {
            const regex = new RegExp(`^(${pattern})$`);
            if (regex.test(val)) {
              valueElement.classList.remove("invalid");
            } else {
              valueElement.classList.add("invalid");
            }
          } catch (e) {
            console.warn("Invalid regex pattern:", pattern, e);
          }
        });
      }
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          const wrapper2 = row.closest(".param-row-wrapper");
          if (wrapper2) {
            wrapper2.remove();
          } else {
            row.remove();
          }
          if (type === "query" && key && state._queryMeta) {
            delete state._queryMeta[key];
          }
          if (type === "path" && key && state._paramsMeta) {
            delete state._paramsMeta[key];
          }
          updateQueryParamsState();
          if (syncUrlWithQueryParams) syncUrlWithQueryParams();
          if (markDirty) markDirty();
          updateUrlPreview();
        });
      }
      const metaMapKey = type === "path" ? "_paramsMeta" : "_queryMeta";
      const wrapper = wrapRowWithMeta(row, type, key, metaMapKey);
      if (container) {
        container.appendChild(wrapper);
      } else {
        console.error("Container not found for param type:", type);
      }
    }
    function addHeaderRow(key, value, isNew = false, enabled = true) {
      const row = document.createElement("div");
      row.className = "param-row";
      const checkboxHtml = `<input type="checkbox" class="param-checkbox" ${enabled ? "checked" : ""} title="Enable/disable this header">`;
      row.innerHTML = `
            ${checkboxHtml}
            <input type="text" class="key" placeholder="Header name" value="${escapeHtml2(key)}">
            <input type="text" class="value" placeholder="Value or {{variable}}" value="${escapeHtml2(value)}">
            ${isNew ? '<button class="icon-btn remove-btn" title="Remove">\xD7</button>' : ""}
        `;
      const checkbox = row.querySelector(".param-checkbox");
      const keyInput = row.querySelector(".key");
      const valueInput = row.querySelector(".value");
      const removeBtn = row.querySelector(".remove-btn");
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          if (markDirty) markDirty();
        });
      }
      if (keyInput) {
        keyInput.addEventListener("input", () => {
          if (markDirty) markDirty();
        });
      }
      if (valueInput) {
        valueInput.addEventListener("input", () => {
          if (markDirty) markDirty();
        });
      }
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          const wrapper2 = row.closest(".param-row-wrapper");
          if (wrapper2) {
            wrapper2.remove();
          } else {
            row.remove();
          }
          if (key && state._headersMeta) {
            delete state._headersMeta[key];
          }
          if (markDirty) markDirty();
        });
      }
      const wrapper = wrapRowWithMeta(row, "header", key, "_headersMeta");
      if (elements.headersList) {
        elements.headersList.appendChild(wrapper);
      } else {
        console.error("Headers list element not found");
      }
    }
    function updateQueryParamsState() {
      state.queryParams = [];
      elements.queryParams?.querySelectorAll(".param-row").forEach((row) => {
        const checkbox = row.querySelector(".param-checkbox");
        const key = row.querySelector(".key")?.value;
        const value = row.querySelector(".value")?.value;
        const enabled = checkbox ? checkbox.checked : true;
        if (key) {
          const entry = { key, value: value || "", enabled };
          if (state._queryMeta && state._queryMeta[key]) {
            Object.assign(entry, state._queryMeta[key]);
          }
          state.queryParams.push(entry);
        }
      });
    }
    function clearForm() {
      if (elements.pathParams) elements.pathParams.innerHTML = "";
      if (elements.queryParams) elements.queryParams.innerHTML = "";
      if (elements.headersList) elements.headersList.innerHTML = "";
      state.pathParams = {};
      state.queryParams = [];
      state._headersMeta = {};
      state._queryMeta = {};
      state._paramsMeta = {};
    }
    function applyBodyData({ bodyFields, method, editor }) {
      if (!editor) {
        console.warn("[FormManager] Cannot apply body data - Monaco not ready");
        return;
      }
      const upperMethod = method?.toUpperCase();
      const methodsWithBody = ["POST", "PUT", "PATCH"];
      const supportsBody = methodsWithBody.includes(upperMethod);
      editor.updateOptions({ readOnly: !supportsBody });
      const bodyEditorContainer = document.getElementById("body-editor");
      if (bodyEditorContainer) {
        bodyEditorContainer.classList.toggle("disabled", !supportsBody);
      }
      if (!supportsBody) {
        const message = `// Request body is not supported for ${upperMethod} requests.
// Only POST, PUT, and PATCH methods can include a request body.`;
        safeSetEditorValue(editor, message);
        state.body = "";
        return;
      }
      if (bodyFields && bodyFields.length > 0) {
        const bodyTemplate = {};
        bodyFields.forEach((field) => {
          const parts = field.split(".");
          let current = bodyTemplate;
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
              if (current[part] === void 0) {
                current[part] = "";
              }
            } else {
              if (current[part] === void 0 || typeof current[part] !== "object") {
                current[part] = {};
              }
              current = current[part];
            }
          }
        });
        const bodyStr = JSON.stringify(bodyTemplate, null, 2);
        safeSetEditorValue(editor, bodyStr);
        state.body = bodyStr;
      } else {
        const emptyTemplate = "{\n  \n}";
        safeSetEditorValue(editor, emptyTemplate);
        state.body = emptyTemplate;
      }
    }
    return {
      addParamRow,
      addHeaderRow,
      updateQueryParamsState,
      clearForm,
      applyBodyData
    };
  }

  // resources/features/request-tester/modules/history-renderer.js
  function createHistoryRenderer({ escapeHtml: escapeHtml2, formatTime: formatTime2, formatDuration: formatDuration2, postMessage }) {
    let historyListElement = null;
    let onEntryClick = null;
    let onEntryDelete = null;
    let onEntryShare = null;
    let onEntryMove = null;
    let onGroupRename = null;
    function setElement(element) {
      historyListElement = element;
    }
    function setOnEntryClick(handler) {
      onEntryClick = handler;
    }
    function setOnEntryDelete(handler) {
      onEntryDelete = handler;
    }
    function setOnEntryShare(handler) {
      onEntryShare = handler;
    }
    function setOnEntryMove(handler) {
      onEntryMove = handler;
    }
    function setOnGroupRename(handler) {
      onGroupRename = handler;
    }
    function render(history) {
      if (!historyListElement) return;
      historyListElement.innerHTML = "";
      if (!history || !Array.isArray(history) || history.length === 0) {
        historyListElement.innerHTML = '<div class="history-empty">No history yet</div>';
        return;
      }
      history.forEach((historyGroup, index) => {
        const { ticket, branch, isCurrent, entries } = historyGroup;
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
          return;
        }
        const group = createGroupElement(historyGroup);
        historyListElement.appendChild(group);
      });
    }
    function createGroupElement({ ticket, branch, isCurrent, isShared, entries }) {
      const group = document.createElement("div");
      group.className = "history-group";
      if (isCurrent) {
        group.classList.add("current-branch");
      }
      const displayName = ticket || branch || "Unknown";
      const header = createGroupHeader(displayName, ticket, isCurrent, isShared, branch);
      group.appendChild(header);
      const entriesContainer = createEntriesContainer(entries, isShared);
      group.appendChild(entriesContainer);
      return group;
    }
    function createGroupHeader(displayName, ticket, isCurrent, isShared, branch) {
      const header = document.createElement("div");
      header.className = "history-group-header";
      const ticketSpan = ticket ? `<span class="ticket-link">${escapeHtml2(displayName)}</span>` : escapeHtml2(displayName);
      const sharedBadge = isShared ? ' <span class="shared-badge">shared</span>' : "";
      const renameButton = isShared ? ' <button class="rename-button" title="Rename shared group">\u270E</button>' : "";
      header.innerHTML = `<span class="chevron">\u25BC</span> ${ticketSpan}${isCurrent ? ' <span class="current-badge" title="Current branch">\u{1F4CD}</span>' : ""}${sharedBadge}${renameButton}`;
      header.addEventListener("click", (e) => {
        if (e.target.classList.contains("ticket-link")) return;
        header.parentElement.classList.toggle("collapsed");
      });
      if (ticket) {
        const ticketEl = header.querySelector(".ticket-link");
        ticketEl?.addEventListener("click", (e) => {
          e.stopPropagation();
          postMessage({ command: "openJiraTicket", ticket });
        });
      }
      if (isShared) {
        const renameEl = header.querySelector(".rename-button");
        renameEl?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onGroupRename) {
            onGroupRename(branch);
          }
        });
      }
      return header;
    }
    function createEntriesContainer(entries, isShared) {
      const container = document.createElement("div");
      container.className = "history-group-entries";
      entries.forEach((entry) => {
        const entryDiv = createEntryElement(entry, isShared);
        container.appendChild(entryDiv);
      });
      return container;
    }
    function createEntryElement(entry, isShared) {
      const statusCode = entry.response?.status || entry.statusCode || 0;
      const timestamp = entry.timestamp || Date.now();
      const executionTime = entry.response?.time || 0;
      let durationClass = "";
      if (executionTime > 0) {
        if (executionTime < 500) durationClass = "fast";
        else if (executionTime > 3e3) durationClass = "very-slow";
        else if (executionTime > 1e3) durationClass = "slow";
      }
      const entryDiv = document.createElement("div");
      entryDiv.className = "history-entry";
      entryDiv.dataset.entryId = entry.id;
      const actionButton = isShared ? '<button class="icon-btn move-btn" title="Move to shared group">\u21C4</button>' : '<button class="icon-btn share-btn" title="Share">\u2934</button>';
      entryDiv.innerHTML = `
            <span class="time">${formatTime2(timestamp)}</span>
            <span class="status ${statusCode >= 200 && statusCode < 400 ? "success" : "error"}">${statusCode}</span>
            <span class="duration ${durationClass}">${formatDuration2(executionTime)}</span>
            ${actionButton}
            <button class="icon-btn delete-btn" title="Delete">\xD7</button>
        `;
      entryDiv.addEventListener("click", (e) => {
        if (!e.target.classList.contains("delete-btn") && !e.target.classList.contains("share-btn") && !e.target.classList.contains("move-btn")) {
          document.querySelectorAll(".history-entry.active").forEach((el) => el.classList.remove("active"));
          entryDiv.classList.add("active");
          if (onEntryClick) {
            onEntryClick(entry.id, isShared);
          }
        }
      });
      entryDiv.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (onEntryDelete) {
          onEntryDelete(entry.id, isShared);
        }
      });
      const shareEl = entryDiv.querySelector(".share-btn");
      if (shareEl) {
        shareEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onEntryShare) {
            onEntryShare(entry.id);
          }
        });
      }
      const moveEl = entryDiv.querySelector(".move-btn");
      if (moveEl) {
        moveEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onEntryMove) {
            onEntryMove(entry.id);
          }
        });
      }
      return entryDiv;
    }
    return {
      setElement,
      setOnEntryClick,
      setOnEntryDelete,
      setOnEntryShare,
      setOnEntryMove,
      setOnGroupRename,
      render
    };
  }

  // resources/features/request-tester/modules/request-builder.js
  function createRequestBuilder({ elements, state, getMethod, getPath }) {
    function buildPathParams() {
      const pathParams = {};
      elements.pathParams?.querySelectorAll(".param-row").forEach((row) => {
        const key = row.dataset.key;
        const value = row.querySelector(".value")?.value;
        if (key && value) {
          pathParams[key] = value;
        }
      });
      return pathParams;
    }
    function updateQueryParams() {
      state.queryParams = [];
      elements.queryParams?.querySelectorAll(".param-row").forEach((row) => {
        const checkbox = row.querySelector(".param-checkbox");
        const key = row.querySelector(".key")?.value;
        const value = row.querySelector(".value")?.value;
        const enabled = checkbox ? checkbox.checked : true;
        if (key) {
          state.queryParams.push({ key, value: value || "", enabled });
        }
      });
    }
    function buildQueryObject() {
      return state.queryParams.reduce((acc, { key, value, enabled }) => {
        if (key && enabled) acc[key] = value;
        return acc;
      }, {});
    }
    function getHeaders() {
      const headers = {};
      elements.headersList?.querySelectorAll(".param-row").forEach((row) => {
        const checkbox = row.querySelector(".param-checkbox");
        const enabled = checkbox ? checkbox.checked : true;
        const key = row.querySelector(".key")?.value;
        const value = row.querySelector(".value")?.value;
        if (key && enabled) {
          headers[key] = value || "";
        }
      });
      return headers;
    }
    function buildAuth() {
      const authType = state.authType || "none";
      if (authType === "none") {
        return { type: "none" };
      }
      if (authType === "inherit") {
        return { type: "inherit" };
      }
      if (authType === "bearer") {
        return {
          type: "bearer",
          bearerToken: state.bearerToken || ""
        };
      }
      if (authType === "basic") {
        return {
          type: "basic",
          basicAuth: {
            username: state.basicAuth?.username || "",
            password: state.basicAuth?.password || ""
          }
        };
      }
      if (authType === "apikey") {
        return {
          type: "apikey",
          apikey: {
            key: state.apiKey?.key || "",
            value: state.apiKey?.value || "",
            in: state.apiKey?.in || "header"
          }
        };
      }
      if (authType === "oauth2" && state.oauth2) {
        return {
          type: "oauth2",
          oauth2: { ...state.oauth2 }
        };
      }
      return { type: authType };
    }
    function buildRequest() {
      updateQueryParams();
      const saveResponse = elements.saveResponseCheckbox?.checked || false;
      const body = buildRequestBody();
      return {
        method: getMethod ? getMethod() : "GET",
        path: getPath ? getPath() : "",
        params: buildPathParams(),
        query: buildQueryObject(),
        headers: getHeaders(),
        body,
        // RequestBody format: { type, format?, content }
        auth: buildAuth(),
        // Consolidated auth object matching RequestAuth
        saveResponse,
        settings: { ...state.settings },
        scripts: {
          preRequest: state.scripts.preRequest,
          postResponse: state.scripts.postResponse
        }
      };
    }
    function buildRequestBody() {
      const bodyType = state.bodyType || "none";
      switch (bodyType) {
        case "none":
          return null;
        case "raw":
          return {
            type: "raw",
            format: state.rawFormat || "json",
            content: state.body || ""
          };
        case "form-data":
          const formData = state.formData?.filter((f) => f.enabled && f.key) || [];
          return {
            type: "form-data",
            content: formData
          };
        case "x-www-form-urlencoded":
          const urlEncoded = state.urlEncodedData?.filter((f) => f.enabled && f.key) || [];
          return {
            type: "x-www-form-urlencoded",
            content: urlEncoded
          };
        case "binary":
          return {
            type: "binary",
            content: state.binaryFile
          };
        case "graphql":
          let variables = {};
          try {
            if (state.graphql?.variables?.trim()) {
              variables = JSON.parse(state.graphql.variables);
            }
          } catch (e) {
            console.warn("Invalid GraphQL variables JSON");
          }
          return {
            type: "graphql",
            content: {
              query: state.graphql?.query || "",
              variables,
              operationName: state.graphql?.operationName || void 0
            }
          };
        default:
          return null;
      }
    }
    return {
      buildPathParams,
      updateQueryParams,
      buildQueryObject,
      getHeaders,
      buildAuth,
      buildRequestBody,
      buildRequest
    };
  }

  // resources/features/request-tester/modules/request-executor.js
  function createRequestExecutor({
    vscode: vscode2,
    state,
    requestBuilder,
    responseHandler,
    testResultsManager,
    onBeforeSend,
    onAfterResponse,
    onError
  }) {
    let isRequestInProgress = false;
    async function execute(overrides = {}) {
      if (isRequestInProgress) {
        cancel();
        return;
      }
      isRequestInProgress = true;
      if (onBeforeSend) {
        onBeforeSend();
      }
      testResultsManager.clear();
      let request = requestBuilder.buildRequest();
      if (overrides.method) request.method = overrides.method;
      if (overrides.url) request.url = overrides.url;
      if (overrides.headers) request.headers = { ...request.headers, ...overrides.headers };
      if (overrides.body !== void 0) request.body = overrides.body;
      vscode2.postMessage({
        command: "sendRequest",
        type: "sendRequest",
        request
      });
    }
    async function handleResponse(response, scriptResults = {}) {
      isRequestInProgress = false;
      if (onAfterResponse) {
        onAfterResponse();
      }
      if (response.error) {
        if (onError) {
          onError(response.error);
        }
        return;
      }
      if (response.testResults && response.testResults.length > 0) {
        response.testResults.forEach((result) => {
          testResultsManager.addResult(result);
        });
      }
      await responseHandler.handleResponse(response, scriptResults);
    }
    function handleError(message) {
      isRequestInProgress = false;
      if (onAfterResponse) {
        onAfterResponse();
      }
      if (onError) {
        onError(message);
      }
    }
    function cancel() {
      if (isRequestInProgress) {
        vscode2.postMessage({ type: "cancelRequest", command: "cancelRequest" });
        isRequestInProgress = false;
        if (onAfterResponse) {
          onAfterResponse();
        }
      }
    }
    function isInProgress() {
      return isRequestInProgress;
    }
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

  // resources/features/request-tester/modules/response-handler.js
  function createResponseHandler({
    elements,
    state,
    getResponseBodyEditor,
    escapeHtml: escapeHtml2,
    formatDuration: formatDuration2,
    testResultsManager
  }) {
    let currentBodyView = "raw";
    function switchBodyView(view) {
      const editorContainer = elements.responseBodyEditor;
      const previewContainer = elements.responseHtmlPreview;
      const editor = getResponseBodyEditor();
      currentBodyView = view;
      if (view === "preview") {
        if (editorContainer) editorContainer.style.display = "none";
        if (previewContainer) previewContainer.classList.add("active");
        if (elements.responseViewRawBtn) elements.responseViewRawBtn.classList.remove("active");
        if (elements.responseViewPreviewBtn) elements.responseViewPreviewBtn.classList.add("active");
      } else {
        if (editorContainer) editorContainer.style.display = "";
        if (previewContainer) previewContainer.classList.remove("active");
        if (elements.responseViewRawBtn) elements.responseViewRawBtn.classList.add("active");
        if (elements.responseViewPreviewBtn) elements.responseViewPreviewBtn.classList.remove("active");
        try {
          editor?.layout();
        } catch (e) {
        }
      }
    }
    if (elements.responseViewRawBtn && elements.responseViewPreviewBtn) {
      elements.responseViewRawBtn.addEventListener("click", () => switchBodyView("raw"));
      elements.responseViewPreviewBtn.addEventListener("click", () => switchBodyView("preview"));
    }
    function clearResponse() {
      if (testResultsManager) {
        testResultsManager.clear();
      }
      if (elements.responseStatus) {
        elements.responseStatus.classList.add("hidden");
        elements.responseStatus.textContent = "";
      }
      if (elements.responseTime) {
        elements.responseTime.classList.add("hidden");
        elements.responseTime.textContent = "";
      }
      const editor = getResponseBodyEditor();
      if (editor) {
        safeSetEditorValue(editor, "");
      }
      if (elements.responseHeadersTable) {
        elements.responseHeadersTable.innerHTML = "";
      }
      if (elements.responseCookiesTable) {
        elements.responseCookiesTable.innerHTML = "";
      }
      if (elements.sentRequestUrl) {
        elements.sentRequestUrl.textContent = "";
      }
      if (elements.sentRequestParamsTable) {
        elements.sentRequestParamsTable.innerHTML = "";
      }
      if (elements.sentRequestParamsSection) {
        elements.sentRequestParamsSection.style.display = "none";
      }
      if (elements.sentRequestQueryTable) {
        elements.sentRequestQueryTable.innerHTML = "";
      }
      if (elements.sentRequestQuerySection) {
        elements.sentRequestQuerySection.style.display = "none";
      }
      if (elements.sentRequestHeadersTable) {
        elements.sentRequestHeadersTable.innerHTML = "";
      }
      if (elements.sentRequestBody) {
        elements.sentRequestBody.textContent = "";
      }
      if (elements.sentRequestBodyType) {
        elements.sentRequestBodyType.textContent = "";
      }
      if (elements.sentRequestBodySection) {
        elements.sentRequestBodySection.style.display = "none";
      }
      if (elements.sentRequestPlaceholder) {
        elements.sentRequestPlaceholder.style.display = "flex";
      }
      elements.responsePlaceholder?.classList.remove("hidden");
      if (elements.responseBodyToolbar) elements.responseBodyToolbar.classList.add("hidden");
      if (elements.responseHtmlPreview) elements.responseHtmlPreview.classList.remove("active");
      if (elements.responseBodyEditor) elements.responseBodyEditor.style.display = "";
      clearVisualizer();
    }
    function renderTemplate(template, data) {
      if (!template) return "";
      if (!data) return template;
      function resolvePath(obj, path) {
        return path.split(".").reduce((o, k) => o != null ? o[k] : void 0, obj);
      }
      function render(tpl, ctx) {
        tpl = tpl.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, path, body) => {
          const arr = resolvePath(ctx, path);
          if (!Array.isArray(arr)) return "";
          return arr.map((item, index) => {
            const itemCtx = typeof item === "object" && item !== null ? { ...ctx, ...item, "@index": index, "@first": index === 0, "@last": index === arr.length - 1, "this": item } : { ...ctx, "@index": index, "@first": index === 0, "@last": index === arr.length - 1, "this": item };
            return render(body, itemCtx);
          }).join("");
        });
        tpl = tpl.replace(/\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, path, body) => {
          const val = resolvePath(ctx, path);
          const parts = body.split("{{else}}");
          if (val) return render(parts[0], ctx);
          return parts[1] ? render(parts[1], ctx) : "";
        });
        tpl = tpl.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, path) => {
          const val = resolvePath(ctx, path);
          return val != null ? String(val) : "";
        });
        tpl = tpl.replace(/\{\{([\w.@]+)\}\}/g, (_, path) => {
          const val = resolvePath(ctx, path);
          if (val == null) return "";
          const s = String(val);
          return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        });
        return tpl;
      }
      return render(template, data);
    }
    function updateVisualizerTab(visualizerData) {
      const tabBtn = elements.visualizeTabBtn;
      const iframe = elements.visualizerIframe;
      const placeholder = elements.visualizerPlaceholder;
      if (!visualizerData || !visualizerData.template) {
        clearVisualizer();
        return;
      }
      if (tabBtn) tabBtn.classList.remove("hidden");
      const renderedHtml = renderTemplate(visualizerData.template, visualizerData.data || {});
      const fullHtml = `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 8px;
            color: #d4d4d4;
            background: #1e1e1e;
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #444; padding: 6px 10px; text-align: left; }
        th { background: #2d2d2d; }
        tr:nth-child(even) { background: #252525; }
        a { color: #569cd6; }
        img { max-width: 100%; }
    </style>
</head>
<body>${renderedHtml}</body>
</html>`;
      if (iframe) {
        iframe.srcdoc = fullHtml;
        iframe.classList.remove("hidden");
      }
      if (placeholder) placeholder.classList.add("hidden");
    }
    function clearVisualizer() {
      const tabBtn = elements.visualizeTabBtn;
      const iframe = elements.visualizerIframe;
      const placeholder = elements.visualizerPlaceholder;
      if (tabBtn) tabBtn.classList.add("hidden");
      if (iframe) {
        iframe.srcdoc = "";
        iframe.classList.add("hidden");
      }
      if (placeholder) placeholder.classList.remove("hidden");
    }
    function updateStatusBadge(statusCode, statusText) {
      if (elements.responseStatus) {
        elements.responseStatus.classList.remove("hidden");
        elements.responseStatus.textContent = `${statusCode} ${statusText}`;
        elements.responseStatus.className = `status-badge ${statusCode >= 200 && statusCode < 400 ? "success" : "error"}`;
      }
    }
    function updateResponseTime(duration) {
      if (elements.responseTime) {
        elements.responseTime.classList.remove("hidden");
        elements.responseTime.textContent = formatDuration2(duration);
      }
    }
    function updateBodyEditor(response) {
      const editor = getResponseBodyEditor();
      if (!editor) return;
      let bodyContent = "";
      let language = "text";
      if (response.body) {
        if (typeof response.body === "object") {
          bodyContent = JSON.stringify(response.body, null, 2);
          language = "json";
        } else if (typeof response.body === "string") {
          if (isHtmlResponse(response)) {
            bodyContent = response.body;
            language = "html";
          } else {
            try {
              const parsed = JSON.parse(response.body);
              bodyContent = JSON.stringify(parsed, null, 2);
              language = "json";
            } catch {
              bodyContent = response.body;
            }
          }
        }
      }
      const model = editor.getModel();
      monaco.editor.setModelLanguage(model, language);
      safeSetEditorValue(editor, bodyContent);
      const isHtml = language === "html";
      if (isHtml && elements.responseHtmlPreview && elements.responsePreviewIframe) {
        try {
          elements.responsePreviewIframe.srcdoc = bodyContent || "";
        } catch (err) {
          try {
            const doc = elements.responsePreviewIframe.contentDocument || elements.responsePreviewIframe.contentWindow.document;
            doc.open();
            doc.write(bodyContent || "");
            doc.close();
          } catch (e) {
          }
        }
        switchBodyView("preview");
        const bodyPanel = document.getElementById("response-body-tab");
        const isBodyActive = bodyPanel && bodyPanel.classList.contains("active");
        if (isBodyActive) {
          elements.responseBodyToolbar?.classList.remove("hidden");
        } else {
          elements.responseBodyToolbar?.classList.add("hidden");
        }
      } else {
        if (elements.responseBodyToolbar) elements.responseBodyToolbar.classList.add("hidden");
        switchBodyView("raw");
      }
    }
    function updateHeadersTable(headers) {
      if (!elements.responseHeadersTable) return;
      elements.responseHeadersTable.innerHTML = "";
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((headerValue) => {
              const row = document.createElement("tr");
              row.innerHTML = `<td>${escapeHtml2(key)}</td><td>${escapeHtml2(headerValue)}</td>`;
              elements.responseHeadersTable.appendChild(row);
            });
          } else {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${escapeHtml2(key)}</td><td>${escapeHtml2(value)}</td>`;
            elements.responseHeadersTable.appendChild(row);
          }
        });
      }
    }
    function updateCookiesTable(cookies) {
      if (!elements.responseCookiesTable) return;
      elements.responseCookiesTable.innerHTML = "";
      if (cookies && cookies.length > 0) {
        cookies.forEach((cookie) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td>${escapeHtml2(cookie.name)}</td>
                    <td>${escapeHtml2(cookie.value)}</td>
                    <td>${escapeHtml2(cookie.domain || "")}</td>
                    <td>${escapeHtml2(cookie.path || "")}</td>
                    <td>${escapeHtml2(cookie.expires || "")}</td>
                `;
          elements.responseCookiesTable.appendChild(row);
        });
      }
    }
    function updateSentRequestTab(sentRequest) {
      const hasSentRequest = !!sentRequest;
      if (elements.sentRequestUrl) {
        elements.sentRequestUrl.textContent = sentRequest?.url || "";
      }
      if (elements.sentRequestParamsTable) {
        elements.sentRequestParamsTable.innerHTML = "";
        const hasParams = sentRequest?.params && Object.keys(sentRequest.params).length > 0;
        if (hasParams) {
          Object.entries(sentRequest.params).forEach(([key, value]) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${escapeHtml2(key)}</td><td>${escapeHtml2(String(value))}</td>`;
            elements.sentRequestParamsTable.appendChild(row);
          });
        }
        if (elements.sentRequestParamsSection) {
          elements.sentRequestParamsSection.style.display = hasParams ? "block" : "none";
        }
      }
      if (elements.sentRequestQueryTable) {
        elements.sentRequestQueryTable.innerHTML = "";
        const hasQuery = sentRequest?.query && Object.keys(sentRequest.query).length > 0;
        if (hasQuery) {
          Object.entries(sentRequest.query).forEach(([key, value]) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${escapeHtml2(key)}</td><td>${escapeHtml2(String(value))}</td>`;
            elements.sentRequestQueryTable.appendChild(row);
          });
        }
        if (elements.sentRequestQuerySection) {
          elements.sentRequestQuerySection.style.display = hasQuery ? "block" : "none";
        }
      }
      if (elements.sentRequestHeadersTable) {
        elements.sentRequestHeadersTable.innerHTML = "";
        if (sentRequest?.headers) {
          Object.entries(sentRequest.headers).forEach(([key, value]) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${escapeHtml2(key)}</td><td>${escapeHtml2(Array.isArray(value) ? value.join(", ") : String(value))}</td>`;
            elements.sentRequestHeadersTable.appendChild(row);
          });
        }
      }
      if (elements.sentRequestBody) {
        let bodyContent = "";
        let bodyTypeLabel = "";
        const bodyData = sentRequest?.body;
        const hasBody = bodyData && typeof bodyData === "object" && bodyData.type && bodyData.type !== "none";
        if (hasBody) {
          bodyTypeLabel = bodyData.type;
          if (bodyData.type === "raw" && bodyData.format) {
            bodyTypeLabel = `${bodyData.type} (${bodyData.format})`;
          }
          const content = bodyData.content;
          if (typeof content === "object") {
            bodyContent = JSON.stringify(content, null, 2);
          } else {
            bodyContent = String(content ?? "");
          }
        }
        elements.sentRequestBody.textContent = bodyContent || "(no body)";
        if (elements.sentRequestBodyType) {
          elements.sentRequestBodyType.textContent = hasBody ? bodyTypeLabel : "";
        }
        if (elements.sentRequestBodySection) {
          elements.sentRequestBodySection.style.display = hasBody ? "block" : "none";
        }
      }
      if (elements.sentRequestPlaceholder) {
        elements.sentRequestPlaceholder.style.display = sentRequest ? "none" : "flex";
      }
    }
    async function handleResponse(response, scriptResults = {}) {
      elements.responsePlaceholder?.classList.add("hidden");
      state.lastResponse = response;
      const statusCode = response.status ?? response.statusCode;
      const statusText = response.statusText || response.statusMessage || "";
      const duration = response.time || response.duration;
      updateStatusBadge(statusCode, statusText);
      updateResponseTime(duration);
      updateBodyEditor(response);
      updateHeadersTable(response.headers);
      updateCookiesTable(response.cookies);
      updateSentRequestTab(state.lastSentRequest);
      if (scriptResults.testResults && scriptResults.testResults.length > 0) {
        testResultsManager.clear();
        scriptResults.testResults.forEach((test) => {
          let errorMessage = test.message;
          if (errorMessage && typeof errorMessage === "object") {
            try {
              errorMessage = JSON.stringify(errorMessage, null, 2);
            } catch {
              errorMessage = String(errorMessage);
            }
          }
          testResultsManager.addResult(test.name, test.passed, errorMessage);
        });
      }
      updateVisualizerTab(scriptResults.visualizerData);
    }
    return {
      clearResponse,
      handleResponse,
      updateSentRequestTab
    };
  }

  // resources/features/request-tester/modules/script-runner.js
  function getDefaultPreRequestScript() {
    return `// Pre-request script - runs before the request is sent (on backend)
// Available: agl.request, agl.env, agl.variables, agl.cookies

// Example: Add dynamic header
// agl.request.setHeader('X-Request-Time', Date.now().toString());

// Example: Use environment variable
// const apiKey = agl.env.get('apiKey');
// agl.request.setHeader('Authorization', 'Bearer ' + apiKey);

// Example: Set request body
// agl.request.setBody({ timestamp: Date.now() });

console.log('Pre-request script executed');
`;
  }
  function getDefaultPostResponseScript() {
    return `// Post-response script - runs after the response is received (on backend)
// Available: agl.request, agl.response, agl.env, agl.test(), agl.expect()

// Example: Log response info
// console.log('Status:', agl.response.status);
// console.log('Response time:', agl.response.time, 'ms');

// Example: Write tests
// agl.test('Status is 200', () => {
//     agl.expect(agl.response.status).to.equal(200);
// });

// agl.test('Response has data', () => {
//     agl.expect(agl.response.json()).to.have.property('data');
// });

// Example: Save token from response
// const token = agl.response.json().token;
// agl.env.set('authToken', token);

console.log('Post-response script executed');
`;
  }

  // resources/features/request-tester/modules/test-results.js
  function createTestResultsManager(escapeHtmlFnOrOptions) {
    let results = [];
    let sectionElement = null;
    let summaryElement = null;
    let listElement = null;
    let badgeElement = null;
    let onUpdate = null;
    let escapeHtmlFn;
    if (typeof escapeHtmlFnOrOptions === "function") {
      escapeHtmlFn = escapeHtmlFnOrOptions;
    } else if (escapeHtmlFnOrOptions && typeof escapeHtmlFnOrOptions === "object") {
      escapeHtmlFn = escapeHtmlFnOrOptions.escapeHtml || ((s) => s);
      onUpdate = escapeHtmlFnOrOptions.onUpdate || null;
    } else {
      escapeHtmlFn = (s) => s;
    }
    function setElements({ section, summary, list, badge }) {
      sectionElement = section;
      summaryElement = summary;
      listElement = list;
      badgeElement = badge;
    }
    function renderToUI() {
      if (onUpdate) {
        onUpdate();
        return;
      }
      if (!listElement) return;
      if (results.length === 0) {
        if (sectionElement) sectionElement.classList.add("hidden");
        if (listElement) listElement.innerHTML = '<div class="test-placeholder">Run tests to see results</div>';
        if (summaryElement) summaryElement.textContent = "";
        if (badgeElement) badgeElement.classList.add("hidden");
        return;
      }
      if (sectionElement) sectionElement.classList.remove("hidden");
      const passed = results.filter((r) => r.passed).length;
      const failed = results.length - passed;
      if (summaryElement) {
        summaryElement.textContent = `${passed}/${results.length} passed`;
        summaryElement.className = "test-summary " + (failed === 0 ? "all-passed" : "some-failed");
      }
      if (badgeElement) {
        badgeElement.textContent = `${passed}/${results.length}`;
        badgeElement.classList.remove("hidden");
        badgeElement.classList.toggle("all-passed", failed === 0);
        badgeElement.classList.toggle("has-failed", failed > 0);
      }
      const html = results.map((result) => `
            <div class="test-result ${result.passed ? "passed" : "failed"}">
                <span class="test-icon">${result.passed ? "\u2713" : "\u2717"}</span>
                <span class="test-name">${escapeHtmlFn(result.name)}</span>
                ${result.error ? `<div class="test-error">${escapeHtmlFn(result.error)}</div>` : ""}
            </div>
        `).join("");
      listElement.innerHTML = html;
    }
    return {
      setElements,
      clear() {
        results = [];
        renderToUI();
      },
      /**
       * Add a test result
       * @param {string} name - Test name
       * @param {boolean} passed - Whether test passed
       * @param {string|null} error - Error message if failed
       */
      addResult(name, passed, error = null) {
        results.push({ name, passed, error });
        renderToUI();
      },
      /**
       * Get results for testing/debugging
       * @returns {Array}
       */
      getResults() {
        return [...results];
      },
      /**
       * Get summary stats
       * @returns {{total: number, passed: number, failed: number}}
       */
      getSummary() {
        const passed = results.filter((r) => r.passed).length;
        return {
          total: results.length,
          passed,
          failed: results.length - passed
        };
      }
    };
  }

  // resources/features/request-tester/modules/main.js
  var vscode = acquireVsCodeApi();
  var RequestTesterApp = class {
    constructor() {
      this.elements = null;
      this.state = null;
      this.queryParamsManager = null;
      this.pathVariablesManager = null;
      this.editorsManager = null;
      this.messageHandler = null;
      this.bodyTypeManager = null;
      this.requestLoader = null;
      this.requestSaver = null;
      this.schemaEditorManager = null;
      this.testResultsManager = null;
      this.cookieManager = null;
      this.historyRenderer = null;
      this.formManager = null;
      this.requestBuilder = null;
      this.responseHandler = null;
      this.requestExecutor = null;
    }
    /**
     * Initialize the application
     */
    initialize() {
      try {
        this.elements = initElements();
        this.state = createState();
        this.initializeManagers();
        this.initializeFeatureModules();
        this.initializeEventListeners();
        this.messageHandler.startListening();
        this.editorsManager.initialize();
        this.schemaEditorManager.init();
        this.graphqlSchemaManager.initialize();
        vscode.postMessage({ command: "webviewLoaded" });
      } catch (error) {
        console.error("[RequestTesterApp] Initialization failed:", error);
        this.showError(`Initialization failed: ${error.message}`);
      }
    }
    /**
     * Initialize manager modules
     */
    initializeManagers() {
      this.formManager = createFormManager({
        elements: this.elements,
        state: this.state,
        escapeHtml,
        updateUrlPreview: () => this.updateUrlPreview(),
        syncUrlWithQueryParams: () => this.syncUrlWithQueryParams(),
        markDirty: () => this.markDirty()
      });
      this.queryParamsManager = createQueryParamsManager({
        state: this.state,
        elements: this.elements,
        formManager: this.formManager,
        updateUrlPreview: () => this.updateUrlPreview()
      });
      this.pathVariablesManager = createPathVariablesManager({
        state: this.state,
        elements: this.elements,
        formManager: this.formManager
      });
      this.editorsManager = createMonacoEditorsManager({
        elements: this.elements,
        state: this.state,
        onBodyChange: () => this.markDirty(),
        onScriptChange: () => this.markDirty(),
        getDefaultPreRequestScript,
        getDefaultPostResponseScript
      });
      this.bodyTypeManager = createBodyTypeManager({
        state: this.state,
        elements: this.elements,
        editorsManager: this.editorsManager,
        onTypeChange: () => this.markDirty()
      });
      this.requestSaver = createRequestSaver({
        vscode,
        state: this.state,
        getMethod: () => this.getMethod(),
        getPath: () => this.getPath(),
        queryParamsManager: this.queryParamsManager,
        bodyTypeManager: this.bodyTypeManager,
        getHeaders: () => this.getHeaders(),
        getSchemaDataForSave: () => this.schemaEditorManager?.getSchemaDataForSave()
      });
      this.oauth2Manager = createOAuth2Manager({
        state: this.state,
        elements: this.elements,
        vscode,
        markDirty: () => this.markDirty()
      });
      this.graphqlSchemaManager = createGraphQLSchemaManager({
        state: this.state,
        elements: this.elements,
        vscode,
        editorsManager: this.editorsManager,
        getRequestUrl: () => this.getPath(),
        getHeaders: () => this.getHeaders()
      });
    }
    /**
     * Initialize feature modules
     */
    initializeFeatureModules() {
      this.testResultsManager = createTestResultsManager(escapeHtml);
      this.testResultsManager.setElements({
        section: document.getElementById("response-tests-tab"),
        summary: this.elements.testResultsSummary,
        list: this.elements.testResultsList,
        badge: this.elements.testCount
      });
      this.cookieManager = createCookieManager({
        postMessage: (msg) => vscode.postMessage(msg)
      });
      this.historyRenderer = createHistoryRenderer({
        escapeHtml,
        formatTime,
        formatDuration,
        postMessage: (msg) => vscode.postMessage(msg)
      });
      this.historyRenderer.setElement(this.elements.historyList);
      this.historyRenderer.setOnEntryClick((entryId, isShared) => {
        this.state.activeHistoryEntryId = entryId;
        vscode.postMessage({ command: "useHistoryEntry", entryId, isShared });
      });
      this.historyRenderer.setOnEntryDelete((entryId, isShared) => {
        vscode.postMessage({ command: "deleteHistoryEntry", entryId, isShared });
      });
      this.historyRenderer.setOnEntryShare((entryId) => {
        vscode.postMessage({ command: "requestShareHistoryEntry", entryId });
      });
      this.historyRenderer.setOnEntryMove((entryId) => {
        vscode.postMessage({ command: "requestMoveSharedHistoryEntry", entryId });
      });
      this.historyRenderer.setOnGroupRename((tag) => {
        vscode.postMessage({ command: "requestRenameSharedGroup", tag });
      });
      this.requestBuilder = createRequestBuilder({
        elements: this.elements,
        state: this.state,
        getMethod: () => this.getMethod(),
        getPath: () => this.getPath()
      });
      this.responseHandler = createResponseHandler({
        elements: this.elements,
        state: this.state,
        getResponseBodyEditor: () => this.editorsManager.getResponseBodyEditor(),
        escapeHtml,
        formatDuration,
        testResultsManager: this.testResultsManager
      });
      this.requestExecutor = createRequestExecutor({
        vscode,
        state: this.state,
        requestBuilder: this.requestBuilder,
        responseHandler: this.responseHandler,
        testResultsManager: this.testResultsManager,
        onBeforeSend: () => this.onBeforeSend(),
        onAfterResponse: () => this.onAfterResponse(),
        onError: (msg) => this.showError(msg)
      });
      this.requestLoader = createRequestLoader({
        state: this.state,
        getMethod: () => this.getMethod(),
        setMethod: (m) => this.setMethod(m),
        getPath: () => this.getPath(),
        setPath: (p) => this.setPath(p),
        queryParamsManager: this.queryParamsManager,
        pathVariablesManager: this.pathVariablesManager,
        bodyTypeManager: this.bodyTypeManager,
        editorsManager: this.editorsManager,
        formManager: this.formManager,
        elements: this.elements,
        updateUrlPreview: () => this.updateUrlPreview(),
        markClean: () => this.markClean(),
        oauth2Manager: this.oauth2Manager
      });
      this.schemaEditorManager = createSchemaEditorManager({
        vscode,
        state: this.state,
        editorsManager: this.editorsManager,
        markDirty: () => this.markDirty()
      });
      this.messageHandler = createMessageHandler({
        handlers: this.createMessageHandlers()
      });
    }
    /**
     * Create message handlers map
     * @returns {Object} Handler map
     */
    createMessageHandlers() {
      return {
        "init": (msg) => this.handleInit(msg.data || msg),
        "initialize": (msg) => this.handleInit(msg.data || msg),
        "environmentChanged": (msg) => this.handleEnvironmentChanged(msg),
        "requestComplete": (msg) => this.handleRequestComplete(msg),
        "requestError": (msg) => this.handleRequestError(msg),
        "requestCancelled": (msg) => this.handleRequestCancelled(),
        "scriptProgress": (msg) => this.handleScriptProgress(msg),
        "historyUpdated": (msg) => this.historyRenderer.render(msg.history || msg.data?.history),
        "applyHistoryEntry": (msg) => this.requestLoader.applyHistoryEntry(
          msg.entry || msg.data,
          msg.fullResponse,
          this.responseHandler
        ),
        "loadRequest": (msg) => this.handleLoadRequest(msg),
        "requestSaved": (msg) => this.handleRequestSaved(msg),
        "sessionVariablesLoaded": (msg) => this.handleSessionVariablesLoaded(msg),
        "cookiesLoaded": (msg) => this.handleCookiesLoaded(msg),
        "error": (msg) => this.handleError(msg),
        "sendRequestResponse": (msg) => this.handleSendRequestResponse(msg),
        // Schema editor handlers
        ...this.schemaEditorManager.getMessageHandlers(),
        // OAuth2 handlers
        ...this.oauth2Manager.getMessageHandlers(),
        // GraphQL schema handlers
        ...this.graphqlSchemaManager.getMessageHandlers()
      };
    }
    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
      this.elements.sendBtn?.addEventListener("click", () => this.sendRequest());
      this.elements.envSettingsBtn?.addEventListener("click", () => {
        vscode.postMessage({
          command: "openEnvironmentEditor",
          environment: this.state.selectedEnvironment
        });
      });
      this.elements.addQueryBtn?.addEventListener("click", () => {
        this.formManager.addParamRow("query", "", "", true, false, true);
      });
      this.elements.addHeaderBtn?.addEventListener("click", () => {
        this.formManager.addHeaderRow("", "", true, true);
      });
      this.elements.clearTestsBtn?.addEventListener("click", () => this.testResultsManager.clear());
      this.elements.collapseSidebarBtn?.addEventListener("click", () => {
        this.elements.historySidebar?.classList.add("collapsed");
        this.elements.sidebarToggle?.classList.remove("hidden");
      });
      this.elements.expandSidebarBtn?.addEventListener("click", () => {
        this.elements.historySidebar?.classList.remove("collapsed");
        this.elements.sidebarToggle?.classList.add("hidden");
      });
      if (this.elements.requestPathInput) {
        this.elements.requestPathInput.addEventListener(
          "input",
          this.debounce(() => this.handlePathInputChange(), 300)
        );
        this.elements.requestPathInput.addEventListener("paste", () => {
          requestAnimationFrame(() => this.handlePathInputChange());
        });
      }
      if (this.elements.methodSelect) {
        this.elements.methodSelect.addEventListener("change", () => {
          this.markDirty();
        });
      }
      if (this.elements.btnSave) {
        this.elements.btnSave.addEventListener("click", () => this.requestSaver.saveRequest());
      }
      this.bodyTypeManager.initEventListeners();
      this.initializeTabs();
      this.initializeSettingsListeners();
      this.initializeAuthListeners();
      this.initializeResizeHandlers();
    }
    // ========================================
    // Handler Methods
    // ========================================
    handleInit(data) {
      try {
        this.state.readonly = data.readonly === true;
        this.state.allowSave = data.allowSave === true;
        this.applyReadonlyState();
        this.initializePanelData(data);
        if (this.state.allowSave) {
          this.state.isDirty = true;
          this.updateSaveButtonState();
          this.state.originalRequest = this.requestSaver.takeSnapshot();
        } else {
          this.markClean();
          this.state.originalRequest = this.requestSaver.takeSnapshot();
        }
      } catch (error) {
        console.error("[RequestTesterApp] Init error:", error);
        this.showError(`Initialization error: ${error.message}`);
      }
    }
    handleEnvironmentChanged(msg) {
      this.state.selectedEnvironment = msg.data?.selectedEnvironment || msg.environment;
      this.state.resolvedEnvironment = msg.data?.resolvedEnvironment || this.state.resolvedEnvironment;
      if (this.elements.historyEnv) {
        this.elements.historyEnv.textContent = this.state.selectedEnvironment;
      }
      if (msg.data?.history || msg.history) {
        this.historyRenderer.render(msg.data?.history || msg.history);
      }
      this.updateUrlPreview();
    }
    handleRequestComplete(msg) {
      this.resetRequestState();
      if (msg.data?.sentRequest) {
        this.state.lastSentRequest = msg.data.sentRequest;
      }
      this.requestExecutor.handleResponse(
        msg.data?.response || msg.data,
        msg.data?.scriptResults
      );
      if (msg.data?.history) {
        this.historyRenderer.render(msg.data.history);
      }
    }
    handleRequestError(msg) {
      this.resetRequestState();
      this.requestExecutor.handleError(msg.error || "Request failed");
    }
    handleRequestCancelled() {
      this.resetRequestState();
      this.requestExecutor.handleError("Request cancelled");
    }
    /**
     * Handle real-time script execution progress
     * Console output is now directed to VS Code Output channel
     * This handler only processes test results
     */
    handleScriptProgress(msg) {
      const { phase, testResults } = msg;
      if (testResults && testResults.length > 0) {
        testResults.forEach((result) => {
          if (result && typeof result === "object") {
            this.testResultsManager.addResult(result.name, result.passed, result.message || result.error || null);
          } else {
            this.testResultsManager.addResult(result);
          }
        });
      }
    }
    handleLoadRequest(msg) {
      if (msg.request) {
        if (typeof msg.readonly === "boolean") {
          this.state.readonly = msg.readonly;
          this.applyReadonlyState();
        }
        if (msg.collectionId) this.state.collectionId = msg.collectionId;
        if (msg.collectionName) this.state.collectionName = msg.collectionName;
        if (msg.resolvedEnvironment) this.state.resolvedEnvironment = msg.resolvedEnvironment;
        if (msg.globalVariables) this.state.globalVariables = msg.globalVariables;
        if (msg.sessionVariables) this.state.sessionVariables = msg.sessionVariables;
        if (msg.collectionVariables) this.state.collectionVariables = msg.collectionVariables;
        this.responseHandler.clearResponse();
        this.requestLoader.loadCollectionRequest(msg.request);
        if (msg.history) {
          this.historyRenderer.render(msg.history);
        }
        this.markClean();
        this.state.originalRequest = this.requestSaver.takeSnapshot();
      }
    }
    handleRequestSaved(msg) {
      if (msg?.requestId) {
        if (!this.state.requestData) {
          this.state.requestData = {};
        }
        this.state.requestData.id = msg.requestId;
        if (msg.name) {
          this.state.requestData.name = msg.name;
        }
      }
      this.markClean();
      this.state.originalRequest = this.requestSaver.takeSnapshot();
    }
    handleSessionVariablesLoaded(msg) {
      if (msg.sessionVariables) {
        this.state.sessionVariables = msg.sessionVariables;
      }
    }
    handleCookiesLoaded(msg) {
      if (this.cookieManager && msg.cookies) {
        this.cookieManager.loadCookies(msg.cookies);
        this.renderCookiePreview(msg.cookies);
      }
    }
    /**
     * Render the cookie preview in the settings tab
     * @param {Array} cookies - Array of cookie objects
     */
    renderCookiePreview(cookies) {
      const list = this.elements.cookiePreviewList;
      if (!list) return;
      if (!cookies || cookies.length === 0) {
        list.innerHTML = '<span class="no-cookies">No cookies stored</span>';
        return;
      }
      list.innerHTML = cookies.map((cookie) => `
            <div class="cookie-preview-item" data-cookie-name="${this.escapeHtml(cookie.name)}" data-cookie-domain="${this.escapeHtml(cookie.domain || "")}">
                <span class="cookie-name">${this.escapeHtml(cookie.name)}</span>
                <span class="cookie-value" title="${this.escapeHtml(cookie.value)}">${this.escapeHtml(cookie.value)}</span>
                <span class="cookie-domain">${this.escapeHtml(cookie.domain || "*")}</span>
                <button class="cookie-delete-btn" title="Delete cookie">\xD7</button>
            </div>
        `).join("");
      list.querySelectorAll(".cookie-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const item = e.target.closest(".cookie-preview-item");
          const name = item.dataset.cookieName;
          const domain = item.dataset.cookieDomain;
          vscode.postMessage({
            command: "deleteCookie",
            name,
            domain
          });
        });
      });
    }
    /**
     * Escape HTML for safe display
     */
    escapeHtml(str) {
      if (!str) return "";
      return str.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[c]);
    }
    handleError(msg) {
      this.resetRequestState();
      this.showError(msg.message || msg.error);
    }
    handlePathInputChange() {
      const currentUrl = this.elements.requestPathInput.value;
      this.state.requestPath = currentUrl;
      const keyEditable = !this.state.readonly;
      this.queryParamsManager.handleUrlChange(currentUrl, this.setPath.bind(this), keyEditable);
      this.pathVariablesManager.updateFromPath(currentUrl);
      this.updateUrlPreview();
      this.markDirty();
    }
    // ========================================
    // Helper Methods
    // ========================================
    initializePanelData(data) {
      const reqData = data.request || data.endpoint || data.endpointInfo;
      this.state.requestData = reqData;
      this.state.selectedEnvironment = data.selectedEnvironment || "dev";
      this.state.resolvedEnvironment = data.resolvedEnvironment || {};
      this.state.globalVariables = data.globalVariables || {};
      this.state.sessionVariables = data.sessionVariables || {};
      this.state.collectionVariables = data.collectionVariables || {};
      this.state.collectionId = data.collectionId || null;
      this.state.collectionName = data.collectionName || null;
      this.responseHandler.clearResponse();
      if (!reqData && this.state.readonly) {
        console.error("No request data received");
        this.showError("No request data received");
        return;
      }
      const method = (reqData?.method || "GET").toUpperCase();
      this.setMethod(method);
      const path = reqData?.url || reqData?.endpointUri || reqData?.path || "/";
      this.setPath(path);
      this.state.requestPath = path;
      this.populateEnvironmentSelector();
      this.formManager.clearForm();
      this.pathVariablesManager.updateFromPath(path);
      if (reqData?.params) {
        this.pathVariablesManager.applyParams(reqData.params);
      }
      this.pathVariablesManager.applyEnvironmentDefaults(this.state.resolvedEnvironment.variables);
      this.setupQueryParams(reqData);
      this.setupHeaders(reqData);
      this.setupBody(reqData, method);
      this.applyScripts(reqData?.scripts);
      this.resetAndApplySettings(reqData?.settings);
      if (data.history) {
        this.historyRenderer.render(data.history);
      }
      if (data.cookies) {
        if (this.cookieManager) {
          this.cookieManager.loadCookies(data.cookies);
        }
        this.renderCookiePreview(data.cookies);
      }
      const rawAuth = reqData?.auth || {};
      if (reqData && rawAuth) {
        this.state.authType = rawAuth.type || "inherit";
        this.state.bearerToken = rawAuth.bearerToken || "";
        if (rawAuth.basicAuth && (rawAuth.basicAuth.username || rawAuth.basicAuth.password)) {
          this.state.basicAuth = {
            username: rawAuth.basicAuth.username || "",
            password: rawAuth.basicAuth.password || ""
          };
        } else {
          this.state.basicAuth = { username: "", password: "" };
        }
        if (rawAuth.apikey && (rawAuth.apikey.key || rawAuth.apikey.value)) {
          this.state.apiKey = {
            key: rawAuth.apikey.key || "",
            value: rawAuth.apikey.value || "",
            in: rawAuth.apikey.in || "header"
          };
        } else {
          this.state.apiKey = { key: "", value: "", in: "header" };
        }
        if (rawAuth.oauth2) {
          this.state.oauth2 = { ...rawAuth.oauth2 };
        } else {
          this.state.oauth2 = null;
        }
        if (this.elements.authType) this.elements.authType.value = this.state.authType;
        if (this.elements.bearerToken) this.elements.bearerToken.value = this.state.bearerToken;
        if (this.elements.bearerTokenSection) this.elements.bearerTokenSection.classList.toggle("hidden", this.state.authType !== "bearer");
        if (this.elements.basicAuthSection) this.elements.basicAuthSection.classList.toggle("hidden", this.state.authType !== "basic");
        if (this.elements.basicUsername) this.elements.basicUsername.value = this.state.basicAuth.username || "";
        if (this.elements.basicPassword) this.elements.basicPassword.value = this.state.basicAuth.password || "";
        if (this.elements.apiKeySection) this.elements.apiKeySection.classList.toggle("hidden", this.state.authType !== "apikey");
        if (this.elements.apiKeyKey) this.elements.apiKeyKey.value = this.state.apiKey.key || "";
        if (this.elements.apiKeyValue) this.elements.apiKeyValue.value = this.state.apiKey.value || "";
        if (this.elements.apiKeyIn) this.elements.apiKeyIn.value = this.state.apiKey.in || "header";
        if (this.elements.oauth2Section) this.elements.oauth2Section.classList.toggle("hidden", this.state.authType !== "oauth2");
        if (this.state.authType === "oauth2" && this.oauth2Manager && this.state.oauth2) {
          this.oauth2Manager.loadConfig(this.state.oauth2);
        }
      }
      this.updateUrlPreview();
      this.schemaEditorManager.loadSchemas();
    }
    populateEnvironmentSelector() {
      if (this.elements.historyEnv) {
        this.elements.historyEnv.textContent = this.state.selectedEnvironment || "dev";
      }
    }
    setupQueryParams(requestData) {
      const queryData = requestData?.query;
      const urlPattern = requestData?.url || "/";
      const keyEditable = !this.state.readonly;
      if (Array.isArray(queryData)) {
        this.queryParamsManager.applyFromCollection(
          this.queryParamsManager.getUrlWithoutQuery(urlPattern),
          queryData,
          this.setPath.bind(this),
          keyEditable
        );
      } else {
        const { baseUrl: parsedBase, params } = this.queryParamsManager.parseUrl(urlPattern);
        this.queryParamsManager.applyFromCollection(
          parsedBase,
          params,
          this.setPath.bind(this),
          keyEditable
        );
      }
    }
    setupHeaders(requestData) {
      const envHeaders = this.state.resolvedEnvironment.headers || {};
      const allHeaders = createCaseInsensitiveMap();
      this.state._headersMeta = {};
      Object.entries(envHeaders).forEach(([key, value]) => {
        allHeaders.set(key, { value, enabled: true });
      });
      const requestHeaders = requestData?.headers || [];
      if (Array.isArray(requestHeaders)) {
        requestHeaders.forEach(({ key, value, enabled, ...meta }) => {
          if (key) {
            allHeaders.set(key, { value: value || "", enabled: enabled !== false });
            if (Object.keys(meta).length > 0) {
              this.state._headersMeta[key] = meta;
            }
          }
        });
      } else if (typeof requestHeaders === "object") {
        Object.entries(requestHeaders).forEach(([key, value]) => {
          allHeaders.set(key, { value, enabled: true });
        });
      }
      allHeaders.forEach(({ value, enabled }, key) => {
        this.formManager.addHeaderRow(key, value, true, enabled);
      });
    }
    setupBody(requestData, method) {
      const bodyData = requestData?.body || requestData?.bodyFields;
      if (bodyData && typeof bodyData === "object" && !Array.isArray(bodyData) && bodyData.type) {
        this.bodyTypeManager.applyFromRequest(bodyData);
      } else if (Array.isArray(bodyData) && bodyData.length > 0) {
        this.editorsManager.onReady(() => {
          this.formManager.applyBodyData({
            bodyFields: bodyData,
            method,
            editor: this.editorsManager.getRequestBodyEditor()
          });
        });
      } else {
        this.bodyTypeManager.reset();
      }
    }
    applyScripts(scripts) {
      this.state.scripts.preRequest = scripts?.preRequest || "";
      this.state.scripts.postResponse = scripts?.postResponse || "";
      this.editorsManager.onReady(() => {
        this.editorsManager.setPreRequestScript(this.state.scripts.preRequest);
        this.editorsManager.setPostResponseScript(this.state.scripts.postResponse);
      });
    }
    /**
     * Reset settings to defaults and apply request settings if provided
     * @param {Object} [requestSettings] - Settings from request (optional)
     */
    resetAndApplySettings(requestSettings) {
      const defaultSettings = {
        timeout: 3e4,
        followRedirects: true,
        followOriginalMethod: false,
        followAuthHeader: false,
        maxRedirects: 10,
        strictSSL: true,
        decompress: true,
        includeCookies: true
      };
      Object.assign(this.state.settings, defaultSettings);
      if (requestSettings) {
        Object.assign(this.state.settings, requestSettings);
      }
      this.requestLoader.applySettingsToUI(this.state.settings);
    }
    updateUrlPreview() {
      const pattern = this.getPath();
      const preview = buildUrlPreview(pattern, this.state.pathParams, this.state.queryParams);
      if (this.elements.urlPreview) {
        this.elements.urlPreview.textContent = preview;
      }
    }
    syncUrlWithQueryParams() {
      if (this.state.readonly) return;
      this.queryParamsManager.handleTableChange(
        () => this.getPath(),
        (url) => {
          this.setPath(url);
          this.state.requestPath = url;
        }
      );
    }
    /**
     * Get all headers from DOM (including disabled ones)
     * Re-attaches OpenAPI metadata from parallel map for save round-trip.
     * @returns {Array<{key: string, value: string, enabled: boolean, [meta: string]: any}>} Headers array
     */
    getHeaders() {
      const headers = [];
      this.elements.headersList?.querySelectorAll(".param-row").forEach((row) => {
        const checkbox = row.querySelector(".param-checkbox");
        const enabled = checkbox ? checkbox.checked : true;
        const key = row.querySelector(".key")?.value;
        const value = row.querySelector(".value")?.value;
        if (key) {
          const header = { key, value: value || "", enabled };
          if (this.state._headersMeta && this.state._headersMeta[key]) {
            Object.assign(header, this.state._headersMeta[key]);
          }
          headers.push(header);
        }
      });
      return headers;
    }
    /**
     * Get only enabled headers as Record<string, string> for HTTP requests
     * @returns {Record<string, string>} Enabled headers only
     */
    getEnabledHeaders() {
      const headers = {};
      this.elements.headersList?.querySelectorAll(".param-row").forEach((row) => {
        const checkbox = row.querySelector(".param-checkbox");
        const enabled = checkbox ? checkbox.checked : true;
        const key = row.querySelector(".key")?.value;
        const value = row.querySelector(".value")?.value;
        if (key && enabled) {
          headers[key] = value || "";
        }
      });
      return headers;
    }
    // ========================================
    // Method/Path Accessors (Unified)
    // ========================================
    /**
     * Get current HTTP method
     * @returns {string} HTTP method (GET, POST, etc.)
     */
    getMethod() {
      return this.elements.methodSelect?.value || "GET";
    }
    /**
     * Set the HTTP method
     * @param {string} method - HTTP method
     */
    setMethod(method) {
      const upperMethod = (method || "GET").toUpperCase();
      if (this.elements.methodSelect) {
        this.elements.methodSelect.value = upperMethod;
      }
    }
    /**
     * Get the current request path/URL
     * @returns {string} Request path
     */
    getPath() {
      return this.elements.requestPathInput?.value || "/";
    }
    /**
     * Set the request path/URL
     * @param {string} path - Request path
     */
    setPath(path) {
      if (this.elements.requestPathInput) {
        this.elements.requestPathInput.value = path;
      }
    }
    /**
     * Apply readonly state to method/path elements
     */
    applyReadonlyState() {
      const isReadonly = this.state.readonly;
      if (this.elements.methodSelect) {
        this.elements.methodSelect.disabled = isReadonly;
      }
      if (this.elements.requestPathInput) {
        this.elements.requestPathInput.readOnly = isReadonly;
        this.elements.requestPathInput.classList.toggle("readonly", isReadonly);
      }
      if (this.elements.btnSave) {
        const hideSave = isReadonly && !this.state.allowSave;
        this.elements.btnSave.classList.toggle("hidden", hideSave);
      }
    }
    // ========================================
    // Dirty State Management
    // ========================================
    markDirty() {
      if (this.state.readonly && !this.state.allowSave) return;
      const hasChanges = this.requestSaver.hasChangedFrom(this.state.originalRequest);
      if (hasChanges !== this.state.isDirty) {
        this.state.isDirty = hasChanges;
        this.updateSaveButtonState();
        vscode.postMessage({ command: "dirtyStateChanged", isDirty: hasChanges });
      }
    }
    markClean() {
      this.state.isDirty = false;
      this.updateSaveButtonState();
      vscode.postMessage({ command: "dirtyStateChanged", isDirty: false });
    }
    updateSaveButtonState() {
      if (!this.elements.btnSave) return;
      if (this.state.isDirty) {
        this.elements.btnSave.disabled = false;
        this.elements.btnSave.classList.add("has-changes");
        this.elements.btnSave.title = "Save changes to collection";
      } else {
        this.elements.btnSave.disabled = true;
        this.elements.btnSave.classList.remove("has-changes");
        this.elements.btnSave.title = "No changes to save";
      }
    }
    // ========================================
    // Request Execution
    // ========================================
    async sendRequest() {
      await this.requestExecutor.execute();
    }
    resetRequestState() {
      this.requestExecutor.reset();
      if (this.elements.sendBtn) {
        this.elements.sendBtn.textContent = "Send";
        this.elements.sendBtn.classList.remove("cancel");
      }
      this.elements.loadingOverlay?.classList.add("hidden");
    }
    onBeforeSend() {
      if (this.elements.sendBtn) {
        this.elements.sendBtn.textContent = "Cancel";
        this.elements.sendBtn.classList.add("cancel");
      }
      this.elements.loadingOverlay?.classList.remove("hidden");
    }
    onAfterResponse() {
      if (this.elements.sendBtn) {
        this.elements.sendBtn.textContent = "Send";
        this.elements.sendBtn.classList.remove("cancel");
      }
      this.elements.loadingOverlay?.classList.add("hidden");
    }
    // ========================================
    // Variable Change Handling
    // ========================================
    onVariableChange(change) {
      if (!change) return;
      vscode.postMessage({ command: "variableChange", change });
    }
    // ========================================
    // HTTP Request from Scripts
    // ========================================
    createSendHttpRequest() {
      let requestIdCounter = 0;
      const pendingRequests = /* @__PURE__ */ new Map();
      this._pendingHttpRequests = pendingRequests;
      return (options) => {
        return new Promise((resolve, reject) => {
          const requestId = `script-request-${++requestIdCounter}`;
          const timeoutId = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
              pendingRequests.delete(requestId);
              reject(new Error("Request timed out"));
            }
          }, 3e4);
          pendingRequests.set(requestId, { resolve, reject, timeoutId });
          vscode.postMessage({
            command: "sendHttpRequest",
            requestId,
            options
          });
        });
      };
    }
    handleSendRequestResponse(msg) {
      if (!this._pendingHttpRequests) return;
      const pending = this._pendingHttpRequests.get(msg.requestId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        this._pendingHttpRequests.delete(msg.requestId);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.response);
        }
      }
    }
    // ========================================
    // UI Helpers
    // ========================================
    showError(message) {
      if (!this.elements.errorMessage) {
        console.error("Error:", message);
        return;
      }
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.classList.remove("hidden");
      setTimeout(() => {
        this.elements.errorMessage?.classList.add("hidden");
      }, 5e3);
    }
    updateCookiesDisplay() {
      if (!this.elements.responseCookiesTable) return;
      const allCookies = this.cookieManager?.getAll() || [];
      this.elements.responseCookiesTable.innerHTML = "";
      if (allCookies.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = '<td colspan="5" class="text-muted">No cookies</td>';
        this.elements.responseCookiesTable.appendChild(row);
        return;
      }
      allCookies.forEach((cookie) => {
        const row = document.createElement("tr");
        row.innerHTML = `
                <td>${escapeHtml(cookie.name)}</td>
                <td>${escapeHtml(cookie.value || "")}</td>
                <td>${escapeHtml(cookie.domain || "")}</td>
                <td>${escapeHtml(cookie.path || "/")}</td>
                <td>${cookie.expires ? new Date(cookie.expires).toLocaleString() : "Session"}</td>
            `;
        this.elements.responseCookiesTable.appendChild(row);
      });
    }
    debounce(fn, delay) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    }
    // ========================================
    // Tab Initialization
    // ========================================
    initializeTabs() {
      this.elements.tabButtons?.forEach((button) => {
        button.addEventListener("click", () => {
          const tabName = button.dataset.tab;
          const targetId = `${tabName}-tab`;
          this.elements.tabButtons.forEach((btn) => btn.classList.remove("active"));
          button.classList.add("active");
          this.elements.tabPanels?.forEach((panel) => {
            panel.classList.remove("active");
            panel.classList.add("hidden");
          });
          const targetPanel = document.getElementById(targetId);
          if (targetPanel) {
            targetPanel.classList.add("active");
            targetPanel.classList.remove("hidden");
          }
          if (tabName === "body") this.editorsManager.layout("body");
          if (tabName === "scripts") {
            this.editorsManager.layout("preRequest");
            this.editorsManager.layout("postResponse");
          }
          if (tabName === "body-schema" || tabName === "response-schema") {
            this.schemaEditorManager.layout();
          }
        });
      });
      document.querySelectorAll(".script-tab, .script-tab-vertical").forEach((tab) => {
        tab.addEventListener("click", () => {
          const scriptTab = tab.dataset.scriptTab;
          document.querySelectorAll(".script-tab, .script-tab-vertical").forEach((t) => {
            t.classList.remove("active");
            t.setAttribute("aria-selected", "false");
          });
          document.querySelectorAll(".script-tab-panel").forEach((p) => p.classList.remove("active"));
          tab.classList.add("active");
          tab.setAttribute("aria-selected", "true");
          document.getElementById(scriptTab + "-script-panel").classList.add("active");
          requestAnimationFrame(() => {
            if (scriptTab === "pre-request") {
              this.editorsManager.layout("preRequest");
            } else if (scriptTab === "post-response") {
              this.editorsManager.layout("postResponse");
            }
          });
        });
      });
      document.querySelectorAll(".graphql-tab-vertical").forEach((tab) => {
        tab.addEventListener("click", () => {
          const gqlTab = tab.dataset.graphqlTab;
          document.querySelectorAll(".graphql-tab-vertical").forEach((t) => {
            t.classList.remove("active");
            t.setAttribute("aria-selected", "false");
          });
          document.querySelectorAll(".graphql-tab-panel").forEach((p) => p.classList.remove("active"));
          tab.classList.add("active");
          tab.setAttribute("aria-selected", "true");
          document.getElementById("graphql-" + gqlTab + "-panel").classList.add("active");
          requestAnimationFrame(() => {
            if (gqlTab === "query") {
              this.editorsManager.layout("graphqlQuery");
            } else if (gqlTab === "variables") {
              this.editorsManager.layout("graphqlVariables");
            }
          });
        });
      });
      this.elements.responseTabButtons?.forEach((button) => {
        button.addEventListener("click", () => {
          const tabName = button.dataset.responseTab;
          const targetId = `response-${tabName}-tab`;
          this.elements.responseTabButtons.forEach((btn) => btn.classList.remove("active"));
          button.classList.add("active");
          this.elements.responseTabPanels?.forEach((panel) => {
            panel.classList.remove("active");
            panel.classList.add("hidden");
          });
          const targetPanel = document.getElementById(targetId);
          if (targetPanel) {
            targetPanel.classList.add("active");
            targetPanel.classList.remove("hidden");
          }
          if (tabName === "body") {
            this.editorsManager.layout("response");
            if (isHtmlResponse(this.state.lastResponse)) {
              this.elements.responseBodyToolbar?.classList.remove("hidden");
            } else {
              this.elements.responseBodyToolbar?.classList.add("hidden");
            }
          }
          if (tabName !== "body") {
            this.elements.responseBodyToolbar?.classList.add("hidden");
          }
        });
      });
    }
    initializeSettingsListeners() {
      const settings = this.state.settings;
      const e = this.elements;
      if (e.settingTimeout) {
        e.settingTimeout.value = settings.timeout;
        e.settingTimeout.addEventListener("input", () => {
          const val = parseInt(e.settingTimeout.value, 10);
          settings.timeout = isNaN(val) ? 0 : Math.max(0, val);
          this.markDirty();
        });
      }
      if (e.settingFollowRedirects) {
        e.settingFollowRedirects.checked = settings.followRedirects;
        e.settingFollowRedirects.addEventListener("change", () => {
          settings.followRedirects = e.settingFollowRedirects.checked;
          e.redirectOptions?.classList.toggle("hidden", !settings.followRedirects);
          this.markDirty();
        });
        e.redirectOptions?.classList.toggle("hidden", !settings.followRedirects);
      }
      if (e.settingOriginalMethod) {
        e.settingOriginalMethod.checked = settings.followOriginalMethod;
        e.settingOriginalMethod.addEventListener("change", () => {
          settings.followOriginalMethod = e.settingOriginalMethod.checked;
          this.markDirty();
        });
      }
      if (e.settingAuthHeader) {
        e.settingAuthHeader.checked = settings.followAuthHeader;
        e.settingAuthHeader.addEventListener("change", () => {
          settings.followAuthHeader = e.settingAuthHeader.checked;
          this.markDirty();
        });
      }
      if (e.settingMaxRedirects) {
        e.settingMaxRedirects.value = settings.maxRedirects;
        e.settingMaxRedirects.addEventListener("input", () => {
          const val = parseInt(e.settingMaxRedirects.value, 10);
          settings.maxRedirects = isNaN(val) ? 10 : Math.max(1, Math.min(50, val));
          this.markDirty();
        });
      }
      if (e.settingStrictSSL) {
        e.settingStrictSSL.checked = settings.strictSSL;
        e.settingStrictSSL.addEventListener("change", () => {
          settings.strictSSL = e.settingStrictSSL.checked;
          this.markDirty();
        });
      }
      if (e.settingDecompress) {
        e.settingDecompress.checked = settings.decompress;
        e.settingDecompress.addEventListener("change", () => {
          settings.decompress = e.settingDecompress.checked;
          this.markDirty();
        });
      }
      if (e.settingIncludeCookies) {
        e.settingIncludeCookies.checked = settings.includeCookies;
        e.settingIncludeCookies.addEventListener("change", () => {
          settings.includeCookies = e.settingIncludeCookies.checked;
          this.markDirty();
        });
      }
      if (e.clearAllCookiesBtn) {
        e.clearAllCookiesBtn.addEventListener("click", () => {
          vscode.postMessage({ command: "clearCookies" });
        });
      }
    }
    // ========================================
    // Auth Initialization
    // ========================================
    initializeAuthListeners() {
      if (this.elements.authType) {
        this.elements.authType.addEventListener("change", () => {
          this.state.authType = this.elements.authType.value;
          this.elements.bearerTokenSection?.classList.toggle("hidden", this.state.authType !== "bearer");
          this.elements.basicAuthSection?.classList.toggle("hidden", this.state.authType !== "basic");
          this.elements.apiKeySection?.classList.toggle("hidden", this.state.authType !== "apikey");
          this.elements.oauth2Section?.classList.toggle("hidden", this.state.authType !== "oauth2");
          if (this.state.authType === "oauth2" && this.oauth2Manager) {
            this.state.oauth2 = this.oauth2Manager.getConfig();
          }
          this.markDirty();
        });
      }
      if (this.elements.bearerToken) {
        this.elements.bearerToken.addEventListener("input", () => {
          this.state.bearerToken = this.elements.bearerToken.value;
          this.markDirty();
        });
      }
      if (this.elements.basicUsername) {
        this.elements.basicUsername.addEventListener("input", () => {
          this.state.basicAuth = this.state.basicAuth || { username: "", password: "" };
          this.state.basicAuth.username = this.elements.basicUsername.value;
          this.markDirty();
        });
      }
      if (this.elements.basicPassword) {
        this.elements.basicPassword.addEventListener("input", () => {
          this.state.basicAuth = this.state.basicAuth || { username: "", password: "" };
          this.state.basicAuth.password = this.elements.basicPassword.value;
          this.markDirty();
        });
      }
      if (this.elements.apiKeyKey) {
        this.elements.apiKeyKey.addEventListener("input", () => {
          this.state.apiKey = this.state.apiKey || { key: "", value: "", in: "header" };
          this.state.apiKey.key = this.elements.apiKeyKey.value;
          this.markDirty();
        });
      }
      if (this.elements.apiKeyValue) {
        this.elements.apiKeyValue.addEventListener("input", () => {
          this.state.apiKey = this.state.apiKey || { key: "", value: "", in: "header" };
          this.state.apiKey.value = this.elements.apiKeyValue.value;
          this.markDirty();
        });
      }
      if (this.elements.apiKeyIn) {
        this.elements.apiKeyIn.addEventListener("change", () => {
          this.state.apiKey = this.state.apiKey || { key: "", value: "", in: "header" };
          this.state.apiKey.in = this.elements.apiKeyIn.value;
          this.markDirty();
        });
      }
      if (this.oauth2Manager) {
        this.oauth2Manager.initListeners();
      }
    }
    // ========================================
    // Resize Handlers
    // ========================================
    initializeResizeHandlers() {
      const handle = this.elements.resizeHandle;
      const requestSection = this.elements.requestSection;
      const mainContent = this.elements.mainContent;
      if (handle && requestSection && mainContent) {
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;
        handle.addEventListener("mousedown", (e) => {
          isResizing = true;
          startY = e.clientY;
          startHeight = requestSection.offsetHeight;
          handle.classList.add("dragging");
          document.body.classList.add("resizing");
          e.preventDefault();
        });
        document.addEventListener("mousemove", (e) => {
          if (!isResizing) return;
          const deltaY = e.clientY - startY;
          const newHeight = startHeight + deltaY;
          const containerHeight = mainContent.offsetHeight;
          const constrainedHeight = Math.max(100, Math.min(containerHeight * 0.7, newHeight));
          requestSection.style.height = `${constrainedHeight}px`;
          this.editorsManager.layoutAll();
        });
        document.addEventListener("mouseup", () => {
          if (isResizing) {
            isResizing = false;
            handle.classList.remove("dragging");
            document.body.classList.remove("resizing");
            this.editorsManager.layoutAll();
          }
        });
      }
      const sidebarHandle = this.elements.sidebarResizeHandle;
      const sidebar = this.elements.historySidebar;
      if (sidebarHandle && sidebar) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        sidebarHandle.addEventListener("mousedown", (e) => {
          isResizing = true;
          startX = e.clientX;
          startWidth = sidebar.offsetWidth;
          sidebarHandle.classList.add("dragging");
          document.body.classList.add("resizing");
          e.preventDefault();
        });
        document.addEventListener("mousemove", (e) => {
          if (!isResizing) return;
          const deltaX = e.clientX - startX;
          const constrainedWidth = Math.max(150, Math.min(400, startWidth + deltaX));
          sidebar.style.width = `${constrainedWidth}px`;
        });
        document.addEventListener("mouseup", () => {
          if (isResizing) {
            isResizing = false;
            sidebarHandle.classList.remove("dragging");
            document.body.classList.remove("resizing");
          }
        });
      }
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    const app = new RequestTesterApp();
    app.initialize();
    window.__requestTesterApp = app;
  });
})();
//# sourceMappingURL=bundle.js.map
