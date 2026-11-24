# Prompt for OpenCode: Implementation of Reactive Hierarchical Test Suite Management

Role: You are an expert VS Code Extension Developer.
Task: Implement a multi-level folder hierarchy for Test Suites in the HTTP Forge extension that is fully reactive to external file system changes.

## 1. Context & Problem Statement
HTTP Forge currently uses a flat list for Test Suites. To support professional scaling, we need a hierarchical folder structure. Because developers often manage files via the terminal, external IDEs, or the VS Code explorer, the extension must treat the physical file system as the single source of truth and reflect all changes in the UI in real-time.

### Reference Documentation:
- User Guide: [https://github.com/hsl1230/http-forge/blob/main/docs/user-guide/](https://github.com/hsl1230/http-forge/blob/main/docs/user-guide/)
- Test Suite Specifics: [https://github.com/hsl1230/http-forge/blob/main/docs/user-guide/test-suites.md](https://github.com/hsl1230/http-forge/blob/main/docs/user-guide/test-suites.md)

## 2. Requirements (The "What")
- Hierarchical Organization: Support for nested folders and sub-folders in the Test Suite Tree View.
- Full-Sync Reactivity: The extension must automatically detect and reflect the following external changes (via terminal mv/cp/rm, VS Code Explorer, or external editors):
    - Creation: New test suite files appearing in the directory.
    - Deletion: Test suite files being removed.
    - Renaming: Changes to the filename of a test suite.
    - Movement: Moving files/folders across different levels of the hierarchy.
    - Updates: Changes to the content within a test suite file.
- Legacy Handling: All existing legacy suites must be treated as root-level suites by default.

## 3. Implementation Guidance (The "How")
- Advanced FileSystemWatcher: Implement vscode.workspace.createFileSystemWatcher with glob patterns that cover all test suite files and their parent directories.
- Event Mapping:
    - onDidCreate $\rightarrow$ Refresh tree to show new suite/folder.
    - onDidDelete $\rightarrow$ Remove suite/folder from tree.
    - onDidChange $\rightarrow$ Update the suite's metadata (e.g., name or content) in the UI.
    - Note: Since a "rename" or "move" is often seen by the OS as a Delete + Create, ensure the TreeView refreshes efficiently to reflect these as a single move.
- Dynamic TreeDataProvider: The TreeDataProvider must not rely on a static internal array. It should perform a dynamic read of the directory structure whenever onDidChangeTreeData.fire() is called.
- Performance: Implement a slight debounce on the refresh trigger if multiple files are moved/changed simultaneously (e.g., during a git checkout or bulk mv) to prevent UI flickering.

## 4. Acceptance Criteria
- [ ] Legacy Support: Existing suites appear at the root level upon installation.
- [ ] External Rename: Changing oldsuite.json to newsuite.json via terminal updates the name in the VS Code sidebar instantly.
- [ ] External Creation: Running touch newtest.json in the terminal immediately adds the suite to the tree.
- [ ] External Move: Moving a file into a sub-folder via the OS file manager reflects the new hierarchy in the sidebar instantly.
- [ ] Content Update: Modifying a test suite's internal configuration externally is reflected in the extension's state.
- [ ] Hierarchical Rendering: Folders are expandable/collapsible and correctly nested.