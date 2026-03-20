"use strict";
(() => {
  // resources/features/test-suite/modules/main.js
  var vscode = acquireVsCodeApi();
  function log() {
  }
  var VIRTUAL_SCROLL = {
    itemHeight: 45,
    // Height of each result item in pixels
    bufferSize: 10
    // Extra items to render above/below visible area
  };
  var virtualScrollState = {
    startIndex: 0,
    endIndex: 0,
    scrollTop: 0
  };
  var HTTP_METHOD_REVERSE = {
    0: "GET",
    1: "POST",
    2: "PUT",
    3: "DELETE",
    4: "PATCH",
    5: "HEAD",
    6: "OPTIONS",
    7: "TRACE",
    8: "CONNECT"
  };
  function buildResultFileName(index, iteration, requestId) {
    const indexStr = String(index).padStart(6, "0");
    const iterStr = String(iteration).padStart(4, "0");
    return `result-${indexStr}-iter-${iterStr}-${requestId}.json`;
  }
  function expandSummary(s) {
    if (s.i !== void 0) {
      const requestId = s.r;
      return {
        index: s.i,
        iteration: s.it,
        name: s.n,
        method: HTTP_METHOD_REVERSE[s.m] || "GET",
        status: s.s,
        duration: s.d,
        passed: s.p,
        assertionsPassed: s.ap,
        assertionsFailed: s.af,
        requestId,
        resultFile: buildResultFileName(s.i, s.it, requestId),
        error: s.e
      };
    }
    return {
      index: s.index ?? 0,
      iteration: s.iteration ?? 1,
      name: s.name || s.requestName || "Unknown",
      method: s.method || "GET",
      status: s.status,
      duration: s.duration,
      passed: s.passed,
      assertionsPassed: s.assertionsPassed || 0,
      assertionsFailed: s.assertionsFailed || 0,
      requestId: s.requestId || s.r,
      resultFile: s.resultFile || (s.index !== void 0 && s.iteration !== void 0 && (s.requestId || s.r) ? buildResultFileName(s.index, s.iteration, s.requestId || s.r) : null),
      error: s.error || null
    };
  }
  var state = {
    suite: null,
    requests: [],
    environments: [],
    selectedEnvironment: null,
    dataFile: null,
    isRunning: false,
    results: [],
    // Now stores compact ResultSummary objects (not full results)
    statistics: null,
    currentIndex: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    selectedResultIndex: -1,
    currentRunId: null,
    suiteId: null,
    autoScroll: true,
    totalRequests: 0,
    iterations: 1,
    requestsPerIteration: 0,
    isDirty: false,
    // Track unsaved changes
    availableRequests: [],
    // Available requests for Add modal
    runStartTime: null
    // Track start time for duration calculation
  };
  var responseBodyMonacoEditor = null;
  var elements = {};
  function initialize() {
    elements = {
      suiteName: document.getElementById("suite-name"),
      runBtn: document.getElementById("run-btn"),
      stopBtn: document.getElementById("stop-btn"),
      environmentDisplay: document.getElementById("environment-display"),
      iterationsInput: document.getElementById("iterations-input"),
      delayInput: document.getElementById("delay-input"),
      dataFilePath: document.getElementById("data-file-path"),
      browseDataBtn: document.getElementById("browse-data-btn"),
      clearDataBtn: document.getElementById("clear-data-btn"),
      stopOnErrorCheck: document.getElementById("stop-on-error-check"),
      readFromSharedSessionCheck: document.getElementById("read-from-shared-session-check"),
      writeToSharedSessionCheck: document.getElementById("write-to-shared-session-check"),
      selectAllBtn: document.getElementById("select-all-btn"),
      deselectAllBtn: document.getElementById("deselect-all-btn"),
      addRequestBtn: document.getElementById("add-request-btn"),
      requestList: document.getElementById("request-list"),
      saveSuiteBtn: document.getElementById("save-suite-btn"),
      progressSection: document.getElementById("progress-section"),
      progressBar: document.getElementById("progress-bar"),
      progressText: document.getElementById("progress-text"),
      passedCount: document.getElementById("passed-count"),
      failedCount: document.getElementById("failed-count"),
      skippedCount: document.getElementById("skipped-count"),
      // Real-time summary cards (above tabs)
      resultsSummary: document.getElementById("results-summary"),
      summaryPassed: document.getElementById("summary-passed"),
      summaryFailed: document.getElementById("summary-failed"),
      summarySkipped: document.getElementById("summary-skipped"),
      summaryPassRate: document.getElementById("summary-pass-rate"),
      summaryDuration: document.getElementById("summary-duration"),
      // Tabs
      tabBtns: document.querySelectorAll(".tab-btn"),
      tabContents: document.querySelectorAll(".tab-content"),
      // Results
      resultsList: document.getElementById("results-list"),
      exportJsonBtn: document.getElementById("export-json-btn"),
      exportHtmlBtn: document.getElementById("export-html-btn"),
      // Statistics (Response Time table and Error Summary only)
      statsTableBody: document.getElementById("stats-table-body"),
      errorSummary: document.getElementById("error-summary"),
      errorList: document.getElementById("error-list"),
      exportReportBtn: document.getElementById("export-report-btn"),
      // Add Request Modal
      addRequestModal: document.getElementById("add-request-modal"),
      addModalCloseBtn: document.getElementById("add-modal-close-btn"),
      requestSearch: document.getElementById("request-search"),
      availableRequestsList: document.getElementById("available-requests-list"),
      addSelectedBtn: document.getElementById("add-selected-btn"),
      cancelAddBtn: document.getElementById("cancel-add-btn"),
      // Response Detail Modal
      responseModal: document.getElementById("response-modal"),
      modalCloseBtn: document.getElementById("modal-close-btn"),
      modalStatusIcon: document.getElementById("modal-status-icon"),
      modalRequestName: document.getElementById("modal-request-name"),
      modalRequestMeta: document.getElementById("modal-request-meta"),
      modalTabs: document.querySelectorAll(".modal-tab"),
      modalPanels: document.querySelectorAll(".modal-panel"),
      responseBodyEditor: document.getElementById("response-body-editor"),
      responseHeadersTable: document.getElementById("response-headers-table"),
      requestUrl: document.getElementById("request-url"),
      requestMethod: document.getElementById("request-method"),
      requestDuration: document.getElementById("request-duration"),
      requestHeadersTable: document.getElementById("request-headers-table"),
      requestBodyContent: document.getElementById("request-body-content"),
      testSummary: document.getElementById("test-summary"),
      testList: document.getElementById("test-list"),
      bodyFormatSelect: document.getElementById("body-format-select"),
      copyBodyBtn: document.getElementById("copy-body-btn"),
      // Panel resizer
      panelResizer: document.getElementById("panel-resizer")
    };
    initResponseBodyEditor();
    initPanelResizer();
    initVirtualScroll();
    setupEventListeners();
    vscode.postMessage({ type: "ready" });
    log("Test Suite Runner initialized", "info");
  }
  function setupEventListeners() {
    elements.runBtn?.addEventListener("click", startRun);
    elements.stopBtn?.addEventListener("click", stopRun);
    elements.selectAllBtn?.addEventListener("click", selectAllRequests);
    elements.deselectAllBtn?.addEventListener("click", deselectAllRequests);
    elements.addRequestBtn?.addEventListener("click", openAddRequestModal);
    elements.saveSuiteBtn?.addEventListener("click", saveSuite);
    elements.suiteName?.addEventListener("input", () => {
      if (state.suite) {
        state.suite.name = elements.suiteName.value;
        state.isDirty = true;
      }
    });
    elements.browseDataBtn?.addEventListener("click", browseDataFile);
    elements.clearDataBtn?.addEventListener("click", clearDataFile);
    elements.exportJsonBtn?.addEventListener("click", exportJsonReport);
    elements.exportHtmlBtn?.addEventListener("click", exportHtmlReport);
    elements.exportReportBtn?.addEventListener("click", exportStatisticsReport);
    elements.tabBtns?.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.dataset.tab;
        elements.tabBtns.forEach((t) => t.classList.remove("active"));
        elements.tabContents?.forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tabId)?.classList.add("active");
      });
    });
    elements.addModalCloseBtn?.addEventListener("click", closeAddRequestModal);
    elements.cancelAddBtn?.addEventListener("click", closeAddRequestModal);
    elements.addSelectedBtn?.addEventListener("click", addSelectedRequests);
    elements.requestSearch?.addEventListener("input", filterAvailableRequests);
    elements.addRequestModal?.addEventListener("click", (e) => {
      if (e.target === elements.addRequestModal) closeAddRequestModal();
    });
    elements.modalCloseBtn?.addEventListener("click", closeModal);
    elements.responseModal?.addEventListener("click", (e) => {
      if (e.target === elements.responseModal) closeModal();
    });
    elements.modalTabs?.forEach((tab) => {
      tab.addEventListener("click", () => {
        const panelId = tab.dataset.panel;
        elements.modalTabs.forEach((t) => t.classList.remove("active"));
        elements.modalPanels?.forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(panelId)?.classList.add("active");
      });
    });
    elements.copyBodyBtn?.addEventListener("click", () => {
      const content = responseBodyMonacoEditor ? responseBodyMonacoEditor.getValue() : "";
      navigator.clipboard.writeText(content).then(() => {
        elements.copyBodyBtn.textContent = "Copied!";
        setTimeout(() => elements.copyBodyBtn.textContent = "Copy", 2e3);
      });
    });
    elements.bodyFormatSelect?.addEventListener("change", () => {
      if (state.selectedResultIndex >= 0) {
        const result = state.results[state.selectedResultIndex];
        if (result) formatAndDisplayBody(result.responseBody);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!elements.responseModal?.classList.contains("hidden")) {
          closeModal();
        } else if (!elements.addRequestModal?.classList.contains("hidden")) {
          closeAddRequestModal();
        }
      }
    });
    window.addEventListener("message", handleMessage);
  }
  function handleMessage(event) {
    const message = event.data;
    switch (message.type) {
      case "setSuite":
        setSuite(message.suite, message.requests);
        break;
      case "setEnvironments":
        setEnvironments(message.environments);
        break;
      case "setAvailableRequests":
        setAvailableRequests(message.requests);
        break;
      case "setDataFile":
        setDataFile(message.filePath, message.content);
        break;
      case "runStarted":
        handleRunStarted(message.runId, message.suiteId);
        break;
      case "runProgress":
        handleRunProgress(message.current, message.total, message.currentIteration, message.totalIterations);
        break;
      case "requestResult":
        handleRequestResult(message.result);
        break;
      case "statisticsUpdate":
        handleStatisticsUpdate(message.statistics);
        break;
      case "runComplete":
        handleRunComplete(message.summary);
        break;
      case "runStopped":
        handleRunStopped();
        break;
      case "resultDetails":
        handleResultDetails(message.details);
        break;
      case "resultDetailsError":
        handleResultDetailsError(message.error);
        break;
      case "suiteSaved":
        handleSuiteSaved(message.suite);
        break;
      case "saveSuiteResult":
        handleSaveSuiteResult(message.success, message.suiteId, message.error);
        break;
      case "error":
        console.error("[TestSuite] Error:", message.error || message.message);
        break;
    }
  }
  function setSuite(suite, requests) {
    state.results = [];
    state.statistics = null;
    state.currentRunId = null;
    state.isRunning = false;
    state.passed = 0;
    state.failed = 0;
    state.skipped = 0;
    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    virtualScrollState.scrollTop = 0;
    state.suite = suite;
    state.suiteId = suite.id;
    state.requests = requests.map((req, index) => ({
      ...req,
      selected: suite.requests[index]?.enabled !== false,
      status: "pending"
    }));
    state.isDirty = false;
    elements.suiteName.value = suite.name;
    elements.runBtn.disabled = state.requests.length === 0;
    if (suite.config) {
      elements.iterationsInput.value = suite.config.iterations || 1;
      elements.delayInput.value = suite.config.delay || 0;
      elements.stopOnErrorCheck.checked = suite.config.stopOnError || false;
      if (elements.readFromSharedSessionCheck) {
        elements.readFromSharedSessionCheck.checked = suite.config.readFromSharedSession || false;
      }
      if (elements.writeToSharedSessionCheck) {
        elements.writeToSharedSessionCheck.checked = suite.config.writeToSharedSession || false;
      }
    } else {
      elements.iterationsInput.value = 1;
      elements.delayInput.value = 0;
      elements.stopOnErrorCheck.checked = false;
      if (elements.readFromSharedSessionCheck) {
        elements.readFromSharedSessionCheck.checked = false;
      }
      if (elements.writeToSharedSessionCheck) {
        elements.writeToSharedSessionCheck.checked = false;
      }
    }
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.progressSection.style.display = "none";
    elements.progressBar.style.width = "0%";
    elements.progressText.textContent = "";
    const itemsContainer = elements.resultsList?.querySelector(".virtual-items");
    if (itemsContainer) itemsContainer.innerHTML = "";
    const spacer = elements.resultsList?.querySelector(".virtual-spacer");
    if (spacer) spacer.style.height = "0px";
    const emptyState = elements.resultsList?.querySelector(".empty-state");
    if (emptyState) emptyState.style.display = "";
    if (elements.summaryPassed) elements.summaryPassed.textContent = "0";
    if (elements.summaryFailed) elements.summaryFailed.textContent = "0";
    if (elements.summarySkipped) elements.summarySkipped.textContent = "0";
    if (elements.summaryTotal) elements.summaryTotal.textContent = "0";
    renderStatistics();
    renderRequestList();
    log(`Loaded test suite: ${suite.name} (${state.requests.length} requests)`, "info");
  }
  function setEnvironments(environments) {
    state.environments = environments;
    const activeEnv = environments.find((env) => env.active);
    state.selectedEnvironment = activeEnv?.id || null;
    if (elements.environmentDisplay) {
      elements.environmentDisplay.textContent = activeEnv?.name || "No Environment";
      elements.environmentDisplay.className = "environment-badge" + (activeEnv ? " active" : "");
    }
  }
  function setAvailableRequests(requests) {
    state.availableRequests = requests;
    renderAvailableRequestsList();
  }
  function setDataFile(filePath, content) {
    state.dataFile = { path: filePath, content };
    elements.dataFilePath.value = filePath;
    elements.clearDataBtn.disabled = false;
    log(`Loaded data file: ${filePath}`, "info");
  }
  function renderRequestList() {
    if (state.requests.length === 0) {
      elements.requestList.innerHTML = `
            <div class="empty-state">
                <p>No requests in suite</p>
                <p class="hint">Click "+ Add" to add requests</p>
            </div>
        `;
      return;
    }
    elements.requestList.innerHTML = state.requests.map((item, index) => {
      const statusIcon = getStatusIcon(item.status);
      const pathParts = [];
      if (item.collectionName) pathParts.push(item.collectionName);
      if (item.folderPath) pathParts.push(item.folderPath);
      const fullPath = pathParts.length > 0 ? `<span class="collection-path">${escapeHtml(pathParts.join(" \u203A "))}</span>` : "";
      return `
            <div class="request-item" data-index="${index}" draggable="true">
                <input type="checkbox" ${item.selected ? "checked" : ""} data-index="${index}" class="request-checkbox">
                <span class="request-method ${item.method}">${item.method}</span>
                <span class="request-path">
                    ${fullPath}
                    <span class="request-name">${escapeHtml(item.name)}</span>
                </span>
                <span class="request-status ${item.status}">${statusIcon}</span>
                <button class="delete-btn" data-index="${index}" title="Remove from suite">\xD7</button>
                <span class="drag-handle" title="Drag to reorder">\u22EE\u22EE</span>
            </div>
        `;
    }).join("");
    elements.requestList.querySelectorAll(".request-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        const index = parseInt(e.target.dataset.index);
        state.requests[index].selected = e.target.checked;
        state.isDirty = true;
        updateRunButton();
      });
    });
    elements.requestList.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(e.target.dataset.index);
        removeRequest(index);
      });
    });
    setupDragAndDrop();
  }
  function setupDragAndDrop() {
    let draggedIndex = null;
    elements.requestList.querySelectorAll(".request-item").forEach((item, index) => {
      item.addEventListener("dragstart", (e) => {
        draggedIndex = index;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index);
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        elements.requestList.querySelectorAll(".request-item").forEach((el) => {
          el.classList.remove("drag-over");
        });
        draggedIndex = null;
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggedIndex !== null && draggedIndex !== index) {
          item.classList.add("drag-over");
        }
      });
      item.addEventListener("dragleave", () => {
        item.classList.remove("drag-over");
      });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.classList.remove("drag-over");
        if (draggedIndex !== null && draggedIndex !== index) {
          const [removed] = state.requests.splice(draggedIndex, 1);
          state.requests.splice(index, 0, removed);
          state.isDirty = true;
          renderRequestList();
          log(`Reordered: moved "${removed.name}" to position ${index + 1}`, "info");
        }
      });
    });
  }
  function removeRequest(index) {
    const removed = state.requests.splice(index, 1)[0];
    state.isDirty = true;
    renderRequestList();
    updateRunButton();
    log(`Removed "${removed.name}" from suite`, "info");
  }
  function getStatusIcon(status) {
    switch (status) {
      case "pending":
        return "\u25CB";
      case "running":
        return "\u27F3";
      case "passed":
        return "\u2713";
      case "failed":
        return "\u2717";
      case "skipped":
        return "\u25CB";
      default:
        return "\u25CB";
    }
  }
  function updateRunButton() {
    const selectedCount = state.requests.filter((r) => r.selected).length;
    elements.runBtn.disabled = selectedCount === 0 || state.isRunning;
  }
  function selectAllRequests() {
    state.requests.forEach((r) => r.selected = true);
    state.isDirty = true;
    renderRequestList();
    updateRunButton();
  }
  function deselectAllRequests() {
    state.requests.forEach((r) => r.selected = false);
    state.isDirty = true;
    renderRequestList();
    updateRunButton();
  }
  function browseDataFile() {
    vscode.postMessage({ type: "browseDataFile" });
  }
  function clearDataFile() {
    state.dataFile = null;
    elements.dataFilePath.value = "";
    elements.clearDataBtn.disabled = true;
    log("Cleared data file", "info");
  }
  async function startRun() {
    state.isRunning = true;
    state.results = [];
    state.statistics = null;
    state.currentIndex = 0;
    state.passed = 0;
    state.failed = 0;
    state.skipped = 0;
    state.currentRunId = null;
    state.autoScroll = true;
    state.runStartTime = Date.now();
    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    virtualScrollState.scrollTop = 0;
    const iterations = parseInt(elements.iterationsInput.value) || 1;
    const selectedRequests = state.requests.filter((r) => r.selected);
    state.iterations = iterations;
    state.requestsPerIteration = selectedRequests.length;
    state.totalRequests = iterations * selectedRequests.length;
    elements.runBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressSection.style.display = "block";
    const emptyState = elements.resultsList?.querySelector(".empty-state");
    if (emptyState) emptyState.style.display = "none";
    const itemsContainer = elements.resultsList?.querySelector(".virtual-items");
    if (itemsContainer) itemsContainer.innerHTML = "";
    const spacer = elements.resultsList?.querySelector(".virtual-spacer");
    if (spacer) spacer.style.height = "0px";
    if (elements.resultsList) elements.resultsList.scrollTop = 0;
    resetStatistics();
    state.requests.forEach((r) => {
      r.status = r.selected ? "pending" : "skipped";
      if (!r.selected) state.skipped++;
    });
    renderRequestList();
    updateProgress();
    const config = {
      iterations,
      delay: parseInt(elements.delayInput.value) || 0,
      environmentId: state.selectedEnvironment,
      stopOnError: elements.stopOnErrorCheck.checked,
      readFromSharedSession: elements.readFromSharedSessionCheck.checked,
      writeToSharedSession: elements.writeToSharedSessionCheck.checked,
      dataFile: state.dataFile
    };
    const selectedIndices = state.requests.map((r, i) => r.selected ? i : -1).filter((i) => i >= 0);
    log(`Starting run: ${config.iterations} iteration(s), ${config.delay}ms delay, ${selectedIndices.length} requests`, "info");
    vscode.postMessage({
      type: "startRun",
      selectedIndices,
      config
    });
  }
  function stopRun() {
    state.isRunning = false;
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
    vscode.postMessage({ type: "stopRun" });
    log("Run stopped by user", "warning");
  }
  function handleRunStarted(runId, suiteId) {
    state.currentRunId = runId;
    state.suiteId = suiteId;
    state.autoScroll = true;
    log(`Run started: ${runId}`, "info");
  }
  function handleRunProgress(current, total, currentIteration, totalIterations) {
    elements.progressText.textContent = `${current} / ${total} (Iteration ${currentIteration}/${totalIterations})`;
    const percent = total > 0 ? current / total * 100 : 0;
    elements.progressBar.style.width = `${percent}%`;
  }
  function handleRequestResult(result) {
    state.results.push(result);
    const expanded = expandSummary(result);
    if (expanded.passed) {
      state.passed++;
    } else {
      state.failed++;
    }
    state.currentIndex++;
    updateProgress();
    renderVirtualResults();
    if (state.autoScroll && elements.resultsList) {
      const totalHeight = state.results.length * VIRTUAL_SCROLL.itemHeight;
      const containerHeight = elements.resultsList.clientHeight || 400;
      elements.resultsList.scrollTop = totalHeight - containerHeight;
    }
    const icon = expanded.passed ? "\u2713" : "\u2717";
    const logLevel = expanded.passed ? "success" : "error";
    log(`${icon} ${expanded.name} - ${expanded.status} (${expanded.duration}ms)`, logLevel);
  }
  function handleStatisticsUpdate(statistics) {
    state.statistics = statistics;
    renderStatistics();
  }
  function updateProgress() {
    const total = state.totalRequests || state.requests.filter((r) => r.selected).length;
    const completed = state.passed + state.failed;
    const percent = total > 0 ? completed / total * 100 : 0;
    elements.progressBar.style.width = `${percent}%`;
    elements.progressText.textContent = `${completed} / ${total}`;
    elements.passedCount.textContent = state.passed;
    elements.failedCount.textContent = state.failed;
    elements.skippedCount.textContent = state.skipped;
    if (state.failed > 0) {
      const passPercent = state.passed / completed * percent;
      elements.progressBar.classList.add("has-failures");
      elements.progressBar.style.setProperty("--pass-percent", `${passPercent}%`);
    }
    updateRealTimeStats();
  }
  function updateRealTimeStats() {
    const total = state.passed + state.failed;
    const passRate = total > 0 ? state.passed / total * 100 : 0;
    const duration = state.runStartTime ? (Date.now() - state.runStartTime) / 1e3 : 0;
    if (elements.summaryPassed) elements.summaryPassed.textContent = state.passed;
    if (elements.summaryFailed) elements.summaryFailed.textContent = state.failed;
    if (elements.summarySkipped) elements.summarySkipped.textContent = state.skipped;
    if (elements.summaryPassRate) elements.summaryPassRate.textContent = `${passRate.toFixed(1)}%`;
    if (elements.summaryDuration) elements.summaryDuration.textContent = `${duration.toFixed(2)}s`;
  }
  function handleRunComplete(summary) {
    state.isRunning = false;
    state.autoScroll = false;
    const finalDuration = state.runStartTime ? Date.now() - state.runStartTime : 0;
    if (summary) {
      state.statistics = {
        ...state.statistics,
        passed: summary.passed,
        failed: summary.failed,
        skipped: summary.skipped,
        passRate: summary.passRate,
        duration: finalDuration
        // Use calculated duration
      };
    } else {
      state.statistics = {
        ...state.statistics,
        duration: finalDuration
      };
    }
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
    renderStatistics();
    log(
      `Run complete: ${state.passed} passed, ${state.failed} failed, ${state.skipped} skipped`,
      state.failed > 0 ? "warning" : "success"
    );
  }
  function handleRunStopped() {
    state.isRunning = false;
    state.autoScroll = false;
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
  }
  function handleSuiteSaved(suite) {
    const saveBtn = elements.saveSuiteBtn;
    if (suite) {
      state.suite = suite;
      state.suiteId = suite.id;
      state.isDirty = false;
      log(`Suite saved: ${suite.name}`, "success");
      if (saveBtn) {
        saveBtn.classList.remove("saving");
        saveBtn.classList.add("saved");
        saveBtn.innerHTML = "\u2713 Saved!";
        setTimeout(() => {
          saveBtn.classList.remove("saved");
          saveBtn.innerHTML = "Save Suite";
          saveBtn.disabled = false;
        }, 2e3);
      }
    } else {
      if (saveBtn) {
        saveBtn.classList.remove("saving");
        saveBtn.innerHTML = "Save Suite";
        saveBtn.disabled = false;
      }
    }
  }
  function resetStatistics() {
    if (elements.summaryPassed) elements.summaryPassed.textContent = "0";
    if (elements.summaryFailed) elements.summaryFailed.textContent = "0";
    if (elements.summaryPassRate) elements.summaryPassRate.textContent = "0%";
    if (elements.summaryDuration) elements.summaryDuration.textContent = "0s";
    if (elements.statsTableBody) elements.statsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No data yet</td></tr>';
    if (elements.errorSummary) elements.errorSummary.style.display = "none";
    if (elements.errorList) elements.errorList.innerHTML = "";
  }
  function renderStatistics() {
    const stats = state.statistics;
    if (!stats) return;
    if (stats.byRequest && stats.byRequest.length > 0) {
      elements.statsTableBody.innerHTML = stats.byRequest.map((reqStats) => `
                <tr>
                    <td>${escapeHtml(reqStats.name || "Unknown")}</td>
                    <td>${reqStats.min}ms</td>
                    <td>${Math.round(reqStats.avg)}ms</td>
                    <td>${reqStats.p95}ms</td>
                    <td>${reqStats.p99}ms</td>
                    <td>${reqStats.max}ms</td>
                </tr>
            `).join("");
    } else {
      elements.statsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No data yet</td></tr>';
    }
    if (stats.errors && Object.keys(stats.errors).length > 0) {
      elements.errorSummary.style.display = "block";
      elements.errorList.innerHTML = Object.entries(stats.errors).map(([errorType, count]) => `
                <div class="error-item">
                    <span class="error-type">${escapeHtml(errorType)}</span>
                    <span class="error-count">${count} occurrence${count > 1 ? "s" : ""}</span>
                </div>
            `).join("");
    } else {
      elements.errorSummary.style.display = "none";
    }
  }
  function saveSuite() {
    if (!state.suite) return;
    const saveBtn = elements.saveSuiteBtn;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add("saving");
      saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    }
    const updatedSuite = {
      ...state.suite,
      requests: state.requests.map((r) => ({
        collectionId: r.collectionId,
        requestId: r.requestId || r.id,
        name: r.name,
        method: r.method,
        collectionName: r.collectionName,
        folderPath: r.folderPath || "",
        enabled: r.selected
      })),
      config: {
        iterations: parseInt(elements.iterationsInput.value) || 1,
        delay: parseInt(elements.delayInput.value) || 0,
        stopOnError: elements.stopOnErrorCheck.checked,
        readFromSharedSession: elements.readFromSharedSessionCheck.checked,
        writeToSharedSession: elements.writeToSharedSessionCheck.checked
      }
    };
    vscode.postMessage({
      type: "saveSuite",
      suite: updatedSuite
    });
    log("Saving suite...", "info");
  }
  function handleSaveSuiteResult(success, suiteId, error) {
    const saveBtn = elements.saveSuiteBtn;
    if (success) {
      state.isDirty = false;
      state.suiteId = suiteId;
      log(`Suite saved: ${suiteId}`, "success");
      if (saveBtn) {
        saveBtn.classList.remove("saving");
        saveBtn.classList.add("saved");
        saveBtn.innerHTML = "\u2713 Saved!";
        setTimeout(() => {
          saveBtn.classList.remove("saved");
          saveBtn.innerHTML = "Save Suite";
          saveBtn.disabled = false;
        }, 2e3);
      }
    } else {
      log(`Failed to save suite: ${error}`, "error");
      if (saveBtn) {
        saveBtn.classList.remove("saving");
        saveBtn.innerHTML = "Save Suite";
        saveBtn.disabled = false;
      }
    }
  }
  function openAddRequestModal() {
    vscode.postMessage({ type: "getAvailableRequests" });
    elements.requestSearch.value = "";
    elements.addRequestModal.classList.remove("hidden");
    elements.requestSearch.focus();
  }
  function closeAddRequestModal() {
    elements.addRequestModal.classList.add("hidden");
    elements.availableRequestsList.innerHTML = "";
  }
  function renderAvailableRequestsList() {
    const searchTerm = (elements.requestSearch.value || "").toLowerCase();
    const byCollection = {};
    for (const req of state.availableRequests) {
      if (searchTerm && !req.name.toLowerCase().includes(searchTerm) && !req.collectionName?.toLowerCase().includes(searchTerm)) {
        continue;
      }
      const collectionName = req.collectionName || "Unknown Collection";
      if (!byCollection[collectionName]) {
        byCollection[collectionName] = [];
      }
      byCollection[collectionName].push(req);
    }
    if (Object.keys(byCollection).length === 0) {
      elements.availableRequestsList.innerHTML = '<div class="empty-state"><p>No requests found</p></div>';
      return;
    }
    elements.availableRequestsList.innerHTML = Object.entries(byCollection).map(([collectionName, requests]) => `
            <div class="collection-group">
                <div class="collection-group-header">${escapeHtml(collectionName)}</div>
                ${requests.map((req) => {
      const folderDisplay = req.folderPath ? `<span class="available-request-folder">${escapeHtml(req.folderPath)}</span>` : "";
      return `
                    <div class="available-request-item" data-collection-id="${req.collectionId}" data-request-id="${req.requestId}">
                        <input type="checkbox" class="add-request-checkbox">
                        <span class="request-method ${req.method}">${req.method}</span>
                        <div class="available-request-info">
                            ${folderDisplay}
                            <span class="available-request-name">${escapeHtml(req.name)}</span>
                        </div>
                    </div>
                `;
    }).join("")}
            </div>
        `).join("");
    elements.availableRequestsList.querySelectorAll(".available-request-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.type !== "checkbox") {
          const checkbox = item.querySelector(".add-request-checkbox");
          checkbox.checked = !checkbox.checked;
        }
        item.classList.toggle("selected", item.querySelector(".add-request-checkbox").checked);
        updateAddSelectedButton();
      });
    });
    updateAddSelectedButton();
  }
  function filterAvailableRequests() {
    renderAvailableRequestsList();
  }
  function updateAddSelectedButton() {
    const checkedCount = elements.availableRequestsList.querySelectorAll(".add-request-checkbox:checked").length;
    elements.addSelectedBtn.disabled = checkedCount === 0;
    elements.addSelectedBtn.textContent = checkedCount > 0 ? `Add Selected (${checkedCount})` : "Add Selected";
  }
  function addSelectedRequests() {
    const selectedItems = elements.availableRequestsList.querySelectorAll(".available-request-item");
    const toAdd = [];
    selectedItems.forEach((item) => {
      const checkbox = item.querySelector(".add-request-checkbox");
      if (checkbox.checked) {
        const collectionId = item.dataset.collectionId;
        const requestId = item.dataset.requestId;
        const req = state.availableRequests.find((r) => r.requestId === requestId && r.collectionId === collectionId);
        if (req) {
          toAdd.push({
            ...req,
            selected: true,
            status: "pending"
          });
        }
      }
    });
    if (toAdd.length > 0) {
      state.requests.push(...toAdd);
      state.isDirty = true;
      vscode.postMessage({
        type: "addRequests",
        requests: toAdd.map((req) => ({
          collectionId: req.collectionId,
          requestId: req.requestId,
          enabled: true
        }))
      });
      renderRequestList();
      updateRunButton();
      log(`Added ${toAdd.length} request(s) to suite`, "info");
    }
    closeAddRequestModal();
  }
  function showResultDetail(index) {
    const compactResult = state.results[index];
    if (!compactResult) return;
    const result = expandSummary(compactResult);
    state.selectedResultIndex = index;
    showModalWithSummary(result);
    if (result.resultFile && state.suiteId && state.currentRunId) {
      vscode.postMessage({
        type: "getResultDetails",
        suiteId: state.suiteId,
        runId: state.currentRunId,
        resultFile: result.resultFile
      });
    } else {
      populateModalWithDetails(result);
    }
  }
  function showModalWithSummary(result) {
    if (elements.modalStatusIcon) {
      elements.modalStatusIcon.textContent = result.passed ? "\u2713" : "\u2717";
      elements.modalStatusIcon.className = `modal-status-icon ${result.passed ? "passed" : "failed"}`;
    }
    if (elements.modalRequestName) {
      elements.modalRequestName.textContent = result.name;
    }
    if (elements.modalRequestMeta) {
      elements.modalRequestMeta.textContent = `${result.method} ${result.status} \u2022 ${result.duration}ms`;
    }
    elements.modalTabs?.forEach((t) => t.classList.remove("active"));
    elements.modalPanels?.forEach((p) => p.classList.remove("active"));
    elements.modalTabs?.[0]?.classList.add("active");
    elements.modalPanels?.[0]?.classList.add("active");
    if (responseBodyMonacoEditor) {
      responseBodyMonacoEditor.setValue("Loading...");
    }
    elements.responseModal.classList.remove("hidden");
  }
  function handleResultDetails(details) {
    if (details) {
      populateModalWithDetails(details);
    }
  }
  function handleResultDetailsError(error) {
    if (responseBodyMonacoEditor) {
      responseBodyMonacoEditor.setValue(`Error loading details: ${error}`);
    }
  }
  function populateModalWithDetails(result) {
    const responseBody = result.response?.body ?? result.responseBody;
    const responseHeaders = result.response?.headers ?? result.responseHeaders ?? {};
    const requestBody = result.request?.body ?? result.requestBody;
    const requestHeaders = result.request?.headers ?? result.requestHeaders ?? {};
    formatAndDisplayBody(responseBody);
    if (elements.responseHeadersTable) {
      elements.responseHeadersTable.innerHTML = Object.entries(responseHeaders).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`).join("") || '<tr><td colspan="2">No headers</td></tr>';
    }
    if (elements.requestUrl) elements.requestUrl.textContent = result.url || "";
    if (elements.requestMethod) elements.requestMethod.textContent = result.method || "";
    if (elements.requestDuration) elements.requestDuration.textContent = `${result.duration}ms`;
    if (elements.requestHeadersTable) {
      elements.requestHeadersTable.innerHTML = Object.entries(requestHeaders).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`).join("") || '<tr><td colspan="2">No headers</td></tr>';
    }
    if (elements.requestBodyContent) {
      if (requestBody) {
        elements.requestBodyContent.textContent = typeof requestBody === "object" ? JSON.stringify(requestBody, null, 2) : String(requestBody);
      } else {
        elements.requestBodyContent.textContent = "No body";
      }
    }
    populateTestResults(result.assertions || []);
  }
  function initResponseBodyEditor() {
    if (!elements.responseBodyEditor) return;
    if (!responseBodyMonacoEditor && window.monaco) {
      responseBodyMonacoEditor = monaco.editor.create(elements.responseBodyEditor, {
        value: "// Response body will appear here",
        language: "json",
        theme: "vs-dark",
        readOnly: true,
        minimap: { enabled: false },
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        folding: true
      });
    }
  }
  function formatAndDisplayBody(body) {
    const format = elements.bodyFormatSelect?.value || "auto";
    let displayText = "";
    let language = "json";
    if (body === void 0 || body === null) {
      displayText = "// No response body";
    } else if (format === "auto") {
      if (typeof body === "object") {
        displayText = JSON.stringify(body, null, 2);
      } else if (typeof body === "string") {
        try {
          const parsed = JSON.parse(body);
          displayText = JSON.stringify(parsed, null, 2);
        } catch {
          displayText = body;
          language = "text";
        }
      } else {
        displayText = String(body);
        language = "text";
      }
    } else if (format === "json") {
      try {
        const parsed = typeof body === "object" ? body : JSON.parse(body);
        displayText = JSON.stringify(parsed, null, 2);
      } catch {
        displayText = String(body);
      }
    } else {
      displayText = typeof body === "object" ? JSON.stringify(body, null, 2) : String(body);
      language = format === "xml" ? "xml" : "text";
    }
    if (!responseBodyMonacoEditor && window.monaco) {
      initResponseBodyEditor();
    }
    if (responseBodyMonacoEditor) {
      monaco.editor.setModelLanguage(responseBodyMonacoEditor.getModel(), language);
      responseBodyMonacoEditor.setValue(displayText);
    } else {
      console.warn("[formatAndDisplayBody] Monaco editor not available, body cannot be displayed");
      if (elements.responseBodyEditor) {
        elements.responseBodyEditor.textContent = displayText;
      }
    }
  }
  function populateTestResults(assertions) {
    if (!elements.testSummary || !elements.testList) return;
    const passed = assertions.filter((a) => a.passed).length;
    const failed = assertions.filter((a) => !a.passed).length;
    elements.testSummary.innerHTML = `
        <div class="test-summary-item passed">\u2713 ${passed} passed</div>
        <div class="test-summary-item failed">\u2717 ${failed} failed</div>
    `;
    if (assertions.length === 0) {
      elements.testList.innerHTML = '<div class="test-item"><span class="test-content">No tests defined</span></div>';
      return;
    }
    elements.testList.innerHTML = assertions.map((test) => `
        <div class="test-item ${test.passed ? "passed" : "failed"}">
            <span class="test-icon ${test.passed ? "passed" : "failed"}">${test.passed ? "\u2713" : "\u2717"}</span>
            <div class="test-content">
                <div class="test-name">${escapeHtml(test.name)}</div>
                ${test.message ? `<div class="test-message">${escapeHtml(test.message)}</div>` : ""}
            </div>
        </div>
    `).join("");
  }
  function closeModal() {
    if (elements.responseModal) {
      elements.responseModal.classList.add("hidden");
    }
    state.selectedResultIndex = -1;
  }
  function exportJsonReport() {
    const expandedResults = state.results.map((r) => expandSummary(r));
    vscode.postMessage({
      type: "exportReport",
      format: "json",
      data: {
        suite: state.suite,
        results: expandedResults,
        statistics: state.statistics
      }
    });
  }
  function exportHtmlReport() {
    const expandedResults = state.results.map((r) => expandSummary(r));
    vscode.postMessage({
      type: "exportReport",
      format: "html",
      data: {
        suite: state.suite,
        results: expandedResults,
        statistics: state.statistics
      }
    });
  }
  function exportStatisticsReport() {
    vscode.postMessage({
      type: "exportReport",
      format: "statistics",
      data: {
        suite: state.suite,
        statistics: state.statistics
      }
    });
  }
  function initPanelResizer() {
    if (!elements.panelResizer) return;
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    const leftPanel = document.querySelector(".runner-left-panel");
    const main = document.querySelector(".runner-main");
    elements.panelResizer.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = leftPanel.offsetWidth;
      elements.panelResizer.classList.add("resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });
    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const delta = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(500, startWidth + delta));
      main.style.gridTemplateColumns = `${newWidth}px 4px 1fr`;
    });
    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        elements.panelResizer.classList.remove("resizing");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    });
  }
  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function initVirtualScroll() {
    if (!elements.resultsList) return;
    elements.resultsList.addEventListener("scroll", onResultsScroll);
    let spacer = elements.resultsList.querySelector(".virtual-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.className = "virtual-spacer";
      spacer.style.position = "absolute";
      spacer.style.top = "0";
      spacer.style.left = "0";
      spacer.style.width = "1px";
      spacer.style.pointerEvents = "none";
      elements.resultsList.appendChild(spacer);
    }
    let itemsContainer = elements.resultsList.querySelector(".virtual-items");
    if (!itemsContainer) {
      itemsContainer = document.createElement("div");
      itemsContainer.className = "virtual-items";
      elements.resultsList.appendChild(itemsContainer);
    }
  }
  function onResultsScroll() {
    if (!elements.resultsList) return;
    const scrollTop = elements.resultsList.scrollTop;
    const totalHeight = state.results.length * VIRTUAL_SCROLL.itemHeight;
    const containerHeight = elements.resultsList.clientHeight || 400;
    const isAtBottom = scrollTop + containerHeight >= totalHeight - 50;
    if (!isAtBottom && state.isRunning) {
      state.autoScroll = false;
    }
    if (isAtBottom && state.isRunning) {
      state.autoScroll = true;
    }
    virtualScrollState.scrollTop = scrollTop;
    renderVirtualResults();
  }
  function renderVirtualResults() {
    if (!elements.resultsList) return;
    const totalItems = state.results.length;
    if (totalItems === 0) {
      const itemsContainer2 = elements.resultsList.querySelector(".virtual-items");
      if (itemsContainer2) itemsContainer2.innerHTML = "";
      return;
    }
    const scrollTop = elements.resultsList.scrollTop;
    const containerHeight = elements.resultsList.clientHeight || 400;
    const itemHeight = VIRTUAL_SCROLL.itemHeight;
    const buffer = VIRTUAL_SCROLL.bufferSize;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + buffer * 2;
    const endIndex = Math.min(totalItems, startIndex + visibleCount);
    const spacer = elements.resultsList.querySelector(".virtual-spacer");
    if (spacer) {
      spacer.style.height = `${totalItems * itemHeight}px`;
    }
    let itemsContainer = elements.resultsList.querySelector(".virtual-items");
    if (!itemsContainer) {
      itemsContainer = document.createElement("div");
      itemsContainer.className = "virtual-items";
      elements.resultsList.appendChild(itemsContainer);
    }
    itemsContainer.style.position = "absolute";
    itemsContainer.style.top = `${startIndex * itemHeight}px`;
    itemsContainer.style.left = "0";
    itemsContainer.style.right = "0";
    if (startIndex === virtualScrollState.startIndex && endIndex === virtualScrollState.endIndex && itemsContainer.children.length === endIndex - startIndex) {
      return;
    }
    virtualScrollState.startIndex = startIndex;
    virtualScrollState.endIndex = endIndex;
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const result = state.results[i];
      if (result) {
        fragment.appendChild(createResultItemElement(result, i));
      }
    }
    itemsContainer.innerHTML = "";
    itemsContainer.appendChild(fragment);
  }
  function createResultItemElement(compactResult, index) {
    const result = expandSummary(compactResult);
    const matchingRequest = state.requests.find(
      (r) => r.requestId === result.requestId || r.id === result.requestId
    );
    let fullPath = "";
    if (matchingRequest) {
      const parts = [];
      if (matchingRequest.collectionName) parts.push(matchingRequest.collectionName);
      if (matchingRequest.folderPath) parts.push(matchingRequest.folderPath);
      parts.push(result.name);
      fullPath = parts.join(" \u203A ");
    } else {
      fullPath = result.name;
    }
    const item = document.createElement("div");
    item.className = `result-item ${result.passed ? "passed" : "failed"}`;
    item.dataset.resultIndex = index;
    item.dataset.resultFile = result.resultFile || "";
    item.title = "Click to view details";
    item.style.height = `${VIRTUAL_SCROLL.itemHeight}px`;
    item.style.boxSizing = "border-box";
    const statusClass = result.status >= 200 && result.status < 300 ? "success" : result.status >= 300 && result.status < 400 ? "redirect" : "error";
    item.innerHTML = `
        <span class="result-icon ${result.passed ? "passed" : "failed"}">
            ${result.passed ? "\u2713" : "\u2717"}
        </span>
        <span class="result-method ${result.method}">${escapeHtml(result.method || "GET")}</span>
        <div class="result-details">
            <div class="result-name" title="${escapeHtml(fullPath)}">${escapeHtml(fullPath)}</div>
        </div>
        <span class="result-status ${statusClass}">${result.status || "-"}</span>
        <span class="result-duration">${result.duration}ms</span>
    `;
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.autoScroll = false;
      showResultDetail(index);
    });
    return item;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
//# sourceMappingURL=bundle.js.map
