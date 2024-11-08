/**
 * @description
 * This file is used to create a new instance of the RaftChannelBLE class.
 * RaftChannelBLE exists in 2 files: RaftChannelBLE.native.ts and RaftChannelBLE.web.ts
 * each of these files contains the same class but with different implementations (native and web).
 * The import statement at the top of the file will import the correct implementation based on the platform 
 * (depending on the build configuration).
 */
import RaftChannelBLE from './RaftChannelBLE';

export function createBLEChannel() {
  return RaftChannelBLE;
}