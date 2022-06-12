import {NS} from '@ns'

class Config {
    constructor(
        public ns: NS,
        public host: string,
        public grow_threshold: number,
        public weaken_threshold: number,
        public hack_threshold: number,
        public total_threads: number,
        public max_money: number,
        public min_security: number,
    ) {
    }

    isValid(): boolean {
        if (this.host.length === 0) {
            this.ns.tprint('ERROR: host is empty')
            return false
        }
        if (this.grow_threshold <= 0) {
            this.ns.tprint('ERROR: grow_threshold must be greater than 0')
            return false
        }
        if (this.weaken_threshold <= 0) {
            this.ns.tprint('ERROR: weaken_threshold must be greater than 0')
            return false
        }
        if (this.hack_threshold <= 0) {
            this.ns.tprint('ERROR: hack_threshold must be greater than 0')
            return false
        }
        if (this.total_threads <= 0) {
            this.ns.tprint('ERROR: total_threads must be greater than 0')
            return false
        }
        if (this.max_money <= 0) {
            this.ns.tprint('ERROR: max_money must be greater than 0')
            return false
        }
        if (this.min_security <= 0) {
            this.ns.tprint('ERROR: min_security must be greater than 0')
            return false
        }

        return true;
    }
}

export async function main(ns: NS): Promise<void> {
    const flags = ns.flags([
        ['host', ''],
        ['grow_threshold', 0],
        ['weaken_threshold', 0],
        ['hack_threshold', 0],
        ['total_threads', 0],
        ['max_money', 0],
        ['min_security', 0],
    ]);
    const config = new Config(
        ns,
        flags.host,
        flags.grow_threshold,
        flags.weaken_threshold,
        flags.hack_threshold,
        flags.total_threads,
        flags.max_money,
        flags.min_security,
    );
    if (!config.isValid()) {
        return;
    }

    while (true) {
        const oldWeakenThreshold = config.weaken_threshold;
        const oldGrowThreshold = config.grow_threshold;
        const oldHackThreshold = config.hack_threshold;

        if (ns.getServerSecurityLevel(config.host) >= config.weaken_threshold) {
            await ns.weaken(config.host);
        } else if (ns.getServerMoneyAvailable(config.host) <= config.grow_threshold) {
            await ns.grow(config.host);
        } else if (ns.getServerMoneyAvailable(config.host) >= config.hack_threshold) {
            await ns.hack(config.host);
        }

        if (ns.getServerSecurityLevel(config.host) <= config.min_security && randomChose(1 / config.total_threads)) {
            config.weaken_threshold += securityLevelStep
        }
        if (ns.getServerMoneyAvailable(config.host) <= 0 && randomChose(1 / config.total_threads)) {
            config.hack_threshold += moneyStep
        }
        if (ns.getServerMoneyAvailable(config.host) >= config.max_money && randomChose(1 / config.total_threads)) {
            config.grow_threshold -= moneyStep
        }

        if (randomChose(1 / (config.total_threads * 30))) {
            config.weaken_threshold -= securityLevelStep;
            config.grow_threshold += moneyStep;
            config.hack_threshold -= moneyStep;
            await config.ns.asleep(100); // in case of server is busy
        }

        config.weaken_threshold = migrateToRange(config.weaken_threshold, config.min_security, Infinity);
        config.grow_threshold = migrateToRange(config.grow_threshold, 0, config.max_money);
        config.hack_threshold = migrateToRange(config.hack_threshold, 0, config.max_money);

        if (oldWeakenThreshold !== config.weaken_threshold) {
            config.ns.print(`weaken_threshold: ${oldWeakenThreshold} -> ${config.weaken_threshold}`);
        }
        if (oldGrowThreshold !== config.grow_threshold) {
            config.ns.print(`grow_threshold: ${oldGrowThreshold} -> ${config.grow_threshold}`);
        }
        if (oldHackThreshold !== config.hack_threshold) {
            config.ns.print(`hack_threshold: ${oldHackThreshold} -> ${config.hack_threshold}`);
        }
    }
}

const securityLevelStep = 0.05;
const moneyStep = 1000;

function migrateToRange(n: number, min: number, max: number): number {
    if (n <= min) {
        return min;
    } else if (n >= max) {
        return max;
    } else {
        return n;
    }
}

function randomChose(n: number): boolean {
    return Math.random() < n;
}
