/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RICJS
// Communications Library
//
// Rob Dobson & Chris Greening 2020-2022
// (C) 2020-2022
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import RaftLog from "../../../../src/RaftLog";
import RaftMsgHandler from "../../../../src/RaftMsgHandler";
import { RaftOKFail, RaftReportMsg } from "../../../../src/RaftTypes";
import { RICConfiguredAddOns } from "./RICAddOn";
import RICAddOnManager from "./RICAddOnManager";
import { RICHWElem, RICHWElemList, RICHWElemList_Str } from "./RICHWElem";
import { RICCalibInfo } from "./RICTypes";

export default class RICSystemUtils {

  // Message handler
  private _msgHandler: RaftMsgHandler;

  // Add-on manager
  private _addOnManager: RICAddOnManager;

  // HWElems (connected to RIC) - excluding AddOns
  private _hwElemsExcludingAddOns: Array<RICHWElem> = new Array<RICHWElem>();
  private _connectedAddOns: Array<RICHWElem> = new Array<RICHWElem>();

  // Calibration info
  private _calibInfo: RICCalibInfo | null = null;

  /**
   * constructor
   * @param raftMsgHandler
   * @param addOnManager
   */
  constructor(msgHandler: RaftMsgHandler, addOnManager: RICAddOnManager) {
    this._msgHandler = msgHandler;
    this._addOnManager = addOnManager;
  }

  /**
   * invalidate
   */
  invalidate() {
    // Invalidate system info
    this._hwElemsExcludingAddOns = new Array<RICHWElem>();
    this._connectedAddOns = new Array<RICHWElem>();
    this._addOnManager.clear();
    this._calibInfo = null;
    RaftLog.debug("RICSystem information invalidated");
  }

  /**
   *  getSystemInfo - get system info
   * @returns Promise<RICSystemInfo>
   *
   */
  async retrieveInfo(): Promise<boolean> {
    // Get HWElems (connected to RIC)
    try {
      await this.getHWElemList();
    } catch (error) {
      RaftLog.warn("retrieveInfo - failed to get HWElems " + error);
      return false;
    }

    // Get calibration info
    try {
      await this.getRICCalibInfo(true);
    } catch (error) {
      RaftLog.warn("retrieveInfo - failed to get calib info " + error);
      return false;
    }

    // Get HWElems (connected to RIC)
    try {
      await this.getHWElemList();
    } catch (error) {
      RaftLog.warn("retrieveInfo - failed to get HWElems " + error);
      return false;
    }
    return true;
  }

  /**
 * Get information Marty system
 *
 *  @return void
 *
 */
  async retrieveMartySystemInfo(): Promise<boolean> {

    // Retrieve system info
    try {
      const retrieveResult = await this.retrieveInfo();
      return retrieveResult;
    } catch (err) {
      RaftLog.error(`retrieveMartySystemInfo: error ${err}`);
    }
    return false;
  }

  // Mark: Calibration -----------------------------------------------------------------------------------------

