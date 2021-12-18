import { Db } from 'mongodb';
import * as core from 'express-serve-static-core';
import { MongoStoreHandler, MongoStoreResponse } from '..';

async function action (handler: MongoStoreHandler, store: Db, query: core.Query, auth: null, req: core.Request, res: core.Response): Promise<MongoStoreResponse> { 
    var response: MongoStoreResponse = new MongoStoreResponse();
    if(!query.hasOwnProperty("collection") || !query.hasOwnProperty("data") || (!query.hasOwnProperty("query") && !query.hasOwnProperty("document"))) {
        response.response = "invalid_request";
        return response;
    }
    var searchForId = query.hasOwnProperty("document");
    var afterData = JSON.parse(query.data as string);
    if(searchForId) {
        response = await handler.update(query.collection as string, query.document as string, afterData, null, store);
    }else{
        response = await handler.update(query.collection as string, JSON.parse(query.query as string), afterData, null, store);
    }
    return response;
};
export default action;