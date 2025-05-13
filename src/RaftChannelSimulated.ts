/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftChannelSimulated.ts
// Part of RaftJS
//
// Rob Dobson 2020-2025
// (C) 2020-2025 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import RaftChannel from "./RaftChannel";
import RaftMsgHandler from "./RaftMsgHandler";
import RaftLog from "./RaftLog";
import { RaftConnEvent, RaftConnEventFn } from "./RaftConnEvents";
import { RaftCommsMsgTypeCode } from './RaftProtocolDefs';
import { ConnectorOptions } from "./RaftSystemType";
import { DeviceTypeInfoRecs, DeviceTypeInfo } from "./RaftDeviceInfo";

interface SimulatedDeviceInfo {
  name: string;
  publishRatePerSecond: number;
}

export default class RaftChannelSimulated implements RaftChannel {

  // Message handler
  private _raftMsgHandler: RaftMsgHandler | null = null;

  // Is connected
  private _isConnected = false;

  // Simulated device name and rate
  private _simulatedDeviceInfo: Array<SimulatedDeviceInfo> | null = null;

  // Simulated device information timer
  private _simulatedDeviceInfoTimers: Array<NodeJS.Timeout> | null = null;
  private _simulatedDeviceInfoTimeMs: Array<number> = [];

  // Conn event fn
  private _onConnEvent: RaftConnEventFn | null = null;

  // File Handler parameters
  private _requestedBatchAckSize = 10;
  private _requestedFileBlockSize = 500;

  fhBatchAckSize(): number { return this._requestedBatchAckSize; }
  fhFileBlockSize(): number { return this._requestedFileBlockSize; }
  
  // isConnected
  isConnected(): boolean {
    return this._isConnected;
  }

  // Set message handler
  setMsgHandler(raftMsgHandler: RaftMsgHandler): void {
    this._raftMsgHandler = raftMsgHandler;
    this._raftMsgHandler.setRawMsgMode(true);
  }

  // WebSocket interfaces require subscription to published messages
  requiresSubscription(): boolean {
    return true;
  }

  // RICREST command before disconnect
  ricRestCmdBeforeDisconnect(): string | null {
    return null;
  }

  // Set onConnEvent handler
  setOnConnEvent(connEventFn: RaftConnEventFn): void {
    this._onConnEvent = connEventFn;
  }

  // Get connected locator
  getConnectedLocator(): string | object {
    return "simulated";
  }

  // Connect to a device
  async connect(locator: string | object, connectorOptions: ConnectorOptions): Promise<boolean> {

    // Debug
    RaftLog.debug(`RaftChannelSimulated.connect connected ${locator.toString()} options ${JSON.stringify(connectorOptions)}`);

    // Extract SimulatedDeviceInfo from JSON locator
    if (typeof locator === 'string') {
      try {
        const parsedLocator = JSON.parse(locator);
        if (parsedLocator && Array.isArray(parsedLocator)) {
          this._simulatedDeviceInfo = parsedLocator;
        }
      } catch (e) {
        RaftLog.warn(`RaftChannelSimulated.connect - error parsing locator ${locator}`);
        return false;
      }
    }

    // Handle simulated devices
    if (this._simulatedDeviceInfo) {
      // Create timers for simulated devices
      this._simulatedDeviceInfoTimers = [];
      for (let i = 0; i < this._simulatedDeviceInfo.length; i++) {
        const deviceInfo = this._simulatedDeviceInfo[i];
        const deviceName = deviceInfo.name ? deviceInfo.name : `SimulatedDevice${i}`;
        this._simulatedDeviceInfoTimeMs.push(0);
        const deviceRate = deviceInfo.publishRatePerSecond ? deviceInfo.publishRatePerSecond : 1;
        let deviceIntervalMs = 911;
        if ((deviceRate > 0.01) && (deviceRate < 1000)) {
          deviceIntervalMs = Math.floor(1000 / deviceRate);
        }
        const deviceTypeInfo = this._deviceTypeInfo[deviceName];
        if (deviceTypeInfo) {
          const timer = setInterval(() => {
            const msg = this._createSimulatedDeviceInfoMsg(
              deviceIntervalMs,
              deviceName,
              deviceTypeInfo,
              this._simulatedDeviceInfoTimeMs[i]
            );
            this._raftMsgHandler?.handleNewRxMsgRaw(msg, RaftCommsMsgTypeCode.MSG_TYPE_PUBLISH, 0, this._simulatedDeviceInfoTimeMs[i]);
            this._simulatedDeviceInfoTimeMs[i] += deviceIntervalMs;
          }, deviceIntervalMs);
          this._simulatedDeviceInfoTimers.push(timer);
        } else {
          RaftLog.warn(`RaftChannelSimulated.connect - device type info not found for ${deviceName}`);
        }
      }
    } else {
      RaftLog.warn(`RaftChannelSimulated.connect - no simulated devices found`);
    }

    // Connected
    this._isConnected = true;    
    return true;
  }

