/**
 * Folder Editor Interfaces
 */

export interface FolderUpdate {
    name?: string;
    description?: string;
    auth?: any;
    scripts?: {
        preRequest?: string;
        postResponse?: string;
    };
}

export interface FolderData {
    id: string;
    name: string;
    description?: string;
    auth?: any;
    scripts?: {
        preRequest?: string;
        postResponse?: string;
    };
    items?: any[];
    requestCount?: number;
    folderCount?: number;
}
