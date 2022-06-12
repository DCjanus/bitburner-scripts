import {NS} from "@ns";

export async function main(ns: NS): Promise<void> {
    const flags = ns.flags([
        ['pattern', '^.*$'],
        ['num', 1],
        ['dry', false],
    ]);
    const pattern = new RegExp(flags.pattern);
    const toRemove = ns.getPurchasedServers().filter(s => pattern.test(s)).slice(0, flags.num);
    for (const server of toRemove) {
        if (flags.dry) {
            ns.tprint(`Would remove ${server}`);
        } else {
            ns.tprint(`Removing ${server}`);
            if (!ns.deleteServer(server)) {
                ns.tprint(`Failed to remove ${server} with unknown error`);
            }
        }
    }
}