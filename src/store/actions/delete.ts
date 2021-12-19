import * as core from 'express-serve-static-core'
import { MongoStoreHandler, MongoStoreResponse } from '..'

async function action (handler: MongoStoreHandler, query: core.Query, auth: null, req: core.Request, res: core.Response): Promise<MongoStoreResponse> { 
    var response: MongoStoreResponse = new MongoStoreResponse()
    if(!query.hasOwnProperty("collection") || (!query.hasOwnProperty("query") && !query.hasOwnProperty("document"))) {
        response.response = "invalid_request"
        return response
    }
    //const mongoOptions = {
        //sort: { rating: -1 },
        //projection: { _id: 0, title: 1, imdb: 1 },
    //}
    var searchForId = query.hasOwnProperty("document")
    if(searchForId) {
        response = await handler.delete(query.collection as string, query.document as string, null)
    }else{
        response = await handler.delete(query.collection as string, JSON.parse(query.query as string), null)
    }
    return response
}
export default action