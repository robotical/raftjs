import RaftChannel from "./RaftChannel";
import RaftMsgHandler, { RaftMsgResultCode } from "./RaftMsgHandler";
import RaftCommsStats from "./RaftCommsStats";
import { RaftEventFn, RaftOKFail, RaftFileDownloadResult, RaftProgressCBType, RaftBridgeSetupResp, RaftFileDownloadFn } from "./RaftTypes";
import RaftSystemUtils from "./RaftSystemUtils";
import { RaftConnEvent } from "./RaftConnEvents";
import { RaftGetSystemTypeCBType, RaftSystemType } from "./RaftSystemType";
import { RaftUpdateEvent } from "./RaftUpdateEvents";
export default class RaftConnector {
    private _getSystemTypeCB;
    private _systemType;
    private _raftChannel;
    private _channelConnMethod;
    private _channelConnLocator;
    private _commsStats;
    private _raftMsgHandler;
    private _raftSystemUtils;
    private readonly _testConnPerfBlockSize;
    private readonly _testConnPerfNumBlocks;
    private readonly _connPerfRsltDelayMs;
    private _retryIfLostEnabled;
    private _retryIfLostForSecs;
    private _retryIfLostIsConnected;
    private _retryIfLostDisconnectTime;
    private readonly _retryIfLostRetryDelayMs;
    private _raftFileHandler;
    private _raftStreamHandler;
    private _onEventFn;
    private _raftUpdateManager;
    /**
     * RaftConnector constructor
     * @param getSystemTypeCB - callback to get system type
      */
    constructor(getSystemTypeCB?: RaftGetSystemTypeCBType | null);
    /**
     * Configure the file handler
     * @param fileBlockSize - size of file blocks to send
     * @param batchAckSize - number of blocks to send before waiting for ack
     * @returns void
       */
    configureFileHandler(fileBlockSize: number, batchAckSize: number): void;
    /**
     * Set event listener
     * @param onEventFn - event listener
     * @returns void
     *  */
    setEventListener(onEventFn: RaftEventFn): void;
    /**
     * isConnected
     * @returns boolean - true if connected
     *  */
    isConnected(): boolean;
    /**
     * Set try to reconnect if connection lost
     * @param enableRetry - true to enable retry
     * @param retryForSecs - retry for this many seconds
     * @returns void
     * */
    setRetryConnectionIfLost(enableRetry: boolean, retryForSecs: number): void;
    /**
     * Get Raft system type (the type of hardware connected to - determined using the getSystemInfo API)
     * @returns RaftSystemType | null - Raft system type
     * */
    getSystemType(): RaftSystemType | null;
    /**
     * Get connection method
     * @returns string - connection method
     * */
    getConnMethod(): string;
    /**
   * Get connection locator
   * @returns string | object - connection locator
   * */
    getConnLocator(): any | null;
    /**
     * Get Raft channel (this is the channel used for commuinications with the Raft application)
     * @returns RaftChannel | null - Raft channel
     * */
    getRaftChannel(): RaftChannel | null;
    /**
     * Get Raft system utils (access to system information and control)
     * @returns RaftSystemUtils - Raft system utils
     * */
    getRaftSystemUtils(): RaftSystemUtils;
    /**
     * Get communication stats
     * @returns RaftCommsStats - communication stats
     * */
    getCommsStats(): RaftCommsStats;
    /**
     * Get Raft message handler (to allow message sending and receiving)
     * @returns RaftMsgHandler - Raft message handler
     * */
    getRaftMsgHandler(): RaftMsgHandler;
    /**
     * Pause connection
     * @param pause - true to pause, false to resume
     */
    pauseConnection(pause?: boolean): void;
    /**
     * Connect to a Raft application
     *
     * @param {string} method - can be "WebBLE", "WebSocket" or "WebSerial"
     * @param {string | object} locator - either a string (WebSocket URL or serial port) or an object (WebBLE)
     * @returns Promise<boolean>
     *
     */
    connect(method: string, locator: string | object): Promise<boolean>;
    disconnect(): Promise<void>;
    /**
     *
     * sendRICRESTMsg
     * @param commandName command API string
     * @param params parameters (simple name value pairs only) to parameterize trajectory
     * @returns Promise<RaftOKFail>
     *
     */
    sendRICRESTMsg(commandName: string, params: object, bridgeID?: number | undefined): Promise<RaftOKFail>;
    /**
     * onRxReply - handle a reply message
     * @param msgHandle number indicating the message that is being replied to (from the original message)
     * @param msgRsltCode result code
     * @param msgRsltJsonObj result object
     */
    onRxReply(msgHandle: number, msgRsltCode: RaftMsgResultCode, msgRsltJsonObj: object | null): void;
    /**
     * onRxUnnumberedMsg - handle an unnumbered message
     * @param msgRsltJsonObj result object
     */
    onRxUnnumberedMsg(msgRsltJsonObj: {
        [key: string]: number | string;
    }): void;
    /**
     * onRxFileBlock - handle a file block
     * @param filePos file position
     * @param fileBlockData file block data
     */
    onRxFileBlock(filePos: number, fileBlockData: Uint8Array): void;
    /**
     * onRxOtherMsgType - handle other message types
     * @param payload message payload
     * @param frameTimeMs time of frame
     */
    onRxOtherMsgType(payload: Uint8Array, _frameTimeMs: number): void;
    /**
     * sendFile - send a file
     * @param fileName name of file to send
     * @param fileContents file contents
     * @param progressCallback callback to receive progress updates
     * @returns Promise<boolean> - true if file sent successfully
     */
    sendFile(fileName: string, fileContents: Uint8Array, progressCallback: ((sent: number, total: number, progress: number) => void) | undefined): Promise<boolean>;
    /**
     * streamAudio - stream audio
     * @param streamContents audio data
     * @param clearExisting true to clear existing audio
     * @param duration duration of audio
     */
    streamAudio(streamContents: Uint8Array, clearExisting: boolean, duration: number): void;
    /**
     * isStreamStarting - check if stream is starting
     */
    isStreamStarting(): boolean;
    /**
     * fsGetContents - get file contents
     * @param fileName name of file to get
     * @param fileSource source of file to get (e.g. "fs" or "bridgeserial1", if omitted defaults to "fs")
     * @param progressCallback callback to receive progress updates
     * @returns Promise<RaftFileDownloadResult>
     */
    fsGetContents(fileName: string, fileSource: string, progressCallback: RaftProgressCBType | undefined): Promise<RaftFileDownloadResult>;
    /**
     * setLegacySoktoMode - set legacy sokto mode
     * @param legacyMode true to set legacy mode
     */
    setLegacySoktoMode(legacyMode: boolean): void;
    /**
     * createCommsBridge - create a comms bridge
     * @param bridgeSource source of bridge (e.g. "Serial1")
     * @param bridgeName name of bridge
     * @param idleCloseSecs idle close time seconds
     * @returns Promise<RaftBridgeSetupResp>
     */
    createCommsBridge(bridgeSource: string, bridgeName: string, idleCloseSecs?: number): Promise<RaftBridgeSetupResp>;
    /**
     * ParkMiller random number generator
     * @param seed
     * @returns number
     */
    private parkmiller_next;
    /**
     * checkConnPerformance - check connection performance
     * @returns Promise<number | undefined> - connection performance
     */
    checkConnPerformance(): Promise<number | undefined>;
    /**
     * onConnEvent - handle connection event
     * @param eventEnum connection event enumeration
     * @param data data associated with event
     * @returns void
     */
    onConnEvent(eventEnum: RaftConnEvent, data?: object | string | null | undefined): void;
    /**
     * Retry connection
     */
    private _retryConnection;
    /**
     * Connect to channel
     * @returns Promise<boolean> - true if connected
     */
    private _connectToChannel;
    /**
     * onUpdateEvent - handle update event
     * @param eventEnum
     * @param data
     */
    _onUpdateEvent(eventEnum: RaftUpdateEvent, data?: object | string | null | undefined): void;
    /**
     * otaUpdateCheck - check for OTA update
     * @returns Promise<RaftUpdateEvent> - update event
     * */
    otaUpdateCheck(): Promise<RaftUpdateEvent>;
    /**
     * otaUpdateStart - start OTA update
     * @returns Promise<RaftUpdateEvent> - update event
     * */
    otaUpdateStart(): Promise<RaftUpdateEvent>;
    /**
     * otaUpdateCancel - cancel OTA update
     * @returns Promise<void>
     * */
    otaUpdateCancel(): Promise<void>;
    /**
     * setupUpdateManager - setup the update manager
     * @param appVersion - app version
     * @param appUpdateURL - app update URL
     * @param firmwareBaseURL - firmware base URL
     * @param fileDownloader - file downloader
     * @returns void
     * */
    setupUpdateManager(appVersion: string, appUpdateURL: string, firmwareBaseURL: string, fileDownloader: RaftFileDownloadFn): void;
}
