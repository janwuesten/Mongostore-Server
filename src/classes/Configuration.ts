export class MongoStoreConfig {
    port: number = 500
    mongodb: {
        url: string
        database: string
    }
    verbose?: boolean = false
}