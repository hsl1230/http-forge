/**
 * WebSocket Manager
 * Single Responsibility: WebSocket composer, connection state, and frame log.
 *
 * The extension host owns the socket. This module only posts connect/send/
 * disconnect messages and renders the state/frames sent back by the host.
 */

const MAX_FRAMES = 500;

function createWebSocketManager({
    vscode,
    elements,
    getRequestType,
    getRequest,
    markDirty
}) {
    let config = { subprotocols: [], messages: [] };
    let connectionState = 'closed';
    let negotiatedProtocol = '';
    let frames = [];
    let wasWebSocketMode = false;
    let nextDraftId = 1;

    function isWebSocketMode() {
        return getRequestType() === 'websocket';
    }

    function normalizeConfig(value) {
        const source = value && typeof value === 'object' ? value : {};
        const subprotocols = Array.isArray(source.subprotocols)
            ? source.subprotocols.filter(protocol => typeof protocol === 'string' && protocol.trim()).map(protocol => protocol.trim())
            : [];
        const messages = Array.isArray(source.messages)
            ? source.messages
                .filter(message => message && typeof message === 'object')
                .map((message, index) => ({
                    id: String(message.id || `draft-${index + 1}`),
                    name: typeof message.name === 'string' ? message.name : undefined,
                    type: message.type === 'binary' ? 'binary' : 'text',
                    data: typeof message.data === 'string' ? message.data : '',
                    enabled: message.enabled !== false
                }))
            : [];

        return { subprotocols, messages };
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

    function getConfig() {
        return {
            subprotocols: readSubprotocols(),
            messages: config.messages.map(message => ({ ...message }))
        };
    }

    function setConfig(value) {
        if (connectionState !== 'closed') {
            disconnect();
        }
        negotiatedProtocol = '';
        clearFrames();
        config = normalizeConfig(value);
        if (elements.wsSubprotocols) {
            elements.wsSubprotocols.value = config.subprotocols.join(', ');
        }
        renderDrafts();
    }

    function addDraft() {
        const data = elements.wsMessageInput?.value || '';
        const type = elements.wsMessageType?.value === 'binary' ? 'binary' : 'text';
        config.messages.push({
            id: `draft-${Date.now()}-${nextDraftId++}`,
            name: `Message ${config.messages.length + 1}`,
            type,
            data,
            enabled: true
        });
        renderDrafts();
        if (elements.wsMessageInput) {
            elements.wsMessageInput.value = '';
        }
        markDirty?.();
    }

    function removeDraft(index) {
        config.messages.splice(index, 1);
        renderDrafts();
        markDirty?.();
    }

    function renderDrafts() {
        const list = elements.wsDraftList;
        if (!list) return;
        list.textContent = '';

        if (config.messages.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'ws-draft-empty';
            empty.textContent = 'No saved messages. Write one above and save it as a draft.';
            list.appendChild(empty);
            return;
        }

        config.messages.forEach((message, index) => {
            const row = document.createElement('div');
            row.className = 'ws-draft-row';

            const badge = document.createElement('span');
            badge.className = `ws-frame-type ${message.type}`;
            badge.textContent = message.type === 'binary' ? 'BINARY' : 'TEXT';

            const preview = document.createElement('span');
            preview.className = 'ws-draft-preview';
            const oneLine = String(message.data).replace(/\s+/g, ' ');
            preview.textContent = oneLine.length > 100 ? `${oneLine.slice(0, 100)}…` : oneLine || '(empty)';
            preview.title = message.data;

            const send = document.createElement('button');
            send.className = 'tiny-btn';
            send.textContent = 'Send';
            send.addEventListener('click', () => sendDraft(index));

            const remove = document.createElement('button');
            remove.className = 'tiny-btn ws-remove-btn';
            remove.textContent = 'Remove';
            remove.addEventListener('click', () => removeDraft(index));

            row.append(badge, preview, send, remove);
            list.appendChild(row);
        });
    }

    function updateStatus() {
        const labels = {
            connecting: 'Connecting…',
            open: 'Connected',
            closing: 'Closing…',
            closed: 'Disconnected'
        };
        const dot = elements.wsStatusDot;
        const text = elements.wsStatusText;
        if (dot) {
            dot.className = `ws-status-dot ${connectionState}`;
        }
        if (text) {
            text.textContent = labels[connectionState] || 'Disconnected';
        }
        if (elements.wsProtocol) {
            elements.wsProtocol.textContent = negotiatedProtocol ? `protocol: ${negotiatedProtocol}` : '';
            elements.wsProtocol.classList.toggle('hidden', !negotiatedProtocol);
        }
        if (elements.wsDisconnectBtn) {
            elements.wsDisconnectBtn.disabled = connectionState !== 'open' && connectionState !== 'connecting';
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
        connectionState = 'connecting';
        updateStatus();
        vscode.postMessage({
            command: 'wsConnect',
            request: getRequest()
        });
    }

    function disconnect() {
        if (connectionState === 'closed') return;
        connectionState = 'closing';
        updateStatus();
        vscode.postMessage({ command: 'wsDisconnect' });
    }

    function sendPayload(type, data) {
        if (connectionState !== 'open') {
            appendSystemFrame('Connect before sending a message');
            return;
        }
        vscode.postMessage({
            command: 'wsSend',
            type: type === 'binary' ? 'binary' : 'text',
            data: data || ''
        });
    }

    function sendComposer() {
        if (connectionState !== 'open') {
            connect();
            return;
        }
        const type = elements.wsMessageType?.value === 'binary' ? 'binary' : 'text';
        sendPayload(type, elements.wsMessageInput?.value || '');
    }

    function sendDraft(index) {
        const message = config.messages[index];
        if (!message) return;
        sendPayload(message.type, message.data);
    }

    function appendFrame(frame) {
        frames.push(frame);
        if (frames.length > MAX_FRAMES) {
            frames.shift();
            elements.wsFramesBody?.firstElementChild?.remove();
        }
        renderFrame(frame);

        if (elements.wsFrameCount) {
            elements.wsFrameCount.textContent = `${frames.length} frame${frames.length === 1 ? '' : 's'}`;
        }
    }

    function renderFrame(frame) {
        const body = elements.wsFramesBody;
        if (!body) return;

        const row = document.createElement('tr');
        row.className = `ws-frame-row ${frame.direction || 'system'}`;

        const direction = document.createElement('td');
        direction.className = 'ws-frame-direction';
        direction.textContent = frame.direction === 'in' ? 'IN' : frame.direction === 'out' ? 'OUT' : 'SYS';

        const type = document.createElement('td');
        type.className = `ws-frame-type ${frame.type || 'system'}`;
        type.textContent = frame.type ? frame.type.toUpperCase() : '—';

        const time = document.createElement('td');
        time.className = 'ws-frame-time';
        time.textContent = frame.time ? new Date(frame.time).toLocaleTimeString() : '';

        const size = document.createElement('td');
        size.className = 'ws-frame-size';
        size.textContent = typeof frame.size === 'number' ? `${frame.size} B` : '';

        const payload = document.createElement('td');
        payload.className = 'ws-frame-payload';
        const value = String(frame.data || '');
        payload.textContent = value.length > 400 ? `${value.slice(0, 400)}…` : value;
        payload.title = value;

        row.append(direction, type, time, size, payload);
        body.appendChild(row);
        body.parentElement?.parentElement?.scrollTo?.({ top: body.parentElement.parentElement.scrollHeight });
    }

    function appendSystemFrame(message) {
        appendFrame({
            direction: 'system',
            type: 'system',
            data: message,
            size: undefined,
            time: Date.now()
        });
    }

    function handleState(message) {
        connectionState = ['connecting', 'open', 'closing', 'closed'].includes(message.state)
            ? message.state
            : 'closed';
        if (typeof message.protocol === 'string') {
            negotiatedProtocol = message.protocol;
        }
        if (connectionState === 'closed') {
            negotiatedProtocol = '';
        }
        updateStatus();
    }

    function handleFrame(message) {
        appendFrame({
            direction: message.direction,
            type: message.type,
            data: message.data,
            size: message.size,
            time: message.time || Date.now()
        });
        if (isWebSocketMode() && frames.filter(frame => frame.direction !== 'system').length === 1) {
            activateResponseTab('frames');
        }
    }

    function handleClosed(message) {
        connectionState = 'closed';
        negotiatedProtocol = '';
        updateStatus();
        const suffix = message.reason ? `: ${message.reason}` : '';
        appendSystemFrame(`Connection closed (${message.code ?? 1000}${suffix})`);
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
        if (elements.wsFramesBody) {
            elements.wsFramesBody.textContent = '';
        }
        if (elements.wsFrameCount) {
            elements.wsFrameCount.textContent = '0 frames';
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

    function refreshMode() {
        const isMode = isWebSocketMode();
        elements.messagesTabBtn?.classList.toggle('hidden', !isMode);
        elements.wsFramesTabBtn?.classList.toggle('hidden', !isMode);

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

        wasWebSocketMode = isMode;
        updateSendButton();
    }

    function onRequestTypeChanged() {
        if (!isWebSocketMode() && connectionState !== 'closed') {
            disconnect();
        }
        refreshMode();
        markDirty?.();
    }

    function initialize() {
        elements.wsSubprotocols?.addEventListener('input', () => markDirty?.());
        elements.wsSaveDraftBtn?.addEventListener('click', addDraft);
        elements.wsDisconnectBtn?.addEventListener('click', disconnect);
        elements.wsClearFramesBtn?.addEventListener('click', clearFrames);
        renderDrafts();
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
        handleError,
        clearFrames
    };
}

export { createWebSocketManager };
