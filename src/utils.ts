import {NS} from "@ns";

export function checksum(input: string): number {
    let hash = 0, i, chr
    if (input.length === 0) return hash
    for (i = 0; i < input.length; i++) {
        chr = input.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash |= 0 // Convert to 32bit integer
    }
    return hash
}

export function checksumText(input: string): string {
    return checksum(input).toString(16);
}

function checksumName(scriptName: string): string {
    return `${scriptName}.csk.txt`;
}

export function shouldUpdate(ns: NS, scriptName: string): boolean {
    const oldChecksum = ns.read(checksumName(scriptName));
    const newChecksum = checksumText(ns.read(scriptName));
    const conclusion = oldChecksum !== newChecksum;
    ns.tprint(`${scriptName} ${conclusion ? 'should be updated' : 'is up to date'}`);
    return conclusion;
}

export async function dumpCheckSum(ns: NS, scriptName: string): Promise<void> {
    await ns.write(checksumName(scriptName), checksumText(ns.read(scriptName)), 'w');
}

export function scanServers(ns: NS, servers: Set<string>, host: string, depth: number): void {
    if (depth <= 0) {
        return
    }
    const items = ns.scan(host);
    for (const item of items) {
        if (servers.has(item)) {
            continue;
        }
        servers.add(item);
        scanServers(ns, servers, item, depth - 1);
    }
}

export function numFmt(money: number): string {
    const units = ['', 'K', 'M', 'B'];
    let unit = 0;
    while (money >= 1000 && unit < units.length - 1) {
        money /= 1000;
        unit++;
    }
    return `${money.toFixed(3)}${units[unit]}`;
}

export function GBRamFmt(ram: number): string {
    const units = ['GB', 'TB', 'PB', 'EB'];
    let unit = 0;
    while (ram >= 1024 && unit < units.length - 1) {
        ram /= 1024;
        unit++;
    }
    return `${ram.toFixed(3)}${units[unit]}`;
}

export function zeroPad(n: number, size: number): string {
    let s = n.toString();
    while (s.length < size) {
        s = '0' + s;
    }
    return s;
}