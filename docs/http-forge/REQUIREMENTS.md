# HTTP Forge - Requirements Document

**Version:** 2.0  
**Date:** January 10, 2026  
**Author:** HTTP Forge Team

---

## 1. Executive Summary

### 1.1 Purpose
HTTP Forge is a standalone VS Code extension that provides Postman-like HTTP API testing functionality with collections, environments, scripting, and a clean user interface.

### 1.2 Goals
- Provide a standalone HTTP API testing experience similar to Postman
- Enable collection-based request organization and management
- **Test Suite**: Cross-collection test configuration with save/reuse capability
- **Performance Statistics**: P50/P90/P95/P99 response time metrics
- Allow import/export of Postman collections
- Provide environment management with variable substitution

### 1.3 Non-Goals
- Replace Postman entirely (focus on developer workflow integration)
- Support Postman Flows or advanced automation features
- Implement team collaboration features (sync, shared workspaces)
- **Complex load testing** (VUs, ramp-up, distributed testing - use k6/JMeter instead)

---

## 2. Stakeholders

| Role | Interest |
|------|----------|
| Developers | Primary users testing APIs during development |
| QA Engineers | Running API test suites |
| DevOps | CI/CD integration (future consideration) |

---

## 3. Functional Requirements

### 3.1 Request Management

