import { Db, Document } from "mongodb";

class MongoStoreTriggers {
    documentGetTriggers: MongoStoreGetTrigger[];
    documentAddTriggers: MongoStoreAddedTrigger[];
    documentUpdateTriggers: MongoStoreUpdatedTrigger[];
    documentDeleteTriggers: MongoStoreDeletedTrigger[];
    constructor() {
        this.documentGetTriggers = [];
        this.documentAddTriggers = [];
        this.documentUpdateTriggers = [];
        this.documentDeleteTriggers = [];
    }
    documentGet(collection: string, trigger: (store: Db, document: Document) => void) {
        this.documentGetTriggers.push(new MongoStoreGetTrigger(collection, trigger))
    }
    documentAdd(collection: string, trigger: (store: Db, added: Document) => void) {
        this.documentAddTriggers.push(new MongoStoreAddedTrigger(collection, trigger))
    }
    documentUpdate(collection: string, trigger: (store: Db, before: Document, after: Document) => void) {
        this.documentUpdateTriggers.push(new MongoStoreUpdatedTrigger(collection, trigger))
    }
    documentDelete(collection: string, trigger: (store: Db, deleted: Document) => void) {
        this.documentDeleteTriggers.push(new MongoStoreDeletedTrigger(collection, trigger))
    }
    runDocumentGetTrigers(collection: string, store: Db, document: Document) {
        for(var index in this.documentGetTriggers) {
            if(this.documentGetTriggers[index].collection == collection) {
                this.documentGetTriggers[index].trigger(store, document);
            }
        }
    }
    runDocumentAddTrigers(collection: string, store: Db, added: Document) {
        for(var index in this.documentAddTriggers) {
            if(this.documentAddTriggers[index].collection == collection) {
                this.documentAddTriggers[index].trigger(store, added);
            }
        }
    }
    runDocumentUpdateTriggers(collection: string, store: Db, before: Document, after: Document) {
        for(var index in this.documentUpdateTriggers) {
            if(this.documentUpdateTriggers[index].collection == collection) {
                this.documentUpdateTriggers[index].trigger(store, before, after);
            }
        }
    }
    runDocumentDeletedTriggers(collection: string, store: Db, deleted: Document) {
        for(var index in this.documentDeleteTriggers) {
            if(this.documentDeleteTriggers[index].collection == collection) {
                this.documentDeleteTriggers[index].trigger(store, deleted);
            }
        }
    }
}
class MongoStoreGetTrigger {
    collection: string;
    trigger: (store: Db, document: Document) => void;
    constructor(collection: string, trigger: (store: Db, document: Document) => void) {
        this.collection = collection;
        this.trigger = trigger;
    }
}
class MongoStoreDeletedTrigger {
    collection: string;
    trigger: (store: Db, deleted: Document) => void;
    constructor(collection: string, trigger: (store: Db, deleted: Document) => void) {
        this.collection = collection;
        this.trigger = trigger;
    }
}
class MongoStoreUpdatedTrigger {
    collection: string;
    trigger: (store: Db, before: Document, after: Document) => void;
    constructor(collection: string, trigger: (store: Db, before: Document, after: Document) => void) {
        this.collection = collection;
        this.trigger = trigger;
    }
}

class MongoStoreAddedTrigger {
    collection: string;
    trigger: (store: Db, added: Document) => void;
    constructor(collection: string, trigger: (store: Db, added: Document) => void) {
        this.collection = collection;
        this.trigger = trigger;
    }
}
export default new MongoStoreTriggers();