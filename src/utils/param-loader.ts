import {CLI} from "./cli";
import * as os from "os";


export class ParamLoader {

    private static instance : ParamLoader;

    public static getInstance() : ParamLoader{
        if (!ParamLoader.instance) {
            ParamLoader.instance = new ParamLoader();
        }
        return ParamLoader.instance;
    }

    public all;
    public CLI;
    public config;
    public env;
    public DEFAULT ={
        dbHost: "localhost",
        dbPort: "5432",
        dbDatabase: "mcm",
        blobAccount: "wetstorage",
        blobContainer: "websites",
        processes: os.cpus().length,
        crawlVersion: "CC-MAIN-2017-13",
        heuristicThreshold: 3,
        heuristicLimit: Infinity,
        languageCodes: ["en"]
    };

    private constructor() {
        this.CLI = CLI.getInstance().parameters;
        this.config = ParamLoader.loadConfig();
        this.env = ParamLoader.parseEnvVars();
        this.all = Object.assign({}, this.DEFAULT, this.env, this.config, this.CLI);
        ParamLoader.groupParams(this.CLI);
        ParamLoader.groupParams(this.config);
        ParamLoader.groupParams(this.env);
        ParamLoader.groupParams(this.all);
    }

    private static groupParams(object : Object) {
        let group = (properties : Array<string>, groupName : string) => {
            let paramGroup = {};
            for (let property of properties) {
                if (!object.hasOwnProperty(property)) continue;
                paramGroup[property] = object[property];
            }
            object[groupName] = paramGroup;
        };

        group(["dbHost", "dbPort", "dbName", "dbUser", "dbPW"], "dbParams");
        group(["blobAccount", "blobContainer", "blobKey"], "blobParams");
        group(["queueAccount", "queueName", "queueKey"], "queueParams");
    }

    private static parseEnvVars() : Object {
        let params = {};
        for (let param in process.env) {
            if (!process.env.hasOwnProperty(param) || param.slice(0, 4) !== "MCM_") continue;
            let parsedName = param.substring(4);
            try {
                params[parsedName] = JSON.parse(process.env[param]);
            } catch (err) {
                params[parsedName] = process.env[param];
            }
        }
        return params;
    }

    private static loadConfig() : Object {
        try {
            return require("../../config.json");
        } catch (err) {
            return {};
        }
    }
}

export let params = ParamLoader.getInstance();