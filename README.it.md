# Desktop in a Tab

🇮🇹 Italiano · [🇬🇧 English](README.md)

Mostra il tuo desktop Linux **dentro una scheda del browser**, così che l'estensione **Claude in Chrome** possa controllarlo con mouse e tastiera.

L'estensione ufficiale di Claude in Chrome può agire solo sulle schede del browser: non vede il desktop e non può premere tasti fuori da Chrome. Questo progetto aggira il limite: il desktop viene trasmesso via VNC in una scheda (tramite [noVNC](https://github.com/novnc/noVNC)), e i clic e i tasti fatti nella scheda tornano al desktop vero. Per Claude in Chrome è una pagina web come un'altra.

Non serve nessuna chiave API: si usa solo l'estensione.

```
 Claude in Chrome ──► scheda con noVNC ──WebSocket──► server Node (questo progetto) ──TCP──► server VNC ──► il tuo desktop
                      (localhost:6080)                 token + controllo host                (127.0.0.1:5900)
```

## Compatibilità

**Testato solo su Arch Linux con Hyprland (Wayland).** Il resto è indicato in base a come funzionano i componenti, ma non l'ho provato.

| Ambiente | Stato | Note |
|---|---|---|
| **Hyprland** | Testato | Funziona con `./run.sh` così com'è. |
| **Sway, river, labwc, Wayfire** e altri compositor wlroots | Dovrebbe funzionare | `wayvnc` supporta i compositor wlroots. `run.sh` usa `hyprctl` per scegliere il monitor: fuori da Hyprland passa `OUTPUT=NOME_MONITOR` (vedi sotto) oppure avvia `wayvnc` a mano. |
| **GNOME / KDE Plasma su Wayland** | Non con `wayvnc` | `wayvnc` non funziona su Mutter e KWin. Usa la condivisione schermo integrata del desktop (Remote Desktop / Krfb, che parlano RDP o VNC) con un server VNC, poi avvia solo il ponte (`node server.mjs`). Non verificato. |
| **X11** (qualsiasi DE) | Dovrebbe funzionare con un altro server VNC | Usa `x11vnc` o `x0vncserver` (TigerVNC) su `127.0.0.1:5900` e poi `node server.mjs`. Non verificato. |
| **macOS / Windows** | Non supportato | Gli script sono pensati per Linux. Il ponte web in sé è portabile, il resto no. |

Il ponte (`server.mjs` + `index.html`) funziona con **qualsiasi server VNC** in ascolto su `127.0.0.1:5900` (porta modificabile con `VNC_PORT`). Solo `run.sh` dipende da Hyprland e `wayvnc`.

## Requisiti

