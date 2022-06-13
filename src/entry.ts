import {NS} from "@ns";
import {dumpCheckSum, scanServers, shouldUpdate} from "/utils";

const simpleHack = 'hack.js';
const moni = 'moni.js';

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
        ['targets', ['n00dles', 'harakiri-sushi', 'max-hardware']],
        ['force', false],
        ['depth', 10],
        ['clean_chance', false],
    ]);

    const cfg = new Config(ns, flags.targets[0], flags.force || shouldUpdate(ns, simpleHack), flags.depth, flags.clean_chance);
    if (cfg.should_update) {
        ns.scriptKill(moni, 'home');
        await ns.asleep(1000);
        ns.exec(moni, 'home');
        await dumpCheckSum(ns, simpleHack);
    }

    const allServers = new Set<string>(['home']);
    scanServers(cfg.ns, allServers, 'home', cfg.depth);
    const hackServers: string [] = [];
    for (const server of allServers) {
        if (!nukeHost(ns, server)) {
            continue;
        }
        hackServers.push(server);
    }
    hackServers.sort();

    let total_threads = 0;
    hackServers.forEach(host => total_threads += calcThreads(ns, host, simpleHack));

    for (const host of flags.targets) {
        if (ns.getServerRequiredHackingLevel(host) * 4 <= ns.getPlayer().hacking) {
            cfg.target = host;
        }
    }
    if (cfg.target === '') {
        ns.tprint(`ERROR: No target server found`);
        return
    }

    for (const host of hackServers) {
        await singleHost(cfg, host, total_threads);
    }
}

function calcThreads(ns: NS, server: string, script: string): number {
    let total = ns.getServerMaxRam(server);
    if (server === 'home') {
        total -= 30;
    }

    const required = ns.getScriptRam(script);
    if (required <= 0) {
        return 1;
    }

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

    const threads = calcThreads(cfg.ns, host, simpleHack);
    if (threads <= 0) {
        cfg.ns.tprint(`No enough RAM to run ${simpleHack} on ${host}, ${threads}`);
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
    if (host === 'home') {
        return true;
    }

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
