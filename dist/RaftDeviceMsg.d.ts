export interface DeviceMsgJsonElem {
    [attrGroupName: string]: string | number | boolean;
}
export interface DeviceMsgJsonBus {
    [devAddr: string]: DeviceMsgJsonElem;
}
export interface DeviceMsgJson {
    [busName: string]: DeviceMsgJsonBus;
}