  // Disconnect
  async disconnect(): Promise<void> {
    
    // Not connected
    this._isConnected = false;

    // Clear timers
    if (this._simulatedDeviceInfoTimers) {
      for (const timer of this._simulatedDeviceInfoTimers) {
        clearInterval(timer);
      }
      this._simulatedDeviceInfoTimers = null;
    }

    // Notify connection event
    if (this._onConnEvent) {
      this._onConnEvent(RaftConnEvent.CONN_DISCONNECTED);
    }
    
    // Debug
    RaftLog.debug(`RaftChannelSimulated.disconnect closed`);
  }

  pauseConnection(pause: boolean): void { 
    RaftLog.debug(`pauseConnection ${pause} - no effect for this channel type`); 
    return; 
  }

  // Send a message
  async sendTxMsg(
    msg: Uint8Array,
    sendWithResponse: boolean
  ): Promise<boolean> {

    // Check connected
    if (!this._isConnected)
      return false;

    // Debug
    RaftLog.debug(`RaftChannelSimulated.sendTxMsg ${msg.toString()} sendWithResp ${sendWithResponse.toString()}`);
    return true;
  }

  async sendTxMsgNoAwait(
    msg: Uint8Array,
    sendWithResponse: boolean
  ): Promise<boolean> {

    // Check connected
    if (!this._isConnected)
      return false;

    // Debug
    RaftLog.debug(`RaftChannelSimulated.sendTxMsgNoAwait ${msg.toString()} sendWithResp ${sendWithResponse.toString()}`);
    return true;
  }

  // Method used for testing and simulation should never be called
  sendTxMsgRaw(msg: string): boolean {
    RaftLog.debug(`sendTxMsgRaw - not implemented ${msg}`);
    return false;
  }

  // Method used for testing and simulation should never be called
  sendTxMsgRawAndWaitForReply<T>(msgPayload: Uint8Array): T {
    RaftLog.debug(`sendTxMsgRawAndWaitForReply ${msgPayload}`);

    // Decode the message from Uint8Array to string
    const textDecoder = new TextDecoder('utf-8');
    const decodedString = textDecoder.decode(msgPayload.slice(1)).replace("\0", "").trim()
    
    RaftLog.debug(`sendTxMsgRawAndWaitForReply ${decodedString}`);
    
    // Check for version request
    if (decodedString === "v") {
      // R"({"req":"%s","rslt":"ok","SystemName":"%s","SystemVersion":"%s","Friendly":"%s","SerialNo":"%s","MAC":"%s",%s})",
      const response = {
        req: "v",
        rslt: "ok",
        SystemName: "Simulated",
        SystemVersion: "1.0.0",
        Friendly: "Simulated",
        SerialNo: "123456",
        MAC: "00:00:00:00:00:00"
      }
      return response as T;
    }

    else if (decodedString.startsWith("sub")) {
      const response = {
        req: decodedString,
        rslt: "ok"
      }
      return response as T;
    }

    // Check if this is a device type info request
    else if (decodedString.startsWith("devman/typeinfo?")) {
      // Extract the type parameter from the request
      const match = decodedString.match(/type=([^&]+)/);
      if (match && match[1]) {
        const deviceType = match[1];
        
        // Look up the device type in the _deviceTypeInfo
        if (deviceType in this._deviceTypeInfo) {
          // Prepare response with the device type info
          const response = {
            req: decodedString,
            rslt: "ok",
            devinfo: this._deviceTypeInfo[deviceType]
          };
          
          RaftLog.debug(`Device type info for ${deviceType} found, returning response`);
          return response as T;
        } else {
          // Device type not found
          const response = {
            req: decodedString,
            rslt: "err",
            msg: `Device type ${deviceType} not found`
          };
          
          RaftLog.warn(`Device type info for ${deviceType} not found`);
          return response as T;
        }
      }
    } 
    
    // Unknown message
    const response = {
      req: decodedString,
      rslt: "err",
      msg: `Unknown request`
    };
    return response as T;
  }

