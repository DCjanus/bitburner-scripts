import {NS} from "@ns";

export async function main(ns: NS): Promise<void> {
    const flags = ns.flags([
        ['num', 25],
        ['ram', 1024],
    ]);

    const limit = ns.getPurchasedServerLimit();
    const cost = ns.getPurchasedServerCost(flags.ram);

    while (ns.getPurchasedServers().length <= flags.num) {
        const bought = ns.getPurchasedServers().length;
        if (bought >= limit) {
            ns.tprint(`ERROR: You have already bought the maximum number of servers, which is ${bought}`);
            break;
        }
        if (cost > ns.getPlayer().money) {
            ns.tprint(`ERROR: You don't have enough money to buy ${flags.num} servers, which cost ${cost}`);
            break;
        }
        const host = `s${ns.getPurchasedServers().length}`;
        const newName = ns.purchaseServer(host, flags.ram);
        if (newName === '') {
            ns.tprint(`ERROR: Failed to purchase server ${host} with unknown reason`);
            break;
        }

        ns.tprint(`Bought server ${newName} with ${flags.ram}GB RAM`);
    }

}