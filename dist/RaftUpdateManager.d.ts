import RaftChannel from "./RaftChannel";
import RaftFileHandler from "./RaftFileHandler";
import RaftMsgHandler from "./RaftMsgHandler";
import RaftSystemUtils from "./RaftSystemUtils";
import { RaftFWInfo, RaftFileDownloadFn, RaftFileSendType, RaftSystemInfo, RaftUpdateInfo } from "./RaftTypes";
import { RaftUpdateEvent, RaftUpdateEventFn } from "./RaftUpdateEvents";
import { RaftSystemType } from "./RaftSystemType";
export default class RICUpdateManager {
    private _systemType;
    private _msgHandler;
    private _raftFileHandler;
    private _raftSystemUtils;
    private _eventListener;
    private _firmwareTypeStrForMainFw;
    private _currentAppVersion;
    private _fileDownloader;
    private _firmwareUpdateURL;
    private _firmwareBaseURL;
    private _raftChannel;
    private _latestVersionInfo;
    private _updateESPRequired;
    private _updateElemsRequired;
    private readonly FW_UPDATE_CHECKS_BEFORE_ASSUME_FAILED;
    private readonly ELEM_FW_CHECK_LOOPS;
    private _progressAfterDownload;
    private _progressDuringUpload;
    private _progressDuringRestart;
    private _idToConnectTo;
    private _nameToConnectTo;
    private _ricHwRevNo;
    private readonly TEST_TRUNCATE_ESP_FILE;
    private readonly TEST_PRETEND_ELEM_UPDATE_REQD;
    TEST_PRETEND_INITIAL_VERSIONS_DIFFER: boolean;
    private readonly TEST_PRETEND_FINAL_VERSIONS_MATCH;
    private readonly TEST_SKIP_FW_UPDATE;
    constructor(_systemType: RaftSystemType | null, _msgHandler: RaftMsgHandler, _raftFileHandler: RaftFileHandler, _raftSystemUtils: RaftSystemUtils, _eventListener: RaftUpdateEventFn, _firmwareTypeStrForMainFw: string, _currentAppVersion: string, _fileDownloader: RaftFileDownloadFn, _firmwareUpdateURL: string, _firmwareBaseURL: string, _raftChannel: RaftChannel | null);
    checkForUpdate(systemInfo: RaftSystemInfo | null): Promise<RaftUpdateEvent>;
    _isUpdateRequired(latestVersion: RaftUpdateInfo, systemInfo: RaftSystemInfo): Promise<boolean>;
    elemUpdateRequired(expectedVersion: string, actualVersion: string, dtid: number, addr: number, elemType: string): boolean;
    getExpectedVersion(firmwareVersions: any, dtid: number): any;
    elemUpdatesRequired(): Promise<Array<any> | null>;
    firmwareUpdate(): Promise<RaftUpdateEvent>;
    updateElems(elemsToUpdate?: Array<any> | null): Promise<boolean>;
    updateHWElem(elemName: string, dtid: number, elemType: string, expectedVersion: string, sendFile: boolean): Promise<boolean>;
    updateElem(elemFw: RaftFWInfo, elemNameOrAll?: string): Promise<boolean>;
    manualReconnect(): Promise<boolean | undefined>;
    waitForRestart(percComplete: number, checkFwVersion?: string | null): Promise<boolean>;
    firmwareUpdateCancel(): Promise<void>;
    /**
     *
     * fileSend - start file transfer
     * @param fileName name of file to send
     * @param fileType normal file or firmware
     * @param fileDest destination on the system (fs or fw generally)
     * @param fileContents contenst of the file (binary object)
     * @returns Promise<boolean>
     *
     */
    fileSend(fileName: string, fileType: RaftFileSendType, fileContents: Uint8Array, progressCallback: (sent: number, total: number, progress: number) => void): Promise<boolean>;
    fileSendCancel(): Promise<void>;
}
