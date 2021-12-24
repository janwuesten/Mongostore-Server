import { MongoStoreServer } from "..";
import { MongoStoreAdmin } from "../admin"

export type MongoStoreHTTPFunction = ((req, res, {admin}: {admin: MongoStoreAdmin}) => Promise<void>)
export type MongoStoreCallFunction = ((data: MongoStoreCallFunctionData, {admin}: {admin: MongoStoreAdmin}) => Promise<Record<string, any>>)|((data: MongoStoreCallFunctionData, {admin}: {admin: MongoStoreAdmin}) => Promise<void>)
export type MongoStoreCallFunctionData = {
    data: Record<string, any>
}

export class MongoStoreFunctions {
    private _server: MongoStoreServer

    constructor(server: MongoStoreServer) {
        this._server = server
    }

    callable(functionName: string, func: MongoStoreCallFunction): void {
        this._express.all(`/mongostore/functions/${functionName}`, async(req, res) => {
            let query: Record<string, any> = req.query
            if(Object.keys(req.body).length > 0) {
                query = req.body
            }
            if(this._server.getConfig().verbose) {
                console.log(`MONGOSTORE: Run callable function ${functionName}`)
            }
            try{
                let responseData = await func({
                    data: query
                }, {
                    admin: this._server.admin()
                })
                if(responseData) {
                    res.json(responseData)
                }else{
                    res.json({})
                }
            }catch(err) {
                console.log(`MONGOSTORE: Crashed callable function ${functionName}`)
                console.error(err);
                res.status(500).send("Error 500: server error")
            }
        })
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd callable function ${functionName} on /mongostore/functions/${functionName}`)
        }
    }
    http(functionName: string, func: MongoStoreHTTPFunction): void {
        this._express.all(`${functionName}`, async (req, res) => {
            if(this._server.getConfig().verbose) {
                console.log(`MONGOSTORE: Run http function ${functionName}`)
            }
            try{
                await func(req, res,  {
                    admin: this._server.admin()
                })
            }catch(err) {
                console.log(`MONGOSTORE: Crashed http function ${functionName}`)
                console.error(err);
                res.status(500).send("Error 500: server error")
            }
        })
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd http function ${functionName} on /${functionName}`)
        }
    }

    private get _express() {
        return this._server.express()
    }
}