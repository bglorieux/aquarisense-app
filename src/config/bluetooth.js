/**
 * AquariSense BLE Configuration
 *
 * These UUIDs are the same on ALL AquariSense devices.
 * They define the communication protocol, not individual devices.
 *
 * Each physical device is identified by:
 * - Unique Bluetooth MAC address (automatic)
 * - Device ID (based on Pi serial number, e.g., "AQS-1A2B3C4D")
 * - Device Name (user-assigned, e.g., "Living Room Tank")
 */

// Main service UUID - identifies "this is an AquariSense device"
export const AQUARISENSE_SERVICE_UUID = '67fdd12e-9cd6-44b7-8be9-c2570df58644';

// Device identification
export const DEVICE_ID_UUID = '38020776-89ec-4de7-ae14-89c6e988f720';      // Read: unique hardware ID
export const DEVICE_NAME_UUID = '2c7f018a-ad6f-4d01-89bb-ec0259a70587';    // Read/Write: friendly name

// WiFi setup
export const WIFI_NETWORKS_UUID = 'cdad060e-80fb-4958-921d-0fd896a4eac6';  // Read: available networks
export const WIFI_CREDENTIALS_UUID = '9f330499-a7d3-49d3-9243-7f9d09f7d37d'; // Write: ssid + password
export const WIFI_STATUS_UUID = '1605ae78-0793-4cab-90d1-32290901e0c2';    // Read: connection status

/**
 * Serial Number Format: AQS-[Region]-M[Model]-[Year]-[Serial]
 * Example: AQS-EU-M01-25-000001
 *
 * Components:
 *   - AQS: Product prefix
 *   - Region: EU, US, UK, AU, AS (Asia), CA, JP, CN
 *   - Model: M01, M02, etc.
 *   - Year: 25 = 2025
 *   - Serial: 000001-999999
 *
 * Data formats (all JSON):
 *
 * DEVICE_ID (read):
 *   { "id": "AQS-EU-M01-25-000001" }
 *
 * DEVICE_NAME (read):
 *   { "id": "AQS-EU-M01-25-000001", "name": "Living Room Tank" }
 *
 * DEVICE_NAME (write):
 *   { "name": "Living Room Tank" }
 *
 * WIFI_NETWORKS (read):
 *   [{ "ssid": "MyNetwork", "signal": -45, "secure": true }, ...]
 *
 * WIFI_CREDENTIALS (write):
 *   { "ssid": "MyNetwork", "password": "secret123" }
 *
 * WIFI_STATUS (read):
 *   { "status": "connected", "ssid": "MyNetwork", "ip": "192.168.1.42" }
 *   status: "idle" | "connecting" | "connected" | "failed" | "disconnected"
 */
