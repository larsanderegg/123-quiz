#include "WiFiS3.h"
#include "secrets.h"

// Pin-Definitionen
const int PIN_1 = 2;
const int PIN_2 = 4;
const int PIN_3 = 7;

// Modi
enum Mode { OFF, ALL, BLINK, MODE_1, MODE_2, MODE_3 };
Mode currentMode = OFF;

unsigned long previousMillis = 0;
const long BLINK_INTERVAL = 300;

WiFiServer server(80);

// ── Setup ────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0));

  pinMode(PIN_1, OUTPUT);
  pinMode(PIN_2, OUTPUT);
  pinMode(PIN_3, OUTPUT);

  connectWiFi();
  server.begin();
  Serial.println("HTTP Server gestartet");

  setMode(OFF);
}

// ── Loop ─────────────────────────────────────────────────────────────────────

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi verloren, verbinde neu...");
    connectWiFi();
  }
  handleClient();
  handleBlink();
}

// ── WiFi ─────────────────────────────────────────────────────────────────────

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Verbinde mit WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" verbunden!");
  Serial.print("IP Adresse: ");
  Serial.println(WiFi.localIP());
}

// ── LED-Steuerung ─────────────────────────────────────────────────────────────

void setMode(Mode mode) {
  currentMode = mode;
  switch (mode) {
    case OFF:
      digitalWrite(PIN_1, LOW);  digitalWrite(PIN_2, LOW);  digitalWrite(PIN_3, LOW);
      break;
    case ALL:
      digitalWrite(PIN_1, HIGH); digitalWrite(PIN_2, HIGH); digitalWrite(PIN_3, HIGH);
      break;
    case MODE_1:
      digitalWrite(PIN_1, HIGH); digitalWrite(PIN_2, LOW);  digitalWrite(PIN_3, LOW);
      break;
    case MODE_2:
      digitalWrite(PIN_1, LOW);  digitalWrite(PIN_2, HIGH); digitalWrite(PIN_3, LOW);
      break;
    case MODE_3:
      digitalWrite(PIN_1, LOW);  digitalWrite(PIN_2, LOW);  digitalWrite(PIN_3, HIGH);
      break;
    case BLINK:
      previousMillis = 0; // trigger immediately on first handleBlink call
      break;
  }
}

void handleBlink() {
  if (currentMode != BLINK) return;
  unsigned long now = millis();
  if (now - previousMillis >= BLINK_INTERVAL) {
    previousMillis = now;
    digitalWrite(PIN_1, random(0, 2));
    digitalWrite(PIN_2, random(0, 2));
    digitalWrite(PIN_3, random(0, 2));
  }
}

// ── Mode-Parsing ──────────────────────────────────────────────────────────────

Mode parseModeString(const String& s) {
  if (s == "OFF")   return OFF;
  if (s == "ALL")   return ALL;
  if (s == "BLINK") return BLINK;
  if (s == "ONE")   return MODE_1;
  if (s == "TWO")   return MODE_2;
  if (s == "THREE") return MODE_3;
  return currentMode; // unbekannt → keine Änderung
}

// Extrahiert den Wert des "mode"-Schlüssels aus einem JSON-Body wie {"mode":"BLINK"}
Mode parseModeFromBody(const String& body) {
  int keyIdx = body.indexOf("\"mode\"");
  if (keyIdx < 0) return currentMode;
  int open = body.indexOf('"', keyIdx + 6);
  if (open < 0) return currentMode;
  int close = body.indexOf('"', open + 1);
  if (close < 0) return currentMode;
  return parseModeString(body.substring(open + 1, close));
}

String modeLabel() {
  switch (currentMode) {
    case OFF:    return "Off";
    case ALL:    return "All";
    case BLINK:  return "Blink";
    case MODE_1: return "1";
    case MODE_2: return "2";
    case MODE_3: return "3";
    default:     return "?";
  }
}

// ── HTTP-Antworten ────────────────────────────────────────────────────────────

void sendJson(WiFiClient& client, const String& body) {
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Access-Control-Allow-Origin: *");
  client.println("Connection: close");
  client.println();
  client.println(body);
}

