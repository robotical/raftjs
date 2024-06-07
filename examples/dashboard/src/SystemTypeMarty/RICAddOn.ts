import { RICHWElem } from "./RICHWElem";

/**
 * RICAddOn
 * 
 * @description
 * Information about an add-on
 * 
 * @field name: string - Name of add-on
 * @field SN: string - Serial number
 * @field poll: string - polling type ("status")
 * @field pollRd: string - hex data most recently read
 * @field pollHz: number - rate of polling
 */
export type RICAddOn = {
  name: string;
  SN: string;
  poll: string;
  pollRd: number;
  pollHz: number;
};

export class RICConfiguredAddOns {
  req = '';
  rslt = 'ok';
  addons: Array<RICAddOn> = [];
}

/**
 * AddOnElemAndConfig
 * 
 * @description
 * Carrier of information about an add-on combining
 * the add-on element and the add-on configuration
 * 
 * @field addOnConfig: RICAddOn - Add-on configuration
 * @field hwElemRec: RICHWElem - Add-on element
 * @field elemIdx: number - Index of the add-on element
 */
export class AddOnElemAndConfig {
  constructor(
    addOnConfig: RICAddOn | null,
    hwElemRec: RICHWElem | null,
    elemIdx: number,
  ) {
    this.isConfigured = addOnConfig !== null;
    this.isConnected = hwElemRec !== null;
    if (addOnConfig != null) {
      this.SN = addOnConfig.SN;
      this.name = addOnConfig.name;
    } else if (hwElemRec != null) {
      this.SN = hwElemRec.SN;
      this.name = hwElemRec.name;
    }
    this.addOnConfig = addOnConfig;
    this.hwElemRec = hwElemRec;
    this.id = elemIdx.toString();
  }

  // Fields from config (stored in RIC NVS using addon REST API)
  addOnConfig: RICAddOn | null = null;
  // Fields from HWElem (from hwstatus command)
  hwElemRec: RICHWElem | null = null;
  // Fields allocated when combining records
  name = '';
  SN = '';
  id = '0';
  isConnected = false;
  isConfigured = false;
}