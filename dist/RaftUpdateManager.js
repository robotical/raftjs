"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftUpdateManager
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const RaftLog_1 = tslib_1.__importDefault(require("./RaftLog"));
const RaftTypes_1 = require("./RaftTypes");
const RaftUpdateEvents_1 = require("./RaftUpdateEvents");
const RaftUtils_1 = tslib_1.__importDefault(require("./RaftUtils"));
class RICUpdateManager {
    constructor(_systemType, _msgHandler, _raftFileHandler, _raftSystemUtils, _eventListener, _firmwareTypeStrForMainFw, _currentAppVersion, _fileDownloader, _firmwareUpdateURL, _firmwareBaseURL, _raftChannel) {
        this._systemType = _systemType;
        this._msgHandler = _msgHandler;
        this._raftFileHandler = _raftFileHandler;
        this._raftSystemUtils = _raftSystemUtils;
        this._eventListener = _eventListener;
        this._firmwareTypeStrForMainFw = _firmwareTypeStrForMainFw;
        this._currentAppVersion = _currentAppVersion;
        this._fileDownloader = _fileDownloader;
        this._firmwareUpdateURL = _firmwareUpdateURL;
        this._firmwareBaseURL = _firmwareBaseURL;
        this._raftChannel = _raftChannel;
        // Version info
        this._latestVersionInfo = null;
        this._updateESPRequired = false;
        this._updateElemsRequired = false;
        // FW update
        this.FW_UPDATE_CHECKS_BEFORE_ASSUME_FAILED = 10;
        this.ELEM_FW_CHECK_LOOPS = 36;
        // Progress levels
        this._progressAfterDownload = 0.1;
        this._progressDuringUpload = 0.8;
        this._progressDuringRestart = 0.015;
        // Raft info
        this._idToConnectTo = null;
        this._nameToConnectTo = null;
        // TODO - decide what to do with RICHwRevNo
        this._ricHwRevNo = null;
        // TESTS - set to true for testing OTA updates ONLY
        this.TEST_TRUNCATE_ESP_FILE = false;
        this.TEST_PRETEND_ELEM_UPDATE_REQD = false;
        this.TEST_PRETEND_INITIAL_VERSIONS_DIFFER = false; // this is public so it can be set from the front-end to force an update
        this.TEST_PRETEND_FINAL_VERSIONS_MATCH = false;
        this.TEST_SKIP_FW_UPDATE = false;
    }
    async checkForUpdate(systemInfo) {
        var _a;
        if (systemInfo === null) {
            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_NOT_AVAILABLE;
        }
        this._latestVersionInfo = null;
        try {
            // handle url modifications
            let updateURL = this._firmwareUpdateURL;
            const raftSystemInfo = this._raftSystemUtils.getCachedSystemInfo();
            // TODO - decide what to do with ricHWRevNo - several times below
            if (!raftSystemInfo || !raftSystemInfo.RicHwRevNo) {
                RaftLog_1.default.debug("checkForUpdate failed to get Raft info, either no channel or no system info");
                RaftLog_1.default.debug("raftSystemInfo:" + JSON.stringify(raftSystemInfo));
                RaftLog_1.default.debug("ricHwRevNo:" + raftSystemInfo.RicHwRevNo);
                return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED;
            }
            updateURL = updateURL.replace("{HWRevNo}", raftSystemInfo.RicHwRevNo.toString());
            // debug
            RaftLog_1.default.debug(`Update URL: ${updateURL}`);
            const response = await fetch(updateURL, { method: 'GET' });
            if (!response.ok) {
                RaftLog_1.default.debug(`HTTP error! status: ${response.status}`);
                return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_CANT_REACH_SERVER;
            }
            this._latestVersionInfo = await response.json();
        }
        catch (error) {
            RaftLog_1.default.debug("checkForUpdate failed to get latest from internet");
        }
        if (this._latestVersionInfo === null) {
            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_CANT_REACH_SERVER;
        }
        // Check the version and incomplete previous hw-elem update if needed
        try {
            const updateRequired = await this._isUpdateRequired(this._latestVersionInfo, systemInfo);
            RaftLog_1.default.debug(`checkForUpdate systemVersion ${systemInfo === null || systemInfo === void 0 ? void 0 : systemInfo.SystemVersion} available online ${(_a = this._latestVersionInfo) === null || _a === void 0 ? void 0 : _a.firmwareVersion} updateRequired ${updateRequired}`);
            if (updateRequired) {
                if (RaftUtils_1.default.isVersionGreater(this._latestVersionInfo.minimumUpdaterVersion.ota, this._currentAppVersion)) {
                    RaftLog_1.default.debug(`App version ${this._currentAppVersion} but version ${this._latestVersionInfo.minimumUpdaterVersion.ota} required`);
                    return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_APP_UPDATE_REQUIRED;
                }
                else {
                    return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_IS_AVAILABLE;
                }
            }
            else {
                return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_NOT_AVAILABLE;
            }
        }
        catch (error) {
            RaftLog_1.default.debug("Failed to get latest version from internet");
        }
        return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_CANT_REACH_SERVER;
    }
    async _isUpdateRequired(latestVersion, systemInfo) {
        this._updateESPRequired = false;
        this._updateElemsRequired = false;
        // Perform the version check
        this._updateESPRequired = RaftUtils_1.default.isVersionGreater(latestVersion.firmwareVersion, systemInfo.SystemVersion);
        // Test ONLY pretend an update is needed
        if (this.TEST_PRETEND_INITIAL_VERSIONS_DIFFER) {
            this._updateESPRequired = true;
        }
        // TODO: check if elem updates are required using elemsUpdatesRequired()
        // Check if a previous hw-elem update didn't complete - but no point if we would update anyway
        if (!this._updateESPRequired) {
            try {
                const elUpdRslt = await this._msgHandler.sendRICRESTURL("hwfwupd");
                // Check result
                this._updateElemsRequired =
                    elUpdRslt.rslt === "ok" && elUpdRslt.st.i === 1;
                // Debug
                if (this._updateElemsRequired) {
                    RaftLog_1.default.debug("isUpdateRequired - prev incomplete");
                }
                else {
                    RaftLog_1.default.debug("isUpdateRequired - prev complete");
                }
                // Test ONLY pretend an element update is needed
                if (this.TEST_PRETEND_ELEM_UPDATE_REQD) {
                    this._updateElemsRequired = true;
                }
            }
            catch (error) {
                RaftLog_1.default.debug("isUpdateRequired failed to get hw-elem firmware update status");
            }
        }
        else {
            this._updateElemsRequired = true;
        }
        return this._updateESPRequired || this._updateElemsRequired;
    }
    // Mark: Firmware update ------------------------------------------------------------------------------------------------
    elemUpdateRequired(expectedVersion, actualVersion, dtid, addr, elemType) {
        if (elemType != "SmartServo" && elemType != "RSAddOn")
            return false;
        const outdated = RaftUtils_1.default.isVersionGreater(expectedVersion, actualVersion);
        if (!outdated)
            return false;
        // if stm32, we only want to update the base elems
        const stm32_dtid_mask = 0xFFFFFF00;
        const stm32_dtid_id = 0x00000100;
        const stm32_base_elems = [0x10, 0x13, 0x16];
        if ((dtid & stm32_dtid_mask) == stm32_dtid_id) {
            return stm32_base_elems.includes(addr);
        }
        return true;
    }
    getExpectedVersion(firmwareVersions, dtid) {
        if (Object.prototype.hasOwnProperty.call(firmwareVersions["dtid"], dtid)) {
            return firmwareVersions["dtid"][dtid]["version"];
        }
        return null;
    }
    async elemUpdatesRequired() {
        const elemsToUpdate = [];
        const firmwareVersionsUrl = `${this._firmwareBaseURL}/firmware/firmwareVersions.json`;
        // get elem firmware expected versions
        const firmwareVersionResponse = await fetch(firmwareVersionsUrl);
        if (!firmwareVersionResponse.ok)
            return null;
        const firmwareVersionsJson = await firmwareVersionResponse.json();
        RaftLog_1.default.debug(`firmwareVersions response ${JSON.stringify(firmwareVersionsJson)}`);
        // get connected elements
        const hwstatus = await this._msgHandler.sendRICRESTURL("hwstatus");
        RaftLog_1.default.debug(`hwstatus response: ${JSON.stringify(hwstatus)}`);
        const hwElems = hwstatus["hw"];
        // TODO: check if hwstatus is reporting versions as "0.0.0", if so pause and retry as robot is probably still starting up
        for (const elem in hwElems) {
            // TODO: use RaftHWElem type
            const dtid = parseInt(hwElems[elem]["whoAmITypeCode"], 16);
            const expectedVersion = this.getExpectedVersion(firmwareVersionsJson, dtid);
            const actualVersion = hwElems[elem]["versionStr"];
            const addr = parseInt(hwElems[elem]["addr"], 16);
            const elemType = hwElems[elem]["type"];
            const elemName = hwElems[elem]["name"];
            RaftLog_1.default.debug(`hwElem ${elemName} dtid ${dtid} addr ${addr} type ${elemType} expectedVersion ${expectedVersion} actual version ${actualVersion}`);
            if (expectedVersion) {
                hwElems[elem]["expectedVersion"] = expectedVersion;
                if (this.elemUpdateRequired(expectedVersion, actualVersion, dtid, addr, elemType))
                    elemsToUpdate.push(hwElems[elem]);
            }
        }
        return elemsToUpdate;
    }
    async firmwareUpdate() {
        var _a;
        // Check valid
        if (this._latestVersionInfo === null)
            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_NOT_CONFIGURED;
        // save Raft info for later restarts
        const raftSystemInfo = this._raftSystemUtils.getCachedSystemInfo();
        if (this._raftChannel && raftSystemInfo !== null) {
            const deviceInfo = this._raftChannel.getConnectedLocator();
            this._idToConnectTo = deviceInfo.id;
            // TODO - decide what to do with this - used to say "Marty"
            this._nameToConnectTo = deviceInfo.name || "Raft";
            //Decide what to do with RICHwRevNo - should use HwRev if it exists
            // Convert raftSystemInfo.RicHwRevNo to a number
            const hwRev = raftSystemInfo.RicHwRevNo;
            this._ricHwRevNo = hwRev === undefined ? 0 : (typeof hwRev === "string" ? parseInt(hwRev) : hwRev);
            RaftLog_1.default.debug("iDToConnectTo " + this._idToConnectTo);
            RaftLog_1.default.debug("nameToConnectTo " + this._nameToConnectTo);
            RaftLog_1.default.debug("HW Rev " + this._ricHwRevNo.toString());
        }
        else {
            RaftLog_1.default.debug("firmwareUpdate failed to get Raft info, either no channel or no system info");
            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED;
        }
        // Update started
        this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_STARTED);
        this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_PROGRESS, {
            stage: "Downloading firmware",
            progress: 0,
            updatingFilesystem: false,
        });
        // parse version file to extract only "ota" files
        const firmwareList = [];
        let mainFwInfo = null;
        this._latestVersionInfo.files.forEach((fileInfo) => {
            if (fileInfo.updaters.indexOf("ota") != -1) {
                fileInfo.downloadUrl = fileInfo.firmware || fileInfo.downloadUrl;
                if (fileInfo.elemType === this._firmwareTypeStrForMainFw) {
                    mainFwInfo = fileInfo;
                }
                else {
                    firmwareList.push(fileInfo);
                }
                RaftLog_1.default.debug(`fwUpdate selected file ${fileInfo.destname} for download`);
            }
        });
        // Add the main firware if it is required
        if (this._updateESPRequired && mainFwInfo != null) {
            firmwareList.unshift(mainFwInfo); // add to front of array so it's downloaded first
        }
        // Binary data downloaded from the internet
        const firmwareData = new Array();
        // Iterate through the firmware entities
        const numFw = firmwareList.length;
        try {
            for (let fwIdx = 0; fwIdx < firmwareList.length; fwIdx++) {
                // Download the firmware
                RaftLog_1.default.debug(`fwUpdate downloading file URI ${firmwareList[fwIdx].downloadUrl}`);
                const downloadResult = await this._fileDownloader(firmwareList[fwIdx].downloadUrl, (received, total) => {
                    const currentProgress = ((fwIdx + received / total) / numFw) *
                        this._progressAfterDownload;
                    this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_PROGRESS, {
                        stage: "Downloading firmware",
                        progress: currentProgress,
                        updatingFilesystem: false,
                    });
                });
                if (downloadResult.downloadedOk && downloadResult.fileData != null) {
                    firmwareData.push(downloadResult.fileData);
                }
                else {
                    this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED);
                    throw Error("file download res null");
                }
            }
        }
        catch (error) {
            RaftLog_1.default.debug(`fwUpdate error ${error}`);
            this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED);
            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED;
        }
        // Test ONLY truncate the main firmware
        if (this._updateESPRequired &&
            mainFwInfo != null &&
            this.TEST_TRUNCATE_ESP_FILE) {
            firmwareData[0] = new Uint8Array(500);
        }
        // Calculate total length of data
        let totalBytes = 0;
        for (const fileData of firmwareData) {
            totalBytes += fileData.length;
        }
        // Debug
        RaftLog_1.default.debug(`fwUpdate got ok ${firmwareData.length} files total ${totalBytes} bytes`);
        // Start uploading
        this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_PROGRESS, {
            stage: "Starting firmware upload",
            progress: this._progressAfterDownload,
            updatingFilesystem: false,
        });
        // Upload each file
        let updateStage = "Uploading new firmware\nThis may take a while, please be patient";
        let updatingFilesystem = false;
        try {
            let sentBytes = 0;
            for (let fwIdx = 0; fwIdx < firmwareData.length; fwIdx++) {
                RaftLog_1.default.debug(`fwUpdate uploading file name ${firmwareList[fwIdx].destname} len ${firmwareData[fwIdx].length}`);
                let updatingItemType = RaftTypes_1.RaftFileSendType.NORMAL_FILE;
                if (firmwareList[fwIdx].elemType === this._firmwareTypeStrForMainFw) {
                    updatingItemType = RaftTypes_1.RaftFileSendType.FIRMWARE_UPDATE;
                }
                let percComplete = (sentBytes / totalBytes) * this._progressDuringUpload +
                    this._progressAfterDownload;
                if (!updatingFilesystem &&
                    updatingItemType == RaftTypes_1.RaftFileSendType.NORMAL_FILE) {
                    // start of filesystem updates
                    updateStage =
                        "Updating system files\nThis may take a while, please be patient\nUpdate cannot be cancelled during this stage\n";
                    updatingFilesystem = true;
                    // emit event so app can deactivate cancel button
                    this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_PROGRESS, {
                        stage: updateStage,
                        progress: percComplete,
                        updatingFilesystem: updatingFilesystem,
                    });
                    // TODO - Decide how to handle this
                    if (this._ricHwRevNo == 1) {
                        // the spiffs filesystem used on rev 1 doesn't delete files properly and has issues being more than 75% full
                        // it must be formatted to prevent issues after multiple OTA updates
                        // Reformat filesystem. This will take a few seconds so set a long timeout for the response
                        RaftLog_1.default.debug(`Beginning file system update. Reformatting FS.`);
                        await this._msgHandler.sendRICRESTURL("reformatfs", undefined, 15000);
                        // trigger and wait for reboot
                        RaftLog_1.default.debug(`Restarting RIC`);
                        try {
                            await this._msgHandler.sendRICRESTURL("reset");
                        }
                        catch (error) {
                            RaftLog_1.default.debug(`fwUpdate reset failed ${error}`);
                        }
                        if (!(await this.waitForRestart(percComplete))) {
                            this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED);
                            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED;
                        }
                    }
                }
                if (updatingItemType == RaftTypes_1.RaftFileSendType.FIRMWARE_UPDATE &&
                    this.TEST_SKIP_FW_UPDATE) {
                    RaftLog_1.default.debug("fwUpdate: Skipping FW update");
                }
                else {
                    await this.fileSend(firmwareList[fwIdx].destname, updatingItemType, firmwareData[fwIdx], (_, __, progress) => {
                        let percComplete = ((sentBytes + progress * firmwareData[fwIdx].length) /
                            totalBytes) *
                            this._progressDuringUpload +
                            this._progressAfterDownload;
                        if (updatingItemType == RaftTypes_1.RaftFileSendType.NORMAL_FILE)
                            percComplete += this._progressDuringRestart * 2;
                        if (percComplete > 1.0)
                            percComplete = 1.0;
                        RaftLog_1.default.debug(`fwUpdate progress ${progress.toFixed(2)} sent ${sentBytes} len ${firmwareData[fwIdx].length} total ${totalBytes} propComplete ${percComplete.toFixed(2)}`);
                        this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_PROGRESS, {
                            stage: updateStage,
                            progress: percComplete,
                            updatingFilesystem: updatingFilesystem,
                        });
                    });
                }
                sentBytes += firmwareData[fwIdx].length;
                if (updatingItemType == RaftTypes_1.RaftFileSendType.FIRMWARE_UPDATE) {
                    percComplete =
                        (sentBytes / totalBytes) * this._progressDuringUpload +
                            this._progressAfterDownload;
                    // if the element was firmware, Raft app will now restart automatically
                    if (!(await this.waitForRestart(percComplete, (_a = this._latestVersionInfo) === null || _a === void 0 ? void 0 : _a.firmwareVersion))) {
                        this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED);
                        return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED;
                    }
                }
            }
        }
        catch (error) {
            RaftLog_1.default.debug(`fwUpdate error ${error}`);
            this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED);
            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_FAILED;
        }
        // TODO: check this is working
        const allElemsUpdatedOk = await this.updateElems();
        /*
        // Issue requests for hw-elem firmware updates
        let elemFwIdx = 0;
        let allElemsUpdatedOk = true;
        for (const elemFw of firmwareList) {
          // Update progress
          const percComplete =
            this._progressAfterUpload +
            ((1 - this._progressAfterUpload) * elemFwIdx) / firmwareList.length;
          this._eventListener(RaftUpdateEvent.UPDATE_PROGRESS, {
            stage: "Updating elements",
            progress: percComplete,
            updatingFilesystem: true,
          });
          elemFwIdx++;
    
          // Check element is not main
          if (elemFw.elemType === this._firmwareTypeStrForMainFw) continue;
    
          // Non-firmware elemTypes
          if (this._nonFirmwareElemTypes.includes(elemFw.elemType)) continue;
    
          await this.updateElem(elemFw);
        }
        */
        // Done update
        this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_PROGRESS, {
            stage: "Finished",
            progress: 1,
            updatingFilesystem: false,
        });
        let updateResult = RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_SUCCESS_ALL;
        if (allElemsUpdatedOk) {
            this._eventListener(updateResult, this._raftSystemUtils.getCachedSystemInfo());
        }
        else {
            updateResult = RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_SUCCESS_MAIN_ONLY;
            this._eventListener(updateResult, this._raftSystemUtils.getCachedSystemInfo());
        }
        return updateResult;
    }
    async updateElems(elemsToUpdate = null) {
        let allElemsUpdatedOk = true;
        if (elemsToUpdate === null)
            elemsToUpdate = await this.elemUpdatesRequired();
        if (elemsToUpdate === null)
            return false;
        let progress = this._progressAfterDownload +
            this._progressDuringUpload +
            2 * this._progressDuringRestart;
        const progressPerElem = (1 - progress) / elemsToUpdate.length;
        const updatedDtids = [];
        for (const elem in elemsToUpdate) {
            const dtid = parseInt(elemsToUpdate[elem]["whoAmITypeCode"], 16);
            const expectedVersion = elemsToUpdate[elem]["expectedVersion"];
            const actualVersion = elemsToUpdate[elem]["versionStr"];
            const elemType = elemsToUpdate[elem]["type"];
            const elemName = elemsToUpdate[elem]["name"];
            RaftLog_1.default.debug(`hwElem ${elemsToUpdate[elem]["name"]} dtid ${dtid} type ${elemType} expectedVersion ${expectedVersion} actual version ${actualVersion}`);
            if (expectedVersion) {
                // only need to send each firmware file once
                const sendFile = updatedDtids.includes(dtid) ? false : true;
                if (!await this.updateHWElem(elemName, dtid, elemType, expectedVersion, sendFile))
                    allElemsUpdatedOk = false;
                updatedDtids.push(dtid);
                progress += progressPerElem;
                this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_PROGRESS, {
                    stage: "Updating elements",
                    progress: progress,
                    updatingFilesystem: true,
                });
            }
        }
        return allElemsUpdatedOk;
    }
    async updateHWElem(elemName, dtid, elemType, expectedVersion, sendFile) {
        const dtidStr = dtid.toString(16).padStart(8, "0");
        const destFwFilename = `fw${dtidStr}.rfw`;
        if (sendFile) {
            const firmwareUrl = `${this._firmwareBaseURL}/firmware/${dtidStr}/fw${dtidStr}-${expectedVersion}.rfw`;
            const firmware = await this._fileDownloader(firmwareUrl, (received, total) => { RaftLog_1.default.debug(`download received ${received} of total ${total}`); });
            if (!firmware.downloadedOk || !firmware.fileData)
                return false;
            if (!await this.fileSend(destFwFilename, RaftTypes_1.RaftFileSendType.NORMAL_FILE, firmware.fileData, (sent, total, progress) => { console.log(`sent ${sent} total ${total} progress ${progress}`); }))
                return false;
        }
        // double check file on Raft has the correct version
        const fwResp = await this._msgHandler.sendRICRESTURL(`hwfwupd//${destFwFilename}`);
        if (fwResp.st.v != expectedVersion)
            return false;
        const fwInfo = {
            elemType: elemType,
            destname: destFwFilename,
            version: "",
            md5: "",
            releaseNotes: "",
            comments: "",
            updaters: [],
            downloadUrl: ""
        };
        return await this.updateElem(fwInfo, elemName);
    }
    async updateElem(elemFw, elemNameOrAll = "all") {
        // Start hw-elem update
        const updateCmd = `hwfwupd/${elemFw.elemType}/${elemFw.destname}/${elemNameOrAll}`;
        try {
            await this._msgHandler.sendRICRESTURL(updateCmd);
        }
        catch (error) {
            RaftLog_1.default.debug(`fwUpdate failed to start hw-elem firmware update cmd ${updateCmd}`);
            return false;
        }
        let allElemsUpdatedOk = false;
        // Check the status
        for (let updateCheckLoop = 0; updateCheckLoop < this.ELEM_FW_CHECK_LOOPS; updateCheckLoop++) {
            try {
                // Wait for process to start on ESP32
                await new Promise((resolve) => setTimeout(resolve, 5000));
                // Get result (or status)
                const elUpdRslt = await this._msgHandler.sendRICRESTURL("hwfwupd");
                // Check result
                if (elUpdRslt.rslt === "ok" &&
                    (elUpdRslt.st.s === "idle" || elUpdRslt.st.s === "done")) {
                    RaftLog_1.default.debug(`fwUpdate hw-elem firmware updated ok - status ${elUpdRslt.st.s} rsltmsg ${elUpdRslt.st.m}`);
                    // Check if any update outstanding (incomplete === 0)
                    allElemsUpdatedOk = elUpdRslt.st.i === 0;
                    break;
                }
            }
            catch (error) {
                RaftLog_1.default.debug(`failed to get hw-elem firmware update status`);
            }
        }
        return allElemsUpdatedOk;
    }
    async manualReconnect() {
        var _a;
        return (_a = this._raftChannel) === null || _a === void 0 ? void 0 : _a.connect({
            name: this._nameToConnectTo,
            localName: this._nameToConnectTo,
            id: this._idToConnectTo || "",
            rssi: 0,
        }, {});
    }
    async waitForRestart(percComplete, checkFwVersion = null) {
        RaftLog_1.default.debug(`fwUpdate: Waiting for restart. percComplete ${percComplete}, checkFwVersion: ${checkFwVersion}`);
        // sending the appropriate disconnect event to the UI so it knows that the device is disconnected
        this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_DISCONNECTED);
        // Wait for firmware update to complete, restart to occur
        // and BLE reconnection to happen
        const waitTime = 5000;
        const iterations = 3;
        for (let i = 0; i < iterations; i++) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_PROGRESS, {
                stage: "Restarting " + (this._systemType ? this._systemType.nameForDialogs : ""),
                progress: percComplete + (this._progressDuringRestart * i) / 3,
                updatingFilesystem: true,
            });
            RaftLog_1.default.debug("fwUpdate waiting for reset, seconds: " +
                i * waitTime +
                " / " +
                iterations * waitTime);
        }
        // Attempt to get status from main ESP32 update
        // The ESP32 will power cycle at this point so we need to wait a while
        let versionConfirmed = false;
        for (let fwUpdateCheckCount = 0; fwUpdateCheckCount < this.FW_UPDATE_CHECKS_BEFORE_ASSUME_FAILED; fwUpdateCheckCount++) {
            try {
                // Get version
                RaftLog_1.default.debug(`fwUpdate attempting to get Raft version attempt ${fwUpdateCheckCount}`);
                const systemInfo = await this._raftSystemUtils.getSystemInfo(true);
                RaftLog_1.default.debug(`fwUpdate version rslt "${systemInfo.rslt}" System Version ${systemInfo.SystemVersion}`);
                if (systemInfo.rslt !== "ok") {
                    let shouldContiue = true; // if this is not the last attempt, or if the manual reconnect fails, we should continue the loop
                    if (fwUpdateCheckCount === this.FW_UPDATE_CHECKS_BEFORE_ASSUME_FAILED - 1) {
                        // we have failed to get the version after the last attempt, so we need to fallback to manually reconnecting
                        const didConnect = await this.manualReconnect();
                        if (didConnect)
                            shouldContiue = false;
                    }
                    if (shouldContiue)
                        continue;
                }
                // at this point we are connected to BLE again, so we can send to the UI the appropriate events
                this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_RECONNECTED);
                if (checkFwVersion != null) {
                    // Check version
                    versionConfirmed = RaftUtils_1.default.isVersionEqual(checkFwVersion, systemInfo.SystemVersion);
                    RaftLog_1.default.debug(`fwUpdate got version rslt ${versionConfirmed}`);
                }
                else {
                    versionConfirmed = true;
                }
                // Test fiddle to say it worked!
                if (this.TEST_PRETEND_FINAL_VERSIONS_MATCH) {
                    versionConfirmed = true;
                }
                break;
            }
            catch (error) {
                RaftLog_1.default.debug(`fwUpdate failed to get version attempt', ${fwUpdateCheckCount} error ${error}`);
            }
        }
        return versionConfirmed;
    }
    async firmwareUpdateCancel() {
        this._eventListener(RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_CANCELLING);
        await this.fileSendCancel();
    }
    // Mark: File Transfer ------------------------------------------------------------------------------------
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
    async fileSend(fileName, fileType, fileContents, progressCallback) {
        // Get the destination
        let fileDest = this._systemType ? this._systemType.normalFileDestName : "fs";
        if (fileType === RaftTypes_1.RaftFileSendType.FIRMWARE_UPDATE) {
            fileDest = this._systemType ? this._systemType.firmwareDestName : "fw";
        }
        return await this._raftFileHandler.fileSend(fileName, fileType, fileDest, fileContents, progressCallback);
    }
    fileSendCancel() {
        return this._raftFileHandler.fileSendCancel();
    }
}
exports.default = RICUpdateManager;
//# sourceMappingURL=RaftUpdateManager.js.map