void sendHtmlPage(WiFiClient& client) {
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/html; charset=UTF-8");
  client.println("Access-Control-Allow-Origin: *");
  client.println("Connection: close");
  client.println();
  client.println("<!DOCTYPE html><html><head>");
  client.println("<meta charset=\"UTF-8\">");
  client.println("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
  client.println("<title>1, 2 oder 3 Steuerung</title>");
  client.println("<style>");
  client.println("body{font-family:sans-serif;padding:15px}");
  client.println("h1,h2{text-align:center}");
  client.println("form{margin-bottom:10px}");
  client.println("input[type=submit]{width:100%;padding:20px;font-size:18px;cursor:pointer;border:1px solid #ccc;border-radius:5px;background:#f0f0f0}");
  client.println("input[type=submit]:hover{background:#e0e0e0}");
  client.println("</style></head><body>");
  client.print("<h1>Modus: "); client.print(modeLabel()); client.println("</h1>");
  client.println("<h2>Licht Steuerung</h2>");
  client.println("<form action=\"/set\" method=\"get\"><input type=\"hidden\" name=\"mode\" value=\"OFF\"><input type=\"submit\" value=\"Off\"></form>");
  client.println("<form action=\"/set\" method=\"get\"><input type=\"hidden\" name=\"mode\" value=\"ALL\"><input type=\"submit\" value=\"All\"></form>");
  client.println("<form action=\"/set\" method=\"get\"><input type=\"hidden\" name=\"mode\" value=\"BLINK\"><input type=\"submit\" value=\"Blink\"></form>");
  client.println("<form action=\"/set\" method=\"get\"><input type=\"hidden\" name=\"mode\" value=\"ONE\"><input type=\"submit\" value=\"1\"></form>");
  client.println("<form action=\"/set\" method=\"get\"><input type=\"hidden\" name=\"mode\" value=\"TWO\"><input type=\"submit\" value=\"2\"></form>");
  client.println("<form action=\"/set\" method=\"get\"><input type=\"hidden\" name=\"mode\" value=\"THREE\"><input type=\"submit\" value=\"3\"></form>");
  client.println("</body></html>");
}

// ── Client-Handler ────────────────────────────────────────────────────────────

void handleClient() {
  WiFiClient client = server.available();
  if (!client) return;

  Serial.println("Neuer Client verbunden.");

  String method = "";
  String path   = "";
  int contentLength = 0;
  bool firstLine = true;
  String currentLine = "";

  while (client.connected()) {
    if (!client.available()) continue;

    char c = client.read();

    if (c == '\n') {
      if (currentLine.length() == 0) {
        // Leerzeile = Ende der Header → Body lesen
        String body = "";
        if (contentLength > 0) {
          unsigned long t = millis();
          while ((int)body.length() < contentLength && millis() - t < 2000) {
            if (client.available()) body += (char)client.read();
          }
        }

        // Dispatch
        if (method == "POST" && path == "/mode") {
          setMode(parseModeFromBody(body));
          Serial.print("POST /mode → "); Serial.println(modeLabel());
          sendJson(client, "{\"success\":true}");

        } else {
          // GET: /set?mode=VALUE oder Legacy-Pfade
          if (path.startsWith("/set?mode=")) {
            setMode(parseModeString(path.substring(10)));
          } else if (path == "/blink") { setMode(BLINK); }
          else if (path == "/off")     { setMode(OFF);   }
          else if (path == "/1")       { setMode(MODE_1);}
          else if (path == "/2")       { setMode(MODE_2);}
          else if (path == "/3")       { setMode(MODE_3);}
          Serial.print("GET "); Serial.print(path); Serial.print(" → "); Serial.println(modeLabel());
          sendHtmlPage(client);
        }
        break;

      } else {
        if (firstLine) {
          // Erste Zeile: "GET /path HTTP/1.1"
          int s1 = currentLine.indexOf(' ');
          int s2 = currentLine.indexOf(' ', s1 + 1);
          method = currentLine.substring(0, s1);
          path   = currentLine.substring(s1 + 1, s2);
          firstLine = false;
        } else if (currentLine.startsWith("Content-Length: ")) {
          contentLength = currentLine.substring(16).toInt();
        }
        currentLine = "";
      }
    } else if (c != '\r') {
      currentLine += c;
    }
  }

  client.stop();
  Serial.println("Client getrennt.");
}
