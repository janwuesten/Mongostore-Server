export class MongoStoreConfig {
    port: number = 500
    mongodb: {
        url: string
        database: string
    }
    auth?: {
        authCollectionPrefix: string
        usernameAuth: boolean
    }
    verbose?: boolean = false
}