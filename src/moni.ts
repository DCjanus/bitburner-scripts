import {NS} from "@ns";
import {numFmt, scanServers} from "/utils";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    const servers = new Set<string>();
    scanServers(ns, servers, 'home', 10);
    const [beginMoneyMade, beginExpMade] = incoming(ns, servers);
    const begin = Date.now();
    while (true) {
        await ns.asleep(30000);

        const servers = new Set<string>();
        scanServers(ns, servers, 'home', 10);
        const [moneyMade, expMade] = incoming(ns, servers);
        const costMs = Date.now() - begin;
        const moneyPerSecond = (moneyMade - beginMoneyMade) / costMs * 1000;
        const expPerSecond = (expMade - beginExpMade) / costMs * 1000;
        ns.print(`${numFmt(moneyPerSecond)} money/s, ${numFmt(expPerSecond)} exp/s`);
    }
}

function incoming(ns: NS, servers: Set<string>): [number, number] {
    let moneyMade = 0;
    let expMade = 0;

    for (const server of servers) {
        const pids = ns.ps(server).map(info => info.pid);
        for (const pid of pids) {
            const info = ns.getRunningScript(pid, server);
            moneyMade += info ? info.onlineMoneyMade : 0;
            expMade += info ? info.onlineExpGained : 0;
        }
    }

    return [moneyMade, expMade];
}