  // Create simulated device info message
  private _createSimulatedDeviceInfoMsg(
    deviceIntervalMs: number,
    deviceName: string,
    deviceTypeInfo: DeviceTypeInfo,
    deviceTimeMs: number
  ): Uint8Array {
    // Make sure we have response metadata
    if (!deviceTypeInfo?.resp?.a) {
      return new Uint8Array(0);
    }

    const attributes = deviceTypeInfo.resp.a;
    const dataBlockSizeBytes = deviceTypeInfo.resp.b;
    
    // Create a buffer for the data
    const dataBuffer = new ArrayBuffer(dataBlockSizeBytes + 2);
    const dataView = new DataView(dataBuffer);
    let bytePos = 0;

    // Add 16 bit big endian deviceTimeMs mod 65536 to the buffer
    dataView.setUint16(bytePos, deviceTimeMs % 65536, false);
    bytePos += 2;
    
    // Calculate sine wave with phase offsets for each attribute
    const numAttributes = attributes.length;
      // Adjust frequency based on the device interval with N samples per cycle
    const numSamplesPerCycle = 10;
    let frequencyHz = 0.1; // Default frequency in Hz
    if (deviceIntervalMs > 0) {
      frequencyHz = (1000 / deviceIntervalMs) / numSamplesPerCycle;
    }

    // Amplitude of the sine wave (0 to 1)
    const amplitude = 0.8;
    
    // Iterate through attributes and set values
    for (let i = 0; i < numAttributes; i++) {
      const attr = attributes[i];
      // Calculate phase offset for this attribute
      const phaseOffset = (2 * Math.PI * i) / numAttributes;
      
      // Generate sine wave value
      const timeRadians = deviceTimeMs * frequencyHz * (2 * Math.PI) / 1000;
      const sinValue = Math.sin(timeRadians + phaseOffset);
      
      // Scale the value to fit within the attribute's range
      let scaledValue: number;
      if (attr.r && attr.r.length >= 2) {
        const minValue = attr.r[0];
        const maxValue = attr.r[1];
        const midPoint = (maxValue + minValue) / 2;
        const range = (maxValue - minValue) / 2;
        scaledValue = midPoint + sinValue * range * amplitude;
      } else {
        // Default range if not specified
        scaledValue = sinValue * 1000 * amplitude;
      }
      
      // Convert to raw integer value if needed
      let rawValue = scaledValue;
      if (attr.d) {
        // Multiply by the divisor to get the raw value (reverse of what happens when decoding)
        rawValue = scaledValue * attr.d;
      }
      
      // Write the value to the buffer based on its type
      if (attr.t === "b") {
        dataView.setUint8(bytePos, Math.round(rawValue));
        bytePos += 1;
      } else if (attr.t === "B") {
        dataView.setUint8(bytePos, Math.round(rawValue));
        bytePos += 1;
      } else if (attr.t === "c") {
        dataView.setInt8(bytePos, Math.round(rawValue));
        bytePos += 1;
      } else if (attr.t === "C") {
        dataView.setUint8(bytePos, Math.round(rawValue));
        bytePos += 1;
      } else if (attr.t === "<h") {
        dataView.setInt16(bytePos, Math.round(rawValue), true); // Little endian
        bytePos += 2;
      } else if (attr.t === ">h") {
        dataView.setInt16(bytePos, Math.round(rawValue), false); // Big endian
        bytePos += 2;
      } else if (attr.t === "<H") {
        dataView.setUint16(bytePos, Math.round(rawValue), true); // Little endian
        bytePos += 2;
      } else if (attr.t === ">H") {
        dataView.setUint16(bytePos, Math.round(rawValue), false); // Big endian
        bytePos += 2;
      } else if (attr.t === "f" || attr.t === "<f") {
        dataView.setFloat32(bytePos, rawValue, true); // Little endian
        bytePos += 4;
      } else if (attr.t === ">f") {
        dataView.setFloat32(bytePos, rawValue, false); // Big endian
        bytePos += 4;
      } else {
        RaftLog.warn(`RaftChannelSimulated._createSimulatedDeviceInfoMsg - unsupported attribute type ${attr.t}`);
      }

    }
    
    // Convert the buffer to a byte array
    const dataBytes = new Uint8Array(dataBuffer);
    
    // Create the JSON message structure
    const message = {
      "BUS1": {
        [deviceName]: {
          "_t": deviceTypeInfo.type,
          "_o": 1,  // Device is online
          "pub": this._bytesToHexStr(dataBytes)
        }
      }
    };
    
    // Convert the JSON to a string and then to Uint8Array with prepended timestamp
    const jsonString = JSON.stringify(message);
    const encodedMsg = new TextEncoder().encode(jsonString);
    const msgWithPrefix = new ArrayBuffer(2 + encodedMsg.byteLength);
    const msgWithPrefixView = new DataView(msgWithPrefix);
    const msgPrefixBytes = new Uint8Array(msgWithPrefix);
    msgWithPrefixView.setUint16(0, 0, false);
    msgPrefixBytes.set(encodedMsg, 2);
    return msgPrefixBytes;    

  }

