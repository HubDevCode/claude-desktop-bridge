# Desktop in a Tab

[🇬🇧 English](README.md) · [🇮🇹 Italiano](README.it.md)

Show your Linux desktop **inside a browser tab**, so the **Claude in Chrome** extension can control it with mouse and keyboard.

The official Claude in Chrome extension can only act on browser tabs: it can't see the desktop or press keys outside Chrome. This project works around that limit. The desktop is streamed over VNC into a tab (using [noVNC](https://github.com/novnc/noVNC)), and the clicks and keys you send in the tab go back to the real desktop. To Claude in Chrome it is just another web page.

No API key needed: you only use the extension.

```
 Claude in Chrome ──► tab with noVNC ──WebSocket──► Node server (this project) ──TCP──► VNC server ──► your desktop
                      (localhost:6080)               token + Host check                 (127.0.0.1:5900)
```

## Compatibility

**Tested only on Arch Linux with Hyprland (Wayland).** Everything else is listed based on how the components work, but has not been tried.

| Environment | Status | Notes |
|---|---|---|
| **Hyprland** | Tested | Works with `./run.sh` as is. |
| **Sway, river, labwc, Wayfire** and other wlroots compositors | Should work | `wayvnc` supports wlroots compositors. `run.sh` uses `hyprctl` to pick the monitor: outside Hyprland pass `OUTPUT=MONITOR_NAME` (see below) or start `wayvnc` by hand. |
| **GNOME / KDE Plasma on Wayland** | Not with `wayvnc` | `wayvnc` does not work on Mutter or KWin. Use the desktop's built-in screen sharing (Remote Desktop / Krfb, which speak RDP or VNC) with a VNC server, then start only the bridge (`node server.mjs`). Not verified. |
| **X11** (any DE) | Should work with a different VNC server | Use `x11vnc` or `x0vncserver` (TigerVNC) on `127.0.0.1:5900`, then `node server.mjs`. Not verified. |
| **macOS / Windows** | Not supported | The scripts are meant for Linux. The web bridge itself is portable, the rest is not. |

The bridge (`server.mjs` + `index.html`) works with **any VNC server** listening on `127.0.0.1:5900` (port configurable with `VNC_PORT`). Only `run.sh` depends on Hyprland and `wayvnc`.

## Requirements

