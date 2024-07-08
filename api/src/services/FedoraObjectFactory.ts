import Config from "../models/Config";
import { FedoraObject } from "../models/FedoraObject";
import Database from "./Database";
import winston = require("winston");

class FedoraObjectFactory {
    private static instance: FedoraObjectFactory = null;

    protected config: Config;
    protected database: Database;

    constructor(config: Config, database: Database) {
        this.config = config;
        this.database = database;
    }

    static getInstance(): FedoraObjectFactory {
        if (this.instance === null) {
            this.instance = new FedoraObjectFactory(Config.getInstance(), Database.getInstance());
        }
        return this.instance;
    }

    log(logger: winston.Logger = null, msg = ""): void {
        if (logger !== null) {
            logger.info(msg);
        }
    }

    async build(
        model: string,
        title: string,
        state = "Inactive",
        parentPid: string = null,
        logger: winston.Logger = null,
    ): Promise<FedoraObject> {
        const pid = await this.database.getNextPid(this.config.pidNamespace);
        const object = await FedoraObject.build(pid, logger, this.config);
        object.title = title;
        object.parentPid = parentPid;
        await object.initialize(state, model);
        return object;
    }
}

export default FedoraObjectFactory;
