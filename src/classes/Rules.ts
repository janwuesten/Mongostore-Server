import { Db, Document } from 'mongodb'

export type MongoStoreRules = {
    (store: Db, req: MongoStoreRulesRequest, res: MongoStoreRulesResponse): Promise<void>
}
export class MongoStoreRulesResponse {
    /** Allow getting a document by ID */
    get: boolean
    /** Allows getting a document by Query */
    find: boolean
    /** Allow adding a document */
    add: boolean
    /** Allow deleting a document by ID */
    delete: boolean
    /** Allows deleting a document by Query */
    deleteByFind: boolean
    /** Allow updating a document by ID */
    update: boolean
    /** Allows updating a document by Query */
    updateByFind: boolean
    /** Allow setting a document by ID */
    set: boolean
    /** Allows setting a document by Query */
    setByFind: boolean
    constructor() {
        this.get = false
    }
    /** Allows all reading action */
    allowRead() {
        this.get = true
        this.find = true
    }
    /** Allows all writing actions */
    allowWrite() {
        this.add = true
        this.delete = true
        this.deleteByFind = true
        this.update = true
        this.updateByFind = true
        this.set = true
        this.setByFind = true
    }
}
export class MongoStoreRulesRequest {
    collection: string
    id: string
    document: Document
    update: Document
    store: Db
}
