import { time } from "console";
import RaftLog from "../../../../src/RaftLog";
import { DeviceManager } from "../../../../src/RaftDeviceManager";

export class StateInfoGeneric {

    public constructor(private _deviceManager: DeviceManager) {
    }

    updateFromMsg(rxMsg: Uint8Array, frameTimeMs: number): Array<string> {

        // Debug 
        // RaftLog.info(`StateInfoGeneric: updateFromMsg: rxMsg: ${rxMsg} frameTimeMs: ${frameTimeMs}`);

        // Convert Uint8Array to string
        const decoder = new TextDecoder('utf-8');
        const jsonString = decoder.decode(rxMsg.slice(2));

        // Handle using device manager
        this._deviceManager.handleClientMsgJson(jsonString);
        return [];

    }
}