import { MongoClient, Document, Db, ObjectId } from 'mongodb';
import * as core from 'express-serve-static-core';
import decode from './decoder';

import actionGet from './actions/get';
import actionAdd from './actions/add';
import actionSet from './actions/set';
import actionUpdate from './actions/update';
import actionDelete from './actions/delete';
import { MongoStoreRulesRequest, MongoStoreRulesResponse, MongoStoreServer } from '..';

export class MongoStoreHandler {
    private server: MongoStoreServer;
    constructor(server: MongoStoreServer) {
        this.server = server;
    }
    async handler(req: core.Request, res: core.Response): Promise<void> {
        try{
            if(this.server.getConfig().verbose) {
                console.log("MONGOSTORE: Request /store");
            }
            var query = req.body;
            if(!query.hasOwnProperty("action")) {
                res.json({response: "invalid_request"});
                return;
            }
            const client = new MongoClient(this.server.getConfig().mongodb.url);
            var mongoConnection = await client.connect();
            var store = mongoConnection.db(this.server.getConfig().mongodb.database);
            var response: MongoStoreResponse = null;
            switch(query.action) {
                case "get":
                    response = await actionGet(this, store, query, null, req, res);
                    break;
                case "delete":
                    response = await actionDelete(this, store, query, null, req, res);
                    break;
                case "add":
                    response = await actionAdd(this, store, query, null, req, res);
                    break;
                case "set":
                    response = await actionSet(this, store, query, null, req, res);
                    break;
                case "update":
                    response = await actionUpdate(this, store, query, null, req, res);
                    break;
                default:
                    break;
            }
            await client.close();
            if(response != null) {
                res.json(response);
            }else{
                res.json({response: "invalid_request"});
            }
        }catch(err) {
            if(this.server.getConfig().verbose) {
                console.error(err);
            }else{
                console.log("MONGOSTORE: Crashed /store. Use verbose mode for detailed information");
            }
            res.json({response: "crash"});
        }
    }

