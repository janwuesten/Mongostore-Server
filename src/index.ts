import express, {Express} from 'express'
import cors from 'cors'
import {MongoStoreHandler} from './store'
import { MongoStoreTriggers } from './triggers'
import { MongoStoreConfig } from './classes/Configuration'
import { MongoStoreRules } from './classes/Rules'
import { MongoStoreAdmin } from './admin'

export class MongoStoreServer {
    private _server: Express
    private _config: MongoStoreConfig
    private _rules: MongoStoreRules
    private _handler: MongoStoreHandler
    private _triggerHandler: MongoStoreTriggers
    private _admin: MongoStoreAdmin

    constructor() {
        this._rules = async (store, req, res): Promise<void> => {}
        this._config = new MongoStoreConfig()
        this._server = express()
        this._handler = new MongoStoreHandler(this)
        this._triggerHandler = new MongoStoreTriggers(this)
        this._admin = new MongoStoreAdmin(this)
        
        this._server.use(express.json())
        this._server.use(express.urlencoded({ extended: true }))
        this._server.use(cors())
        
        /*const staticPath = path.join(__dirname, '..', '..', 'hosting')
        this.server.use(express.static(staticPath))
        this.server.get('/',  (req,res): void => {
            res.sendFile(path.join(staticPath, "index.html"))
        })
        this.server.get('*', (req, res): void =>{
            res.sendFile(path.join(staticPath, "index.html"))
        })*/

        // Mongostore APIs
        this._server.post("/mongostore/store", async (req, res) => {
            await this._handler.handler(req, res)
        })
        this._server.all("/mongostore/info", (req, res) => {
            res.send({
                response: "ok"
            })
        })
    }
    async start(): Promise<void> {
        await this._handler.init()
        this._server.listen(this._config.port)
        console.log("MONGOSTORE: Server started on port " + this._config.port)
    }
    setRules(rules: MongoStoreRules): void {
        this._rules = rules
    }
    setConfig(config: MongoStoreConfig): void {
        this._config = config
    }

    getRules(): MongoStoreRules {
        return this._rules
    }
    getConfig(): MongoStoreConfig {
        return this._config
    }
    getHandler(): MongoStoreHandler {
        return this._handler;
    }

    //#region APIs
    admin(): MongoStoreAdmin {
        return this._admin
    }
    triggers(): MongoStoreTriggers {
        return this._triggerHandler
    }
    express(): Express | null {
        if(this._server) {
            return this._server
        }
        return null
    }
    //#endregion
    
}