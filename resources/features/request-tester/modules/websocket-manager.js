/**
 * WebSocket / Socket.IO Manager
 * Single Responsibility: composer, saved messages, listeners, connection
 * state, and the frame inspector.
 *
 * The extension host owns the socket. This module only posts connect/send/
 * disconnect messages and renders the state/frames sent back by the host.
 */

const MAX_FRAMES = 500;
const MAX_DISPLAY_BYTES = 64 * 1024;
const TEXT_FORMATS = ['text', 'json', 'xml', 'html'];
const MESSAGE_FORMATS = [...TEXT_FORMATS, 'binary'];
const DEFAULT_SETTINGS = {
    handshakeTimeout: 30000,
    responseTimeout: 1000,
    reconnectionAttempts: 5,
    reconnectionInterval: 5000,
    maxMessageSizeMb: 0
};
const DEFAULT_SOCKETIO = {
    clientVersion: '4',
    handshakePath: '/socket.io',
    namespace: '/',
    auth: '',
    transports: ['websocket'],
    listeners: []
};

function createWebSocketManager({
    vscode,
    elements,
    getRequestType,
    getWebSocketProtocol,
    getRequest,
    markDirty
}) {
    let config = normalizeConfig(undefined);
    let connectionState = 'closed';
    let reconnectPending = false;
    let negotiatedProtocol = '';
    let transport = 'websocket';
    let frames = [];
    let historyLoaded = false;
    let frameSequence = 0;
    let wasWebSocketMode = false;
    let activeDraftId = null;
    let nextDraftId = 1;
    let nextListenerId = 1;
    let diffSelection = [];
    let expandedFrames = new Set();
    let renderScheduled = false;
    let scrollToBottom = false;

    function isWebSocketMode() {
        return getRequestType() === 'websocket';
    }

    function currentProtocol() {
        return getWebSocketProtocol?.() === 'socketio' ? 'socketio' : 'websocket';
    }

    function normalizeConfig(value) {
        const source = value && typeof value === 'object' ? value : {};
        const settings = source.settings && typeof source.settings === 'object' ? source.settings : {};
        const socketio = source.socketio && typeof source.socketio === 'object' ? source.socketio : {};
        const subprotocols = Array.isArray(source.subprotocols)
            ? source.subprotocols.filter(protocol => typeof protocol === 'string' && protocol.trim()).map(protocol => protocol.trim())
            : [];
        const messages = Array.isArray(source.messages)
            ? source.messages
                .filter(message => message && typeof message === 'object')
                .map((message, index) => normalizeMessage(message, index))
            : [];
        const listeners = Array.isArray(socketio.listeners)
            ? socketio.listeners
                .filter(listener => listener && typeof listener === 'object')
                .map((listener, index) => normalizeListener(listener, index))
            : [];

        return {
            protocol: source.protocol === 'socketio' ? 'socketio' : 'websocket',
            subprotocols,
            messages,
            settings: {
                handshakeTimeout: normalizeNumber(settings.handshakeTimeout, DEFAULT_SETTINGS.handshakeTimeout, 0),
                responseTimeout: normalizeNumber(settings.responseTimeout, DEFAULT_SETTINGS.responseTimeout, 0),
                reconnectionAttempts: clamp(normalizeNumber(settings.reconnectionAttempts, DEFAULT_SETTINGS.reconnectionAttempts, 0), 0, 100),
                reconnectionInterval: normalizeNumber(settings.reconnectionInterval, DEFAULT_SETTINGS.reconnectionInterval, 0),
                maxMessageSizeMb: normalizeNumber(settings.maxMessageSizeMb, DEFAULT_SETTINGS.maxMessageSizeMb, 0)
            },
            socketio: {
                clientVersion: typeof socketio.clientVersion === 'string' ? socketio.clientVersion : DEFAULT_SOCKETIO.clientVersion,
                handshakePath: typeof socketio.handshakePath === 'string' && socketio.handshakePath.trim()
                    ? socketio.handshakePath.trim()
                    : DEFAULT_SOCKETIO.handshakePath,
                namespace: typeof socketio.namespace === 'string' && socketio.namespace.trim()
                    ? socketio.namespace.trim()
                    : DEFAULT_SOCKETIO.namespace,
                auth: typeof socketio.auth === 'string' ? socketio.auth : DEFAULT_SOCKETIO.auth,
                transports: Array.isArray(socketio.transports) && socketio.transports.length > 0
                    ? socketio.transports
                    : DEFAULT_SOCKETIO.transports,
                listeners
            },
            frameHistory: Array.isArray(source.frameHistory) ? source.frameHistory.slice(-200) : []
        };
    }

    function normalizeMessage(message, index) {
        const type = message.type === 'binary' ? 'binary' : 'text';
        const format = MESSAGE_FORMATS.includes(message.format)
            ? message.format
            : type === 'binary' ? 'binary' : 'text';
        const args = Array.isArray(message.args)
            ? message.args.map(value => String(value))
            : [];
        return {
            id: String(message.id || `draft-${Date.now()}-${index + 1}`),
            name: typeof message.name === 'string' ? message.name : undefined,
            type,
            format,
            encoding: format === 'binary' ? (message.encoding === 'hex' ? 'hex' : 'base64') : undefined,
            data: typeof message.data === 'string' ? message.data : '',
            enabled: message.enabled !== false,
            event: typeof message.event === 'string' && message.event.trim() ? message.event.trim() : 'message',
            args,
            ack: message.ack === true
        };
    }

    function normalizeListener(listener, index) {
        return {
            id: String(listener.id || `listener-${Date.now()}-${index + 1}`),
            name: typeof listener.name === 'string' ? listener.name : '',
            description: typeof listener.description === 'string' ? listener.description : '',
            enabled: listener.enabled !== false
        };
    }

    function normalizeNumber(value, fallback, min) {
        const parsed = typeof value === 'number' ? value : parseFloat(value);
        if (!Number.isFinite(parsed)) {
            return fallback;
        }
        return Math.max(min, Math.trunc(parsed));
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function readSubprotocols() {
        const raw = elements.wsSubprotocols?.value || '';
        const seen = new Set();
        return raw
            .split(',')
            .map(protocol => protocol.trim())
            .filter(protocol => {
                if (!protocol || seen.has(protocol)) return false;
                seen.add(protocol);
                return true;
            });
    }

    function readSettingsFromDom() {
        return {
            handshakeTimeout: normalizeNumber(elements.wsSettingHandshakeTimeout?.value, DEFAULT_SETTINGS.handshakeTimeout, 0),
            responseTimeout: normalizeNumber(elements.wsSettingResponseTimeout?.value, DEFAULT_SETTINGS.responseTimeout, 0),
            reconnectionAttempts: clamp(normalizeNumber(elements.wsSettingReconnectAttempts?.value, DEFAULT_SETTINGS.reconnectionAttempts, 0), 0, 100),
            reconnectionInterval: normalizeNumber(elements.wsSettingReconnectInterval?.value, DEFAULT_SETTINGS.reconnectionInterval, 0),
            maxMessageSizeMb: normalizeNumber(elements.wsSettingMaxMessageSize?.value, DEFAULT_SETTINGS.maxMessageSizeMb, 0)
        };
    }

    function readSocketIoFromDom() {
        const transportValue = elements.wsSettingTransports?.value || DEFAULT_SOCKETIO.transports.join(',');
        return {
            clientVersion: elements.wsSettingClientVersion?.value || DEFAULT_SOCKETIO.clientVersion,
            handshakePath: (elements.wsSettingHandshakePath?.value || DEFAULT_SOCKETIO.handshakePath).trim() || DEFAULT_SOCKETIO.handshakePath,
            namespace: (elements.wsSettingNamespace?.value || DEFAULT_SOCKETIO.namespace).trim() || DEFAULT_SOCKETIO.namespace,
            auth: elements.wsSettingAuth?.value || DEFAULT_SOCKETIO.auth,
            transports: transportValue.split(',').map(value => value.trim()).filter(Boolean),
            listeners: config.socketio.listeners
        };
    }

    function getConfig() {
        const settings = readSettingsFromDom();
        const socketio = readSocketIoFromDom();
        config.settings = settings;
        config.socketio.clientVersion = socketio.clientVersion;
        config.socketio.handshakePath = socketio.handshakePath;
        config.socketio.namespace = socketio.namespace;
        config.socketio.auth = socketio.auth;
        config.socketio.transports = socketio.transports;
        config.frameHistory = Array.isArray(config.frameHistory) ? config.frameHistory.slice(-200) : [];

        return {
            protocol: currentProtocol(),
            subprotocols: readSubprotocols(),
            settings,
            socketio,
            messages: config.messages.map(message => ({ ...message })),
            frameHistory: config.frameHistory
        };
    }

    function setConfig(value) {
        if (connectionState !== 'closed') {
            disconnect();
        }
        negotiatedProtocol = '';
        transport = currentProtocol();
        clearFrames();
        config = normalizeConfig(value);
        historyLoaded = false;
        if (elements.wsLoadHistoryBtn) {
            elements.wsLoadHistoryBtn.disabled = false;
            elements.wsLoadHistoryBtn.textContent = 'Load history';
        }
        activeDraftId = config.messages[0]?.id || null;
        writeSettingsToDom(config.settings);
        writeSocketIoToDom(config.socketio);
        if (elements.wsSubprotocols) {
            elements.wsSubprotocols.value = config.subprotocols.join(', ');
        }
        renderDrafts();
        renderListeners();
        if (activeDraftId) {
            loadDraftById(activeDraftId, false);
        } else {
            clearComposer(false);
        }
        updateComposerForFormat();
        updateStatus();
    }

    function writeSettingsToDom(settings) {
        if (elements.wsSettingHandshakeTimeout) elements.wsSettingHandshakeTimeout.value = String(settings.handshakeTimeout);
        if (elements.wsSettingResponseTimeout) elements.wsSettingResponseTimeout.value = String(settings.responseTimeout);
        if (elements.wsSettingReconnectAttempts) elements.wsSettingReconnectAttempts.value = String(settings.reconnectionAttempts);
        if (elements.wsSettingReconnectInterval) elements.wsSettingReconnectInterval.value = String(settings.reconnectionInterval);
        if (elements.wsSettingMaxMessageSize) elements.wsSettingMaxMessageSize.value = String(settings.maxMessageSizeMb);
    }

    function writeSocketIoToDom(socketio) {
        if (elements.wsSettingClientVersion) elements.wsSettingClientVersion.value = socketio.clientVersion;
        if (elements.wsSettingHandshakePath) elements.wsSettingHandshakePath.value = socketio.handshakePath;
        if (elements.wsSettingNamespace) elements.wsSettingNamespace.value = socketio.namespace || DEFAULT_SOCKETIO.namespace;
        if (elements.wsSettingTransports) elements.wsSettingTransports.value = (socketio.transports || DEFAULT_SOCKETIO.transports).join(',');
        if (elements.wsSettingAuth) elements.wsSettingAuth.value = socketio.auth || '';
    }

    function readComposer() {
        const format = MESSAGE_FORMATS.includes(elements.wsMessageFormat?.value)
            ? elements.wsMessageFormat.value
            : 'text';
        const type = format === 'binary' ? 'binary' : 'text';
        const socketio = currentProtocol() === 'socketio';
        return {
            type,
            format,
            data: elements.wsMessageInput?.value || '',
            encoding: type === 'binary' ? (elements.wsBinaryEncoding?.value === 'hex' ? 'hex' : 'base64') : undefined,
            event: socketio ? (elements.wsEventName?.value.trim() || 'message') : undefined,
            args: socketio ? parseArgsInput(elements.wsEventArgs?.value || '') : [],
            ack: socketio && elements.wsAck?.checked === true
        };
    }

    function parseArgsInput(value) {
        const trimmed = String(value || '').trim();
        if (!trimmed) {
            return [];
        }
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map(item => typeof item === 'string' ? item : JSON.stringify(item));
                }
            } catch {
                // Fall through to comma-separated parsing.
            }
        }
        return trimmed.split(',').map(item => item.trim()).filter(Boolean);
    }

    function updateComposerForFormat() {
        const format = MESSAGE_FORMATS.includes(elements.wsMessageFormat?.value)
            ? elements.wsMessageFormat.value
            : 'text';
        const isBinary = format === 'binary';
        elements.wsBinaryEncoding?.classList.toggle('hidden', !isBinary);
        if (elements.wsBeautifyBtn) {
            elements.wsBeautifyBtn.disabled = isBinary;
        }
        if (elements.wsMessageInput) {
            elements.wsMessageInput.placeholder = isBinary
                ? 'Binary payload encoded as Base64 or Hexadecimal'
                : format === 'json'
                    ? '{\n  "type": "message"\n}'
                    : 'Message payload';
        }
        updateComposerHint();
    }

    function updateComposerHint() {
        if (!elements.wsComposerHint) {
            return;
        }
        const format = elements.wsMessageFormat?.value || 'text';
        const active = config.messages.find(message => message.id === activeDraftId);
        const prefix = active?.name ? `${active.name} · ` : '';
        const socketio = currentProtocol() === 'socketio';
        const socketHint = socketio ? ' Socket.IO event fields are sent with the message.' : '';
        elements.wsComposerHint.textContent = `${prefix}${format.toUpperCase()}${format === 'binary' ? ` (${elements.wsBinaryEncoding?.value || 'base64'})` : ''}.${socketHint}`;
    }

    function beautifyComposer() {
        const format = elements.wsMessageFormat?.value || 'text';
        const value = elements.wsMessageInput?.value || '';
        if (!value.trim()) {
            return;
        }
        let formatted = value;
        if (format === 'json') {
            try {
                formatted = JSON.stringify(JSON.parse(value), null, 2);
            } catch (error) {
                appendSystemFrame(`JSON beautify failed: ${error instanceof Error ? error.message : String(error)}`);
                return;
            }
        } else if (format === 'xml' || format === 'html') {
            formatted = formatMarkup(value);
        }
        if (elements.wsMessageInput) {
            elements.wsMessageInput.value = formatted;
        }
    }

    function formatMarkup(value) {
        const tokens = String(value)
            .replace(/>\s*</g, '><')
            .replace(/</g, '\n<')
            .split('\n')
            .map(token => token.trim())
            .filter(Boolean);
        let indent = 0;
        return tokens.map(token => {
            if (/^<\//.test(token)) {
                indent = Math.max(0, indent - 1);
            }
            const line = `${'  '.repeat(indent)}${token}`;
            if (/^<[^!?/][^>]*[^/]>$/.test(token) && !/^<[^>]+\/>$/.test(token)) {
                indent += 1;
            }
            return line;
        }).join('\n');
    }

    function addOrUpdateDraft() {
        const composer = readComposer();
        const socketio = currentProtocol() === 'socketio';
        const existingIndex = config.messages.findIndex(message => message.id === activeDraftId);
        const saved = {
            id: activeDraftId || `draft-${Date.now()}-${nextDraftId++}`,
            name: existingIndex >= 0
                ? (config.messages[existingIndex].name || `Message ${existingIndex + 1}`)
                : `Message ${config.messages.length + 1}`,
            type: composer.type,
            format: composer.format,
            encoding: composer.encoding,
            data: composer.data,
            enabled: true,
            event: socketio ? composer.event : undefined,
            args: socketio ? composer.args : [],
            ack: socketio ? composer.ack : false
        };

        if (existingIndex >= 0) {
            config.messages[existingIndex] = saved;
        } else {
            config.messages.push(saved);
        }
        activeDraftId = saved.id;
        renderDrafts();
        updateComposerHint();
        markDirty?.();
    }

    function removeDraft(index) {
        const message = config.messages[index];
        if (!message) return;
        config.messages.splice(index, 1);
        if (activeDraftId === message.id) {
            clearComposer(false);
        }
        renderDrafts();
        markDirty?.();
    }

    function loadDraftById(id, shouldMarkDirty = false) {
        const message = config.messages.find(item => item.id === id);
        if (!message) return;
        activeDraftId = message.id;
        if (elements.wsMessageFormat) {
            elements.wsMessageFormat.value = MESSAGE_FORMATS.includes(message.format) ? message.format : 'text';
        }
        if (elements.wsBinaryEncoding) {
            elements.wsBinaryEncoding.value = message.encoding === 'hex' ? 'hex' : 'base64';
        }
        if (elements.wsMessageInput) {
            elements.wsMessageInput.value = message.data;
        }
        if (elements.wsEventName) {
            elements.wsEventName.value = message.event || 'message';
        }
        if (elements.wsEventArgs) {
            elements.wsEventArgs.value = (message.args || []).join(', ');
        }
        if (elements.wsAck) {
            elements.wsAck.checked = message.ack === true;
        }
        updateComposerForFormat();
        renderDrafts();
        if (shouldMarkDirty) {
            markDirty?.();
        }
    }

    function loadDraft(index) {
        const message = config.messages[index];
        if (message) {
            loadDraftById(message.id, false);
        }
    }

    function clearComposer(mark = true) {
        activeDraftId = null;
        if (elements.wsMessageFormat) elements.wsMessageFormat.value = 'text';
        if (elements.wsBinaryEncoding) elements.wsBinaryEncoding.value = 'base64';
        if (elements.wsMessageInput) elements.wsMessageInput.value = '';
        if (elements.wsEventName) elements.wsEventName.value = 'message';
        if (elements.wsEventArgs) elements.wsEventArgs.value = '';
        if (elements.wsAck) elements.wsAck.checked = false;
        updateComposerForFormat();
        renderDrafts();
        if (mark) {
            markDirty?.();
        }
    }

    function renderDrafts() {
        const list = elements.wsDraftList;
        if (!list) return;
        list.textContent = '';
        if (elements.wsDraftCount) {
            elements.wsDraftCount.textContent = config.messages.length === 0
                ? ''
                : `${config.messages.length} saved`;
        }

        if (config.messages.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'ws-draft-empty';
            empty.textContent = 'No saved messages. Write one above and save it.';
            list.appendChild(empty);
            return;
        }

        config.messages.forEach((message, index) => {
            const row = document.createElement('div');
            row.className = 'ws-draft-row';
            if (message.id === activeDraftId) {
                row.classList.add('active');
            }

            const badge = document.createElement('span');
            badge.className = `ws-frame-type ${message.format === 'binary' ? 'binary' : 'text'}`;
            badge.textContent = (message.format || message.type).toUpperCase();

            const name = document.createElement('input');
            name.className = 'ws-draft-name';
            name.type = 'text';
            name.value = message.name || `Message ${index + 1}`;
            name.title = 'Message name';
            name.addEventListener('input', () => {
                message.name = name.value;
                markDirty?.();
            });

            const preview = document.createElement('span');
            preview.className = 'ws-draft-preview';
            const oneLine = String(message.data).replace(/\s+/g, ' ');
            preview.textContent = oneLine.length > 120 ? `${oneLine.slice(0, 120)}…` : oneLine || '(empty)';
            preview.title = message.data;

            const send = document.createElement('button');
            send.className = 'tiny-btn';
            send.textContent = 'Send';
            send.addEventListener('click', () => sendDraft(index));

            const load = document.createElement('button');
            load.className = 'tiny-btn';
            load.textContent = 'Load';
            load.addEventListener('click', () => loadDraft(index));

            const remove = document.createElement('button');
            remove.className = 'tiny-btn ws-remove-btn';
            remove.textContent = 'Delete';
            remove.addEventListener('click', () => removeDraft(index));

            const actions = document.createElement('div');
            actions.className = 'ws-draft-actions';
            actions.append(send, load, remove);

            row.append(badge, name, preview, actions);
            list.appendChild(row);
        });
    }

    function renderListeners() {
        const list = elements.wsListenerList;
        if (!list) return;
        list.textContent = '';
        if (config.socketio.listeners.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'ws-listener-empty';
            empty.textContent = 'No event listeners. Add an event name to display matching incoming Socket.IO events.';
            list.appendChild(empty);
            return;
        }

        config.socketio.listeners.forEach((listener, index) => {
            const row = document.createElement('div');
            row.className = 'ws-listener-row';

            const enabled = document.createElement('input');
            enabled.type = 'checkbox';
            enabled.checked = listener.enabled !== false;
            enabled.title = 'Listen for this event';
            enabled.addEventListener('change', () => {
                listener.enabled = enabled.checked;
                markDirty?.();
            });

            const name = document.createElement('input');
            name.type = 'text';
            name.className = 'ws-listener-name';
            name.placeholder = 'event name';
            name.value = listener.name;
            name.addEventListener('input', () => {
                listener.name = name.value.trim();
                markDirty?.();
            });

            const description = document.createElement('input');
            description.type = 'text';
            description.className = 'ws-listener-description';
            description.placeholder = 'description (optional)';
            description.value = listener.description || '';
            description.addEventListener('input', () => {
                listener.description = description.value;
                markDirty?.();
            });

            const remove = document.createElement('button');
            remove.className = 'tiny-btn ws-remove-btn';
            remove.textContent = 'Delete';
            remove.addEventListener('click', () => {
                config.socketio.listeners.splice(index, 1);
                renderListeners();
                markDirty?.();
            });

            row.append(enabled, name, description, remove);
            list.appendChild(row);
        });
    }

    function addListener() {
        config.socketio.listeners.push({
            id: `listener-${Date.now()}-${nextListenerId++}`,
            name: '',
            description: '',
            enabled: true
        });
        renderListeners();
        const inputs = elements.wsListenerList?.querySelectorAll('.ws-listener-name');
        inputs?.[inputs.length - 1]?.focus();
        markDirty?.();
    }

    function updateStatus() {
        const labels = {
            connecting: 'Connecting…',
            reconnecting: 'Reconnecting…',
            open: 'Connected',
            closing: 'Closing…',
            closed: 'Disconnected'
        };
        const displayState = reconnectPending && connectionState === 'closed' ? 'reconnecting' : connectionState;
        const dot = elements.wsStatusDot;
        const text = elements.wsStatusText;
        if (dot) {
            dot.className = `ws-status-dot ${displayState}`;
        }
        if (text) {
            text.textContent = labels[displayState] || 'Disconnected';
        }
        if (elements.wsProtocol) {
            const protocolLabel = transport === 'socketio'
                ? 'Socket.IO'
                : negotiatedProtocol
                    ? `protocol: ${negotiatedProtocol}`
                    : '';
            elements.wsProtocol.textContent = protocolLabel;
            elements.wsProtocol.classList.toggle('hidden', !protocolLabel);
        }
        if (elements.wsDisconnectBtn) {
            elements.wsDisconnectBtn.disabled = connectionState !== 'open' && connectionState !== 'connecting' && !reconnectPending;
        }
        updateSendButton();
    }

    function updateSendButton() {
        if (!isWebSocketMode() || !elements.sendBtn) return;
        const button = elements.sendBtn;
        button.classList.remove('cancel');
        switch (connectionState) {
            case 'connecting':
                button.textContent = 'Connecting…';
                button.disabled = true;
                break;
            case 'closing':
                button.textContent = 'Closing…';
                button.disabled = true;
                break;
            case 'open':
                button.textContent = 'Send';
                button.disabled = false;
                break;
            default:
                button.textContent = 'Connect';
                button.disabled = false;
        }
    }

    function connect() {
        if (connectionState === 'connecting' || connectionState === 'closing') return;
        if (!isWebSocketMode()) return;
        connectionState = 'connecting';
        transport = currentProtocol();
        updateStatus();
        vscode.postMessage({
            command: 'wsConnect',
            request: getRequest()
        });
    }

    function disconnect() {
        if (connectionState === 'closed' && !reconnectPending) return;
        reconnectPending = false;
        connectionState = 'closing';
        updateStatus();
        vscode.postMessage({ command: 'wsDisconnect' });
    }

    function sendPayload(message) {
        if (connectionState !== 'open') {
            appendSystemFrame('Connect before sending a message');
            return;
        }
        const payload = {
            command: 'wsSend',
            type: message.type === 'binary' ? 'binary' : 'text',
            format: message.format,
            data: message.data || ''
        };
        if (payload.type === 'binary') {
            payload.encoding = message.encoding === 'hex' ? 'hex' : 'base64';
        }
        if (currentProtocol() === 'socketio') {
            payload.event = message.event || 'message';
            payload.args = Array.isArray(message.args) ? message.args : [];
            payload.ack = message.ack === true;
        }
        vscode.postMessage(payload);
    }

    function sendComposer() {
        if (connectionState !== 'open') {
            connect();
            return;
        }
        sendPayload(readComposer());
    }

    function sendDraft(index) {
        const message = config.messages[index];
        if (!message) return;
        sendPayload(message);
    }

    function scheduleFramesRender() {
        updateFrameCount();
        if (renderScheduled) return;
        renderScheduled = true;
        const render = () => {
            renderScheduled = false;
            renderFrames();
        };
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(render);
        } else {
            setTimeout(render, 0);
        }
    }

    function appendFrame(frame, persist = true) {
        const normalized = {
            id: frame.id || `frame-${Date.now()}-${frameSequence++}`,
            direction: frame.direction || 'system',
            type: frame.type || 'system',
            format: frame.format || (frame.type === 'binary' ? 'binary' : 'text'),
            encoding: frame.encoding,
            data: frame.data || '',
            size: frame.size,
            time: frame.time || Date.now(),
            event: frame.event,
            args: Array.isArray(frame.args) ? frame.args : [],
            ack: frame.ack === true
        };
        frames.push(normalized);
        if (persist) {
            if (!Array.isArray(config.frameHistory)) {
                config.frameHistory = [];
            }
            config.frameHistory.push(normalized);
            if (config.frameHistory.length > 200) {
                config.frameHistory.shift();
            }
        }
        scrollToBottom = true;
        if (frames.length > MAX_FRAMES) {
            const removed = frames.shift();
            expandedFrames.delete(removed.id);
            diffSelection = diffSelection.filter(id => id !== removed.id);
        }
        scheduleFramesRender();
    }

    function appendSystemFrame(message) {
        appendFrame({
            direction: 'system',
            type: 'system',
            format: 'text',
            data: message,
            time: Date.now()
        });
    }

    function updateFrameCount() {
        if (!elements.wsFrameCount) return;
        const visible = getVisibleFrames().length;
        elements.wsFrameCount.textContent = visible === frames.length
            ? `${frames.length} frame${frames.length === 1 ? '' : 's'}`
            : `${visible} of ${frames.length} frames`;
    }

    function getVisibleFrames() {
        const search = (elements.wsFrameSearch?.value || '').trim().toLowerCase();
        const filter = elements.wsFrameFilter?.value || 'all';
        return frames.filter(frame => {
            if (filter !== 'all' && frame.direction !== filter) {
                return false;
            }
            if (!search) {
                return true;
            }
            const haystack = [
                frame.data,
                frame.event,
                ...(frame.args || []),
                frame.format,
                frame.type,
                frame.direction
            ].join(' ').toLowerCase();
            return haystack.includes(search);
        });
    }

    function renderFrames() {
        const body = elements.wsFramesBody;
        if (!body) return;
        const scroll = elements.wsFramesScroll;
        const wrap = elements.wsFrameWrap?.checked === true;
        scroll?.classList.toggle('ws-wrap', wrap);
        body.textContent = '';

        const visible = getVisibleFrames();
        if (visible.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.className = 'ws-frame-empty';
            cell.textContent = frames.length === 0 ? 'No frames yet. Connect and send a message.' : 'No frames match the current filter.';
            row.appendChild(cell);
            body.appendChild(row);
        } else {
            visible.forEach(frame => renderFrameRow(body, frame, wrap));
        }

        updateFrameCount();
        updateDiffLabel();
        if (scrollToBottom && scroll) {
            scrollToBottom = false;
            scroll.scrollTop = scroll.scrollHeight;
        }
    }

    function renderFrameRow(body, frame, wrap) {
        const row = document.createElement('tr');
        row.className = `ws-frame-row ${frame.direction || 'system'}`;
        row.dataset.frameId = frame.id;
        if (expandedFrames.has(frame.id)) {
            row.classList.add('expanded');
        }
        if (diffSelection.includes(frame.id)) {
            row.classList.add('selected');
        }

        const direction = document.createElement('td');
        direction.className = 'ws-frame-direction';
        direction.textContent = frame.direction === 'in' ? 'IN' : frame.direction === 'out' ? 'OUT' : 'SYS';

        const type = document.createElement('td');
        type.className = 'ws-frame-type-cell';
        if (frame.event) {
            const event = document.createElement('span');
            event.className = 'ws-frame-event';
            event.textContent = frame.event;
            const badge = document.createElement('span');
            badge.className = `ws-frame-type ${frame.type}`;
            badge.textContent = frame.type === 'binary' ? 'BIN' : 'TXT';
            type.append(event, badge);
        } else if (frame.type === 'system') {
            type.textContent = 'SYSTEM';
        } else {
            const badge = document.createElement('span');
            badge.className = `ws-frame-type ${frame.type}`;
            badge.textContent = (frame.format || frame.type).toUpperCase();
            type.appendChild(badge);
        }

        const time = document.createElement('td');
        time.className = 'ws-frame-time';
        time.textContent = formatClock(frame.time);
        time.title = new Date(frame.time).toLocaleString();

        const size = document.createElement('td');
        size.className = 'ws-frame-size';
        size.textContent = typeof frame.size === 'number' ? formatBytes(frame.size) : '—';

        const payload = document.createElement('td');
        payload.className = 'ws-frame-payload';
        const preview = document.createElement('div');
        preview.className = 'ws-frame-preview';
        const display = formatFramePayload(frame, false);
        preview.textContent = display;
        preview.title = display;
        payload.appendChild(preview);

        const actions = document.createElement('td');
        actions.className = 'ws-frame-actions';
        actions.append(
            frameAction('Copy', () => copyFrame(frame)),
            frameAction('Save', () => saveFrameAsDraft(frame)),
            frameAction('Δ', () => markFrame(frame), diffSelection.includes(frame.id))
        );

        row.append(direction, type, time, size, payload, actions);
        row.addEventListener('click', (event) => {
            if (event.target.closest('button')) return;
            if (expandedFrames.has(frame.id)) {
                expandedFrames.delete(frame.id);
            } else {
                expandedFrames.add(frame.id);
            }
            renderFrames();
        });
        body.appendChild(row);

        if (expandedFrames.has(frame.id)) {
            body.appendChild(renderFrameDetail(frame));
        }
    }

    function renderFrameDetail(frame) {
        const row = document.createElement('tr');
        row.className = 'ws-frame-detail-row';
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'ws-frame-detail';

        const meta = document.createElement('div');
        meta.className = 'ws-frame-meta';
        const bits = [
            frame.direction === 'in' ? 'Received' : frame.direction === 'out' ? 'Sent' : 'System',
            `${frame.format || frame.type}${frame.encoding ? ` (${frame.encoding})` : ''}`,
            typeof frame.size === 'number' ? formatBytes(frame.size) : undefined,
            new Date(frame.time).toLocaleString(),
            frame.event ? `event: ${frame.event}` : undefined,
            frame.args?.length ? `args: ${frame.args.join(', ')}` : undefined,
            frame.ack ? 'ack requested' : undefined
        ].filter(Boolean);
        meta.textContent = bits.join(' · ');

        const pre = document.createElement('pre');
        pre.className = 'ws-frame-detail-payload';
        pre.textContent = formatFramePayload(frame, true);
        cell.append(meta, pre);
        row.appendChild(cell);
        return row;
    }

    function frameAction(label, action, active = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `tiny-btn ws-frame-action${active ? ' active' : ''}`;
        button.textContent = label;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            action();
        });
        return button;
    }

    function formatFramePayload(frame, full) {
        const selected = elements.wsFrameFormat?.value || 'auto';
        const format = selected === 'auto' ? (frame.format || frame.type) : selected;
        let value = String(frame.data || '');

        if (format === 'binary' || frame.type === 'binary') {
            if (elements.wsFrameHexdump?.checked === true) {
                return toHexDump(value, frame.encoding || 'base64');
            }
            if (!full && value.length > 400) {
                return `${value.slice(0, 400)}…`;
            }
            return value || '(empty binary payload)';
        }

        if (format === 'json') {
            try {
                value = JSON.stringify(JSON.parse(value), null, 2);
            } catch {
                // Keep the original payload when it is not valid JSON.
            }
        } else if (format === 'xml' || format === 'html') {
            value = formatMarkup(value);
        }

        if (!full && value.length > 400) {
            return `${value.slice(0, 400)}…`;
        }
        return value;
    }

    function decodeBytes(value, encoding) {
        const input = String(value || '');
        if (encoding === 'hex') {
            const clean = input.replace(/[^0-9a-f]/gi, '');
            const bytes = new Uint8Array(Math.floor(clean.length / 2));
            for (let index = 0; index < bytes.length; index += 1) {
                bytes[index] = parseInt(clean.slice(index * 2, index * 2 + 2), 16);
            }
            return bytes;
        }
        try {
            const binary = atob(input);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
            }
            return bytes;
        } catch {
            return new Uint8Array();
        }
    }

    function toHexDump(value, encoding) {
        const bytes = decodeBytes(value, encoding);
        if (bytes.length === 0) {
            return '(empty binary payload)';
        }
        const limit = Math.min(bytes.length, MAX_DISPLAY_BYTES);
        const lines = [];
        for (let offset = 0; offset < limit; offset += 16) {
            const slice = bytes.slice(offset, Math.min(offset + 16, limit));
            const hex = Array.from(slice).map(byte => byte.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' ');
            const ascii = Array.from(slice).map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.').join('');
            lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex}  ${ascii}`);
        }
        if (bytes.length > limit) {
            lines.push(`… ${bytes.length - limit} more bytes`);
        }
        return lines.join('\n');
    }

    function formatBytes(value) {
        if (!Number.isFinite(value) || value < 0) return '—';
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatClock(value) {
        const date = new Date(value);
        const time = date.toLocaleTimeString();
        return `${time}.${String(date.getMilliseconds()).padStart(3, '0')}`;
    }

    function copyFrame(frame) {
        const text = String(frame.data || '');
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => copyWithFallback(text));
        } else {
            copyWithFallback(text);
        }
    }

    function copyWithFallback(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } finally {
            textarea.remove();
        }
    }

    function saveFrameAsDraft(frame) {
        const message = {
            id: `draft-${Date.now()}-${nextDraftId++}`,
            name: frame.event ? `${frame.event} frame` : `Frame ${frames.length}`,
            type: frame.type === 'binary' ? 'binary' : 'text',
            format: frame.format || (frame.type === 'binary' ? 'binary' : 'text'),
            encoding: frame.type === 'binary' ? (frame.encoding || 'base64') : undefined,
            data: String(frame.data || ''),
            enabled: true,
            event: frame.event || 'message',
            args: Array.isArray(frame.args) ? frame.args : [],
            ack: false
        };
        config.messages.push(message);
        activeDraftId = message.id;
        renderDrafts();
        loadDraftById(message.id, false);
        activateRequestTab('messages');
        markDirty?.();
    }

    function markFrame(frame) {
        if (diffSelection.includes(frame.id)) {
            diffSelection = diffSelection.filter(id => id !== frame.id);
        } else {
            diffSelection = [...diffSelection, frame.id].slice(-2);
        }
        updateDiffLabel();
        renderFrames();
    }

    function updateDiffLabel() {
        if (!elements.wsFrameDiff) return;
        if (diffSelection.length !== 2) {
            elements.wsFrameDiff.classList.add('hidden');
            elements.wsFrameDiff.textContent = '';
            return;
        }
        const first = frames.find(frame => frame.id === diffSelection[0]);
        const second = frames.find(frame => frame.id === diffSelection[1]);
        if (!first || !second) {
            elements.wsFrameDiff.classList.add('hidden');
            return;
        }
        const diff = Math.abs(second.time - first.time);
        elements.wsFrameDiff.textContent = `Δ ${diff} ms`;
        elements.wsFrameDiff.classList.remove('hidden');
    }

    function handleState(message) {
        connectionState = ['connecting', 'open', 'closing', 'closed'].includes(message.state)
            ? message.state
            : 'closed';
        if (connectionState !== 'closed') {
            reconnectPending = false;
        }
        if (message.transport === 'socketio' || message.transport === 'websocket') {
            transport = message.transport;
        }
        if (typeof message.protocol === 'string') {
            negotiatedProtocol = message.protocol;
        }
        if (connectionState === 'closed') {
            negotiatedProtocol = '';
        }
        updateStatus();
    }

    function handleFrame(message) {
        if (message.direction === 'in' && message.event && currentProtocol() === 'socketio') {
            const enabledListeners = config.socketio.listeners.filter(listener => listener.enabled !== false && listener.name.trim());
            if (enabledListeners.length > 0 && !enabledListeners.some(listener => listener.name === message.event)) {
                return;
            }
        }
        appendFrame({
            direction: message.direction,
            type: message.type,
            format: message.format,
            encoding: message.encoding,
            data: message.data,
            size: message.size,
            time: message.time || Date.now(),
            event: message.event,
            args: message.args,
            ack: message.ack
        });
        if (isWebSocketMode() && frames.filter(frame => frame.direction !== 'system').length === 1) {
            activateResponseTab('frames');
        }
    }

    function handleClosed(message) {
        connectionState = 'closed';
        reconnectPending = false;
        negotiatedProtocol = '';
        updateStatus();
        const suffix = message.reason ? `: ${message.reason}` : '';
        appendSystemFrame(`Connection closed (${message.code ?? 1000}${suffix})`);
    }

    function handleInfo(message) {
        if (typeof message.reconnecting === 'boolean') {
            reconnectPending = message.reconnecting;
            updateStatus();
        }
        if (message.message) {
            appendSystemFrame(message.message);
        }
    }

    function handleError(message) {
        if (connectionState === 'connecting') {
            connectionState = 'closed';
        }
        updateStatus();
        appendSystemFrame(message.error || 'WebSocket error');
    }

    function clearFrames() {
        frames = [];
        if (config) {
            config.frameHistory = [];
        }
        expandedFrames.clear();
        diffSelection = [];
        scrollToBottom = false;
        updateDiffLabel();
        renderFrames();
    }

    function loadFrameHistory() {
        if (historyLoaded || !Array.isArray(config?.frameHistory) || config.frameHistory.length === 0) {
            return;
        }
        historyLoaded = true;
        config.frameHistory.forEach(frame => {
            appendFrame(frame, false);
        });
        if (elements.wsLoadHistoryBtn) {
            elements.wsLoadHistoryBtn.disabled = true;
            elements.wsLoadHistoryBtn.textContent = 'History loaded';
        }
    }

    function activateRequestTab(name) {
        const button = Array.from(elements.tabButtons || []).find(tab => tab.dataset.tab === name);
        button?.click();
    }

    function activateResponseTab(name) {
        const button = Array.from(elements.responseTabButtons || []).find(tab => tab.dataset.responseTab === name);
        button?.click();
    }

    function isResponseTabActive(name) {
        const button = Array.from(elements.responseTabButtons || []).find(tab => tab.dataset.responseTab === name);
        return button?.classList.contains('active') === true;
    }

    function isRequestTabActive(name) {
        const button = Array.from(elements.tabButtons || []).find(tab => tab.dataset.tab === name);
        return button?.classList.contains('active') === true;
    }

    function setTabVisibility(isMode) {
        const requestTabsToHide = new Set(['body', 'scripts', 'body-schema', 'response-schema']);
        const responseTabsToHide = new Set(['body', 'headers', 'cookies', 'sent-request', 'tests', 'visualize']);
        for (const button of elements.tabButtons || []) {
            if (requestTabsToHide.has(button.dataset.tab)) {
                button.classList.toggle('ws-hidden', isMode);
            }
        }
        for (const button of elements.responseTabButtons || []) {
            if (responseTabsToHide.has(button.dataset.responseTab)) {
                button.classList.toggle('ws-hidden', isMode);
            }
        }
    }

    function refreshMode() {
        const isMode = isWebSocketMode();
        const socketio = currentProtocol() === 'socketio';
        if (connectionState === 'closed') {
            transport = currentProtocol();
        }
        elements.messagesTabBtn?.classList.toggle('hidden', !isMode);
        elements.wsFramesTabBtn?.classList.toggle('hidden', !isMode);
        elements.wsSettingsSection?.classList.toggle('hidden', !isMode);
        elements.wsSocketIoFields?.classList.toggle('hidden', !isMode || !socketio);
        elements.wsListenersSection?.classList.toggle('hidden', !isMode || !socketio);
        elements.wsSubprotocolsField?.classList.toggle('hidden', !isMode || socketio);
        elements.wsSocketIoSettings?.classList.toggle('hidden', !isMode || !socketio);
        setTabVisibility(isMode);

        if (isMode && !wasWebSocketMode) {
            activateRequestTab('messages');
            activateResponseTab('frames');
        } else if (!isMode && wasWebSocketMode) {
            if (isRequestTabActive('messages')) {
                activateRequestTab('params');
            }
            if (isResponseTabActive('frames')) {
                activateResponseTab('body');
            }
            if (elements.sendBtn) {
                elements.sendBtn.textContent = 'Send';
                elements.sendBtn.disabled = false;
                elements.sendBtn.classList.remove('cancel');
            }
        }

        if (isMode && socketio && !elements.wsEventName?.value) {
            if (elements.wsEventName) elements.wsEventName.value = 'message';
        }

        wasWebSocketMode = isMode;
        updateComposerForFormat();
        updateSendButton();
    }

    function onRequestTypeChanged() {
        if (connectionState !== 'closed') {
            disconnect();
        }
        refreshMode();
        markDirty?.();
    }

    function getDocumentation() {
        const request = getRequest ? getRequest() : {};
        const websocket = getConfig();
        const lines = [];
        lines.push(`# ${request.name || 'WebSocket Request'}`);
        lines.push('');
        lines.push(`**URL:** \`${request.path || request.url || ''}\``);
        lines.push(`**Protocol:** ${websocket.protocol === 'socketio' ? 'Socket.IO (WebSocket transport)' : 'WebSocket'}`);
        if (websocket.subprotocols.length > 0) {
            lines.push(`**Subprotocols:** ${websocket.subprotocols.join(', ')}`);
        }
        lines.push('');
        lines.push('## Connection Settings');
        lines.push('');
        lines.push(`- Handshake timeout: ${websocket.settings.handshakeTimeout} ms`);
        lines.push(`- Response wait after sending: ${websocket.settings.responseTimeout} ms`);
        lines.push(`- Reconnection attempts: ${websocket.settings.reconnectionAttempts}`);
        lines.push(`- Reconnection interval: ${websocket.settings.reconnectionInterval} ms`);
        lines.push(`- Maximum message size: ${websocket.settings.maxMessageSizeMb > 0 ? `${websocket.settings.maxMessageSizeMb} MB` : 'unlimited'}`);
        if (websocket.protocol === 'socketio') {
            lines.push(`- Socket.IO client version: ${websocket.socketio.clientVersion}`);
            lines.push(`- Handshake path: ${websocket.socketio.handshakePath}`);
        }

        if (request.headers && Object.keys(request.headers).length > 0) {
            lines.push('');
            lines.push('## Headers');
            lines.push('');
            for (const [key, value] of Object.entries(request.headers)) {
                if (value !== undefined && value !== null && String(value).trim()) {
                    lines.push(`- \`${key}\`: ${value}`);
                }
            }
        }

        if (request.query && Object.keys(request.query).length > 0) {
            lines.push('');
            lines.push('## Query Parameters');
            lines.push('');
            for (const [key, value] of Object.entries(request.query)) {
                if (value !== undefined && value !== null && String(value).trim()) {
                    lines.push(`- \`${key}\`: ${value}`);
                }
            }
        }

        if (websocket.protocol === 'socketio' && websocket.socketio.listeners.length > 0) {
            lines.push('');
            lines.push('## Event Listeners');
            lines.push('');
            for (const listener of websocket.socketio.listeners) {
                const enabled = listener.enabled === false ? ' (disabled)' : '';
                const description = listener.description ? ` — ${listener.description}` : '';
                lines.push(`- \`${listener.name}\`${description}${enabled}`);
            }
        }

        lines.push('');
        lines.push('## Saved Messages');
        lines.push('');
        if (websocket.messages.length === 0) {
            lines.push('No saved messages.');
        } else {
            for (const message of websocket.messages) {
                const name = message.name || 'Message';
                const format = message.format || message.type;
                const language = format === 'json' ? 'json' : format === 'xml' ? 'xml' : format === 'html' ? 'html' : 'text';
                const event = message.event ? ` (event: \`${message.event}\`)` : '';
                lines.push(`### ${name}${event}`);
                lines.push('');
                lines.push(`Format: ${format}${message.encoding ? ` (${message.encoding})` : ''}`);
                lines.push('');
                lines.push('```' + language);
                lines.push(message.data || '');
                lines.push('```');
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    function initialize() {
        elements.wsSubprotocols?.addEventListener('input', () => markDirty?.());
        elements.wsSaveDraftBtn?.addEventListener('click', addOrUpdateDraft);
        elements.wsNewDraftBtn?.addEventListener('click', () => clearComposer(false));
        elements.wsBeautifyBtn?.addEventListener('click', beautifyComposer);
        elements.wsDisconnectBtn?.addEventListener('click', disconnect);
        elements.wsClearFramesBtn?.addEventListener('click', clearFrames);
        elements.wsLoadHistoryBtn?.addEventListener('click', loadFrameHistory);
        elements.wsAddListenerBtn?.addEventListener('click', addListener);
        elements.wsMessageFormat?.addEventListener('change', updateComposerForFormat);
        elements.wsBinaryEncoding?.addEventListener('change', updateComposerHint);

        elements.wsSettingHandshakeTimeout?.addEventListener('input', () => markDirty?.());
        elements.wsSettingResponseTimeout?.addEventListener('input', () => markDirty?.());
        elements.wsSettingReconnectAttempts?.addEventListener('input', () => markDirty?.());
        elements.wsSettingReconnectInterval?.addEventListener('input', () => markDirty?.());
        elements.wsSettingMaxMessageSize?.addEventListener('input', () => markDirty?.());
        elements.wsSettingClientVersion?.addEventListener('change', () => markDirty?.());
        elements.wsSettingHandshakePath?.addEventListener('input', () => markDirty?.());
        elements.wsSettingNamespace?.addEventListener('input', () => markDirty?.());
        elements.wsSettingTransports?.addEventListener('change', () => markDirty?.());
        elements.wsSettingAuth?.addEventListener('input', () => markDirty?.());

        elements.wsFrameSearch?.addEventListener('input', renderFrames);
        elements.wsFrameFilter?.addEventListener('change', renderFrames);
        elements.wsFrameFormat?.addEventListener('change', renderFrames);
        elements.wsFrameWrap?.addEventListener('change', renderFrames);
        elements.wsFrameHexdump?.addEventListener('change', renderFrames);

        renderDrafts();
        renderListeners();
        renderFrames();
        updateComposerForFormat();
        updateStatus();
    }

    return {
        initialize,
        getConfig,
        setConfig,
        refreshMode,
        onRequestTypeChanged,
        connect,
        disconnect,
        sendComposer,
        handleState,
        handleFrame,
        handleClosed,
        handleInfo,
        handleError,
        clearFrames,
        appendSystemFrame,
        getDocumentation
    };
}

export { createWebSocketManager };
