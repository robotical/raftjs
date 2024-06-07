/**
 * RICHWElem
 * 
 * @description
 * Information about a hardware element
 * 
 * @field name: string - element name
 * @field type: string - element type
 * @field busName: string - name of bus (e.g. I2C) attached to
 * @field addr: string - address of element on the bus
 * @field addrValid: number - 1 if address is valid
 * @field IDNo: string - unique identifier of element
 * @field whoAmI: string - name of element type
 * @field whoAmITypeCode: string - number of element type
 * @field SN: string - Serial number
 * @field versionStr: string - Version
 * @field commsOk: number - 1 if communications OK, 0 if not, -1 if device is invalid
 */
export type RICHWElem = {
  name: string;
  type: string;
  busName: string;
  addr: string;
  addrValid: number;
  IDNo: string;
  whoAmI: string;
  whoAmITypeCode: string;
  SN: string;
  versionStr: string;
  commsOk: number;
};

export class RICHWElemList {
  req = '';
  rslt = 'ok';
  hw: Array<RICHWElem> = [];
}

// Minimum key length version of RICHWElem
export type RICHWElem_Min = {
  n: string;
  t: string;
  I: string;
  w: string;
  W: string;
  S: string;
  v: string;
  c: number;
};

export class RICHWElemList_Min {
  // Members
  req = '';
  rslt = 'ok';
  hw: Array<RICHWElem_Min> = [];

  // Method to convert to RICHWElemList
  static expand(hwMin: RICHWElemList_Min): RICHWElemList {
    const hwList = new RICHWElemList();
    for (const hwElem of hwMin.hw) {
      hwList.hw.push({
        name: hwElem.n,
        type: hwElem.t,
        busName: '',
        addr: '',
        addrValid: 0,
        IDNo: hwElem.I,
        whoAmI: hwElem.w,
        whoAmITypeCode: hwElem.W,
        SN: hwElem.S,
        versionStr: hwElem.v,
        commsOk: hwElem.c,
      });
    }
    return hwList;
  }
}

// Single encoded string version of RICHWElem
export type RICHWElem_Str = {
  a: string;
};

export type RICHWElemList_Name = {
  rslt: string;
  hw: Array<string>;
};

// RICHWElemList containing coded strings for each HWElem field
export class RICHWElemList_Str {
  req = '';
  rslt = 'ok';
  hw: Array<RICHWElem_Str> = [];

  // Method to convert to RICHWElemList
  static expand(hwStr: RICHWElemList_Str): RICHWElemList {
    const hwList = new RICHWElemList();
    for (const hwElem of hwStr.hw) {
      if (hwElem.a) {
        const hwElemStr = hwElem.a.split('|');
        hwList.hw.push({
          name: RICHWElemList_Str.unesc(hwElemStr[0]),
          type: RICHWElemList_Str.unesc(hwElemStr[1]),
          busName: "",
          addr: "",
          addrValid: 0,
          IDNo: RICHWElemList_Str.unesc(hwElemStr[2]),
          whoAmI: RICHWElemList_Str.unesc(hwElemStr[3]),
          whoAmITypeCode: RICHWElemList_Str.unesc(hwElemStr[4]),
          SN: RICHWElemList_Str.unesc(hwElemStr[5]),
          versionStr: RICHWElemList_Str.unesc(hwElemStr[6]),
          commsOk: Number(hwElemStr[7]),
        });
      }
    }
    return hwList;
  }

  // Method to unescape a pipe character
  static unesc(s: string): string {
    return s.replace(/\/x7c/g, '|');
  }
}
