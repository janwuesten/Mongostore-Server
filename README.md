# Mongostore-Server

# Introduction
Mongostore server is a Node.js server for "serverless" communication between a Client (e.g. a Website) and a MongoDB.
While it isn't real serverless, because you will need to run the Mongostore-Server, it features some aspects of a serverless environment like accessing your MongoDB without writing APIs for each request type.

It is heavily inspired by the Google Firebase environment and tries to bring features like [Google Firebase Firestore](https://firebase.google.com/docs/firestore), [Google Firebase Functions](https://firebase.google.com/docs/functions) and [Google Firebase Triggers](https://firebase.google.com/docs/functions/firestore-events) as well as [Google Firebase Hosting](https://firebase.google.com/docs/hosting) with a similar syntax to a self-hosted environment.

## Server features
- Access your MongoDB from your Client without the need of serversite API. You can limit whitch documents a client can access through Mongostore Rules.
- Easily create serversite functions that can easily be run from your client.
- Create Triggers for your MongoDB collections
- Hosting static Websites like Vue.js projects.

## Client Libraries
- [Node.js client lib](https://github.com/janwuesten/Mongostore)

# Getting started
> This getting started guide focuses on the server site. For client site please use the getting started guide for the client library.

To start creating a Mongostore Server you need to create a Node.js project (recommended) or use a existing one. Using Typescript is not required but strongly recommended. All guides will use Typescript.
```cmd
REM Create new project
mkdir my-mongostore-server
cd my-mongostore-server
npm init

REM Install typescript as a dev dependency
npm install -D typescript
mkdir src
tsc --init

REM Install mongostore-server
npm install mongostore-server
```

Edit the tsconfig.json and enter the following configuration:
```json
{
    "compilerOptions": {
        "module": "commonjs",
        "target": "es2020",
        "declaration": true,
        "esModuleInterop": true,
        "outDir": "./dist",
        "stripInternal": true
    },
    "include": [
        "src/**/*"
    ]
}
```

Edit your package.json and add the following information:
```json
{
    [...]
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "files": [
        "/dist"
    ],
    "scripts": {
        "build": "tsc",
        "start": "node dist/index.js"
    },
    [...]
}
```

Create a index.ts in the src/ directory with the following content:

```ts
import { MongoStoreServer } from "mongostore-server"

const server = new MongoStoreServer()
server.setConfig({
    port: 80,
    verbose: true,
    mongodb: {
        database: "mongostore_database",
        url: "mongodb://localhost:27017/"
    }
});
server.store().setRules(async (req, res, {admin}) => {
    
});
server.start();
```

You can now build your server with `npm run build`.

# Configuration examples

## Server configuration examples

The server is configurable through the setConfig method:
```ts
server.setConfig({
    port: 80,
    verbose: true,
    mongodb: {
        database: "mongostore_database",
        url: "mongodb://localhost:27017/"
    }
});
```

## Rule configuration examples

With store rules you can choose which documents can be read, updated, deleted and listed depending on the user that request the document.

```ts
server.store().setRules(async (req, res, {admin}) => {
    if(req.doc.collection.collectionID == "test") {
        // All documents from collection "test"
        // Allow read and write
        res.allowRead()
        res.allowWrite()
    }else if(req.doc.data().allowRead === true) {
        // All documents with a field "allowRead" that is true
        // Allow getting (through document id)
        res.get = true
        // Deny finding through query search
        res.find = false
    }
});
```