  async calibrate(
    cmd: string,
    jointList: Array<string>,
    jointNames: { [key: string]: string }
  ) {
    let overallResult = true;
    if (cmd === "set") {
      // Set calibration
      for (const jnt of jointList) {
        try {
          // Set calibration on joint
          const cmdUrl = "calibrate/set/" + jnt;
          const rsl = await this._msgHandler.sendRICRESTURL<RaftOKFail>(
            cmdUrl
          );
          // saving the calibration... (For the new servo boards it is necessary
          // to send a "save" command after the calibration ones or any servo
          // parameter changes in order to save any changes made into nonvolatile storage)
          const saveCalibCmd = `elem/${jnt}/saveparams`;
          await this._msgHandler.sendRICRESTURL<RaftOKFail>(saveCalibCmd);
          if (rsl.rslt != "ok") overallResult = false;
        } catch (error) {
          console.log(`calibrate failed on joint ${jnt}`, error);
        }

        // Wait as writing to flash blocks servo access
        // as of v0.0.113 of firmware, the pause is no longer required
        //await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // ensure all joints are enabled
      for (const jnt in jointNames) {
        try {
          // enable joint
          const cmdUrl = "servo/" + jnt + "/enable/1";
          const rsl = await this._msgHandler.sendRICRESTURL<RaftOKFail>(
            cmdUrl
          );
          if (rsl.rslt != "ok") overallResult = false;
        } catch (error) {
          console.log(`enable failed on joint ${jnt}`, error);
        }
      }

      // Result
      console.log("Set calibration flag to true");
      const rslt = new RaftOKFail();
      rslt.rslt = overallResult ? "ok" : "fail";
      return rslt;
    }
    return false;
  }

  /**
   *
   * getRICCalibInfo
   * @returns Promise<RICCalibInfo>
   *
   */
  async getRICCalibInfo(forceGetFromRIC = false): Promise<RICCalibInfo> {
    if (!forceGetFromRIC && this._calibInfo) {
      return this._calibInfo;
    }
    try {
      this._calibInfo = await this._msgHandler.sendRICRESTURL<RICCalibInfo>(
        "calibrate"
      );
      RaftLog.debug("getRICCalibInfo returned " + this._calibInfo);
      this._calibInfo.validMs = Date.now();
      return this._calibInfo;
    } catch (error) {
      RaftLog.debug(`getRICCalibInfo Failed to get version ${error}`);
      return new RICCalibInfo();
    }
  }

  /**
   *
   * getHWElemList - get the list of hardware elements connected to the robot
   *               - the result (if successful) is processed as follows:
   *                       = if no filter is applied then all non-add-ons found are stored in
   *                         this._hwElemsExcludingAddOns and all addons are stored in this._connectedAddOns
   *                       = if a filter is applied and this filter is RSAddOns then this._connectedAddOns is
   *                         updated with the new list of addons
   *                       = in all cases the discovered list is returned
   *
   * @returns Promise<RICHWElemList>
   *
   */

  async getHWElemList(filterByType?: string): Promise<Array<RICHWElem>> {
    // Form a list of the requests to make
    const reqList: Array<string> = [];
    let addToNonAddOnsList = false;
    if (!filterByType) {
      reqList.push("SmartServo");
      reqList.push("RSAddOn");
      reqList.push("BusPixels");
      reqList.push("!SmartServo,RSAddOn,BusPixels"); // not SmartServo or RSAddOn or BusPixels
      this._hwElemsExcludingAddOns = new Array<RICHWElem>();
      addToNonAddOnsList = true;
    } else if (filterByType === "RSAddOn") {
      // we treat BusPixels as an RSAddOn
      // (batch 4 led eye add-ons have type BusPixels)
      reqList.push("RSAddOn");
      reqList.push("BusPixels");
      this._connectedAddOns = new Array<RICHWElem>();
    } else {
      reqList.push(filterByType);
    }

    // Make the requests
    const fullListOfElems = new Array<RICHWElem>();
    this._connectedAddOns = [];
    for (const reqType of reqList) {
      try {
        const hwElemList_Str = await this._msgHandler.sendRICRESTURL<
          RICHWElemList_Str
        >(`hwstatus/strstat?filterByType=${reqType}`);
        // if the results of hwElem indicates that we are on an older fw version
        // send the old hwstatus command and don't expand()
        // the logic behind deciding if we are on a fw version that
        // supports strstat is: given that hwElemList_Str.hw === object[]
        // if we get back string[], then we know we are on an older version
        // if hw === empty array, then we don't have any hw elems in which
        // case we can stop at that point
        const hwElems = hwElemList_Str.hw;
        let hwElemList;
        if (hwElems.length) {
          if (typeof hwElems[0] !== "object") {
            // we are on an older version
            hwElemList = await this._msgHandler.sendRICRESTURL<
              RICHWElemList
            >(`hwstatus?filterByType=${reqType}`);
          } else {
            // we are on the fw version that supports strstat
            hwElemList = RICHWElemList_Str.expand(hwElemList_Str);
          }
        }
        if (hwElemList && hwElemList.rslt && hwElemList.rslt === "ok") {
          fullListOfElems.push(...hwElemList.hw);
          if (reqType === "RSAddOn") {
            this._connectedAddOns = hwElemList.hw;
            this._addOnManager.setHWElems(this._connectedAddOns);
            // Debug
            RaftLog.debug(
              `getHWElemList: found ${hwElemList.hw.length} addons/buspixels`
            );
          } else if (reqType === "BusPixels") {
            // BusPixels are treated as an RSAddOn
            this._connectedAddOns.push(...hwElemList.hw);
            this._addOnManager.setHWElems(this._connectedAddOns);
            // Debug
            RaftLog.debug(
              `getHWElemList: found ${hwElemList.hw.length} addons/buspixels`
            
          } else if (addToNonAddOnsList) {
            this._hwElemsExcludingAddOns.push(...hwElemList.hw);
            // Debug
            RaftLog.debug(
              `getHWElemList: found ${hwElemList.hw.length} elems matching ${reqType}`
            );
          }
        }
      } catch (error) {
        RaftLog.debug(`getHWElemList failed to get ${reqType} ${error}`);
        return new Array<RICHWElem>();
      }
    }

    // Handle any callbacks
    try {
      const reports: Array<RaftReportMsg> = [];
      // add callback to subscribe to report messages
      this._msgHandler.reportMsgCallbacksSet("getHWElemCB", function (
        report: RaftReportMsg
      ) {
        reports.push(report);
        RaftLog.debug(`getHWElemCB Report callback ${JSON.stringify(report)}`);
      });

      // run any required initialisation for the addons
      const initCmds = this._addOnManager.getInitCmds();
      // send init commands to the robot
      const timeInitStart = Date.now();
      for (let i = 0; i < initCmds.length; i++) {
        this.runCommand(initCmds[i], {});
      }
      // wait a couple of seconds for any report messages to be received
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // pass report messages to add on manager for processing
      this._addOnManager.processReportMsg(reports, timeInitStart);

      // clean up callback
      this._msgHandler.reportMsgCallbacksDelete("getHWElemCB");
    } catch (error) {
      RaftLog.debug(`getHWElemList failed processing callback reports ${error}`);
      return new Array<RICHWElem>();
    }

    // return the full list of elements
    return fullListOfElems;
  }

  /**
   *
   * getAddOnConfigs - get list of add-ons configured on the robot
   * @returns Promise<RICConfiguredAddOns>
   *
   */
  async getAddOnConfigs(): Promise<RICConfiguredAddOns> {
    try {
      const addOnList = await this._msgHandler.sendRICRESTURL<
        RICConfiguredAddOns
      >("addon/list");
      RaftLog.debug("getAddOnConfigs returned " + addOnList);
      return addOnList;
    } catch (error) {
      RaftLog.debug(`getAddOnConfigs Failed to get list of add-ons ${error}`);
      return new RICConfiguredAddOns();
    }
  }

  /**
     *
     * runCommand
     * @param commandName command API string
     * @param params parameters (simple name value pairs only) to parameterize trajectory
     * @returns Promise<RaftOKFail>
     *
     */
  async runCommand(commandName: string, params: object): Promise<RaftOKFail> {
    try {
      // Format the paramList as query string
      const paramEntries = Object.entries(params);
      let paramQueryStr = "";
      for (const param of paramEntries) {
        if (paramQueryStr.length > 0) paramQueryStr += "&";
        paramQueryStr += param[0] + "=" + param[1];
      }
      // Format the url to send
      if (paramQueryStr.length > 0) commandName += "?" + paramQueryStr;
      return await this._msgHandler.sendRICRESTURL<RaftOKFail>(commandName);
    } catch (error) {
      RaftLog.debug(`RaftSystemUtils runCommand failed ${error}`);
      return new RaftOKFail();
    }
  }

  getCachedAddOnList(): Array<RICHWElem> {
    return this._connectedAddOns;
  }

  getCachedAllHWElems(): Array<RICHWElem> {
    const allHWElems = new Array<RICHWElem>();
    allHWElems.push(...this._connectedAddOns);
    allHWElems.push(...this._hwElemsExcludingAddOns);
    return allHWElems;
  }

  getCachedCalibInfo(): RICCalibInfo | null {
    return this._calibInfo;
  }
}
