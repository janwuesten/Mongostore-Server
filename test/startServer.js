const { MongoStoreServer } = require("../dist/index");

const server = new MongoStoreServer();
server.setConfig({
    port: 5000,
    verbose: true,
    mongodb: {
        database: "mongostore_test",
        url: "mongodb://localhost:27017/"
    }
});
server.setRules((store, req, res) => {
    res.allowRead();
    res.allowWrite();
});

server.start();