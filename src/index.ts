import express, {Express, RequestHandler} from 'express'
import cors from 'cors'
import {MongoStoreHandler, MongoStore} from './store'
import { MongoStoreTriggers } from './triggers'
import { MongoStoreConfig } from './classes/Configuration'
import { MongoStoreAdmin } from './admin'
import { MongoStoreFunctions } from './functions'

export class MongoStoreServer {
    private _server: Express
    private _config: MongoStoreConfig
    private _store: MongoStore
    private _handler: MongoStoreHandler
    private _triggers: MongoStoreTriggers
    private _admin: MongoStoreAdmin
    private _functions: MongoStoreFunctions

    constructor() {
        this._config = new MongoStoreConfig()
        this._server = express()
        this._store = new MongoStore(this)
        this._handler = new MongoStoreHandler(this)
        this._triggers = new MongoStoreTriggers(this)
        this._admin = new MongoStoreAdmin(this)
        this._functions = new MongoStoreFunctions(this)
        
        this._server.use(express.json() as RequestHandler)
        this._server.use(express.urlencoded({ extended: true }) as RequestHandler)
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
    setConfig(config: MongoStoreConfig): void {
        this._config = config
    }

    getConfig(): MongoStoreConfig {
        return this._config
    }
    getHandler(): MongoStoreHandler {
        return this._handler;
    }

    //#region APIs
    store(): MongoStore {
        return this._store
    }
    admin(): MongoStoreAdmin {
        return this._admin
    }
    functions(): MongoStoreFunctions {
        return this._functions
    }
    triggers(): MongoStoreTriggers {
        return this._triggers
    }
    express(): Express | null {
        if(this._server) {
            return this._server
        }
        return null
    }
    //#endregion
    
}