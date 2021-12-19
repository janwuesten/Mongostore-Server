import { MongoStoreServer } from ".."
import { MongoStoreAdminStore } from "./store"

export class MongoStoreAdmin {
    private _server: MongoStoreServer
    private _store: MongoStoreAdminStore
    constructor(server: MongoStoreServer) {
        this._server = server
        this._store = new MongoStoreAdminStore(this._server)
    }
    store(): MongoStoreAdminStore {
        return this._store
    }
}