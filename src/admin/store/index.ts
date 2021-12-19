import { ObjectId } from "mongodb"
import { MongoStoreServer } from "../.."
import { MongoStoreResponse } from "../../store"

export type MongoStoreSearchOptions = {
    searchForId: boolean
}
export class MongoStoreDocument {
    private _collection: MongoStoreCollection
    private _data: Record<string, any>

    constructor(collection: MongoStoreCollection, data: Record<string, any>) {
        this._collection = collection
        this._data = data
    }

    get id(): string {
        return this._data._id.toString()
    }
    get collection(): MongoStoreCollection {
        return this._collection
    }
    get ref(): MongoStoreQuery {
        return this._collection.doc(this.id)
    }
    data(): Record<string, any> {
        return this._data
    }
}
export class MongoStoreDocumentResponse {
    private _response: MongoStoreResponse
    private _collection: MongoStoreCollection

    constructor(response: MongoStoreResponse, collection: MongoStoreCollection) {
        this._response = response
        this._collection = collection
    }

    get success(): boolean {
        return this._response.response === "ok"
    }
    get docs(): MongoStoreDocument[] {
        let docs: MongoStoreDocument[] = []
        for(let doc of this._response.documents) {
            docs.push(new MongoStoreDocument(this._collection, doc))
        }
        return docs
    }
    get doc(): MongoStoreDocument {
        if(this.docs.length >= 1) {
            return this.docs[0]
        }
    }
}
export class MongoStoreQuery {
    private _collection: MongoStoreCollection
    private _query: Record<string, any>

    constructor(query: Record<string, any>, searchOptions: MongoStoreSearchOptions, collection: MongoStoreCollection) {
        this._collection = collection
        this._query = {}
        if(searchOptions.searchForId) {
            this._query = {
                _id: new ObjectId(query._id)
            }
        }else{
            this._query = query
        }
    }
    async get(trigger: boolean = true): Promise<MongoStoreDocumentResponse> {
        try{
            const response = await this._collection.getServer().getHandler().get(
                this._collection.collectionID,
                this._query,
                null,
                {},
                true,
                !trigger
            )
            return new MongoStoreDocumentResponse(response, this._collection)
        }catch(err) {
            return new MongoStoreDocumentResponse({
                response: "error",
                documents: []
            }, this._collection)
        }
    }
    async set(data: Record<string, any>, trigger: boolean = true): Promise<MongoStoreDocumentResponse> {
        try{
            const response = await this._collection.getServer().getHandler().set(
                this._collection.collectionID,
                this._query,
                data,
                null,
                {},
                true,
                !trigger
            )
            return new MongoStoreDocumentResponse(response, this._collection)
        }catch(err) {
            return new MongoStoreDocumentResponse({
                response: "error",
                documents: []
            }, this._collection)
        }
    }
    async update(data: Record<string, any>, trigger: boolean = true): Promise<MongoStoreDocumentResponse> {
        try{
            const response = await this._collection.getServer().getHandler().update(
                this._collection.collectionID,
                this._query,
                data,
                null,
                {},
                true,
                !trigger
            )
            return new MongoStoreDocumentResponse(response, this._collection)
        }catch(err) {
            return new MongoStoreDocumentResponse({
                response: "error",
                documents: []
            }, this._collection)
        }
    }
    async delete(trigger: boolean = true): Promise<MongoStoreDocumentResponse> {
        try{
            const response = await this._collection.getServer().getHandler().delete(
                this._collection.collectionID,
                this._query,
                null,
                {},
                true,
                !trigger)
                return new MongoStoreDocumentResponse(response, this._collection)
        }catch(err) {
            return new MongoStoreDocumentResponse({
                response: "error",
                documents: []
            }, this._collection)
        }
    }
    where(field: string, search: string, find: any): MongoStoreQuery {
        if(!this._query.hasOwnProperty(field) || typeof this._query[field] !== "object") {
            this._query[field] = {}
        }
        switch(search) {
            case "<":
                this._query[field].$lt = find
                break
            case "<=":
                this._query[field].$lte = find
                break
            case ">":
                this._query[field].$gt = find
                break
            case ">=":
                this._query[field].$gte = find
                break
            case "!=":
                this._query[field].$ne = find
                break
            case "in-array":
                this._query[field].$in = find
                break
            case "not-in-array":
                this._query[field].$nin = find
                break
            case "=":
            case "==":
                this._query[field].$eq = find
                break
            default:
                break
        }
        return this
    }
}
export class MongoStoreCollection {
    private _collectionID: string
    private _server: MongoStoreServer

    constructor(collectionID: string, server: MongoStoreServer) {
        this._collectionID = collectionID
        this._server = server
    }

    get collectionID(): string {
        return this._collectionID
    }
    doc(id: string): MongoStoreQuery {
        return new MongoStoreQuery({_id: new ObjectId(id)}, {searchForId: true}, this)
    }
    all(): MongoStoreQuery {
        return new MongoStoreQuery({}, {searchForId: false}, this)
    }
    query(query: {[key: string]: any}): MongoStoreQuery {
        return new MongoStoreQuery(query, {searchForId: false}, this)
    }
    where(field: string, search: string, find: any) {
        return new MongoStoreQuery({}, {searchForId: false}, this).where(field, search, find)
    }
    async add(data: Record<string, any>, trigger: boolean = true): Promise<MongoStoreDocumentResponse> {
        try{
            const response = await this._server.getHandler().add(this.collectionID, data, null, true, !trigger)
            return new MongoStoreDocumentResponse(response, this)
        }catch(err) {
            return new MongoStoreDocumentResponse({
                response: "error",
                documents: []
            }, this)
        }
    }
    getServer(): MongoStoreServer {
        return this._server
    }
}
export class MongoStoreAdminStore {
    private _server: MongoStoreServer

    constructor(server: MongoStoreServer) {
        this._server = server
    }

    collection(collectionID: string): MongoStoreCollection {
        return new MongoStoreCollection(collectionID, this._server)
    }
    fields() {
        return {
            serverTimestamp() {
                return "$$__$$SERVER_TIMESTAMP$$__$$"
            },
            serverMillisTimestamp() {
                return "$$__$$SERVER_MILLIS_TIMESTAMP$$__$$"
            }
        }
    }
}