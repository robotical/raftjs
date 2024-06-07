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
import { Dictionary, RaftOKFail, RaftReportMsg } from "../../../../src/RaftTypes";
import RICAddOnBase from "./RICAddOnBase";
import { RICHWElem } from "./RICHWElem";
import { ROSSerialAddOnStatus } from "./RICROSSerial";

export type RICAddOnCreator = (
  name: string,
  addOnFamily: string,
  whoAmI: string,
  whoAmITypeCode: string
) => RICAddOnBase;

class AddOnFactoryElem {
  typeName: string;
  addOnFamily: string;
  whoAmI: string;
  factoryFn: RICAddOnCreator;
  constructor(
    typeName: string,
    addOnFamily: string,
    whoAmI: string,
    factoryFn: RICAddOnCreator
  ) {
    this.addOnFamily = addOnFamily;
    this.typeName = typeName;
    this.whoAmI = whoAmI;
    this.factoryFn = factoryFn;
  }
}

export interface RICAddOnRegistry {
  registerHWElemType(
    typeName: string,
    addOnFamily: string,
    whoAmI: string,
    factoryFn: RICAddOnCreator
  ): void;
}

/**
 * RICAddOnManager
 *
 * @description
 * Handles the creation and management of RIC Add-Ons
 *
 */
export default class RICAddOnManager implements RICAddOnRegistry {

  // Message handler, etc
  private _msgHandler: RaftMsgHandler | null = null;

  // Add-on factory map
  private _addOnFactoryMap: Dictionary<AddOnFactoryElem> = {};

  // Configured add-ons
  private _configuredAddOns: Dictionary<RICAddOnBase> = {};

  /**
   * Setup the RIC Add-On Manager
   */
  setup(msgHandler: RaftMsgHandler): void {
    this._msgHandler = msgHandler;
  }

  /**
   * 
   * @param typeName Register HWElem type
   * @param addOnFamily 
   * @param whoAmI 
   * @param factoryFn 
   */
  registerHWElemType(
    typeName: string,
    addOnFamily: string,
    whoAmI: string,
    factoryFn: RICAddOnCreator
  ): void {
    RaftLog.debug(`registerHWElemType ${whoAmI} ${typeName}`);
    const lookupStr = addOnFamily + "_" + whoAmI;
    this._addOnFactoryMap[lookupStr] = new AddOnFactoryElem(
      typeName,
      addOnFamily,
      whoAmI,
      factoryFn
    );
  }

  // Mark: Set AddOn config -----------------------------------------------------------

  /**
   *
   * setAddOnConfig - set a specified add-on's configuration
   * @param serialNo used to identify the add-on
   * @param newName name to refer to add-on by
   * @returns Promise<RaftOKFail>
   *
   */
  async setAddOnConfig(serialNo: string, newName: string): Promise<RaftOKFail> {
    try {
      if (this._msgHandler) {
        const msgRslt = await this._msgHandler.sendRICRESTURL<RaftOKFail>(
          `addon/set?SN=${serialNo}&name=${newName}`,
        );
        return msgRslt;
      }
    } catch (error) {
    }
    return new RaftOKFail();
  }

  /**
   * deleteAddOn - remove an addon from the addonlist on RIC
   * @param serialNo used to identify the add-on
   * @returns Promise<RaftOKFail>
   */
  async deleteAddOn(serialNo: string): Promise<RaftOKFail> {
    try {
      if (this._msgHandler) {
        const msgRslt = await this._msgHandler.sendRICRESTURL<RaftOKFail>(
          `addon/del?SN=${serialNo}`,
        );
        return msgRslt;
      }
    } catch (error) {
    }
    return new RaftOKFail();
  }

  // Mark: Identify AddOn -----------------------------------------------------------

  /**
   *
   * identifyAddOn - send the 'identify' command to a specified add-on
   * @param name used to identify the add-on
   * @returns Promise<RaftOKFail>
   *
   */
  async identifyAddOn(name: string): Promise<RaftOKFail> {
    try {
      if (this._msgHandler) {
        const msgRslt = await this._msgHandler.sendRICRESTURL<RaftOKFail>(
          `elem/${name}/json?cmd=raw&hexWr=F8`,
        );
        return msgRslt;
      }
    } catch (error) {
    }
    return new RaftOKFail();
  }

  /**
   * @function getStaticAddonIds
   * Get the ids of the add-ons that are static
   * (their data do not get published from ricjs, eg buspixel ledeyes)
   * @returns {Array<number>} the ids of the static add-ons
   */
  getStaticAddonIds(): Array<number> {
    // at this point we will create the buspixel addon for the batch 4 ledeye,
    // as their data is not published the same way the RSAddOn do
    // to do so, however, we need to know if the batch 4 ledeye is connected
    const staticAddonIds = [];
    for (const addOnId in this._configuredAddOns) {
      const addon = this._configuredAddOns[addOnId];
      if (addon._isStatic) {
        staticAddonIds.push(+addOnId);
      }
    }
    return staticAddonIds;
  }

