/**
 * HTTP Forge Services
 * 
 * Following SOLID principles:
 * - Single Responsibility: Each service has a focused purpose
 * - Open/Closed: Interceptors allow extension without modification
 * - Liskov Substitution: Services implement common interfaces
 * - Interface Segregation: Multiple small interfaces
 * - Dependency Inversion: Depend on abstractions, not concretions
 */

// Service Container (Dependency Injection)
export * from './service-bootstrap';
export * from './service-container';

// Core Services
export * from './console-service';
