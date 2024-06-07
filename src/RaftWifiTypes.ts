/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftWifiTypes
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export enum RaftWifiConnState {
  WIFI_CONN_NONE,
  WIFI_CONN_CONNECTED,
}

export class RaftWifiConnStatus {
  connState = RaftWifiConnState.WIFI_CONN_NONE;
  isPaused = false;
  ipAddress = '';
  hostname = '';
  ssid = '';
  bssid = '';
  validMs = 0;
}

export class RaftSysModInfoWiFi {
  rslt = 'ok';
  isConn = 0;
  isPaused = 0;
  connState = 'None';
  SSID = '';
  IP = '';
  Hostname = '';
  WiFiMAC = '';
}

