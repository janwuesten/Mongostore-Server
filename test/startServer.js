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
server.store().setRules(async (req, res, {admin}) => {
    let settings = await admin.store().collection("settings").where("settings_id", "==", "allowReadAndWrite").get()
    if(settings.success && settings.doc.data().value === true) {
        res.allowRead()
        res.allowWrite()
    }
});
server.triggers().documentUpdate("test", async (added) => {
    await added.ref.update({
        response: false
    })
    await added.ref.get()
    console.log("Document update")
})
server.functions().http("test", (req, res, {admin}) => {
    res.json({"test": true})
})
server.start();