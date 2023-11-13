import { MongoClient } from 'mongodb'
import path,{dirname} from 'path'
import {fileURLToPath, pathToFileURL} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const settings = (await import(pathToFileURL(
    path.join(__dirname,'../settings.js')
).toString())).default;

class KeyvMongoDB {
    constructor() {
        const mongoUrl = `mongodb://${settings.mongodb.user}:${settings.mongodb.password}@${settings.mongodb.url}`

        this.collectionName = 'keyv'
        this.dbName = 'chat_bot'

        this.isReadyPromise =  MongoClient.connect(
            mongoUrl
        ).then(client=>{
            const db = client.db(this.dbName)
            return this.handleNewConnectionAsync(db)
        }).catch(this.connectionFailed)
    }

    connectionFailed(err) {
        throw err
    }

    async handleNewConnectionAsync(db) {
        this.db = db

        const collection = db.collection(this.collectionName)

        return this.setCollection(collection)
    }

    async setCollection(collection) {
        this.mongo = collection

        await this.mongo.createIndex(
            { key: 1 },
            {
                unique: true,
                background: true,
            },
        )

       await this.mongo.createIndex(
            { expiresAt: 1 },
            {
                expireAfterSeconds: 0,
                background: true,
            },
        )
    }

    async get(key) {
        await this.isReadyPromise

        const doc = await this.mongo.findOne({ key })

        if (doc === null) return

        return doc.value
    }

    async set(key, value, ttl) {
        await this.isReadyPromise

        const expiresAt =
            typeof ttl === 'number' ? new Date(Date.now() + ttl) : null

        return this.mongo.updateOne(
            { key },
            { $set: { key, value, expiresAt } },
            { upsert: true },
        )
    }

    async delete(key) {
        if (typeof key !== 'string') return false

        await this.isReadyPromise

        const obj = await this.mongo.deleteOne({ key })

        return obj.deletedCount > 0
    }

    async clear() {
        await this.isReadyPromise

        await this.mongo.deleteMany({ key: new RegExp(`^${this.namespace}:`) })
    }
}

export default KeyvMongoDB