  // Helper function to convert bytes to hex string
  private _bytesToHexStr(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Simulated device type information - this is a copy of part of DeviceTypeInfo in RaftCore
  private _deviceTypeInfo: DeviceTypeInfoRecs = 
  {
    "LSM6DS": {
      "name": "LSM6DS",
      "desc": "6-Axis IMU",
      "manu": "ST",
      "type": "LSM6DS",
      "clas": ["ACC","GYRO"],
      "resp": {
          "b": 12,
          "a": [
              {
                  "n": "gx",
                  "t": "<h",
                  "u": "&deg;/s",
                  "r": [-2000, 2000],
                  "d": 16.384,
                  "f": ".2f",
                  "o": "float"
              },
              {
                  "n": "gy",
                  "t": "<h",
                  "u": "&deg;/s",
                  "r": [-2000, 2000],
                  "d": 16.384,
                  "f": ".2f",
                  "o": "float"
              },
              {
                  "n": "gz",
                  "t": "<h",
                  "u": "&deg;/s",
                  "r": [-2000, 2000],
                  "d": 16.384,
                  "f": ".2f",
                  "o": "float"
              },
              {
                  "n": "ax",
                  "t": "<h",
                  "u": "g",
                  "r": [-4.0, 4.0],
                  "d": 8192,
                  "f": ".2f",
                  "o": "float"
              },
              {
                  "n": "ay",
                  "t": "<h",
                  "u": "g",
                  "r": [-4.0,4.0],
                  "d": 8192,
                  "f": ".2f",
                  "o": "float"
              },
              {
                  "n": "az",
                  "t": "<h",
                  "u": "g",
                  "r": [-4.0,4.0],
                  "d": 8192,
                  "f": ".2f",
                  "o": "float"
              }
          ]
       }
    }
  };
 
}