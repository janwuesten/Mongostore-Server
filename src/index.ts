import express, {Express} from 'express'
import cors from 'cors'
import {MongoStoreHandler} from './store'
import { MongoStoreTriggers } from './triggers'
import { MongoStoreConfig } from './classes/Configuration'
import { MongoStoreRules } from './classes/Rules'

export class MongoStoreServer {
    private server: Express
    private config: MongoStoreConfig
    private rules: MongoStoreRules
    private handler: MongoStoreHandler
    private triggerHandler: MongoStoreTriggers

    constructor() {
        this.rules = async (store, req, res): Promise<void> => {}
        this.config = new MongoStoreConfig()
        this.server = express()
        this.handler = new MongoStoreHandler(this)
        
        this.server.use(express.json())
        this.server.use(express.urlencoded({ extended: true }))
        this.server.use(cors())
        
        /*const staticPath = path.join(__dirname, '..', '..', 'hosting')
        this.server.use(express.static(staticPath))
        this.server.get('/',  (req,res): void => {
            res.sendFile(path.join(staticPath, "index.html"))
        })
        this.server.get('*', (req, res): void =>{
            res.sendFile(path.join(staticPath, "index.html"))
        })*/

        // Mongostore APIs
        this.server.post("/mongostore/store", async (req, res) => {
            await this.handler.handler(req, res)
        })
        this.server.all("/mongostore/info", (req, res) => {
            res.send({
                response: "ok"
            })
        })
    }
    start(): void {
        this.server.listen(this.config.port)
        console.log("MONGOSTORE: Server started on port " + this.config.port)
    }
    setRules(rules: MongoStoreRules): void {
        this.rules = rules
    }
    setConfig(config: MongoStoreConfig): void {
        this.config = config
    }

    getRules(): MongoStoreRules {
        return this.rules
    }
    getConfig(): MongoStoreConfig {
        return this.config
    }
    triggers(): MongoStoreTriggers {
        return this.triggerHandler
    }
    express(): Express | null {
        if(this.server) {
            return this.server
        }
        return null
    }
}