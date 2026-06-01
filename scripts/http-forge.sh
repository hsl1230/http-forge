#!/bin/bash
# HTTP Forge Launcher — Linux/macOS
# Detects VS Code, downloads if missing, installs extension, launches in isolated profile.
#
# Usage:
#   ./http-forge.sh [path]           # Launch in "HTTP Forge" profile (test mode)
#   ./http-forge.sh --dev [path]     # Launch in "Default" profile (all extensions)
#   ./http-forge.sh --both [path]    # Launch BOTH profiles side by side

PROFILE_TEST="HTTP Forge"
PROFILE_DEV="Default"
EXTENSION="henry-huang.http-forge"
INSTALL_DIR="$HOME/.http-forge-launcher/vscode"
TEST_DATA_DIR="$HOME/.http-forge-launcher/vscode-data"

# ─── Parse Arguments ───────────────────────────────────────────
MODE="test"
WORKSPACE_ARGS=()

for arg in "$@"; do
    case "$arg" in
        --dev)   MODE="dev" ;;
        --test)  MODE="test" ;;
        --both)  MODE="both" ;;
        --help|-h)
            echo "HTTP Forge Launcher"
            echo ""
            echo "Usage: ./http-forge.sh [options] [workspace-path]"
            echo ""
            echo "Options:"
            echo "  --test   Launch with HTTP Forge profile (isolated, default)"
            echo "  --dev    Launch with Default profile (all your extensions)"
            echo "  --both   Launch two instances: Default + HTTP Forge (test)"
            echo "  --help   Show this help"
            echo ""
            echo "Default: Launch with \"HTTP Forge\" profile (isolated, test-only)"
            exit 0
            ;;
        *)       WORKSPACE_ARGS+=("$arg") ;;
    esac
done

# ─── Detect VS Code ───────────────────────────────────────────
find_code() {
    # Check PATH first
    if command -v code &>/dev/null; then
        echo "code"
        return
    fi

    # Check common Linux locations
    for bin in /usr/bin/code /snap/bin/code /usr/share/code/bin/code; do
        if [[ -x "$bin" ]]; then
            echo "$bin"
            return
        fi
    done

    # Check macOS locations
    for bin in "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
               "$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"; do
        if [[ -x "$bin" ]]; then
            echo "$bin"
            return
        fi
    done

    # Check our own install
    if [[ -x "$INSTALL_DIR/bin/code" ]]; then
        echo "$INSTALL_DIR/bin/code"
        return
    fi

    return 1
}

# ─── Install VS Code ──────────────────────────────────────────
install_code() {
    echo "[http-forge] VS Code not found. Downloading..."
    mkdir -p "$INSTALL_DIR"

    local url
    case "$(uname -s)" in
        Linux)  url="https://update.code.visualstudio.com/latest/linux-x64/stable" ;;
        Darwin) url="https://update.code.visualstudio.com/latest/darwin-universal/stable" ;;
        *)      echo "[http-forge] ERROR: Unsupported OS. Please install VS Code manually."; exit 1 ;;
    esac

    local tmp
    tmp="$(mktemp -d)/vscode-download"

    if [[ "$(uname -s)" == "Linux" ]]; then
        curl -L --progress-bar "$url" -o "$tmp.tar.gz"
        echo "[http-forge] Extracting..."
        rm -rf "$INSTALL_DIR"
        mkdir -p "$INSTALL_DIR"
        tar -xzf "$tmp.tar.gz" -C "$INSTALL_DIR" --strip-components=1
        rm -f "$tmp.tar.gz"
    else
        curl -L --progress-bar "$url" -o "$tmp.zip"
        echo "[http-forge] Extracting..."
        unzip -qo "$tmp.zip" -d "$HOME/Applications"
        rm -f "$tmp.zip"
    fi

    echo "[http-forge] VS Code installed."
}

# ─── Main Flow ─────────────────────────────────────────────────
CODE_BIN=$(find_code)

if [[ -z "$CODE_BIN" ]]; then
    install_code
    CODE_BIN=$(find_code)
    if [[ -z "$CODE_BIN" ]]; then
        echo "[http-forge] ERROR: Failed to install VS Code."
        exit 1
    fi
fi

echo "[http-forge] Using: $CODE_BIN"

# Install extension only where it will actually be launched
echo "[http-forge] Ensuring extension is installed..."
case "$MODE" in
    test)
        "$CODE_BIN" --profile "$PROFILE_TEST" --install-extension "$EXTENSION" --force 2>/dev/null
        ;;
    dev)
        "$CODE_BIN" --profile "$PROFILE_DEV" --install-extension "$EXTENSION" --force 2>/dev/null
        ;;
    both)
        mkdir -p "$TEST_DATA_DIR/User"
        if [[ ! -f "$TEST_DATA_DIR/User/settings.json" ]]; then
            echo '{"debug.showInActivityBar": false, "debug.showInStatusBar": "never", "workbench.startupEditor": "none"}' > "$TEST_DATA_DIR/User/settings.json"
        fi
        "$CODE_BIN" --profile "$PROFILE_TEST" --user-data-dir "$TEST_DATA_DIR" --install-extension "$EXTENSION" --force 2>/dev/null
        "$CODE_BIN" --profile "$PROFILE_DEV" --install-extension "$EXTENSION" --force 2>/dev/null
        ;;
esac

# Built-in extensions to disable in test mode (not needed, saves RAM)
DISABLE_EXTENSIONS=(--disable-extension ms-vscode.js-debug --disable-extension ms-vscode.js-debug-companion --disable-extension vscode.debug-auto-launch --disable-extension vscode.debug-server-ready)

case "$MODE" in
    dev)
        echo "[http-forge] Launching VS Code (profile: $PROFILE_DEV)..."
        "$CODE_BIN" --new-window --profile "$PROFILE_DEV" "${WORKSPACE_ARGS[@]}"
        "$CODE_BIN" --profile "$PROFILE_DEV" --open-url "vscode:extension/$EXTENSION" &
        ;;
    test)
        echo "[http-forge] Launching VS Code (profile: $PROFILE_TEST)..."
        "$CODE_BIN" --new-window --profile "$PROFILE_TEST" "${DISABLE_EXTENSIONS[@]}" "${WORKSPACE_ARGS[@]}"
        "$CODE_BIN" --profile "$PROFILE_TEST" --open-url "vscode:extension/$EXTENSION" &
        ;;
    both)
        echo "[http-forge] Launching two separate instances..."
        echo "  → Test: isolated instance (--user-data-dir)"
        echo "  → Dev:  default VS Code"
        # Test instance
        "$CODE_BIN" --new-window --profile "$PROFILE_TEST" --user-data-dir "$TEST_DATA_DIR" "${DISABLE_EXTENSIONS[@]}" "${WORKSPACE_ARGS[@]}"
        "$CODE_BIN" --profile "$PROFILE_TEST" --user-data-dir "$TEST_DATA_DIR" --open-url "vscode:extension/$EXTENSION" &
        # Dev instance
        "$CODE_BIN" --new-window --profile "$PROFILE_DEV" "${WORKSPACE_ARGS[@]}"
        "$CODE_BIN" --profile "$PROFILE_DEV" --open-url "vscode:extension/$EXTENSION" &
        ;;
esac
