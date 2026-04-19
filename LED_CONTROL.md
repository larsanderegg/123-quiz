# LED Control Setup

The quiz app can control three LEDs via an Arduino connected to the local WiFi network.
The system has two parts: the **Arduino sketch** and a **local HTTPS proxy** needed to
bridge the HTTPS quiz app to the Arduino's plain HTTP server.

---

## Hardware

**Board**: Arduino UNO R4 WiFi

**LED wiring**:

| LED | Pin |
|-----|-----|
| 1   | D2  |
| 2   | D4  |
| 3   | D7  |

---

## Arduino Sketch (`led-control/`)

### Files

- `led-control.ino` — main sketch
- `secrets.h` — WiFi credentials (not committed to version control)

### First-time setup

1. Create `led-control/secrets.h` with your WiFi credentials:

   ```cpp
   #pragma once
   const char* ssid     = "your-wifi-ssid";
   const char* password = "your-wifi-password";
   ```

2. Open `led-control.ino` in the Arduino IDE.
3. Select board: **Arduino UNO R4 WiFi**.
4. Upload the sketch.
5. Open the Serial Monitor (115200 baud) — the assigned IP address is printed on connect.

### LED modes

| Mode    | Effect                                      |
|---------|---------------------------------------------|
| `OFF`   | All LEDs off                                |
| `ALL`   | All LEDs on                                 |
| `BLINK` | All LEDs blink randomly every 300 ms        |
| `ONE`   | Only LED 1 (pin D2) on                     |
| `TWO`   | Only LED 2 (pin D4) on                     |
| `THREE` | Only LED 3 (pin D7) on                     |

### HTTP API

The Arduino runs an HTTP server on port 80.

**Set mode** (used by the quiz app):
```
POST /mode
Content-Type: application/json

{"mode": "BLINK"}
```

**Legacy GET shortcuts** (also supported, used by the built-in HTML page):
```
GET /set?mode=ALL
GET /blink
GET /off
GET /1   /2   /3
```

**Built-in control page**: open `http://<arduino-ip>/` in a browser.

---

## Local HTTPS Proxy (`led-control-proxy/`)

The quiz app is served over HTTPS (`https://123-quiz.attika-wg.ch`). Browsers block
requests from HTTPS pages to plain HTTP endpoints (mixed content). The proxy runs
locally on the quiz host machine and exposes the Arduino's HTTP API over HTTPS.

```
Browser → https://localhost:8443 (Caddy) → http://<arduino-ip>:80 (Arduino)
```

Caddy also handles CORS preflight (`OPTIONS`) requests, since the Arduino does not.

### Prerequisites

- macOS with [Homebrew](https://brew.sh) (Caddy is installed automatically on first run)
- The Arduino must be reachable from the host machine

### Running the proxy

```bash
bash led-control-proxy/start.sh
```

On first run this will:
1. Install Caddy via Homebrew (if not already installed)
2. Add Caddy's root CA to the system keychain — Chrome will then trust the local cert
   (requires sudo password)
3. Start the proxy on `https://localhost:8443`

Keep the terminal open while using LED control. Press `Ctrl+C` to stop.

### Changing the Arduino IP

Edit `led-control-proxy/Caddyfile` and update the `reverse_proxy` target:

```
localhost:8443 {
    ...
    reverse_proxy http://<new-ip>
}
```

---

## Quiz App Integration

The LED API URL is stored in `localStorage` and can be set from within the app.
Set it to the local proxy address:

```
https://localhost:8443
```

This only needs to be done once per browser on the quiz host machine.
