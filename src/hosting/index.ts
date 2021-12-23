import { MongoStoreServer } from "..";
import express, { Express } from "express"
import fs from "fs"
import path from "path"

export class MongoStoreHosting {
    private _server: MongoStoreServer
    private _absolutePath: string
    private _publicDir: string

    constructor(server: MongoStoreServer) {
        this._server = server
    }

    private get express(): Express {
        return this._server.express()
    }

    public(publicDir, absolutePath): void {
        this._absolutePath = absolutePath
        this._publicDir = publicDir
        this.express.use(express.static(this._publicDir))
    }
    error(errorPage): void {
        if(!this._publicDir || !this._absolutePath) {
            console.error("MONGOSTORE: You need to set the public directory first");
            return
        }
        this.express.get('*', (req, res): void => {
            res.sendFile(path.join(this._absolutePath, this._publicDir, errorPage))
        })
    }
    singlePageApp(index: string = "index.html"): void {
        if(!this._publicDir || !this._absolutePath) {
            console.error("MONGOSTORE: You need to set the public directory first");
            return
        }
        this.express.get('*', (req, res): void =>{
            let indexFile = path.join(this._absolutePath, this._publicDir, index)
            if(fs.existsSync(indexFile)) {
                res.sendFile(indexFile)
            }else{
                res.status(404)
                res.send("Cannot GET /")
            }
        })
    }
}