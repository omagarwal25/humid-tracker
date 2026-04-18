// #include <Wire.h>

// #define SDA_PIN 4  // D2
// #define SCL_PIN 5  // D1

// void setup() {
//   Serial.begin(115200);
//   Wire.begin(SDA_PIN, SCL_PIN);
//   delay(1000);

//   Serial.println("Scanning I2C bus...");
//   int found = 0;

//   for (byte addr = 1; addr < 127; addr++) {
//     Wire.beginTransmission(addr);
//     byte error = Wire.endTransmission();
//     if (error == 0) {
//       Serial.printf("Device found at 0x%02X\n", addr);
//       found++;
//     }
//   }

//   if (found == 0) {
//     Serial.println("No I2C devices found — check wiring");
//   } else {
//     Serial.printf("%d device(s) found\n", found);
//   }
// }

// void loop() {}
