import {NS} from "@ns";
import {GBRamFmt, numFmt, zeroPad} from "/utils";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    const flags = ns.flags([
        ['ram', 0],
    ]);
    if (flags.ram <= 0) {
        ns.tprint('ERROR: ram must be greater than 0');
        return;
    }

    while (true) {
        const bought = await buyOnce(ns, flags.ram);
        if (bought !== '') {
            ns.tprint(`bought ${bought}`);
        }
    }
}

async function buyOnce(ns: NS, ram: number): Promise<string> {
    const cost = ns.getPurchasedServerCost(ram);
    let reported = false;
    while (cost > ns.getPlayer().money) {
        await ns.asleep(1000);
        if (!reported) {
            ns.tprint(`waiting money to ${numFmt(cost)}`);
            reported = true;
        }
    }

    ns.tprint('buying server');
    delOnce(ns, ram);
    const hosts = ns.getPurchasedServers().sort();

    for (let i = 0; ; i++) {
        const prefix = `s${zeroPad(i, 2)}-`;
        if (hosts.some(host => host.startsWith(prefix))) {
            continue;
        }
        const hostname = `${prefix}${GBRamFmt(ram)}`;
        return ns.purchaseServer(hostname, ram);
    }
}

function delOnce(ns: NS, ram: number) {
    if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
        return
    }

    const picked = ns.getPurchasedServers().map(host => ns.getServer(host)).sort((a, b) => a.maxRam - b.maxRam)[0];
    if (picked.maxRam >= ram) {
        ns.tprint(`smallest server is ${picked.hostname}(${GBRamFmt(picked.maxRam)}), which is large than ${GBRamFmt(ram)}`);
        ns.exit();
    }
    ns.killall(picked.hostname);
    if (!ns.deleteServer(picked.hostname)) {
        ns.tprint(`ERROR: failed to delete ${picked.hostname} with unknown reason`);
        ns.exit();
    }
    ns.tprint(`deleted ${picked.hostname}`);
}