- Linux with a wlroots Wayland compositor (Hyprland recommended), or X11 with a VNC server of your choice
- [`wayvnc`](https://github.com/any1/wayvnc) (for wlroots Wayland)
- Node.js 18 or newer, and npm
- `python3` (used by `run.sh` to read the monitor from `hyprctl`)
- Chrome with the **Claude in Chrome** extension

On Arch:

```bash
sudo pacman -S wayvnc nodejs npm
```

## Installation

```bash
git clone https://github.com/HubDevCode/claude-desktop-bridge
cd claude-desktop-bridge
npm install
chmod +x run.sh
```

## Running

```bash
./run.sh
```

The script:
1. picks the monitor that has focus (or the one set in `OUTPUT`),
2. starts `wayvnc` on `127.0.0.1:5900` with the Italian keyboard layout,
3. starts the web bridge and prints an address like `http://127.0.0.1:6080/?t=<token>`.

Open that address in Chrome. At the top you'll see the connection status ("connesso" when connected) and the desktop below it.

To stop everything press `Ctrl+C` in the terminal: `wayvnc` is closed together with the bridge.

> The page and the script messages are currently in Italian. Button labels are given below with their Italian text and an English translation.

### Environment variables

| Variable | Default | What it does |
|---|---|---|
| `OUTPUT` | monitor with focus | Name of the monitor to share (e.g. `eDP-1`, `HDMI-A-1`). List them with `hyprctl monitors`. |
| `KBD_LAYOUT` | `it` | Keyboard layout `wayvnc` uses for typed characters (e.g. `us`, `de`, `fr`). Needed so accented letters come out right. |
| `PORT` | `6080` | Port of the web bridge. |
| `VNC_PORT` | `5900` | Port of the VNC server the bridge connects to. |
| `TOKEN` | random on every start | Access token. If you set it yourself, keep it secret. |

Example:

```bash
OUTPUT=HDMI-A-1 KBD_LAYOUT=us ./run.sh
```

### Without Hyprland or without wayvnc

Start a VNC server by hand on `127.0.0.1:5900`, then just the bridge:

```bash
# X11 example
x11vnc -localhost -rfbport 5900 -nopw -display :0 &
node server.mjs
```

On Sway or other wlroots compositors `OUTPUT=NAME ./run.sh` is enough, as long as `hyprctl` isn't needed: when `OUTPUT` is set, the `hyprctl` call is skipped.

## Using it with Claude in Chrome

1. Open the address printed by `run.sh` in a Chrome tab.
2. Keep that tab **visible and in the foreground**: Chrome doesn't refresh background tabs.
3. Ask Claude in Chrome to work in that tab, for example: *"In the Desktop tab, open the file manager and create a folder called Photos on the Desktop."*

**Tip:** put the tab on a **different monitor or workspace** from the one you share. If the tab shows the monitor it sits on, Claude sees the screen inside the screen.

### The top bar

The bar above the desktop exists for what the VNC canvas doesn't receive well from an automated browser.

- **Text field + Enter / "Invia testo" (Send text):** types the text on the desktop, accented letters included (`è`, `à`, `ù`...).
- **Ctrl, Alt, Shift, Super:** one click holds the key down on the desktop, a second click releases it ("Rilascia" / Release lets go of all of them). Use them for Ctrl+click, Shift+click and the like.
- **Ready-made shortcuts:** Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Ctrl+S, Alt+Tab, plus "Invio" (Enter), Esc, Tab, ⌫, "Canc" (Delete) and the arrow keys.
- **Combo field:** any shortcut, for example `ctrl+shift+t` or `alt+f4`, then Enter. It accepts `ctrl`, `alt`, `shift`, `super`, named keys (`enter`, `esc`, `tab`, `backspace`, `delete`, `home`, `end`, `pageup`, `pagedown`, arrows, `f1`–`f12`) and single characters.
- **Missing modifiers:** if an event arrives with Ctrl/Alt/Shift active but without their own key press (this happens with remotely driven browsers), the page adds them before the key and releases them afterwards.

## Security

This project gives **full control of your desktop** to whoever opens the page. Read this carefully.

- The bridge listens **only on `127.0.0.1`**, it is not reachable from the network.
- Every request needs the **token** (in the address on first access, then in a cookie) and a local **Host header**. This stops other web pages, or DNS rebinding attacks, from connecting to the desktop.
- The token is random on every start. **Don't share the full address** and don't paste it in chats, issues or screenshots.
- `wayvnc` is started **without a VNC password**, listening on localhost. Any program on your PC can connect to port 5900 directly. On a computer with other users or untrusted software, don't use it like this: add authentication to `wayvnc` (see its documentation) or restrict access to the port.
- Don't expose ports 5900 and 6080 to the Internet, and don't pass them through tunnels or port forwarding without strong authentication.
- Claude, like any agent, can make mistakes, and text on screen can contain misleading instructions. Don't leave password managers, banking or other sensitive sessions open while you use it, and watch what it is doing.

## Troubleshooting

| Symptom | What to try |
|---|---|
| `Installa wayvnc` (install wayvnc) | `sudo pacman -S wayvnc` (or your distribution's package). |
| "disconnesso (wayvnc attivo?)" appears at the top | `wayvnc` didn't start or went down. Look at the errors in the `run.sh` terminal. Check that port 5900 is free. |
| Error about the `--keyboard` option | Some `wayvnc` versions use a different option. Check `wayvnc --help` and adapt the line in `run.sh`. |
| "forbidden" / 403 in the browser | The token is missing or the address differs: use the one printed at startup, with `127.0.0.1` or `localhost` and the same port. |
| Accented letters come out wrong | Check `KBD_LAYOUT` (default `it`). Try the "Invia testo" field. |
| Ctrl/Alt/Shift shortcuts don't arrive | Use the Ctrl/Alt/Shift buttons in the bar, or the combo field. |
| The desktop doesn't update | The tab is in the background: bring it to the foreground. |
| You see the wrong monitor | Pass `OUTPUT=NAME`. Names are shown by `hyprctl monitors`. |
| Clicks land away from the pointer | Rarely happens with fractional scaling: reload the page and check that the monitor is the right one. |

## Project layout

```
claude-desktop-bridge/
├── run.sh         starts wayvnc + the bridge (Hyprland/wayvnc specific)
├── server.mjs     HTTP server + WebSocket → TCP VNC bridge (token, Host check)
├── index.html     page with noVNC and the key bar
├── package.json   dependencies: @novnc/novnc, ws
├── LICENSE        MIT license
├── README.md      this file (English)
└── README.it.md   Italian version
```

## Limitations

- Slower than an agent that uses the API directly, because everything goes through a VNC video stream.
- Only works while the tab is in the foreground.
- Not verified on anything other than Hyprland. If you try it elsewhere, open an issue with the result.
- This project is not made or endorsed by Anthropic.

## License

The code in this project is released under the **MIT** license: see the [LICENSE](LICENSE) file. You may use, modify and redistribute it freely, including for commercial purposes, as long as you keep the copyright notice.

Dependencies have their own licenses: [noVNC](https://github.com/novnc/noVNC) is MPL-2.0 and [`ws`](https://github.com/websockets/ws) is MIT.