    async add(collection: string, data: Document, auth: null, store: Db, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        data = decode(data);
        var rulesRequest = new MongoStoreRulesRequest();
        rulesRequest.document = data;
        rulesRequest.update = data;
        rulesRequest.id = null;
        rulesRequest.collection = collection;
        var rulesResponse = new MongoStoreRulesResponse();
        if(!bypassRules) {
            try{
                await this.server.getRules()(store, rulesRequest, rulesResponse);
            }catch(err){
                if(this.server.getConfig().verbose) {
                    console.error(err);
                }else{
                    console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                }
                rulesResponse = new MongoStoreRulesResponse()
            };
        }
        if(rulesResponse.add || bypassRules) {
            const result = await store.collection(collection).insertOne(data);
            data._id = result.insertedId.toHexString();
            response.documents.push(data);
            if(!bypassTriggers) {
                this.server.triggers().runDocumentAddTrigers(collection, store, data);
            }
        }else{
            response.response = "invalid_permissions";
        }
        return response;
    };
    async delete(collection: string, query: Document|string, auth: null, store: Db, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        var searchForId = typeof query === "string";
        var mongoQuery;
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            };
        }else{
            mongoQuery = query as Document;
        }
        if(searchForId) {
            const beforeData = await store.collection(collection).findOne(mongoQuery, options);
            if(beforeData != null) {
                var rulesRequest = new MongoStoreRulesRequest();
                rulesRequest.document = beforeData;
                rulesRequest.id = beforeData._id;
                rulesRequest.collection = collection;
                var rulesResponse = new MongoStoreRulesResponse();
                if(!bypassRules) {
                    try{
                        await this.server.getRules()(store, rulesRequest, rulesResponse);
                    }catch(err){
                        if(this.server.getConfig().verbose) {
                            console.error(err);
                        }else{
                            console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                        }
                        rulesResponse = new MongoStoreRulesResponse()
                    };
                }
                if(rulesResponse.delete || bypassRules) {
                    response.documents.push(beforeData);
                    await store.collection(collection).deleteOne(mongoQuery);
                    if(!bypassTriggers) {
                        this.server.triggers().runDocumentDeletedTriggers(collection, store, beforeData);
                    }
                }else{
                    response.response = "invalid_permissions";
                }
            }
        }else{
            const cursor = await store.collection(collection).find(mongoQuery, options);
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next();
                    var rulesRequest = new MongoStoreRulesRequest();
                    rulesRequest.document = beforeData;
                    rulesRequest.id = beforeData._id;
                    rulesRequest.collection = collection;
                    var rulesResponse = new MongoStoreRulesResponse();
                    if(!bypassRules) {
                        try{
                            await this.server.getRules()(store, rulesRequest, rulesResponse);
                        }catch(err){
                            if(this.server.getConfig().verbose) {
                                console.error(err);
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        };
                    }
                    if(rulesResponse.deleteByFind || bypassRules) {
                        response.documents.push(beforeData);
                        await store.collection(collection).deleteOne({_id: new ObjectId(beforeData._id)});
                        if(!bypassTriggers) {
                            this.server.triggers().runDocumentDeletedTriggers(collection, store, beforeData);
                        }
                    }
                }
            }
        }
        return response;
    };
    async get(collection: string, query: Document|string, auth: null, store: Db, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        var searchForId = typeof query === "string";
        var mongoQuery;
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            };
        }else{
            mongoQuery = query as Document;
        }
        if(searchForId) {
            const result = await store.collection(collection).findOne(mongoQuery, options);
            if(result != null) {
                var rulesRequest = new MongoStoreRulesRequest();
                rulesRequest.document = result;
                rulesRequest.id = result._id;
                rulesRequest.collection = collection;
                var rulesResponse = new MongoStoreRulesResponse();
                if(!bypassRules) {
                    try{
                        await this.server.getRules()(store, rulesRequest, rulesResponse);
                    }catch(err){
                        if(this.server.getConfig().verbose) {
                            console.error(err);
                        }else{
                            console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                        }
                        rulesResponse = new MongoStoreRulesResponse()
                    };
                }
                if(rulesResponse.get || bypassRules) {
                    response.documents.push(result);
                    if(!bypassTriggers) {
                        this.server.triggers().runDocumentGetTrigers(collection, store, result);
                    }
                }else{
                    response.response = "invalid_permissions";
                }
            }
        }else{
            const cursor = await store.collection(collection).find(mongoQuery, options);
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const item = await cursor.next();
                    var rulesRequest = new MongoStoreRulesRequest();
                    rulesRequest.document = item;
                    rulesRequest.id = item._id;
                    rulesRequest.collection = collection;
                    var rulesResponse = new MongoStoreRulesResponse();           
                    if(!bypassRules) {
                        try{
                            rulesResponse = new MongoStoreRulesResponse();    
                        }catch(err){
                            if(this.server.getConfig().verbose) {
                                console.error(err);
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        };
                    }
                    await this.server.getRules()(store, rulesRequest, rulesResponse);   
                    if(rulesResponse.find || bypassRules) {
                        response.documents.push(item);
                        if(!bypassTriggers) {
                            this.server.triggers().runDocumentGetTrigers(collection, store, item);
                        }
                    }
                }
            }
        }
        return response;
    };
    async set(collection: string, query: Document|string, afterData: Document, auth: null, store: Db, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        afterData = decode(afterData);
        var searchForId = typeof query === "string";
        var mongoQuery;
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            };
        }else{
            mongoQuery = query as Document;
        }
        if(searchForId) {
            const beforeData = await store.collection(collection).findOne(mongoQuery, options);
            if(beforeData != null) {
                afterData._id = new ObjectId(beforeData._id);
                var rulesRequest = new MongoStoreRulesRequest();
                rulesRequest.document = beforeData;
                rulesRequest.update = afterData;
                rulesRequest.id = beforeData._id;
                rulesRequest.collection = collection;
                var rulesResponse = new MongoStoreRulesResponse();
                if(!bypassRules) {
                    try{
                        await this.server.getRules()(store, rulesRequest, rulesResponse);
                    }catch(err){
                        if(this.server.getConfig().verbose) {
                            console.error(err);
                        }else{
                            console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                        }
                        rulesResponse = new MongoStoreRulesResponse()
                    };
                }
                if(rulesResponse.set || bypassRules) {
                    response.documents.push(afterData);
                    await store.collection(collection).replaceOne(mongoQuery, afterData);
                    if(!bypassTriggers) {
                        this.server.triggers().runDocumentUpdateTriggers(collection, store, beforeData, afterData);
                    }
                }else{
                    response.response = "invalid_permissions";
                    return response;
                }
            }
        }else{
            const cursor = await store.collection(collection).find(mongoQuery, options);
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next();
                    afterData._id = new ObjectId(beforeData._id);
                    var rulesRequest = new MongoStoreRulesRequest();
                    rulesRequest.document = beforeData;
                    rulesRequest.update = afterData;
                    rulesRequest.id = beforeData._id;
                    rulesRequest.collection = collection;
                    var rulesResponse = new MongoStoreRulesResponse();
                    if(!bypassRules) {
                        try{
                            await this.server.getRules()(store, rulesRequest, rulesResponse);
                        }catch(err){
                            if(this.server.getConfig().verbose) {
                                console.error(err);
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        };
                    }
                    if(rulesResponse.setByFind || bypassRules) {
                        response.documents.push(afterData);
                        await store.collection(collection).replaceOne({_id: new ObjectId(beforeData._id)}, afterData);
                        if(!bypassTriggers) {
                            this.server.triggers().runDocumentUpdateTriggers(collection, store, beforeData, afterData);
                        }
                    }
                }
            }
        }
        return response;
    };
    async update(collection: string, query: Document|string, afterData: Document, auth: null, store: Db, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        afterData = decode(afterData);
        var searchForId = typeof query === "string";
        var mongoQuery;
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            };
        }else{
            mongoQuery = query as Document;
        }
        if(searchForId) {
            const beforeData = await store.collection(collection).findOne(mongoQuery, options);
            if(beforeData != null) {
                afterData._id = new ObjectId(beforeData._id);
                var rulesRequest = new MongoStoreRulesRequest();
                rulesRequest.document = beforeData;
                rulesRequest.update = afterData;
                rulesRequest.id = beforeData._id;
                rulesRequest.collection = collection;
                var rulesResponse = new MongoStoreRulesResponse();
                if(!bypassRules) {
                    try{
                        await this.server.getRules()(store, rulesRequest, rulesResponse);
                    }catch(err){
                        if(this.server.getConfig().verbose) {
                            console.error(err);
                        }else{
                            console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                        }
                        rulesResponse = new MongoStoreRulesResponse()
                    };
                }
                if(rulesResponse.update || bypassRules) {
                    response.documents.push(afterData);
                    await store.collection(collection).updateOne(mongoQuery, {
                        $set: afterData
                    });
                    if(!bypassTriggers) {
                        this.server.triggers().runDocumentUpdateTriggers(collection, store, beforeData, afterData);
                    }
                }else{
                    response.response = "invalid_permissions";
                    return response;
                }
            }
        }else{
            const cursor = await store.collection(collection).find(mongoQuery, options);
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next();
                    afterData._id = new ObjectId(beforeData._id);
                    var rulesRequest = new MongoStoreRulesRequest();
                    rulesRequest.document = beforeData;
                    rulesRequest.update = afterData;
                    rulesRequest.id = beforeData._id;
                    rulesRequest.collection = collection;
                    var rulesResponse = new MongoStoreRulesResponse();
                    if(!bypassRules) {
                        try{
                            await this.server.getRules()(store, rulesRequest, rulesResponse);
                        }catch(err){
                            if(this.server.getConfig().verbose) {
                                console.error(err);
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information");
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        };
                    }
                    if(rulesResponse.updateByFind || bypassRules) {
                        response.documents.push(afterData);
                        await store.collection(collection).updateOne({_id: new ObjectId(beforeData._id)}, {
                            $set: afterData
                        });
                        if(!bypassTriggers) {
                            this.server.triggers().runDocumentUpdateTriggers(collection, store, beforeData, afterData);
                        }
                    }
                }
            }
        }
        return response;
    };
}
export class MongoStoreResponse {
    response: string;
    documents: Document[];
    constructor() {
        this.response = "ok";
        this.documents = [];
    }
}