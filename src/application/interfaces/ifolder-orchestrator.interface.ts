/**
 * Folder Orchestrator Interface
 */

import { SaveFolderInput } from '../dto/folder.dto';

export interface IFolderOrchestrator {
  saveFolder(input: SaveFolderInput): Promise<any>;
}
