import { fail } from "./contracts.js";
export const MAX_FLOW_BUNDLE_BYTES = 64 * 1024 * 1024;
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
// ZIP STORE avoids dependency, compression bombs and platform-specific archive tools.
export function zipStore(entries) {
  if (
    !Array.isArray(entries) ||
    entries.length > 40 ||
    new Set(entries.map((e) => e.name)).size !== entries.length
  )
    fail("INVALID_ARCHIVE", "Invalid archive entries");
  const local = [],
    central = [];
  let offset = 0,
    centralSize = 0;
  for (const { name, buffer } of entries) {
    if (
      typeof name !== "string" ||
      !/^[A-Za-z0-9_./-]{1,200}$/.test(name) ||
      name.split("/").some((s) => !s || s === "." || s === "..") ||
      !Buffer.isBuffer(buffer)
    )
      fail("INVALID_ARCHIVE", "Unsafe archive entry");
    const filename = Buffer.from(name),
      crc = crc32(buffer);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(buffer.length, 18);
    header.writeUInt32LE(buffer.length, 22);
    header.writeUInt16LE(filename.length, 26);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(0x800, 8);
    directory.writeUInt16LE(33, 14);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(buffer.length, 20);
    directory.writeUInt32LE(buffer.length, 24);
    directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE(offset, 42);
    local.push(header, filename, buffer);
    central.push(directory, filename);
    offset += header.length + filename.length + buffer.length;
    centralSize += directory.length + filename.length;
    if (offset + centralSize + 22 > MAX_FLOW_BUNDLE_BYTES)
      fail("FLOW_PACKAGE_LIMIT", "Flow reference package exceeds 64 MiB");
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}
