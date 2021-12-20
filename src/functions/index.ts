import { MongoStoreServer } from "..";

export type MongoStoreHTTPFunction = ((req, res, {admin}) => Promise<void>)

export class MongoStoreFunctions {
    private _server: MongoStoreServer

    constructor(server: MongoStoreServer) {
        this._server = server
    }

    http(functionName: string, func: MongoStoreHTTPFunction): void {
        this._express.all(`/mongostore/functions/${functionName}`, async (req, res) => {
            if(this._server.getConfig().verbose) {
                console.log(`MONGOSTORE: Run function ${functionName}`)
            }
            try{
                await func(req, res,  {
                    admin: this._server.admin()
                })
            }catch(err) {
                console.log(`MONGOSTORE: Crashed function ${functionName}`)
                console.error(err);
                res.status(500).send("Error 500: server error")
            }
        })
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd function ${functionName}`)
        }
    }

    private get _express() {
        return this._server.express()
    }
}