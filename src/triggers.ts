import { MongoStoreServer } from "."
import { MongoStoreAdmin } from "./admin"
import { MongoStoreDocument } from "./admin/store"

export class MongoStoreTriggers {
    private _server: MongoStoreServer
    private _documentGetTriggers: MongoStoreGetTrigger[]
    private _documentAddTriggers: MongoStoreAddedTrigger[]
    private _documentUpdateTriggers: MongoStoreUpdatedTrigger[]
    private _documentDeleteTriggers: MongoStoreDeletedTrigger[]
    constructor(server: MongoStoreServer) {
        this._server = server
        this._documentGetTriggers = []
        this._documentAddTriggers = []
        this._documentUpdateTriggers = []
        this._documentDeleteTriggers = []
    }
    documentGet(collection: string, trigger: (admin: MongoStoreAdmin, document: MongoStoreDocument) => void) {
        this._documentGetTriggers.push(new MongoStoreGetTrigger(collection, trigger))
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd documentGet trigger for collection ${collection}`)
        }
    }
    documentAdd(collection: string, trigger: (admin: MongoStoreAdmin, added: MongoStoreDocument) => void) {
        this._documentAddTriggers.push(new MongoStoreAddedTrigger(collection, trigger))
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd documentAdd trigger for collection ${collection}`)
        }
    }
    documentUpdate(collection: string, trigger: (admin: MongoStoreAdmin, before: MongoStoreDocument, after: MongoStoreDocument) => void) {
        this._documentUpdateTriggers.push(new MongoStoreUpdatedTrigger(collection, trigger))
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd documentUpdate trigger for collection ${collection}`)
        }
    }
    documentDelete(collection: string, trigger: (admin: MongoStoreAdmin, deleted: MongoStoreDocument) => void) {
        this._documentDeleteTriggers.push(new MongoStoreDeletedTrigger(collection, trigger))
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd documentDelete trigger for collection ${collection}`)
        }
    }
    
    /** @internal */
    runDocumentGetTriggers(document: MongoStoreDocument) {
        const verbose = this._server.getConfig().verbose
        for(var index in this._documentGetTriggers) {
            if(this._documentGetTriggers[index].collection == document.collection.collectionID) {
                if(verbose) {
                    console.log(`MONGOSTORE: Triggered documentGet trigger for collection ${document.collection.collectionID}`)
                }
                this._documentGetTriggers[index].trigger(this._server.admin(), document)
            }
        }
    }
    /** @internal */
    runDocumentAddTriggers(added: MongoStoreDocument) {
        const verbose = this._server.getConfig().verbose
        for(var index in this._documentAddTriggers) {
            if(this._documentAddTriggers[index].collection == added.collection.collectionID) {
                if(verbose) {
                    console.log(`MONGOSTORE: Triggered documentAdd trigger for collection ${added.collection.collectionID}`)
                }
                this._documentAddTriggers[index].trigger(this._server.admin(), added)
            }
        }
    }
    /** @internal */
    runDocumentUpdateTriggers(before: MongoStoreDocument, after: MongoStoreDocument) {
        const verbose = this._server.getConfig().verbose
        for(var index in this._documentUpdateTriggers) {
            if(this._documentUpdateTriggers[index].collection == before.collection.collectionID) {
                if(verbose) {
                    console.log(`MONGOSTORE: Triggered documentUpdate trigger for collection ${before.collection.collectionID}`)
                }
                this._documentUpdateTriggers[index].trigger(this._server.admin(), before, after)
            }
        }
    }
    /** @internal */
    runDocumentDeletedTriggers(deleted: MongoStoreDocument) {
        const verbose = this._server.getConfig().verbose
        for(var index in this._documentDeleteTriggers) {
            if(this._documentDeleteTriggers[index].collection == deleted.collection.collectionID) {
                if(verbose) {
                    console.log(`MONGOSTORE: Triggered documentDelete trigger for collection ${deleted.collection.collectionID}`)
                }
                this._documentDeleteTriggers[index].trigger(this._server.admin(), deleted)
            }
        }
    }
}
class MongoStoreDocumentTrigger {
    collection: string
    constructor(collection: string) {
        this.collection = collection
    }
}
class MongoStoreGetTrigger extends MongoStoreDocumentTrigger {
    trigger: (admin: MongoStoreAdmin, document: MongoStoreDocument) => void
    constructor(collection: string, trigger: (admin: MongoStoreAdmin, document: MongoStoreDocument) => void) {
        super(collection)
        this.trigger = trigger
    }
}
class MongoStoreDeletedTrigger extends MongoStoreDocumentTrigger {
    trigger: (admin: MongoStoreAdmin, deleted: MongoStoreDocument) => void
    constructor(collection: string, trigger: (admin: MongoStoreAdmin, deleted: MongoStoreDocument) => void) {
        super(collection)
        this.trigger = trigger
    }
}
class MongoStoreUpdatedTrigger extends MongoStoreDocumentTrigger {
    trigger: (admin: MongoStoreAdmin, before: MongoStoreDocument, after: MongoStoreDocument) => void
    constructor(collection: string, trigger: (admin: MongoStoreAdmin, before: MongoStoreDocument, after: MongoStoreDocument) => void) {
        super(collection)
        this.trigger = trigger
    }
}

class MongoStoreAddedTrigger extends MongoStoreDocumentTrigger {
    trigger: (admin: MongoStoreAdmin, added: MongoStoreDocument) => void
    constructor(collection: string, trigger: (admin: MongoStoreAdmin, added: MongoStoreDocument) => void) {
        super(collection)
        this.trigger = trigger
    }
}