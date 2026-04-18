// ============================================================
// Configuration — copy secrets_example.h to secrets.h and fill in your values
// ============================================================
#include "secrets.h"
// ============================================================

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>

#define SHT3X_ADDR 0x44
#define SDA_PIN    4   // D2
#define SCL_PIN    5   // D1

#define READ_INTERVAL_MS 600000

String macAddress;

bool readSHT3x(float &temperature, float &humidity) {
  Wire.beginTransmission(SHT3X_ADDR);
  Wire.write(0x2C);
  Wire.write(0x06);
  if (Wire.endTransmission() != 0) {
    Serial.println("SHT3x: transmission error");
    return false;
  }

  delay(500);

  if (Wire.requestFrom(SHT3X_ADDR, 6) != 6) {
    Serial.println("SHT3x: failed to read 6 bytes");
    return false;
  }

  uint8_t data[6];
  for (int i = 0; i < 6; i++) {
    data[i] = Wire.read();
  }

  uint16_t rawTemp = (data[0] << 8) | data[1];
  uint16_t rawHum  = (data[3] << 8) | data[4];

  temperature = -45.0 + 175.0 * ((float)rawTemp / 65535.0);
  humidity    = 100.0 * ((float)rawHum  / 65535.0);

  return true;
}

void connectWiFi() {
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  delay(100);

  Wire.begin(SDA_PIN, SCL_PIN);

  connectWiFi();

  macAddress = WiFi.macAddress();
  Serial.print("MAC: ");
  Serial.println(macAddress);
}

void loop() {
  static unsigned long lastRead = 0;
  unsigned long now = millis();

  if (now - lastRead >= READ_INTERVAL_MS || lastRead == 0) {
    lastRead = now;

    float temperature, humidity;
    if (!readSHT3x(temperature, humidity)) {
      Serial.println("Failed to read sensor — skipping");
      return;
    }

    Serial.printf("Temp: %.2f°C  Humidity: %.2f%%\n", temperature, humidity);

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected — reconnecting");
      connectWiFi();
    }

    WiFiClient client;
    HTTPClient http;
    http.begin(client, SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"mac\":\"" + macAddress +
                     "\",\"temperature\":" + String(temperature, 2) +
                     ",\"humidity\":" + String(humidity, 2) + "}";

    int httpCode = http.POST(payload);
    Serial.printf("POST %s → %d\n", SERVER_URL, httpCode);
    http.end();
  }
}
