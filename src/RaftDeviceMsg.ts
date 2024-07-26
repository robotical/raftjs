/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftDeviceMsg
// Device message for Raft devices
//
// Rob Dobson (C) 2024
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface DeviceMsgJsonElem {
    [attrGroupName: string]: string | number | boolean; // Attribute group name and value
}

export interface DeviceMsgJsonBus {
    [devAddr: string]: DeviceMsgJsonElem;
}
  
export interface DeviceMsgJson {
    [busName: string]: DeviceMsgJsonBus;
}
