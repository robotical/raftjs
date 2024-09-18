"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftDeviceInfo
// Device information for Raft devices
//
// Rob Dobson (C) 2024
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeAttrUnitsEncoding = exports.isAttrTypeSigned = exports.getAttrTypeBits = void 0;
const attrTypeBits = {
    "c": 8, "b": 8, "B": 8, "?": 8,
    "h": 16, "H": 16, ">h": 16, "<h": 16, ">H": 16, "<H": 16,
    "i": 32, "I": 32, ">i": 32, "<i": 32, ">I": 32, "<I": 32, "l": 32, "L": 32, ">l": 32, "<l": 32, ">L": 32, "<L": 32,
    "q": 64, "Q": 64, ">q": 64, "<q": 64, ">Q": 64, "<Q": 64,
    "f": 32, ">f": 32, "<f": 32,
    "d": 64, ">d": 64, "<d": 64,
};
function getAttrTypeBits(attrType) {
    if (attrType in attrTypeBits) {
        return attrTypeBits[attrType];
    }
    return 8;
}
exports.getAttrTypeBits = getAttrTypeBits;
function isAttrTypeSigned(attrType) {
    const attrStr = attrType.charAt(0) === ">" || attrType.charAt(0) === "<" ? attrType.slice(1).charAt(0) : attrType.charAt(0);
    return attrStr === "b" || attrStr === "h" || attrStr === "i" || attrStr === "l" || attrStr === "q";
}
exports.isAttrTypeSigned = isAttrTypeSigned;
function decodeAttrUnitsEncoding(unitsEncoding) {
    // Replace instances of HTML encoded chars like &deg; with the actual char
    return unitsEncoding.replace(/&deg;/g, "°");
}
exports.decodeAttrUnitsEncoding = decodeAttrUnitsEncoding;
//# sourceMappingURL=RaftDeviceInfo.js.map