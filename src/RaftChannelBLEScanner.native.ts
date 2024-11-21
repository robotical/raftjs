/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftChannelBLEScanner.native.ts
// Communications Connector for RaftJS
//
// Rob Dobson 2022-24
// (C) Robotical 2022-24
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  BleManager,
  Device,
  BleError,
} from 'react-native-ble-plx';
import { DiscoveredDevice } from './RaftTypes';
import RaftLog from './RaftLog';
import { RaftConnEvent, RaftConnEventFn } from './RaftConnEvents';

export default class RaftChannelBLEScanner {

  // BleManager
  _bleManager: BleManager;

  // Services to scan for
  _defaultUUIDsOfServicesToScanFor: Array<string> = [];

  // Scanned devices found on BLE
  _discoveredDevices: DiscoveredDevice[] = [];
  static _scanInProgress = false;

  // Time to scan for
  _discoveryTimeMs = 10000;

  // Event callback
  _eventCallback: RaftConnEventFn;

  constructor(bleManager: BleManager, uuidsOfServicesToScanFor: Array<string>, eventCallback: RaftConnEventFn) {
    this._bleManager = bleManager;
    this._defaultUUIDsOfServicesToScanFor = uuidsOfServicesToScanFor;
    this._eventCallback = eventCallback;
  }

  // Get discovered Devices
  getDiscoveredDevices(): DiscoveredDevice[] {
    return this._discoveredDevices;
  }

  // Check is a scan is in progress
  isScanInProgress(): boolean {
    return RaftChannelBLEScanner._scanInProgress;
  }

  async scanningStart(uuids: string[]): Promise<boolean> {
    // Handle discovery
    RaftLog.debug('Starting Scanning...');

    // Clear list
    this._discoveredDevices = [];

    // Disconnect any connections
    RaftChannelBLEScanner._scanInProgress = true;

    // Start scan
    try {
      this._bleManager.startDeviceScan(
        uuids.length > 0 ? uuids : this._defaultUUIDsOfServicesToScanFor,
        { allowDuplicates: true },
        (error: BleError | null, device: Device | null) => {
          // RaftLog.debug(`discoveryFoundCB error ${error}`);
          this._discoveryFoundCB(error, device);
        },
      );
    } catch (e) {
      RaftLog.warn(`Error starting scan ${e}`);
      return false;
    }

    // Set a time limit
    this._discoverySetTimeLimit(this._discoveryTimeMs);
    return true;
  }

  scanningStop(): void {

    RaftLog.debug('scanningStop');

    // Emit finished if we were scanning
    RaftLog.debug(`IS SCANNING IN PROGRESS: ${RaftChannelBLEScanner._scanInProgress}`);
    if (RaftChannelBLEScanner._scanInProgress) {
      RaftLog.debug(`sending BLE_SCANNING_FINISHED event`);
      this._eventCallback(RaftConnEvent.BLE_SCANNING_FINISHED, { discoveredDevices: this._discoveredDevices });
    }

    // Cancel scanning
    this._bleManager.stopDeviceScan();
    RaftChannelBLEScanner._scanInProgress = false;
  }

  // Callback from BLE-PLX library on device discovered
  _discoveryFoundCB(
    error: BleError | null,
    scannedDevice: Device | null,
  ): void {
    if (error) {
      //RaftLog.warn(`⚠️ Scan Error >> ${error.toString()}`);
      RaftLog.warn(`⚠️ Scan Error >> ${JSON.stringify(error)}`);
      // Event if we were scanning
      if (RaftChannelBLEScanner._scanInProgress) {
        this._eventCallback(RaftConnEvent.BLE_SCANNING_FINISHED, {
          discoveredDevices: this._discoveredDevices,
        });
        RaftChannelBLEScanner._scanInProgress = false;
      }
      return;
    }

    // See if already in the list
    const deviceAlreadyFound = this._discoveredDevices.find(
      item => item.id === scannedDevice!.id,
    );

    RaftLog.debug(`✅ Scanning... >> ${scannedDevice}`);

    if (deviceAlreadyFound) {
      // update the rssi value if it's not 127
      if (scannedDevice!.rssi !== null && scannedDevice!.rssi !== 127) {
        deviceAlreadyFound._rssi = scannedDevice!.rssi;
        this._eventCallback(RaftConnEvent.BLE_DEVICE_FOUND, {
          discoveredDevice: deviceAlreadyFound
        });
      }
      return;
    }

    if (scannedDevice !== null) {
      if (!scannedDevice.localName) {
        // if the name of the device is null, don't add this device
        // the first time round. Second time this device comes up
        // will have all the needed info
        return;
      }
      const newDiscoveredDevice = new DiscoveredDevice(
        scannedDevice.localName !== null ? scannedDevice.localName : '',
        scannedDevice.name !== null ? scannedDevice.name : '',
        scannedDevice.id,
        scannedDevice.rssi !== null ? scannedDevice.rssi : -150,
      );
      this._discoveredDevices.push(newDiscoveredDevice);
      // send the newly found ric to the state so it can pop-up on the front-end
      this._eventCallback(RaftConnEvent.BLE_DEVICE_FOUND, {
        discoveredDevice: newDiscoveredDevice
      });
    }
    RaftLog.debug(`🤖 Scanned RICs >> ${this._discoveredDevices}`);
  }

  // Time-limit on device scanning
  _discoverySetTimeLimit(timeLimitMs: number) {
    setTimeout(() => {
      // Stop scanning
      this._bleManager.stopDeviceScan();

      // Check we were scanning
      if (RaftChannelBLEScanner._scanInProgress) {
        // Sort by signal strength
        // this._discoveredDevices.sort((a, b) => {
        //   return b!.rssi! - a!.rssi!;
        // });

        // Debug
        const msg = `🤖 ${this._discoveredDevices.length} RICs found! Choose one to connect`;
        RaftLog.debug(msg);

        // Finished event
        this._eventCallback(RaftConnEvent.BLE_SCANNING_FINISHED, {
          discoveredDevices: this._discoveredDevices,
        });
      }
      RaftChannelBLEScanner._scanInProgress = false;
    }, timeLimitMs);
  }
}