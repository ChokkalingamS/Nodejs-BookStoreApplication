import {client} from './index.js'


async function getBooks(userData)
{
    if(userData)
    {
        return await client.db('Books').collection('books').find(userData).toArray();
    }

        return await client.db('Books').collection('books').find().toArray();

}


async function getBooksById(userData)
{
    return await client.db('Books').collection('books').findOne(userData)
}


async function updateBookData(userData)
{
    return await client.db('Books').collection('books').updateOne(userData[0],userData[1])
}

async function orderBook(userData)
{
    return await client.db('Books').collection('OrderedBooks').insertOne(userData)
}

async function getorderBookData(userData)
{
    return await client.db('Books').collection('OrderedBooks').findOne(userData)
}

async function getorderBooks(userData)
{
    if(userData)
    {
    return await client.db('Books').collection('OrderedBooks').findOne(userData)
    }
    return await client.db('Books').collection('OrderedBooks').find().toArray()
}

async function UpdateorderBook(userData)
{
    return await client.db('Books').collection('OrderedBooks').updateOne(userData[0],userData[1])
}


async function getCartData(userData)
{
    return await client.db('Books').collection('Cart').findOne(userData)    
}

async function   AddCartData(userData)
{
    return await client.db('Books').collection('Cart').insertOne(userData)
}

async function  UpdateCartData(userData)
{
    return await client.db('Books').collection('Cart').updateOne(userData[0],userData[1])
}



async function getData(userData)
{
    return await client.db('Books').collection('books').distinct(userData)
}

async function getNewBooks()
{
    return await client.db('Books').collection('NewArrivals').find().toArray();
}

async function DeleteBook(userData)
{

  return client.db('Books').collection('books').deleteOne(userData);
}



export {getBooks,getBooksById,updateBookData,orderBook,getorderBookData,UpdateorderBook,getorderBooks, getCartData,
    UpdateCartData,getData,getNewBooks,DeleteBook,
    AddCartData,}