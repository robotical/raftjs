"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftDeviceStates
// Device states for Raft devices
//
// Rob Dobson (C) 2024
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceKey = exports.DevicesState = exports.deviceAttrGetLatestFormatted = void 0;
function deviceAttrGetLatestFormatted(attrState) {
    if (attrState.values.length === 0) {
        return 'N/A';
    }
    if (attrState.format.length === 0) {
        return attrState.values[attrState.values.length - 1].toString();
    }
    const value = attrState.values[attrState.values.length - 1];
    let format = attrState.format;
    if (format.startsWith("%")) {
        format = format.slice(1);
    }
    if (format.endsWith('f')) {
        // Floating point number formatting
        const parts = format.split('.');
        let decimalPlaces = 0;
        if (parts.length === 2) {
            decimalPlaces = parseInt(parts[1], 10);
        }
        const formattedNumber = value.toFixed(decimalPlaces);
        let fieldWidth = parseInt(parts[0], 10);
        return fieldWidth ? formattedNumber.padStart(fieldWidth, ' ') : formattedNumber;
    }
    else if (format.endsWith('x')) {
        // Hexadecimal formatting
        const totalLength = parseInt(format.slice(0, -1), 10);
        return Math.floor(value).toString(16).padStart(totalLength, format.startsWith('0') ? '0' : ' ');
    }
    else if (format.endsWith('d')) {
        // Decimal integer formatting
        const totalLength = parseInt(format.slice(0, -1), 10);
        return Math.floor(value).toString(10).padStart(totalLength, format.startsWith('0') ? '0' : ' ');
    }
    else if (format.endsWith('b')) {
        // Binary formatting
        return Math.floor(value) === 0 ? 'no' : 'yes';
    }
    return value.toString();
}
exports.deviceAttrGetLatestFormatted = deviceAttrGetLatestFormatted;
class DevicesState {
}
exports.DevicesState = DevicesState;
// Add the getDeviceKey method to generate a composite key
function getDeviceKey(busName, devAddr) {
    return `${busName}_${devAddr}`;
}
exports.getDeviceKey = getDeviceKey;
//# sourceMappingURL=RaftDeviceStates.js.map