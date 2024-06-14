import { RaftWifiConnStatus } from "./RaftWifiTypes";
import RaftMsgHandler from "./RaftMsgHandler";
import { RaftFileList, RaftFriendlyName, RaftOKFail, RaftSysModInfoBLEMan, RaftSystemInfo, RaftWifiScanResults } from "./RaftTypes";
export default class RaftSystemUtils {
    private _msgHandler;
    private _systemInfo;
    private _friendlyName;
    private _wifiConnStatus;
    private _defaultWiFiHostname;
    private _maxSecsToWaitForWiFiConn;
    /**
     * constructor
     * @param raftMsgHandler
     */
    constructor(raftMsgHandler: RaftMsgHandler);
    /**
     * getMsgHandler
     * @returns RaftMsgHandler
     */
    getMsgHandler(): RaftMsgHandler;
    /**
     * setDefaultWiFiHostname
     * @param defaultWiFiHostname
     */
    setDefaultWiFiHostname(defaultWiFiHostname: string): void;
    /**
     * getFriendlyName
     *
     * @returns friendly name
     */
    getFriendlyName(): RaftFriendlyName | null;
    /**
     * invalidate
     */
    invalidate(): void;
    /**
     * retrieveInfo - get system info
     * @returns Promise<RaftSystemInfo>
     *
     */
    retrieveInfo(): Promise<boolean>;
    /**
     *
     * getSystemInfo
     * @param forceGet - true to force a get from the raft app
     * @returns Promise<RaftSystemInfo>
     *
     */
    getSystemInfo(forceGet?: boolean): Promise<RaftSystemInfo>;
    /**
     *
     * setRaftName
     * @param newName name to refer to Raft - used for BLE advertising
     * @returns Promise<boolean> true if successful
     *
     */
    setRaftName(newName: string): Promise<boolean>;
    /**
     *
     * getRaftName
     * @param forceGet - true to force a get from the raft app
     * @returns Promise<RaftNameResponse> (object containing rslt)
     *
     */
    getRaftName(forceGet?: boolean): Promise<RaftFriendlyName>;
    /**
     *
     * getFileList - get list of files on file system
     * @returns Promise<RaftFileList>
     *
     */
    getFileList(): Promise<RaftFileList>;
    /**
     *
     * Get BLEMan sysmod info
     *
     * @returns RaftSysModInfoBLEMan
     *
     */
    getSysModInfoBLEMan(): Promise<RaftSysModInfoBLEMan | null>;
    /**
     * Get hostname of connected WiFi
     *
     *  @return string - hostname of connected WiFi
     *
     */
    _getHostnameFromFriendlyName(): string;
    /**
     * Get Wifi connection status
     *
     *  @return boolean - true if connected
     *
     */
    getWiFiConnStatus(): Promise<boolean | null>;
    /**
     * pause Wifi connection
     *
     *  @param boolean - true to pause, false to resume
     *  @return boolean - true if successful
     *
     */
    pauseWifiConnection(pause: boolean): Promise<boolean>;
    /**
     * Connect to WiFi
     *
     *  @param string - WiFi SSID
     *  @param string - WiFi password
     *  @return boolean - true if successful
     *
     */
    wifiConnect(ssid: string, password: string): Promise<boolean>;
    /**
     * Disconnect WiFi
     *
     *  @return boolean - true if successful
     *
     */
    wifiDisconnect(): Promise<boolean>;
    /**
     *  WiFiScan start
     *
     *  @return boolean - true if successful
     *
     */
    wifiScanStart(): Promise<boolean>;
    /**
     *  WiFiScan get results
     *
     *  @return boolean - false if unsuccessful, otherwise the results of the promise
     *
     */
    wifiScanResults(): Promise<boolean | RaftOKFail | RaftWifiScanResults>;
    getCachedSystemInfo(): RaftSystemInfo | null;
    getCachedRaftName(): RaftFriendlyName | null;
    getCachedWifiStatus(): RaftWifiConnStatus;
}
