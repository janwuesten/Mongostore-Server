import { MongoClient, Db, ObjectId } from 'mongodb'
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

    async add(collectionID: string, data: Record<string, any>, auth: null, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        data = decode(data)

        const collection = this._server.admin().store().collection(collectionID)
        const document = new MongoStoreDocument(collection, data)

        var rulesRequest = new MongoStoreRulesRequest(document)
        var rulesResponse = new MongoStoreRulesResponse()
        if(!bypassRules) {
            try{
                await (this._server.getRules())(rulesRequest, rulesResponse, {
                    admin: this._server.admin()
                })
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
            const result = await this._store.collection(collection.collectionID).insertOne(data)
            data._id = result.insertedId.toHexString()
            response.documents.push(data)
            if(!bypassTriggers) {
                this._server.triggers().runDocumentAddTriggers(document)
            }
        }else{
            response.response = "invalid_permissions"
        }
        return response
    }
    async delete(collectionID: string, query: Record<string, any>|string, auth: null, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        const collection = this._server.admin().store().collection(collectionID)

        var searchForId = typeof query === "string"
        var mongoQuery
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            }
        }else{
            mongoQuery = query as Record<string, any>
        }
        if(searchForId) {
            const beforeData = await this._store.collection(collection.collectionID).findOne(mongoQuery, options)
            if(beforeData != null) {
                const beforeDocument = new MongoStoreDocument(collection, beforeData)
                var rulesRequest = new MongoStoreRulesRequest(beforeDocument)
                var rulesResponse = new MongoStoreRulesResponse()
                if(!bypassRules) {
                    try{
                        await (this._server.getRules())(rulesRequest, rulesResponse, {
                            admin: this._server.admin()
                        })
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
                    await this._store.collection(collection.collectionID).deleteOne(mongoQuery)
                    if(!bypassTriggers) {
                        this._server.triggers().runDocumentDeletedTriggers(beforeDocument)
                    }
                }else{
                    response.response = "invalid_permissions"
                }
            }
        }else{
            const cursor = await this._store.collection(collection.collectionID).find(mongoQuery, options)
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next()
                    const beforeDocument = new MongoStoreDocument(collection, beforeData)
                    var rulesRequest = new MongoStoreRulesRequest(beforeDocument)
                    var rulesResponse = new MongoStoreRulesResponse()
                    if(!bypassRules) {
                        try{
                            await (this._server.getRules())(rulesRequest, rulesResponse, {
                                admin: this._server.admin()
                            })
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
                        await this._store.collection(collection.collectionID).deleteOne({_id: new ObjectId(beforeData._id)})
                        if(!bypassTriggers) {
                            this._server.triggers().runDocumentDeletedTriggers(beforeDocument)
                        }
                    }
                }
            }
        }
        return response
    }
    async get(collectionID: string, query: Record<string, any>|string, auth: null, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        const collection = this._server.admin().store().collection(collectionID)
        
        var searchForId = typeof query === "string"
        var mongoQuery
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            }
        }else{
            mongoQuery = query as Record<string, any>
        }
        if(searchForId) {
            const result = await this._store.collection(collection.collectionID).findOne(mongoQuery, options)
            if(result != null) {
                const document = new MongoStoreDocument(collection, result)
                var rulesRequest = new MongoStoreRulesRequest(document)
                var rulesResponse = new MongoStoreRulesResponse()                
                if(!bypassRules) {
                    try{
                        await (this._server.getRules())(rulesRequest, rulesResponse, {
                            admin: this._server.admin()
                        })
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
                        this._server.triggers().runDocumentGetTriggers(document)
                    }
                }else{
                    response.response = "invalid_permissions"
                }
            }
        }else{
            const cursor = await this._store.collection(collection.collectionID).find(mongoQuery, options)
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const item = await cursor.next()
                    const document = new MongoStoreDocument(collection, item)
                    var rulesRequest = new MongoStoreRulesRequest(document)
                    var rulesResponse = new MongoStoreRulesResponse()
                    if(!bypassRules) {
                        try{
                            await (this._server.getRules())(rulesRequest, rulesResponse, {
                                admin: this._server.admin()
                            })
                        }catch(err){
                            if(this._server.getConfig().verbose) {
                                console.error(err)
                            }else{
                                console.log("MONGOSTORE: Crashed /store ruleset. Use verbose mode for detailed information")
                            }
                            rulesResponse = new MongoStoreRulesResponse()
                        }
                    }
                    if(rulesResponse.find || bypassRules) {
                        response.documents.push(item)
                        if(!bypassTriggers) {
                            this._server.triggers().runDocumentGetTriggers(document)
                        }
                    }
                }
            }
        }
        return response
    }
    async set(collectionID: string, query: Record<string, any>|string, afterData: Record<string, any>, auth: null, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        afterData = decode(afterData)

        const collection = this._server.admin().store().collection(collectionID)

        var searchForId = typeof query === "string"
        var mongoQuery
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            }
        }else{
            mongoQuery = query as Record<string, any>
        }
        if(searchForId) {
            const beforeData = await this._store.collection(collection.collectionID).findOne(mongoQuery, options)
            if(beforeData != null) {
                afterData._id = new ObjectId(beforeData._id)
                const beforeDocument = new MongoStoreDocument(collection, beforeData)
                const afterDocument = new MongoStoreDocument(collection, afterData)
                var rulesRequest = new MongoStoreRulesRequest(beforeDocument, afterDocument)
                var rulesResponse = new MongoStoreRulesResponse()
                if(!bypassRules) {
                    try{
                        await (this._server.getRules())(rulesRequest, rulesResponse, {
                            admin: this._server.admin()
                        })
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
                    await this._store.collection(collection.collectionID).replaceOne(mongoQuery, afterData)
                    if(!bypassTriggers) {
                        if(this.dataUpdated(beforeData, afterData)) {
                            this._server.triggers().runDocumentUpdateTriggers(beforeDocument, afterDocument)
                        }
                    }
                }else{
                    response.response = "invalid_permissions"
                    return response
                }
            }
        }else{
            const cursor = await this._store.collection(collection.collectionID).find(mongoQuery, options)
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next()
                    afterData._id = new ObjectId(beforeData._id)
                    const beforeDocument = new MongoStoreDocument(collection, beforeData)
                    const afterDocument = new MongoStoreDocument(collection, afterData)
                    var rulesRequest = new MongoStoreRulesRequest(beforeDocument, afterDocument)
                    var rulesResponse = new MongoStoreRulesResponse()
                    if(!bypassRules) {
                        try{
                            await (this._server.getRules())(rulesRequest, rulesResponse, {
                                admin: this._server.admin()
                            })
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
                        await this._store.collection(collection.collectionID).replaceOne({_id: new ObjectId(beforeData._id)}, afterData)
                        if(!bypassTriggers) {
                            if(this.dataUpdated(beforeData, afterData)) {
                                this._server.triggers().runDocumentUpdateTriggers(beforeDocument, afterDocument)
                            }
                        }
                    }
                }
            }
        }
        return response
    }
    async update(collectionID: string, query: Record<string, any>|string, afterData: Record<string, any>, auth: null, options: {[key: string]: any} = {}, bypassRules: boolean = false, bypassTriggers: boolean = false, response: MongoStoreResponse = new MongoStoreResponse()): Promise<MongoStoreResponse> {
        afterData = decode(afterData)

        const collection = this._server.admin().store().collection(collectionID)

        var searchForId = typeof query === "string"
        var mongoQuery
        if(searchForId) {
            mongoQuery = {
                _id: new ObjectId(query as string)
            }
        }else{
            mongoQuery = query as Record<string, any>
        }
        if(searchForId) {
            const beforeData = await this._store.collection(collection.collectionID).findOne(mongoQuery, options)
            if(beforeData != null) {
                afterData._id = new ObjectId(beforeData._id)
                const beforeDocument = new MongoStoreDocument(collection, beforeData)
                const afterDocument = new MongoStoreDocument(collection, afterData)
                var rulesRequest = new MongoStoreRulesRequest(beforeDocument, afterDocument)
                var rulesResponse = new MongoStoreRulesResponse()
                if(!bypassRules) {
                    try{
                        await (this._server.getRules())(rulesRequest, rulesResponse, {
                            admin: this._server.admin()
                        })
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
                    await this._store.collection(collection.collectionID).updateOne(mongoQuery, {
                        $set: afterData
                    })
                    if(!bypassTriggers) {
                        if(this.dataUpdated(beforeData, afterData)) {
                            this._server.triggers().runDocumentUpdateTriggers(beforeDocument, afterDocument)
                        }
                    }
                }else{
                    response.response = "invalid_permissions"
                    return response
                }
            }
        }else{
            const cursor = await this._store.collection(collection.collectionID).find(mongoQuery, options)
            if ((await cursor.count()) != 0) {
                while(await cursor.hasNext()) {
                    const beforeData = await cursor.next()
                    afterData._id = new ObjectId(beforeData._id)
                    const beforeDocument = new MongoStoreDocument(collection, beforeData)
                    const afterDocument = new MongoStoreDocument(collection, afterData)
                    var rulesRequest = new MongoStoreRulesRequest(beforeDocument, afterDocument)
                    var rulesResponse = new MongoStoreRulesResponse()
                    if(!bypassRules) {
                        try{
                            await (this._server.getRules())(rulesRequest, rulesResponse, {
                                admin: this._server.admin()
                            })
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
                        await this._store.collection(collection.collectionID).updateOne({_id: new ObjectId(beforeData._id)}, {
                            $set: afterData
                        })
                        if(!bypassTriggers) {
                            if(this.dataUpdated(beforeData, afterData)) {
                                this._server.triggers().runDocumentUpdateTriggers(beforeDocument, afterDocument)
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
    documents: Record<string, any>[]
    constructor() {
        this.response = "ok"
        this.documents = []
    }
}