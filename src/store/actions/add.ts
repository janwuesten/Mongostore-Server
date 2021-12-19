import { Db } from 'mongodb'
import * as core from 'express-serve-static-core'
import { MongoStoreHandler, MongoStoreResponse } from '..'

async function action (handler: MongoStoreHandler, store: Db, query: core.Query, auth: null, req: core.Request, res: core.Response): Promise<MongoStoreResponse> { 
    var response: MongoStoreResponse = new MongoStoreResponse()
    if(!query.hasOwnProperty("data") || !query.hasOwnProperty("collection")) {
        response.response = "invalid_request"
        return response
    }
    var data = JSON.parse(query.data as string)
    response = await handler.add(query.collection as string, data, null, store)
    return response
}
export default action