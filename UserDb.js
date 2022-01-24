import {client} from './index.js'
import bcrypt from 'bcrypt'


async function createUser(userData)
{
    return client.db('Books').collection('Users').insertOne(userData);
}

async function getUser(userData)
{
    return client.db('Books').collection('Users').findOne(userData);
}

async function getAllUsers(userData)
{
    return client.db('Books').collection('Users').find(userData).toArray();
}


async function updateUser(userData)
{
    return client.db('Books').collection('Users').updateOne(userData[0],userData[1]);
}

async function PasswordGenerator(Password)
{
    const rounds=10;
    const salt=await bcrypt.genSalt(rounds) // Random string
    const hashedPassword=await bcrypt.hash(Password,salt);
    return hashedPassword;
}



export { createUser, getUser, updateUser, PasswordGenerator, getAllUsers };