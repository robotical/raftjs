/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftCustomAttrHandler
// Custom attribute handler for Raft devices
//
// Rob Dobson (C) 2024
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { DeviceTypePollRespMetadata } from "./RaftDeviceInfo";

export default class CustomAttrHandler {
    
    public handleAttr(pollRespMetadata: DeviceTypePollRespMetadata, msgBuffer: Uint8Array, msgBufIdx: number): number[][] {

        // Number of bytes in the each message
        const numMsgBytes = pollRespMetadata.b;

        // Create a vector for each attribute in the metadata
        const attrValueVecs: [][] = [];

        // Reference to each vector by attribute name
        const attrValues: { [key: string]: number[] } = {};

        // Add attributes to the vector
        for (let attrIdx = 0; attrIdx < pollRespMetadata.a.length; attrIdx++) {
            attrValueVecs.push([]);
            attrValues[pollRespMetadata.a[attrIdx].n] = attrValueVecs[attrIdx];
        }

        // Custom code for each device type
        if (pollRespMetadata.c!.n === "max30101_fifo") {
            // Hex dump msgBuffer
            // console.log(`CustomAttrHandler handleAttr ${pollRespMetadata.c!.n} msgBuffer: ${msgBuffer.toString('hex')}`); 
            const buf = msgBuffer.slice(msgBufIdx);
            if (buf.length < numMsgBytes) {
                return [];
            }

            // Generated code ...
            const N=(buf[0]+32-buf[2])%32;
            let k=3;
            let i=0;
            while (i<N) {
                attrValues['Red'].push(0); attrValues['Red'][attrValues['Red'].length-1] =(buf[k]<<16)|(buf[k+1]<<8)|buf[k+2];
                attrValues['IR'].push(0); attrValues['IR'][attrValues['IR'].length-1] =(buf[k+3]<<16)|(buf[k+4]<<8)|buf[k+5];
                k+=6;
                i++;
                ;
            }            
        }
        return attrValueVecs;
    }
}
