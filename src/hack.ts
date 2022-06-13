import {NS} from '@ns'

class Config {
    constructor(
        public ns: NS,
        public host: string,
        public total_threads: number,
        public max_money: number,
        public min_security: number,
        public grow_chance: number = 10,
        public weaken_chance: number = 10,
        public hack_chance: number = 10,
    ) {
    }

    isValid(): boolean {
        if (this.host.length === 0) {
            this.ns.tprint('ERROR: host is empty')
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
        ['total_threads', 0],
        ['max_money', 0],
        ['min_security', 0],
        ['clean_chance', false]
    ]);
    const config = new Config(
        ns,
        flags.host,
        flags.total_threads,
        flags.max_money,
        flags.min_security,
    );
    if (!config.isValid()) {
        return;
    }

    if (!flags.clean_chance) {
        loadChance(config);
    }

    while (true) {
        adjustChance(config);
        await saveChance(config);

        const totalChance = config.grow_chance + config.weaken_chance + config.hack_chance;
        let chance = Math.random() * totalChance;

        chance -= config.weaken_chance;
        if (chance <= 0 && config.ns.getServerSecurityLevel(config.host) > config.min_security) {
            await ns.weaken(config.host);
            continue;
        }
        chance -= config.grow_chance;
        if (chance <= 0 && config.ns.getServerMoneyAvailable(config.host) < config.max_money) {
            await ns.grow(config.host);
            continue;
        }
        chance -= config.hack_chance;
        if (chance <= 0 && config.ns.getServerMoneyAvailable(config.host) > 0) {
            await ns.hack(config.host);
        }
    }
}

function adjustChance(c: Config) {
    const oldWeakenChance = c.weaken_chance;
    const oldGrowChance = c.grow_chance;
    const oldHackChance = c.hack_chance;

    const money = c.ns.getServerMoneyAvailable(c.host);
    const security = c.ns.getServerSecurityLevel(c.host);
    if (money <= 0) {
        c.hack_chance -= 1;
        c.grow_chance += 1;
    }
    if (money <= c.max_money * 0.2) {
        c.hack_chance -= 1;
        c.grow_chance += 1;
    }
    if (money >= c.max_money) {
        c.hack_chance += 1;
        c.grow_chance -= 1;
    }
    if (money >= c.max_money * 0.8) {
        c.hack_chance += 1;
        c.grow_chance -= 1;
    }

    if (security <= c.min_security) {
        c.weaken_chance -= 1;
    }
    if (security <= c.min_security * 1.2) {
        c.weaken_chance -= 1;
    }
    if (security >= c.min_security * 2) {
        c.weaken_chance += 1;
    }
    if (security >= c.min_security * 3) {
        c.weaken_chance += 1;
    }
    if (security >= c.min_security * 4) {
        c.weaken_chance += 1;
    }
    if (security >= c.min_security * 5) {
        c.weaken_chance += 1;
    }
    if (security >= c.min_security * 6) {
        c.weaken_chance += 1;
    }


    const r = Math.random();
    if (r < 0.05) {
        c.weaken_chance -= 1;
        c.grow_chance -= 1;
        c.hack_chance -= 1;
    } else if (r < 0.1) {
        c.weaken_chance += 1;
        c.grow_chance += 1;
        c.hack_chance += 1;
    }

    while (c.hack_chance <= 0 || c.grow_chance <= 0 || c.weaken_chance <= 0) {
        c.hack_chance += 1;
        c.grow_chance += 1;
        c.weaken_chance += 1;
    }
    while (c.hack_chance <= 10 && c.grow_chance <= 10 && c.weaken_chance <= 10) {
        c.hack_chance *= 2;
        c.grow_chance *= 2;
        c.weaken_chance *= 2;
    }
    while (c.hack_chance > 100 && c.grow_chance > 100 && c.weaken_chance > 100) {
        c.hack_chance *= 0.5;
        c.grow_chance *= 0.5;
        c.weaken_chance *= 0.5;
    }
    c.hack_chance = Math.min(Math.floor(c.hack_chance), 10000);
    c.grow_chance = Math.min(Math.floor(c.grow_chance), 10000);
    c.weaken_chance = Math.min(Math.floor(c.weaken_chance), 10000);

    if (oldWeakenChance !== c.weaken_chance) {
        c.ns.print(`adjusted chance: weaken ${oldWeakenChance} -> ${c.weaken_chance}`);
    }
    if (oldGrowChance !== c.grow_chance) {
        c.ns.print(`adjusted chance: grow ${oldGrowChance} -> ${c.grow_chance}`);
    }
    if (oldHackChance !== c.hack_chance) {
        c.ns.print(`adjusted chance: hack ${oldHackChance} -> ${c.hack_chance}`);
    }
}

function chanceFileName(host: string): string {
    return `${host}.chance.txt`
}

function loadChance(c: Config) {
    const text = c.ns.read(chanceFileName(c.host));
    if (text.length === 0) {
        return;
    }
    const data = JSON.parse(text);
    if (typeof data !== 'object') {
        return;
    }
    if (data.grow_chance !== undefined) {
        c.grow_chance = data.grow_chance;
    }
    if (data.weaken_chance !== undefined) {
        c.weaken_chance = data.weaken_chance;
    }
    if (data.hack_chance !== undefined) {
        c.hack_chance = data.hack_chance;
    }
}

async function saveChance(c: Config) {
    const object = {
        grow_chance: c.grow_chance,
        weaken_chance: c.weaken_chance,
        hack_chance: c.hack_chance,
    }
    await c.ns.write(chanceFileName(c.host), JSON.stringify(object), 'w');
}