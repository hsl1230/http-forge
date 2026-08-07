import { runImportRequestCommand } from '../commands/importRequest';

describe('importRequest command', () => {
  it('exports a command runner', () => {
    expect(typeof runImportRequestCommand).toBe('function');
  });
});

