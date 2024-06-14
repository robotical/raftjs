export declare enum RaftWifiConnState {
    WIFI_CONN_NONE = 0,
    WIFI_CONN_CONNECTED = 1
}
export declare class RaftWifiConnStatus {
    connState: RaftWifiConnState;
    isPaused: boolean;
    ipAddress: string;
    hostname: string;
    ssid: string;
    bssid: string;
    validMs: number;
}
export declare class RaftSysModInfoWiFi {
    rslt: string;
    isConn: number;
    isPaused: number;
    connState: string;
    SSID: string;
    IP: string;
    Hostname: string;
    WiFiMAC: string;
}