#### FR-3.1.1 Free-form URL Input
- **Priority:** P0 (Must Have)
- **Description:** Users can enter any HTTP/HTTPS URL directly
- **Acceptance Criteria:**
  - Method selector dropdown (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
  - URL input field with variable substitution support (`{{variable}}`)
  - Send button to execute request

#### FR-3.1.2 Request Configuration
- **Priority:** P0 (Must Have)
- **Description:** Configure all aspects of an HTTP request
- **Acceptance Criteria:**
  - Query parameters (key-value pairs, enable/disable toggle)
  - Headers (key-value pairs, enable/disable toggle)
  - Request body (JSON, form-data, raw text, none)
  - Authorization (Inherit, OAuth 2.0, Bearer Token, Basic Auth, API Key, No Auth)
  - Pre-request script (JavaScript)
  - Post-response script (JavaScript with tests)
  - Settings (timeout, redirects, SSL verification)

#### FR-3.1.3 Response Display
- **Priority:** P0 (Must Have)
- **Description:** Display HTTP response with full details
- **Acceptance Criteria:**
  - Response body with syntax highlighting (JSON, XML, HTML, plain text)
  - Response headers table
  - Cookies table with all cookie attributes
  - Status code, response time, response size
  - Test results summary

### 3.2 Collection Management

#### FR-3.2.1 Collection CRUD
- **Priority:** P0 (Must Have)
- **Description:** Create, read, update, delete collections
- **Acceptance Criteria:**
  - Create new collection with name and description
  - Rename collection
  - Delete collection with confirmation
  - Duplicate collection

#### FR-3.2.2 Folder Organization
- **Priority:** P0 (Must Have)
- **Description:** Organize requests in nested folders
- **Acceptance Criteria:**
  - Create folders within collections
  - Nest folders (unlimited depth)
  - Rename and delete folders
  - Move requests between folders

#### FR-3.2.3 Request CRUD
- **Priority:** P0 (Must Have)
- **Description:** Save and manage requests within collections
- **Acceptance Criteria:**
  - Save current request to collection/folder
  - Create new request from scratch
  - Rename and delete requests
  - Duplicate requests
  - Move requests between folders/collections

#### FR-3.2.4 Collection Tree View
- **Priority:** P0 (Must Have)
- **Description:** Visual tree structure for collections
- **Acceptance Criteria:**
  - Expandable/collapsible tree nodes
  - Visual indicators for item types (collection, folder, request)
  - Method badge on requests (color-coded)
  - Context menu (right-click) for all operations
  - Drag and drop for reordering (P1)

#### FR-3.2.5 Collection Storage
- **Priority:** P0 (Must Have)
- **Description:** Persist collections to file system
- **Acceptance Criteria:**
  - Store in `agl-essentials/collections/` directory
  - One file per collection (JSON format)
  - Postman Collection v2.1 compatible format
  - Auto-save on changes

### 3.3 Collection Variables

#### FR-3.3.1 Collection-Level Variables
- **Priority:** P1 (Should Have)
- **Description:** Define variables scoped to a collection
- **Acceptance Criteria:**
  - Variable editor UI in collection settings
  - Variables override environment variables
  - Support initial and current values

#### FR-3.3.2 Variable Resolution Order
- **Priority:** P1 (Should Have)
- **Description:** Clear precedence for variable substitution
- **Acceptance Criteria:**
  - Order: Request > Folder > Collection > Environment
  - Display resolved value on hover

### 3.4 Script Execution

#### FR-3.4.1 Script Inheritance
- **Priority:** P1 (Should Have)
- **Description:** Scripts execute in hierarchical order
- **Acceptance Criteria:**
  - Collection pre-request → Folder pre-request → Request pre-request
  - Request post-response → Folder post-response → Collection post-response
  - Option to skip inherited scripts

#### FR-3.4.2 AGL Script API
- **Priority:** P0 (Must Have)
- **Description:** JavaScript API for scripts (similar to Postman pm.*)
- **Acceptance Criteria:**
  - `agl.env.get/set()` - Environment variables
  - `agl.variables.get/set()` - Collection/local variables
  - `agl.request.*` - Request properties
  - `agl.response.*` - Response properties
  - `agl.test()` - Define test assertions
  - `agl.expect()` - Chai-like assertions
  - `agl.cookies.*` - Cookie management

### 3.5 Test Suite (replaces Collection Runner)

#### FR-3.5.1 Create Test Suite
- **Priority:** P0 (Must Have)
- **Description:** Create reusable test configurations that can span multiple collections
- **Acceptance Criteria:**
  - Select requests from **multiple collections** (cross-collection support)
  - Arrange execution order via drag-and-drop
  - Save test suite configuration to `.http-forge/suites/` directory
  - Load and edit saved suites
  - Test Suite appears in Tree View under "Test Suites" section

#### FR-3.5.2 Run Test Suite
- **Priority:** P0 (Must Have)
- **Description:** Execute test suite sequentially with configurable options
- **Acceptance Criteria:**
  - Run selected requests sequentially (single user, no concurrency)
  - Configurable iterations (1-1000)
  - Configurable delay between requests (ms)
  - Stop on first error (configurable)
  - Show real-time progress with virtual scrolling for large results
  - Environment selector for variable substitution

#### FR-3.5.3 Performance Statistics
- **Priority:** P0 (Must Have)
- **Description:** Display response time statistics after run completion
- **Acceptance Criteria:**
  - Per-request statistics table: Min, Avg, P50, P90, P95, P99, Max
  - Overall statistics across all requests
  - Error rate percentage and error type breakdown
  - Summary: Total requests, Passed, Failed, Duration
  - Export statistics report option

#### FR-3.5.4 Quick Run (Single Collection)
- **Priority:** P0 (Must Have)
- **Description:** Quick run entire collection without creating a saved suite
- **Acceptance Criteria:**
  - Right-click collection → "Run All"
  - Auto-creates temporary suite pre-filled with all collection requests
  - Opens suite runner interface
  - User can choose [Run] (temporary) or [Save & Run] (persistent)

#### FR-3.5.5 Test Suite Storage
- **Priority:** P0 (Must Have)
- **Description:** Persist test suites to file system
- **Acceptance Criteria:**
  - Store in `.http-forge/suites/` directory
  - JSON format with suite configuration
  - Stores request references (collectionId + requestId), not copies
  - Results stored in `.http-forge/results/suites/{suiteId}/{runId}/`

### 3.6 Cookie Management

#### FR-3.6.1 Cookie Persistence
- **Priority:** P0 (Must Have)
- **Description:** Cookies persist across requests
- **Acceptance Criteria:**
  - Cookies stored per domain
  - Sent automatically on subsequent requests
  - Script access via `agl.cookies.*`
  - Clear cookies option

#### FR-3.6.2 Cookie Jar UI
- **Priority:** P2 (Nice to Have)
- **Description:** View and manage stored cookies
- **Acceptance Criteria:**
  - List all cookies by domain
  - Edit cookie values
  - Delete individual cookies
  - Clear all cookies

### 3.7 Import/Export

#### FR-3.7.1 Postman Import
- **Priority:** P1 (Should Have)
- **Description:** Import Postman Collection v2.1 format
- **Acceptance Criteria:**
  - Parse collection JSON file
  - Transform `pm.*` scripts to `agl.*`
  - Preserve folder structure
  - Report unsupported features

#### FR-3.7.2 Postman Export
- **Priority:** P2 (Nice to Have)
- **Description:** Export in Postman-compatible format
- **Acceptance Criteria:**
  - Generate valid Postman Collection v2.1 JSON
  - Transform `agl.*` scripts to `pm.*`
  - Include all folders and requests

#### FR-3.7.3 Script Transformation
- **Priority:** P1 (Should Have)
- **Description:** Convert between Postman and AGL script APIs
- **Acceptance Criteria:**
  - See transformation mapping table in Design Doc
  - Handle common patterns
  - Warn on unsupported features

### 3.8 Environment Integration

#### FR-3.8.1 Shared Environments
- **Priority:** P0 (Must Have)
- **Description:** Use existing AGL environment configuration
- **Acceptance Criteria:**
  - Environment selector dropdown
  - Access to environment variables
  - Access to environment headers
  - Same environments as Endpoint Tester

---

## 4. Non-Functional Requirements

### 4.1 Performance

#### NFR-4.1.1 UI Responsiveness
- Tree view expands/collapses in < 100ms
- Request execution feedback immediate
- Large collections (500+ requests) render in < 2s

#### NFR-4.1.2 Memory Usage
- Collections lazy-loaded
- Response bodies limited to prevent memory issues

### 4.2 Usability

#### NFR-4.2.1 Familiar UX
- Similar layout to Postman for easy adoption
- Keyboard shortcuts for common actions
- Tooltips and hints for new users

#### NFR-4.2.2 Accessibility
- Keyboard navigation support
- Screen reader compatible labels
- Sufficient color contrast

### 4.3 Maintainability

#### NFR-4.3.1 Code Reuse
- Share core modules with Endpoint Tester
- SOLID principles in module design
- Clear separation of concerns

### 4.4 Compatibility

#### NFR-4.4.1 Postman Format
- Full compatibility with Postman Collection v2.1
- Graceful handling of unsupported features

---

## 5. Use Cases

### UC-1: Basic API Testing
**Actor:** Developer  
**Goal:** Test an API endpoint quickly  
**Steps:**
1. Open HTTP API Tester
2. Enter URL and select method
3. Add headers/body as needed
4. Click Send
5. View response

### UC-2: Save Request to Collection
**Actor:** Developer  
**Goal:** Save a request for reuse  
**Steps:**
1. Configure request (UC-1)
2. Click Save button
3. Select or create collection
4. Select or create folder
5. Enter request name
6. Confirm save

### UC-3: Run Auth Collection Before Endpoint Test
**Actor:** Developer  
**Goal:** Authenticate before testing protected endpoint  
**Steps:**
1. Create "Auth" collection with login request
2. In login's post-response script, extract tokens
3. Open Endpoint Tester for protected endpoint
4. Select "Auth" as pre-flight collection
5. Click Send - auth runs first, then endpoint

### UC-4: Import Postman Collection
**Actor:** Developer  
**Goal:** Migrate existing Postman collection  
**Steps:**
1. Export collection from Postman (v2.1 format)
2. In HTTP API Tester, click Import
3. Select exported JSON file
4. Review transformation report
5. Collection appears in tree

---

## 6. Constraints

- Must work within VS Code webview limitations
- No external network calls except to configured URLs
- Must not conflict with existing Endpoint Tester functionality
- Must use existing environment configuration system

---

## 7. Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| Endpoint Tester | Internal | Share core modules |
| Environment Service | Internal | Shared env configuration |
| Monaco Editor | External | Code editors |
| VS Code API | External | Webview, storage, commands |

---

## 8. Glossary

| Term | Definition |
|------|------------|
| Collection | A group of saved HTTP requests and folders |
| Folder | A container for organizing requests within a collection |
| Pre-flight | A collection run before the main request |
| Cookie Jar | Storage for HTTP cookies that persist across requests |
| Variable Substitution | Replacing `{{variable}}` with actual values |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-18 | AGL Team | Initial requirements |
| 2.0 | 2026-01-10 | AGL Team | Replaced Collection Runner with Test Suite; Added cross-collection support; Added performance statistics (P50/P90/P95/P99); Removed complex load testing from scope |
