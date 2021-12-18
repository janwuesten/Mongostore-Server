import express, {Express} from 'express';
import cors from 'cors';
import {MongoStoreHandler} from './store';
import path from 'path';
import { Db, Document } from 'mongodb';
import { MongoStoreTriggers } from './triggers';

export class MongoStoreConfig {
    port: number = 500;
    mongodb: {
        url: string;
        database: string;
    };
    auth?: {
        authCollectionPrefix: string;
        usernameAuth: boolean;
    };
    verbose?: boolean = false;
};
export type MongoStoreRules = {
    (store: Db, req: MongoStoreRulesRequest, res: MongoStoreRulesResponse): Promise<void>;
}
export class MongoStoreRulesResponse {
    /** Allow getting a document by ID */
    get: boolean;
    /** Allows getting a document by Query */
    find: boolean;
    /** Allow adding a document */
    add: boolean;
    /** Allow deleting a document by ID */
    delete: boolean;
    /** Allows deleting a document by Query */
    deleteByFind: boolean;
    /** Allow updating a document by ID */
    update: boolean;
    /** Allows updating a document by Query */
    updateByFind: boolean;
    /** Allow setting a document by ID */
    set: boolean;
    /** Allows setting a document by Query */
    setByFind: boolean;
    constructor() {
        this.get = false;
    }
    /** Allows all reading action */
    allowRead() {
        this.get = true;
        this.find = true;
    }
    /** Allows all writing actions */
    allowWrite() {
        this.add = true;
        this.delete = true;
        this.deleteByFind = true;
        this.update = true;
        this.updateByFind = true;
        this.set = true;
        this.setByFind = true;
    }
}
export class MongoStoreRulesRequest {
    collection: string;
    id: string;
    document: Document;
    update: Document;
    store: Db
}
export class MongoStoreServer {
    private server: Express;
    private config: MongoStoreConfig;
    private rules: MongoStoreRules;
    private handler: MongoStoreHandler;
    private triggerHandler: MongoStoreTriggers;

    constructor() {
        this.rules = async (store, req, res): Promise<void> => {};
        this.config = new MongoStoreConfig();
        this.server = express();
        this.handler = new MongoStoreHandler(this);
        
        this.server.use(express.json());
        this.server.use(express.urlencoded({ extended: true }));
        this.server.use(cors());
        
        /*const staticPath = path.join(__dirname, '..', '..', 'hosting');
        this.server.use(express.static(staticPath));
        this.server.get('/',  (req,res): void => {
            res.sendFile(path.join(staticPath, "index.html"));
        });
        this.server.get('*', (req, res): void =>{
            res.sendFile(path.join(staticPath, "index.html"));
        });*/

        // Mongostore APIs
        this.server.post("/mongostore/store", async (req, res) => {
            await this.handler.handler(req, res);
        });
        this.server.all("/mongostore/info", (req, res) => {
            res.send({
                response: "ok"
            });
        });
    }
    start(): void {
        this.server.listen(this.config.port);
        console.log("MONGOSTORE: Server started on port " + this.config.port);
    }
    setRules(rules: MongoStoreRules): void {
        this.rules = rules;
    }
    setConfig(config: MongoStoreConfig): void {
        this.config = config;
    }

    getRules(): MongoStoreRules {
        return this.rules;
    }
    getConfig(): MongoStoreConfig {
        return this.config;
    }
    triggers(): MongoStoreTriggers {
        return this.triggerHandler;
    }
    express(): Express | null {
        if(this.server) {
            return this.server;
        }
        return null;
    }
}