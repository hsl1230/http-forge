// Minimal vscode mock for jest tests
export const window = {
  showInformationMessage: () => {}
};

export const workspace = {
  getConfiguration: () => ({})
};

export const commands = {
  registerCommand: () => ({})
};

export default {
  window,
  workspace,
  commands
};
