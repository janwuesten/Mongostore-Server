import { MongoClient, Document, Db, ObjectId } from 'mongodb'
import * as core from 'express-serve-static-core'
import decode from './decoder'

import actionGet from './actions/get'
import actionAdd from './actions/add'
import actionSet from './actions/set'
import actionUpdate from './actions/update'
import actionDelete from './actions/delete'
import { MongoStoreRulesRequest, MongoStoreRulesResponse } from '../classes/Rules'
import { MongoStoreServer } from '..'
import { MongoStoreDocument } from '../admin/store'

export class MongoStoreHandler {
    private _server: MongoStoreServer
    private _client: MongoClient
    private _store: Db
    constructor(server: MongoStoreServer) {
        this._server = server
    }
    async init(): Promise<void> {
        this._client = new MongoClient(this._server.getConfig().mongodb.url)
        await this._client.connect()
        this._store = this._client.db(this._server.getConfig().mongodb.database)
    }
    async close(): Promise<void> {
        await this._client.close()
    }
    async handler(req: core.Request, res: core.Response): Promise<void> {
        try{
            if(this._server.getConfig().verbose) {
                console.log("MONGOSTORE: Request /store")
            }
            var query = req.body
            if(!query.hasOwnProperty("action")) {
                res.json({response: "invalid_request"})
                return
            }
            var response: MongoStoreResponse = null
            switch(query.action) {
                case "get":
                    response = await actionGet(this, query, null, req, res)
                    break
                case "delete":
                    response = await actionDelete(this, query, null, req, res)
                    break
                case "add":
                    response = await actionAdd(this, query, null, req, res)
                    break
                case "set":
                    response = await actionSet(this, query, null, req, res)
                    break
                case "update":
                    response = await actionUpdate(this, query, null, req, res)
                    break
                default:
                    break
            }
            if(response != null) {
                res.json(response)
            }else{
                res.json({response: "invalid_request"})
            }
        }catch(err) {
            if(this._server.getConfig().verbose) {
                console.error(err)
            }else{
                console.log("MONGOSTORE: Crashed /store. Use verbose mode for detailed information")
            }
            res.json({response: "crash"})
        }
    }

