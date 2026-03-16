/**
 * Message Handler Module
 * Single Responsibility: Handle VS Code extension messages
 * 
 * Follows:
 * - SRP: Only handles message routing and dispatch
 * - OCP: New handlers can be added via registerHandler
 * - DIP: Depends on handler abstractions, not concrete implementations
 */

/**
 * Create a message handler instance
 * @param {Object} options
 * @param {Object} options.handlers - Initial handler map
 * @returns {Object} Message handler interface
 */
function createMessageHandler({ handlers = {} } = {}) {
    // Handler registry
    const handlerRegistry = new Map(Object.entries(handlers));
    
    // Message listener reference for cleanup
    let messageListener = null;

    /**
     * Register a handler for a specific command
     * @param {string} command - Command name
     * @param {Function} handler - Handler function
     */
    function registerHandler(command, handler) {
        if (typeof handler !== 'function') {
            console.error(`[MessageHandler] Invalid handler for command: ${command}`);
            return;
        }
        handlerRegistry.set(command, handler);
    }

    /**
     * Unregister a handler
     * @param {string} command - Command name
     */
    function unregisterHandler(command) {
        handlerRegistry.delete(command);
    }

    /**
     * Handle incoming message
     * @param {MessageEvent} event - Message event
     */
    function handleMessage(event) {
        const message = event.data;
        const cmd = message.command || message.type;
        
        if (!cmd) {
            console.warn('[MessageHandler] Message without command:', message);
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

    /**
     * Start listening for messages
     */
    function startListening() {
        if (messageListener) {
            console.warn('[MessageHandler] Already listening');
            return;
        }
        
        messageListener = handleMessage;
        window.addEventListener('message', messageListener);
    }

    /**
     * Stop listening for messages
     */
    function stopListening() {
        if (messageListener) {
            window.removeEventListener('message', messageListener);
            messageListener = null;
        }
    }

    /**
     * Get all registered handlers
     * @returns {string[]} Array of command names
     */
    function getRegisteredCommands() {
        return Array.from(handlerRegistry.keys());
    }

    /**
     * Check if handler exists for command
     * @param {string} command - Command name
     * @returns {boolean}
     */
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

export { createMessageHandler };

