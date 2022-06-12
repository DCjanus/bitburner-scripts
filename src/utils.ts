function checksumInner(input: string): number {
    let hash = 0, i, chr
    if (input.length === 0) return hash
    for (i = 0; i < input.length; i++) {
        chr = input.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash |= 0 // Convert to 32bit integer
    }
    return hash
}

export function checksum(input: string): string {
    return checksumInner(input).toString(16);
}


function checksumName(scriptName: string): string {
    return `${scriptName}.csk.txt`;
}

export function shouldUpdate(ns: NS, scriptName: string): boolean {
    const oldChecksum = ns.read(checksumName(scriptName));
    const newChecksum = checksum(ns.read(scriptName));
    const conclusion = oldChecksum !== newChecksum;
    ns.tprint(`${scriptName} ${conclusion ? 'should be updated' : 'is up to date'}`);
    return conclusion;
}

export async function dumpCheckSum(ns: NS, scriptName: string): Promise<void> {
    await ns.write(checksumName(scriptName), checksum(ns.read(scriptName)), 'w');
}