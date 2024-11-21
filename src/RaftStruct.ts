/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftStruct
// Part of RaftJS
//
// Rob Dobson 2024
// (C) 2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function structUnpack(format: string, data: Uint8Array): number[] {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const results: number[] = [];
    let offset = 0;
    let littleEndian = false;

    for (const char of format) {
        switch (char) {
            case "<":
                littleEndian = true;
                break;
            case ">":
                littleEndian = false;
                break;
            case "x": // Padding byte
                offset += 1;
                break;
            case "c": // Char
                results.push(view.getUint8(offset));
                offset += 1;
                break;
            case "b": // Signed 8-bit integer
                results.push(view.getInt8(offset));
                offset += 1;
                break;
            case "B": // Unsigned 8-bit integer
                results.push(view.getUint8(offset));
                offset += 1;
                break;
            case "h": // Signed 16-bit integer
                results.push(view.getInt16(offset, littleEndian));
                offset += 2;
                break;
            case "H": // Unsigned 16-bit integer (big-endian)
                results.push(view.getUint16(offset, littleEndian));
                offset += 2;
                break;
            case "i": // Signed 32-bit integer (big-endian)
                results.push(view.getInt32(offset, littleEndian));
                offset += 4;
                break;
            case "I": // Unsigned 32-bit integer (big-endian)
                results.push(view.getUint32(offset, littleEndian));
                offset += 4;
                break;
            case "l": // Signed 32-bit integer (big-endian)
                results.push(view.getInt32(offset, littleEndian));
                offset += 4;
                break;
            case "L": // Unsigned 32-bit integer (big-endian)
                results.push(view.getUint32(offset, littleEndian));
                offset += 4;
                break;
            // case "q": // Signed 64-bit integer (big-endian)
            //     results.push(view.getBigInt64(offset, littleEndian));
            //     offset += 8;
            //     break;
            // case "Q": // Unsigned 64-bit integer (big-endian)
            //     results.push(view.getBigUint64(offset, littleEndian));
            //     offset += 8;
            //     break;
            case "f": // 32-bit float (big-endian)
                results.push(view.getFloat32(offset, littleEndian));
                offset += 4;
                break;
            case "d": // 64-bit float (big-endian)
                results.push(view.getFloat64(offset, littleEndian));
                offset += 8;
                break;
            default:
                throw new Error(`Unknown format character: ${char}`);
        }
    }

    return results;
}

export function structSizeOf(format: string): number {
    let size = 0;
    for (const char of format) {
        switch (char) {
            case "<":
            case ">":
                break;
            case "x": // Padding byte
                size += 1;
                break;
            case "c": // Char
            case "b": // Signed 8-bit integer
            case "B": // Unsigned 8-bit integer
                size += 1;
                break;
            case "h": // Signed 16-bit integer
            case "H": // Unsigned 16-bit integer
                size += 2;
                break;
            case "i": // Signed 32-bit integer
            case "I": // Unsigned 32-bit integer
            case "l": // Signed 32-bit integer
            case "L": // Unsigned 32-bit integer
                size += 4;
                break;
            // case "q": // Signed 64-bit integer
            // case "Q": // Unsigned 64-bit integer
            //     size += 8;
            //     break;
            case "f": // 32-bit float
                size += 4;
                break;
            case "d": // 64-bit float
                size += 8;
                break;
            default:
                throw new Error(`Unknown format character: ${char}`);
        }
    }
    return size;
}

export function structPack(format: string, values: number[]): Uint8Array {
    const size = structSizeOf(format);
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;
    let littleEndian = false;

    for (let i = 0; i < format.length; i++) {
        const char = format[i];
        const value = values[i];
        switch (char) {
            case "<":
                littleEndian = true;
                break;
            case ">":
                littleEndian = false;
                break;
            case "x": // Padding byte
                offset += 1;
                break;
            case "c": // Char
                view.setInt8(offset, value);
                offset += 1;
                break;
            case "b": // Signed 8-bit integer
                view.setInt8(offset, value);
                offset += 1;
                break;
            case "B": // Unsigned 8-bit integer
                view.setUint8(offset, value);
                offset += 1;
                break;
            case "h": // Signed 16-bit integer
                view.setInt16(offset, value, littleEndian);
                offset += 2;
                break;
            case "H": // Unsigned 16-bit integer
                view.setUint16(offset, value, littleEndian);
                offset += 2;
                break;
            case "i": // Signed 32-bit integer
                view.setInt32(offset, value, littleEndian);
                offset += 4;
                break;
            case "I": // Unsigned 32-bit integer
                view.setUint32(offset, value, littleEndian);
                offset += 4;
                break;
            case "l": // Signed 32-bit integer
                view.setInt32(offset, value, littleEndian);
                offset += 4;
                break;
            case "L": // Unsigned 32-bit integer
                view.setUint32(offset, value, littleEndian);
                offset += 4;
                break;
            // case "q": // Signed 64-bit integer
            //     view.setBigInt64(offset, BigInt(value), littleEndian);
            //     offset += 8;
            //     break;
            // case "Q": // Unsigned 64-bit integer
            //     view.setBigUint64(offset, BigInt(value), littleEndian);
            //     offset += 8;
            //     break;
            case "f": // 32-bit float
                view.setFloat32(offset, value, littleEndian);
                offset += 4;
                break;
            case "d": // 64-bit float
                view.setFloat64(offset, value, littleEndian);
                offset += 8;
                break;
            default:
                throw new Error(`Unknown format character: ${char}`);
        }
    }

    return new Uint8Array(buffer);
}
