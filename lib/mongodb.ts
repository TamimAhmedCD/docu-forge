import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI || ''
const options = {}

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function initializeMongoClient(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set')
  }

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      client = new MongoClient(process.env.MONGODB_URI, options)
      global._mongoClientPromise = client.connect()
    }
    return global._mongoClientPromise
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      client = new MongoClient(process.env.MONGODB_URI, options)
      clientPromise = client.connect()
    }
    return clientPromise
  }
}

export function getClientPromise(): Promise<MongoClient> {
  return initializeMongoClient()
}

// Default export for backward compatibility
export default {
  then: (onfulfilled?: ((value: MongoClient) => any) | null, onrejected?: ((reason?: any) => any) | null) => {
    return initializeMongoClient().then(onfulfilled, onrejected)
  },
} as any

export async function getDatabase(): Promise<Db> {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MongoDB URI to environment variables')
  }
  const mongoClient = await initializeMongoClient()
  return mongoClient.db('document-generator')
}
