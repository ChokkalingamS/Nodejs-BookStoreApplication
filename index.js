import {MongoClient} from 'mongodb'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import {userRouter} from './User.js'
import {bookRouter} from './Books.js'

export const app=express()
dotenv.config()

// .env
const Mongo_URL=process.env.MONGO_URL
const port=process.env.PORT;

// Middleware
app.use(cors())
app.use(express.json())
app.use('/user',userRouter)
app.use('/data',bookRouter)

// MongoDB Connection
async function CreateConnection()
{
    const client=new MongoClient(Mongo_URL);
    await client.connect()
    console.log("MongoDB Connected");
    return client
}

export const client=await CreateConnection()

// Server
app.get('/',(request,response)=>{
    response.send('Books Store Application')
})

app.listen(port,()=>{
    console.log("Server Started-",port);
})