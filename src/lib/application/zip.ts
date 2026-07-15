// ============================================================================
// application/zip — dependency-free ZIP writer (store / no compression)
// ----------------------------------------------------------------------------
// Builds a valid .zip entirely in memory with zero dependencies, so the client
// can bundle a dry-run application package for download. Uses the "stored"
// method (no compression) which every unzip tool supports. Pure — no DOM, no
// network; the browser Blob/anchor download lives in the component.
// ============================================================================

export interface ZipEntry {
  name: string;
  data: string | Uint8Array;
}

const enc = new TextEncoder();

// DOS date/time (used in ZIP headers). The DOS epoch is 1980; a zero value
// renders as 1979/1980 in file managers, so we always encode a real date.
function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f);
  const date = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | (d.getDate() & 0x1f);
  return { time: time & 0xffff, date: date & 0xffff };
}

let CRC_TABLE: number[] | null = null;
function crcTable(): number[] {
  if (CRC_TABLE) return CRC_TABLE;
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}

export function crc32(buf: Uint8Array): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const push16 = (arr: number[], n: number) => arr.push(n & 0xff, (n >>> 8) & 0xff);
const push32 = (arr: number[], n: number) =>
  arr.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);

/** Encode entries into a single .zip byte array (stored/uncompressed). The
 *  archive modification time defaults to now, so entries don't show as 1979. */
export function createZip(entries: ZipEntry[], modifiedAt: Date = new Date()): Uint8Array {
  const local: number[] = [];
  const central: number[] = [];
  const { time: dosTime, date: dosDate } = dosDateTime(modifiedAt);

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const data = typeof entry.data === "string" ? enc.encode(entry.data) : entry.data;
    const crc = crc32(data);
    const localOffset = local.length;

    // ── local file header ──
    push32(local, 0x04034b50);
    push16(local, 20); // version needed
    push16(local, 0); // flags
    push16(local, 0); // method: 0 = stored
    push16(local, dosTime); // mod time
    push16(local, dosDate); // mod date
    push32(local, crc);
    push32(local, data.length); // compressed size (== uncompressed for stored)
    push32(local, data.length); // uncompressed size
    push16(local, nameBytes.length);
    push16(local, 0); // extra length
    for (let i = 0; i < nameBytes.length; i++) local.push(nameBytes[i]);
    for (let i = 0; i < data.length; i++) local.push(data[i]);

    // ── central directory record ──
    push32(central, 0x02014b50);
    push16(central, 20); // version made by
    push16(central, 20); // version needed
    push16(central, 0); // flags
    push16(central, 0); // method
    push16(central, dosTime); // mod time
    push16(central, dosDate); // mod date
    push32(central, crc);
    push32(central, data.length);
    push32(central, data.length);
    push16(central, nameBytes.length);
    push16(central, 0); // extra
    push16(central, 0); // comment
    push16(central, 0); // disk number
    push16(central, 0); // internal attrs
    push32(central, 0); // external attrs
    push32(central, localOffset);
    for (let i = 0; i < nameBytes.length; i++) central.push(nameBytes[i]);
  }

  const centralOffset = local.length;
  const eocd: number[] = [];
  push32(eocd, 0x06054b50);
  push16(eocd, 0); // disk number
  push16(eocd, 0); // disk with central dir
  push16(eocd, entries.length); // entries on this disk
  push16(eocd, entries.length); // total entries
  push32(eocd, central.length); // central dir size
  push32(eocd, centralOffset); // central dir offset
  push16(eocd, 0); // comment length

  const out = new Uint8Array(local.length + central.length + eocd.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(eocd, local.length + central.length);
  return out;
}