- Linux con un compositor Wayland wlroots (consigliato Hyprland) oppure X11 con un server VNC a tua scelta
- [`wayvnc`](https://github.com/any1/wayvnc) (per Wayland wlroots)
- Node.js 18 o superiore e npm
- `python3` (usato da `run.sh` per leggere il monitor da `hyprctl`)
- Chrome con l'estensione **Claude in Chrome**

Su Arch:

```bash
sudo pacman -S wayvnc nodejs npm
```

## Installazione

```bash
git clone https://github.com/HubDevCode/claude-desktop-bridge
cd claude-desktop-bridge
npm install
chmod +x run.sh
```

## Avvio

```bash
./run.sh
```

Lo script:
1. sceglie il monitor che ha il focus (o quello indicato in `OUTPUT`),
2. avvia `wayvnc` su `127.0.0.1:5900` con la tastiera italiana,
3. avvia il ponte web e stampa un indirizzo del tipo `http://127.0.0.1:6080/?t=<token>`.

Apri quell'indirizzo in Chrome. In alto vedi "connesso" e sotto il desktop.

Per fermare tutto premi `Ctrl+C` nel terminale: `wayvnc` viene chiuso insieme al ponte.

### Variabili d'ambiente

| Variabile | Default | Cosa fa |
|---|---|---|
| `OUTPUT` | monitor con il focus | Nome del monitor da condividere (es. `eDP-1`, `HDMI-A-1`). Elenco con `hyprctl monitors`. |
| `KBD_LAYOUT` | `it` | Layout tastiera usato da `wayvnc` per i caratteri digitati (es. `us`, `de`, `fr`). Serve perché le lettere accentate escano giuste. |
| `PORT` | `6080` | Porta del ponte web. |
| `VNC_PORT` | `5900` | Porta del server VNC a cui il ponte si collega. |
| `TOKEN` | casuale a ogni avvio | Token di accesso. Se lo fissi tu, tienilo segreto. |

Esempio:

```bash
OUTPUT=HDMI-A-1 KBD_LAYOUT=us ./run.sh
```

### Senza Hyprland o senza wayvnc

Avvia a mano un server VNC su `127.0.0.1:5900`, poi solo il ponte:

```bash
# esempio X11
x11vnc -localhost -rfbport 5900 -nopw -display :0 &
node server.mjs
```

Con Sway o altri wlroots basta `OUTPUT=NOME ./run.sh`, a patto che `hyprctl` non serva: se non c'è, `OUTPUT` salta la sua chiamata.

## Come si usa con Claude in Chrome

1. Apri l'indirizzo stampato da `run.sh` in una scheda di Chrome.
2. Tieni quella scheda **visibile e in primo piano**: Chrome non aggiorna le schede in background.
3. Chiedi a Claude in Chrome di lavorare in quella scheda, per esempio: *«Nella scheda Desktop apri il file manager e crea una cartella "Foto" sul Desktop»*.

**Consiglio:** metti la scheda su un **altro monitor o workspace** rispetto a quello condiviso. Se la scheda mostra il monitor su cui si trova, Claude vede lo schermo dentro lo schermo.

### La barra in alto

La barra sopra il desktop esiste per quello che il canvas VNC non riceve bene da un browser pilotato in automatico.

- **Campo testo + Invio / "Invia testo":** digita il testo sul desktop, lettere accentate comprese (`è`, `à`, `ù`...).
- **Ctrl, Alt, Shift, Super:** un clic tiene il tasto premuto sul desktop, un secondo clic lo rilascia ("Rilascia" li lascia andare tutti). Servono per Ctrl+clic, Shift+clic e simili.
- **Scorciatoie pronte:** Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Ctrl+S, Alt+Tab, più Invio, Esc, Tab, ⌫, Canc e le frecce.
- **Campo combo:** qualsiasi scorciatoia, per esempio `ctrl+shift+t` o `alt+f4`, poi Invio. Accetta `ctrl`, `alt`, `shift`, `super`, i tasti con nome (`enter`, `esc`, `tab`, `backspace`, `delete`, `home`, `end`, `pageup`, `pagedown`, frecce, `f1`–`f12`) e singoli caratteri.
- **Modificatori mancanti:** se un evento arriva con Ctrl/Alt/Shift attivi ma senza il loro tasto premuto (succede con i browser pilotati da remoto), la pagina li aggiunge prima del tasto e li toglie dopo.

## Sicurezza

Questo progetto dà il **controllo completo del tuo desktop** a chi apre la pagina. Leggi con attenzione.

- Il ponte ascolta **solo su `127.0.0.1`**, non è raggiungibile dalla rete.
- Ogni richiesta richiede il **token** (nell'indirizzo al primo accesso, poi in un cookie) e un **header Host** locale. Questo impedisce che altre pagine web, o attacchi DNS rebinding, si colleghino al desktop.
- Il token è generato a caso a ogni avvio. **Non condividere l'indirizzo completo** e non incollarlo in chat, issue o screenshot.
- `wayvnc` è avviato **senza password VNC**, in ascolto su localhost. Qualunque programma sul tuo PC può collegarsi alla porta 5900 direttamente. Su un computer con altri utenti o software non fidato, non usarlo così: aggiungi un'autenticazione a `wayvnc` (vedi la sua documentazione) o restringi l'accesso alla porta.
- Non esporre le porte 5900 e 6080 su Internet e non farle passare da tunnel o port forwarding senza un'autenticazione forte.
- Claude, come qualsiasi agente, può sbagliare e il testo sullo schermo può contenere istruzioni ingannevoli. Non lasciare aperti password manager, banca o altre sessioni sensibili mentre lo usi, e controlla cosa sta facendo.

## Risoluzione dei problemi

| Sintomo | Cosa provare |
|---|---|
| `Installa wayvnc` | `sudo pacman -S wayvnc` (o il pacchetto della tua distribuzione). |
| In alto compare "disconnesso (wayvnc attivo?)" | `wayvnc` non è partito o è sceso. Guarda gli errori nel terminale di `run.sh`. Controlla che la porta 5900 sia libera. |
| Errore sull'opzione `--keyboard` | Alcune versioni di `wayvnc` usano un'opzione diversa. Controlla `wayvnc --help` e adatta la riga in `run.sh`. |
| "forbidden" / 403 nel browser | Manca il token o l'indirizzo è diverso: usa quello stampato all'avvio, con `127.0.0.1` o `localhost` e la stessa porta. |
| Le lettere accentate escono sbagliate | Controlla `KBD_LAYOUT` (default `it`). Prova a usare il campo "Invia testo". |
| Le scorciatoie con Ctrl/Alt/Shift non arrivano | Usa i pulsanti Ctrl/Alt/Shift della barra oppure il campo combo. |
| Il desktop non si aggiorna | La scheda è in background: portala in primo piano. |
| Vedi il monitor sbagliato | Passa `OUTPUT=NOME`. I nomi si vedono con `hyprctl monitors`. |
| Clic spostati rispetto al puntatore | Succede con scale frazionarie in rari casi: prova a ricaricare la pagina e controlla che il monitor sia quello giusto. |

## Struttura del progetto

```
claude-desktop-bridge/
├── run.sh         avvia wayvnc + ponte (specifico per Hyprland/wayvnc)
├── server.mjs     server HTTP + ponte WebSocket → TCP VNC (token, controllo Host)
├── index.html     pagina con noVNC e la barra di tasti
├── package.json   dipendenze: @novnc/novnc, ws
├── LICENSE        licenza MIT
├── README.md      versione inglese
└── README.it.md   versione italiana
```

## Limiti

- Più lento di un agente che usa direttamente l'API, perché tutto passa da un flusso video VNC.
- Funziona solo finché la scheda è in primo piano.
- Non è stato verificato su altro che Hyprland. Se lo provi altrove, apri una issue con l'esito.
- Questo progetto non è prodotto né approvato da Anthropic.

## Licenza

Il codice di questo progetto è rilasciato con licenza **MIT**: vedi il file [LICENSE](LICENSE). Puoi usarlo, modificarlo e ridistribuirlo liberamente, anche per scopi commerciali, mantenendo l'avviso di copyright.

Le dipendenze hanno le loro licenze: [noVNC](https://github.com/novnc/noVNC) è sotto MPL-2.0 e [`ws`](https://github.com/websockets/ws) sotto MIT.
