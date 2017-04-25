import {CLI} from "./cli";
import {winston} from "./logging";
import * as os from "os";


class ParameterLoader {

    private static instance : ParameterLoader;

    public static getInstance() : ParameterLoader{
        if (!ParameterLoader.instance) {
            ParameterLoader.instance = new ParameterLoader();
        }
        return ParameterLoader.instance;
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
        languageCodes: ["en"]
    };

    private constructor() {
        this.CLI = CLI.getInstance().parameters;
        this.config = ParameterLoader.loadConfig();
        this.env = ParameterLoader.parseEnvVars();
        this.all = Object.assign({}, this.DEFAULT, this.env, this.config, this.CLI);
        ParameterLoader.groupParams(this.CLI);
        ParameterLoader.groupParams(this.config);
        ParameterLoader.groupParams(this.env);
        ParameterLoader.groupParams(this.all);
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
            if (!process.env.hasOwnProperty(param)) continue;
            try {
                params[param] = JSON.parse(process.env[param]);
            } catch (err) {
                params[param] = process.env[param];
            }
        }
        return params;
    }

    private static loadConfig() : Object {
        try {
            return require("../../config.json");
        } catch (err) {
            winston.error("Failed loading config", err);
            return {};
        }
    }
}

export let params = ParameterLoader.getInstance();

console.log(params.config);