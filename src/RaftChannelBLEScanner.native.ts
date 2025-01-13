/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RICBLEScanner
// Communications Connector for RIC V2
//
// RIC V2
// Rob Dobson 2022
// (C) Robotical 2022
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  BleManager,
  Device,
  BleError,
} from 'react-native-ble-plx';
import { DiscoveredRIC } from './RaftTypes';
import RaftLog from './RaftLog';
import { RaftConnEvent, RaftConnEventFn } from './RaftConnEvents';

export default class RICBLEScanner {

  // BleManager
  _bleManager: BleManager;

  // Services to scan for
  _uuidsOfServicesToScanFor: Array<string> = [];

  // Scanned devices found on BLE
  _discoveredRICs: DiscoveredRIC[] = [];
  static _scanInProgress = false;

  // Time to scan for
  _discoveryTimeMs = 10000;

  // Event callback
  _eventCallback: RaftConnEventFn;

  constructor(bleManager: BleManager, uuidsOfServicesToScanFor: Array<string>, eventCallback: RaftConnEventFn) {
    this._bleManager = bleManager;
    this._uuidsOfServicesToScanFor = uuidsOfServicesToScanFor;
    this._eventCallback = eventCallback;
  }

  // Get discovered RICs
  getDiscoveredRICs(): DiscoveredRIC[] {
    return this._discoveredRICs;
  }

  // Check is a scan is in progress
  isScanInProgress(): boolean {
    return RICBLEScanner._scanInProgress;
  }

  async scanningStart(uuid?: string): Promise<boolean> {
    let uuidsOfServicesToScanFor: string[] = [];
    if (uuid) {
      uuidsOfServicesToScanFor.push(uuid);
    } else {
      uuidsOfServicesToScanFor = this._uuidsOfServicesToScanFor;
    }
    // Handle discovery
    RaftLog.debug('Starting Scanning...');

    // Clear list
    this._discoveredRICs = [];

    // Disconnect any connections
    RICBLEScanner._scanInProgress = true;

    // Start scan
    try {
      this._bleManager.startDeviceScan(
        uuidsOfServicesToScanFor,
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
    RaftLog.debug(`IS SCANNING IN PROGRESS: ${RICBLEScanner._scanInProgress}`);
    if (RICBLEScanner._scanInProgress) {
      RaftLog.debug(`sending BLE_SCANNING_FINISHED event`);
      this._eventCallback(RaftConnEvent.BLE_SCANNING_FINISHED, { discoveredRICs: this._discoveredRICs });
    }

    // Cancel scanning
    this._bleManager.stopDeviceScan();
    RICBLEScanner._scanInProgress = false;
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
      if (RICBLEScanner._scanInProgress) {
        this._eventCallback(RaftConnEvent.BLE_SCANNING_FINISHED, {
          discoveredRICs: this._discoveredRICs,
        });
        RICBLEScanner._scanInProgress = false;
      }
      return;
    }

    // See if already in the list
    const ricAlreadyFound = this._discoveredRICs.find(
      item => item.id === scannedDevice!.id,
    );
    RaftLog.debug(`✅ Scanning... >> ${scannedDevice}`);

    if (ricAlreadyFound) {
      // update the rssi value if it's not 127
      if (scannedDevice!.rssi !== null && scannedDevice!.rssi !== 127) {
        ricAlreadyFound._rssi = scannedDevice!.rssi;
        this._eventCallback(RaftConnEvent.BLE_DEVICE_FOUND, {
          discoveredRIC: ricAlreadyFound
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
      const newDiscoveredRic = new DiscoveredRIC(
        scannedDevice.localName !== null ? scannedDevice.localName : '',
        scannedDevice.name !== null ? scannedDevice.name : '',
        scannedDevice.id,
        scannedDevice.rssi !== null ? scannedDevice.rssi : -150,
        scannedDevice.serviceUUIDs
      );
      this._discoveredRICs.push(newDiscoveredRic);
      // send the newly found ric to the state so it can pop-up on the front-end
      this._eventCallback(RaftConnEvent.BLE_DEVICE_FOUND, {
        discoveredRIC: newDiscoveredRic
      });
    }
    RaftLog.debug(`🤖 Scanned RICs >> ${this._discoveredRICs}`);
  }

  // Time-limit on device scanning
  _discoverySetTimeLimit(timeLimitMs: number) {
    setTimeout(() => {
      // Stop scanning
      this._bleManager.stopDeviceScan();

      // Check we were scanning
      if (RICBLEScanner._scanInProgress) {
        // Sort by signal strength
        // this._discoveredRICs.sort((a, b) => {
        //   return b!.rssi! - a!.rssi!;
        // });

        // Debug
        const msg = `🤖 ${this._discoveredRICs.length} RICs found! Choose one to connect`;
        RaftLog.debug(msg);

        // Finished event
        this._eventCallback(RaftConnEvent.BLE_SCANNING_FINISHED, {
          discoveredRICs: this._discoveredRICs,
        });
      }
      RICBLEScanner._scanInProgress = false;
    }, timeLimitMs);
  }
}