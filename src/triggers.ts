import { MongoStoreServer } from "."
import { MongoStoreDocument } from "./admin/store"

export type MongoStoreTriggerDocumentTrigger = (document: MongoStoreDocument, { admin: MongoStoreAdmin }) => void
export type MongoStoreTriggerDocumentUpdateTrigger = (before: MongoStoreDocument, after: MongoStoreDocument, { admin: MongoStoreAdmin }) => void

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
    documentGet(collection: string, trigger: MongoStoreTriggerDocumentTrigger) {
        this._documentGetTriggers.push(new MongoStoreGetTrigger(collection, trigger))
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd documentGet trigger for collection ${collection}`)
        }
    }
    documentAdd(collection: string, trigger: MongoStoreTriggerDocumentTrigger) {
        this._documentAddTriggers.push(new MongoStoreAddedTrigger(collection, trigger))
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd documentAdd trigger for collection ${collection}`)
        }
    }
    documentUpdate(collection: string, trigger: MongoStoreTriggerDocumentUpdateTrigger) {
        this._documentUpdateTriggers.push(new MongoStoreUpdatedTrigger(collection, trigger))
        if(this._server.getConfig().verbose) {
            console.log(`MONGOSTORE: Registerd documentUpdate trigger for collection ${collection}`)
        }
    }
    documentDelete(collection: string, trigger: MongoStoreTriggerDocumentTrigger) {
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
                this._documentGetTriggers[index].trigger(document, {
                    admin: this._server.admin()
                })
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
                this._documentAddTriggers[index].trigger(added, {
                    admin: this._server.admin()
                })
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
                this._documentUpdateTriggers[index].trigger(before, after, {
                    admin: this._server.admin()
                })
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
                this._documentDeleteTriggers[index].trigger(deleted, {
                    admin: this._server.admin()
                })
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
    trigger: MongoStoreTriggerDocumentTrigger
    constructor(collection: string, trigger: MongoStoreTriggerDocumentTrigger) {
        super(collection)
        this.trigger = trigger
    }
}
class MongoStoreDeletedTrigger extends MongoStoreDocumentTrigger {
    trigger: MongoStoreTriggerDocumentTrigger
    constructor(collection: string, trigger: MongoStoreTriggerDocumentTrigger) {
        super(collection)
        this.trigger = trigger
    }
}
class MongoStoreUpdatedTrigger extends MongoStoreDocumentTrigger {
    trigger: MongoStoreTriggerDocumentUpdateTrigger
    constructor(collection: string, trigger: MongoStoreTriggerDocumentUpdateTrigger) {
        super(collection)
        this.trigger = trigger
    }
}

class MongoStoreAddedTrigger extends MongoStoreDocumentTrigger {
    trigger: MongoStoreTriggerDocumentTrigger
    constructor(collection: string, trigger: MongoStoreTriggerDocumentTrigger) {
        super(collection)
        this.trigger = trigger
    }
}