    async add(collection: string, data: Document, auth: null, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        data = decode(data)
        var rulesRequest = new MongoStoreRulesRequest()
        rulesRequest.document = data
        rulesRequest.update = data
        rulesRequest.id = null
        rulesRequest.collection = collection
        var rulesResponse = new MongoStoreRulesResponse()
        if(!bypassRules) {
            try{
                await this._server.getRules()(this._store, rulesRequest, rulesResponse)
            }catch(err){
                if(this._server.getConfig().verbose) {
                    console.error(err)
                }else{
                    console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                }
                rulesResponse = new MongoStoreRulesResponse()
            }
        }
        if(rulesResponse.add || bypassRules) {
            const result = await this._store.collection(collection).insertOne(data)
            data._id = result.insertedId.toHexString()
            response.documents.push(data)
            if(!bypassTriggers) {
                this._server.triggers().runDocumentAddTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), data))
            }
        }else{
            response.response = "invalid_permissions"
        }
        return response
    }
    async delete(collection: string, query: Document|string, auth: null, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        var searchForId = typeof query === "string"
        var mongoQuery
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            }
        }else{
            mongoQuery = query as Document
        }
        if(searchForId) {
            const beforeData = await this._store.collection(collection).findOne(mongoQuery, options)
            if(beforeData != null) {
                var rulesRequest = new MongoStoreRulesRequest()
                rulesRequest.document = beforeData
                rulesRequest.id = beforeData._id
                rulesRequest.collection = collection
                var rulesResponse = new MongoStoreRulesResponse()
                if(!bypassRules) {
                    try{
                        await this._server.getRules()(this._store, rulesRequest, rulesResponse)
                    }catch(err){
                        if(this._server.getConfig().verbose) {
                            console.error(err)
                        }else{
                            console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                        }
                        rulesResponse = new MongoStoreRulesResponse()
                    }
                }
                if(rulesResponse.delete || bypassRules) {
                    response.documents.push(beforeData)
                    await this._store.collection(collection).deleteOne(mongoQuery)
                    if(!bypassTriggers) {
                        this._server.triggers().runDocumentDeletedTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), beforeData))
                    }
                }else{
                    response.response = "invalid_permissions"
                }
            }
        }else{
            const cursor = await this._store.collection(collection).find(mongoQuery, options)
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next()
                    var rulesRequest = new MongoStoreRulesRequest()
                    rulesRequest.document = beforeData
                    rulesRequest.id = beforeData._id
                    rulesRequest.collection = collection
                    var rulesResponse = new MongoStoreRulesResponse()
                    if(!bypassRules) {
                        try{
                            await this._server.getRules()(this._store, rulesRequest, rulesResponse)
                        }catch(err){
                            if(this._server.getConfig().verbose) {
                                console.error(err)
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        }
                    }
                    if(rulesResponse.deleteByFind || bypassRules) {
                        response.documents.push(beforeData)
                        await this._store.collection(collection).deleteOne({_id: new ObjectId(beforeData._id)})
                        if(!bypassTriggers) {
                            this._server.triggers().runDocumentDeletedTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), beforeData))
                        }
                    }
                }
            }
        }
        return response
    }
    async get(collection: string, query: Document|string, auth: null, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        var searchForId = typeof query === "string"
        var mongoQuery
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            }
        }else{
            mongoQuery = query as Document
        }
        if(searchForId) {
            const result = await this._store.collection(collection).findOne(mongoQuery, options)
            if(result != null) {
                var rulesRequest = new MongoStoreRulesRequest()
                rulesRequest.document = result
                rulesRequest.id = result._id
                rulesRequest.collection = collection
                var rulesResponse = new MongoStoreRulesResponse()
                if(!bypassRules) {
                    try{
                        await this._server.getRules()(this._store, rulesRequest, rulesResponse)
                    }catch(err){
                        if(this._server.getConfig().verbose) {
                            console.error(err)
                        }else{
                            console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                        }
                        rulesResponse = new MongoStoreRulesResponse()
                    }
                }
                if(rulesResponse.get || bypassRules) {
                    response.documents.push(result)
                    if(!bypassTriggers) {
                        this._server.triggers().runDocumentGetTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), result))
                    }
                }else{
                    response.response = "invalid_permissions"
                }
            }
        }else{
            const cursor = await this._store.collection(collection).find(mongoQuery, options)
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const item = await cursor.next()
                    var rulesRequest = new MongoStoreRulesRequest()
                    rulesRequest.document = item
                    rulesRequest.id = item._id
                    rulesRequest.collection = collection
                    var rulesResponse = new MongoStoreRulesResponse()           
                    if(!bypassRules) {
                        try{
                            rulesResponse = new MongoStoreRulesResponse()    
                        }catch(err){
                            if(this._server.getConfig().verbose) {
                                console.error(err)
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        }
                    }
                    await this._server.getRules()(this._store, rulesRequest, rulesResponse)   
                    if(rulesResponse.find || bypassRules) {
                        response.documents.push(item)
                        if(!bypassTriggers) {
                            this._server.triggers().runDocumentGetTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), item))
                        }
                    }
                }
            }
        }
        return response
    }
    async set(collection: string, query: Document|string, afterData: Document, auth: null, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        afterData = decode(afterData)
        var searchForId = typeof query === "string"
        var mongoQuery
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            }
        }else{
            mongoQuery = query as Document
        }
        if(searchForId) {
            const beforeData = await this._store.collection(collection).findOne(mongoQuery, options)
            if(beforeData != null) {
                afterData._id = new ObjectId(beforeData._id)
                var rulesRequest = new MongoStoreRulesRequest()
                rulesRequest.document = beforeData
                rulesRequest.update = afterData
                rulesRequest.id = beforeData._id
                rulesRequest.collection = collection
                var rulesResponse = new MongoStoreRulesResponse()
                if(!bypassRules) {
                    try{
                        await this._server.getRules()(this._store, rulesRequest, rulesResponse)
                    }catch(err){
                        if(this._server.getConfig().verbose) {
                            console.error(err)
                        }else{
                            console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                        }
                        rulesResponse = new MongoStoreRulesResponse()
                    }
                }
                if(rulesResponse.set || bypassRules) {
                    response.documents.push(afterData)
                    await this._store.collection(collection).replaceOne(mongoQuery, afterData)
                    if(!bypassTriggers) {
                        if(this.dataUpdated(beforeData, afterData)) {
                            this._server.triggers().runDocumentUpdateTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), beforeData), new MongoStoreDocument(this._server.admin().store().collection(collection), afterData))
                        }
                    }
                }else{
                    response.response = "invalid_permissions"
                    return response
                }
            }
        }else{
            const cursor = await this._store.collection(collection).find(mongoQuery, options)
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next()
                    afterData._id = new ObjectId(beforeData._id)
                    var rulesRequest = new MongoStoreRulesRequest()
                    rulesRequest.document = beforeData
                    rulesRequest.update = afterData
                    rulesRequest.id = beforeData._id
                    rulesRequest.collection = collection
                    var rulesResponse = new MongoStoreRulesResponse()
                    if(!bypassRules) {
                        try{
                            await this._server.getRules()(this._store, rulesRequest, rulesResponse)
                        }catch(err){
                            if(this._server.getConfig().verbose) {
                                console.error(err)
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        }
                    }
                    if(rulesResponse.setByFind || bypassRules) {
                        response.documents.push(afterData)
                        await this._store.collection(collection).replaceOne({_id: new ObjectId(beforeData._id)}, afterData)
                        if(!bypassTriggers) {
                            if(this.dataUpdated(beforeData, afterData)) {
                                this._server.triggers().runDocumentUpdateTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), beforeData), new MongoStoreDocument(this._server.admin().store().collection(collection), afterData))
                            }
                        }
                    }
                }
            }
        }
        return response
    }
    async update(collection: string, query: Document|string, afterData: Document, auth: null, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        afterData = decode(afterData)
        var searchForId = typeof query === "string"
        var mongoQuery
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            }
        }else{
            mongoQuery = query as Document
        }
        if(searchForId) {
            const beforeData = await this._store.collection(collection).findOne(mongoQuery, options)
            if(beforeData != null) {
                afterData._id = new ObjectId(beforeData._id)
                var rulesRequest = new MongoStoreRulesRequest()
                rulesRequest.document = beforeData
                rulesRequest.update = afterData
                rulesRequest.id = beforeData._id
                rulesRequest.collection = collection
                var rulesResponse = new MongoStoreRulesResponse()
                if(!bypassRules) {
                    try{
                        await this._server.getRules()(this._store, rulesRequest, rulesResponse)
                    }catch(err){
                        if(this._server.getConfig().verbose) {
                            console.error(err)
                        }else{
                            console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                        }
                        rulesResponse = new MongoStoreRulesResponse()
                    }
                }
                if(rulesResponse.update || bypassRules) {
                    response.documents.push(afterData)
                    await this._store.collection(collection).updateOne(mongoQuery, {
                        $set: afterData
                    })
                    if(!bypassTriggers) {
                        if(this.dataUpdated(beforeData, afterData)) {
                            this._server.triggers().runDocumentUpdateTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), beforeData), new MongoStoreDocument(this._server.admin().store().collection(collection), afterData))
                        }
                    }
                }else{
                    response.response = "invalid_permissions"
                    return response
                }
            }
        }else{
            const cursor = await this._store.collection(collection).find(mongoQuery, options)
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next()
                    afterData._id = new ObjectId(beforeData._id)
                    var rulesRequest = new MongoStoreRulesRequest()
                    rulesRequest.document = beforeData
                    rulesRequest.update = afterData
                    rulesRequest.id = beforeData._id
                    rulesRequest.collection = collection
                    var rulesResponse = new MongoStoreRulesResponse()
                    if(!bypassRules) {
                        try{
                            await this._server.getRules()(this._store, rulesRequest, rulesResponse)
                        }catch(err){
                            if(this._server.getConfig().verbose) {
                                console.error(err)
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        }
                    }
                    if(rulesResponse.updateByFind || bypassRules) {
                        response.documents.push(afterData)
                        await this._store.collection(collection).updateOne({_id: new ObjectId(beforeData._id)}, {
                            $set: afterData
                        })
                        if(!bypassTriggers) {
                            if(this.dataUpdated(beforeData, afterData)) {
                                this._server.triggers().runDocumentUpdateTriggers(new MongoStoreDocument(this._server.admin().store().collection(collection), beforeData), new MongoStoreDocument(this._server.admin().store().collection(collection), afterData))
                            }
                        }
                    }
                }
            }
        }
        return response
    }
    private dataUpdated(data: Record<string, any>, updateData: Record<string, any>, root = true): boolean {
        for(let key of Object.keys(updateData)) {
            if(key !== "_id" || !root) {
                let update = updateData[key]
                if(!data.hasOwnProperty(key)) {
                    return true
                }
                let current = data[key]
                if(Array.isArray(update)) {
                    if(update.length !== current.length) {
                        return true
                    }
                    for(let i in update) {
                        if(update[i] !== current[i]) {
                            return true
                        }
                    }
                }else if(typeof update === "object") {
                    let innerObjRes = this.dataUpdated(current, update, false)
                    if(innerObjRes) {
                        return true
                    }
                }else{
                    if(update !== current) {
                        return true
                    }
                }
            }
        }
        return false
    }
}
export class MongoStoreResponse {
    response: string
    documents: Document[]
    constructor() {
        this.response = "ok"
        this.documents = []
    }
}