  /**
   * @function getStaticAddons
   * Get the add-ons that are static
   * (their data do not get published from ricjs, eg buspixel ledeyes)
   * @returns {Array<RICAddOnBase>} the static add-ons unprocessed
   */
  getStaticAddons(): Array<RICAddOnBase> {
    const staticAddons = [];
    for (const addOnId in this._configuredAddOns) {
      const addon = this._configuredAddOns[addOnId];
      if (addon._isStatic) {
        staticAddons.push(addon);
      }
    }
    return staticAddons;
  }

  /**
   * @function getProcessedStaticAddons
   * Get the add-ons that are static
   * (their data do not get published from ricjs, eg buspixel ledeyes)
   * @returns {Array<ROSSerialAddOnStatus>} the static add-ons processed
   */
  getProcessedStaticAddons(): Array<ROSSerialAddOnStatus> {
    const ids = this.getStaticAddonIds();
    const staticAddons: ROSSerialAddOnStatus[] = [];
    ids.forEach((id) => {
      const processedAddon = this.processPublishedData(
        id,
        0,
        new Uint8Array(0)
      );
      if (processedAddon) {
        staticAddons.push(processedAddon);
      }
    });
    return staticAddons;
  }

  /**
   * @function setHWElems
   * Set the hardware elements from a list of RICHWElem
   * @param hwElems
   *
   */
  setHWElems(hwElems: Array<RICHWElem>): void {
    this._configuredAddOns = this.configureAddOns(hwElems);
  }

  clear(): void {
    this._configuredAddOns = {};
  }

  configureAddOns(hwElems: Array<RICHWElem>): Dictionary<RICAddOnBase> {
    const addOnMap: Dictionary<RICAddOnBase> = {};
    // Iterate HWElems to find addons
    for (const hwElem of hwElems) {
      RaftLog.debug(`configureAddOns whoAmITypeCode ${hwElem.whoAmI}`);

      // Lookup the add-on
      const lookupStr = hwElem.type + "_" + hwElem.whoAmI;
      if (lookupStr in this._addOnFactoryMap) {
        const addOnFactoryElem = this._addOnFactoryMap[lookupStr];
        const whoAmILen = hwElem.whoAmITypeCode.length;
        hwElem.whoAmITypeCode = hwElem.whoAmITypeCode.slice(
          whoAmILen - 2,
          whoAmILen
        );
        const addOn = addOnFactoryElem.factoryFn(
          hwElem.name,
          hwElem.type,
          hwElem.whoAmI,
          hwElem.whoAmITypeCode
        );
        if (addOn !== null) {
          addOnMap[hwElem.IDNo.toString()] = addOn;
        }
      }
    }
    return addOnMap;
  }

  getHWElemTypeStr(
    whoAmITypeCode: string | undefined,
    whoAmI: string | undefined
  ) {
    RaftLog.debug(`getting type code for ${whoAmITypeCode}`);
    if (whoAmITypeCode === undefined) {
      return `Undefined whoamiTypeCode`;
    }
    if (whoAmITypeCode in this._addOnFactoryMap) {
      return this._addOnFactoryMap[whoAmITypeCode].typeName;
    }
    return `Unknown (${whoAmI} - ${whoAmITypeCode})`;
  }

  processPublishedData(
    addOnID: number,
    statusByte: number,
    rawData: Uint8Array
  ): ROSSerialAddOnStatus | null {
    // Lookup in map
    const addOnIdStr = addOnID.toString();
    if (addOnIdStr in this._configuredAddOns) {
      const addOnHandler = this._configuredAddOns[addOnIdStr];
      const data = addOnHandler.processPublishedData(
        addOnID,
        statusByte,
        rawData
      );
      return data;
    }
    return null;
  }
  getIDNoFromName(name: string): string | null {
    for (const key in this._configuredAddOns) {
      if (key in this._configuredAddOns) {
        if (this._configuredAddOns[key]._name == name) return key;
      }
    }
    return null;
  }

  getInitCmds(): Array<string> {
    const cmds: Array<string> = [];
    for (const key in this._configuredAddOns) {
      if (key in this._configuredAddOns) {
        const initCmd = this._configuredAddOns[key]._initCmd;
        if (initCmd) {
          cmds.push(initCmd);
        }
      }
    }
    return cmds;
  }

  processReportMsg(reportMsgs: Array<RaftReportMsg>, timeInitStart: number) {
    for (const reportID in reportMsgs) {
      const report = reportMsgs[reportID];
      //RaftLog.debug(`Report message: ${JSON.stringify(report)}`);
      if (report.timeReceived && report.timeReceived < timeInitStart) {
        continue;
      }
      if (report.elemName) {
        let hwElemIDNoStr = "";
        if (report.IDNo) {
          hwElemIDNoStr = report.IDNo.toString();
        } else if (report.elemName) {
          const maybeIdno = this.getIDNoFromName(report.elemName);
          if (maybeIdno) {
            hwElemIDNoStr = maybeIdno;
          }
        }
        if (hwElemIDNoStr.length > 0) {
          this._configuredAddOns[hwElemIDNoStr].processInit(report);
        }
      }
    }
  }
}
