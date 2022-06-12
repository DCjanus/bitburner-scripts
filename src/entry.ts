import {NS} from "@ns";
import {dumpCheckSum, scanServers, shouldUpdate} from "/utils";

const simpleHack = 'hack.js';

class Config {
    constructor(
        public ns: NS,
        public target: string,
        public should_update: boolean,
        public depth: number,
        public clean_chance: boolean,
    ) {
    }
}

export async function main(ns: NS): Promise<void> {
    const flags = ns.flags([
        ['target', 'n00dles'],
        ['force', false],
        ['depth', 10],
        ['clean_chance', false],
    ]);

    const cfg = new Config(ns, flags.target, flags.force || shouldUpdate(ns, simpleHack), flags.depth, flags.clean_chance);
    if (cfg.should_update) {
        await dumpCheckSum(ns, simpleHack);
    }

    const allServers = new Set<string>(['home']);
    scanServers(cfg.ns, allServers, 'home', cfg.depth);
    const hackServers = new Set<string>();
    for (const server of allServers) {
        if (server === 'home') {
            continue;
        }
        if (!nukeHost(ns, server)) {
            continue;
        }
        hackServers.add(server);
    }

    let total_threads = 0;
    hackServers.forEach(host => total_threads += calcThreads(ns, host, simpleHack));

    for (const host of hackServers) {
        await singleHost(cfg, host, total_threads);
    }
}


function calcThreads(ns: NS, server: string, script: string): number {
    const total = ns.getServerMaxRam(server);
    const required = ns.getScriptRam(script);
    return Math.floor(total / required);
}

let nextLevelToHack = 99999999;

async function singleHost(cfg: Config, host: string, totalThreads: number) {
    await cfg.ns.scp(simpleHack, 'home', host);
    await cfg.ns.scp('utils.js', 'home', host);

    if (cfg.should_update) {
        cfg.ns.scriptKill(simpleHack, host);
        cfg.ns.tprint(`Updating ${simpleHack} on ${host}`);
    }

    if (cfg.ns.scriptRunning(simpleHack, host)) {
        return
    }

    const maxMoney = cfg.ns.getServerMaxMoney(cfg.target);
    const minSecurity = cfg.ns.getServerMinSecurityLevel(cfg.target);
    const rawRemain = cfg.ns.getServerMaxRam(host) - cfg.ns.getServerUsedRam(host);
    const rawRequired = cfg.ns.getScriptRam(simpleHack, host);
    const threads = Math.floor(rawRemain / rawRequired);
    if (threads <= 0) {
        cfg.ns.tprint(`No enough RAM to run ${simpleHack} on ${host}, ${rawRemain}/${rawRequired}`);
        return;
    }

    cfg.ns.exec(simpleHack, host, threads,
        '--host', cfg.target,
        '--total_threads', totalThreads,
        '--max_money', maxMoney,
        '--min_security', minSecurity,
        '--clean_chance', cfg.clean_chance,
    );
    cfg.ns.tprint(`Started ${simpleHack} on ${host} with ${threads} threads`);
}

function nukeHost(ns: NS, host: string): boolean {
    openPorts(ns, host);

    const server = ns.getServer(host);
    if (ns.hasRootAccess(host)) {
        return true
    }
    if (ns.getServerRequiredHackingLevel(host) > ns.getHackingLevel()) {
        nextLevelToHack = Math.min(nextLevelToHack, ns.getServerRequiredHackingLevel(host));
        return false;
    }

    if (ns.getServerNumPortsRequired(host) > server.openPortCount) {
        return false;
    }
    ns.tprint(`Nuking ${host}`);
    ns.nuke(host);

    return true;
}

function openPorts(ns: NS, host: string) {
    const server = ns.getServer(host);
    const tasks: [string, boolean, { (): void }][] = [
        ['BruteSSH.exe', server.sshPortOpen, () => ns.brutessh(host)],
        ['FTPCrack.exe', server.ftpPortOpen, () => ns.ftpcrack(host)],
        ['relaySMTP.exe', server.smtpPortOpen, () => ns.relaysmtp(host)],
        ['HTTPWorm.exe', server.httpPortOpen, () => ns.httpworm(host)],
        ['SQLInject.exe', server.sqlPortOpen, () => ns.sqlinject(host)],
    ];

    for (const [name, opened, f] of tasks) {
        if (opened) {
            continue;
        }
        if (!ns.fileExists(name, 'home')) {
            continue;
        }
        ns.tprint(`Run ${name} on ${host}`);
        f();
    }
}
