/**
 * Request Tester Interfaces
 * 
 * Following SOLID principles:
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Handlers depend on abstractions
 * 
 * This file consolidates all interfaces used by the Request Tester components.
 */

import type { HistoryEntry, RequestScripts, RequestSettings } from '@http-forge/core';
import { RequestContext } from '../../../../shared/utils';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

export type { UIRequest } from '../../../../shared/types';
export type { RequestScripts, RequestSettings };

// ============================================
// Context Provider Interfaces
// ============================================

/**
 * Request history storage path info
 */
export interface HistoryStoragePath {
  environment: string;
  requestPath: string;
  requestId: string;
}

/**
 * Interface for panel context management
 * Dependency Inversion: Handlers depend on this abstraction
 */
export interface IPanelContextProvider {
  getCurrentContext(): RequestContext | undefined;
  getHistoryStoragePath(): HistoryStoragePath | undefined;
  getCollectionId(): string | undefined;
}

// ============================================
// Data Transfer Objects
// ============================================

/**
 * History entry UI format - grouped by ticket/branch
 */
export interface HistoryUIEntry {
  ticket: string | null;
  branch: string;
  isCurrent: boolean;
  isShared?: boolean;
  entries: HistoryEntry[];
}

// RequestSettings and RequestScripts are now imported from canonical types above

// ============================================
// Environment Handler Interfaces
// ============================================

/**
 * Environment data for webview initialization
 */
export interface EnvironmentData {
  selectedEnvironment: string;
  resolvedEnvironment: any;
  globalVariables: Record<string, string>;
  sessionVariables: Record<string, string>;
}

/**
 * Interface for environment operations
 * Extends IMessageHandler with environment-specific methods
 */
export interface IEnvironmentHandler extends IMessageHandler {
  getEnvironmentData(): EnvironmentData;
  handleEnvironmentChanged(environment: string, messenger: IWebviewMessenger): void;
  getHistoryForUI(environment: string, requestPath: string, requestId: string): HistoryUIEntry[];
}

// ============================================
// Cookie Handler Interfaces
// ============================================

/**
 * Interface for cookie operations
 * Extends IMessageHandler with cookie-specific methods
 */
export interface ICookieHandler extends IMessageHandler {
  getAllCookies(): any[];
}

// ============================================
// Variable Handler Interfaces
// ============================================

/**
 * Variable change request structure
 */
export interface VariableChange {
  type: 'global' | 'environment' | 'collection' | 'session';
  action: 'set' | 'unset' | 'clear';
  key?: string;
  value?: unknown;
  collectionId?: string;
}
