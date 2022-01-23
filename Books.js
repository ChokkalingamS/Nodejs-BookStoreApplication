import express from 'express'
import  Mail  from "./Mail.js";
import {client} from './index.js'
import {
  getBooks,InsertBook,
  getBooksById,
  updateBookData,
  orderBook,
  getorderBookData,
  UpdateorderBook,
  getorderBooks,
  getCartData,
  UpdateCartData,
  AddCartData,
  getData,getNewBooks,DeleteBook,getcustomerBooks,BookAvailability
} from "./BooksDb.js";

import {ObjectId} from 'mongodb'
import {getUser} from './UserDb.js'

import {auth} from './Token.js'

const router=express.Router()

router.route('/addbook')
.post(auth,async (request,response)=>{
    const {BookName,Author,Description,Language,Publisher,Imageurl,Price,Available,PublicationDate,Rating,Genre,Email} = request.body;
    if(!(BookName||Author||Description||Language||Publisher||Imageurl||Price||Available||PublicationDate||Rating||Genre))
    {
        return response.status(400).send({Msg:'All Fields Required'})
    }

    const check=await getUser({Email,User:'Admin'})
    if(!check)
    {
        return response.status(401).send({Msg:'UnAuthorized'})
    }

    const bookData={BookName,Author,Description,Language,Publisher,Imageurl,Price,Available,PublicationDate,Rating,Genre}

    const get =await BookAvailability(bookData)
    console.log(get);

    if(get)
    {
        return response.status(400).send({Msg:'Already Books Available'})
    }


    const insert=await InsertBook(bookData)

    if(!insert)
    {
        return response.status(400).send({Msg:'Error Occurred'})
    }    

    return response.send({Msg:'Books Added'})

})


router.route('/getbook')
.get(async (request,response)=>{

    const getData=await getBooks();

    if(!getData)
    {
        return response.status(404).send('Not Found')
    }

    response.send(getData)

})



router.route('/getbook/:id')
.get( async (request,response)=>{

    const {id}=request.params

    const getData=await getBooksById({_id:ObjectId(id)});

    if(!getData)
    {
        return response.status(404).send({Msg:'Book Unavailable'})
    }

    console.log(getData);
    return response.send(getData)


})


router.route('/getbook/:id')
.put( async (request,response)=>{

    const {id}=request.params;
    const {
      BookName,
      Author,
      Description,
      Language,
      Publisher,
      Imageurl,
      Price,
      Available,
      PublicationDate,
      Rating,
      Genre,
    } = request.body;

    if(!( BookName && Author && Description && Language && Publisher && Imageurl && Price && Available && PublicationDate && Rating))
    {
        return response.status(400).send({Msg:"All Fields Required"})
    }

    const getData=await getBooksById({_id:ObjectId(id)});

    if(!getData)
    {
        return response.status(404).send({Msg:'Not Found'})
    }

    const update = await updateBookData([
      { _id: ObjectId(id) },
      {$set:{
        BookName,
        Author,
        Description,
        Language,
        Publisher,
        Imageurl,
        Price,
        Available,
        PublicationDate,
        Rating,
        Genre,
      }}
    ]);

    
  const {modifiedCount}=update

  if(!modifiedCount)
  {
    return response
      .status(400)
      .send({ Msg: "No Changes" });
  }

//   const result=await getBooksById({_id:ObjectId(id)});  
  return response.send({Msg:'Book Updated'})

})


router.route('/getbooksbyauthor')
.get(async (request,response)=>{
    const {name}=request.query;

    const getData=await getBooks({Author:name});
    if(!getData)
    {
        return response.status(404).send({Msg:'Books Not found'})
    }
    return response.send(getData);
})

router.route('/getbooksbygenre')
.get(async (request,response)=>{
    const {genre}=request.query;

    const getData=await getBooks({Genre:genre});
    if(!getData)
    {
        return response.status(404).send({Msg:'Books Not found'})
    }
    return response.send(getData);
})

router.route('/orderbooks/:id')
.post(auth,async(request,response)=>{
    const {total,Email}=request.body;
    const {id}=request.params;

    const d = new Date();
    d.setDate(d.getDate() + 2);

    if(!(total && id && Email))
    {
        return response.status(400).send({Msg:"All Fields Required"});
    }

    const getUserData=await getUser({Email});

    if(!getUserData)
    {
        return response.status(404).send({Msg:'Not Found'})
    }

    const {FirstName,LastName,Mobile,Address,User}=getUserData;

    if(!(Mobile && Address))
    {
        return response.status(400).send({Msg:"Address or Mobile Should not be Empty"})
    }

    let  getBookData;
    try {
        getBookData=await getBooksById({_id:ObjectId(id)});
    } catch (error) 
    {
        return response.send({Msg:"Error Occured"})   
    }
    

    if(!getBookData)
    {
        return response.status(404).send({Msg:'Not Found'})
    }

    const { 
        _id,
        BookName,
        Author,
        Description,
        Language,
        Publisher,
        Imageurl,
        Price,
        Available,
        PublicationDate,
        Rating,
        Genre,
    }=getBookData

    if(Available===0)
    {
        return response.status(400).send({Msg:`Books Sold Out`})
    }

    if(Available<total)
    {
        return response.status(400).send({Msg:`Only ${Available} Books Left`})
    }

    const bookDetails={_id,BookName,Author,Description,Language,Publisher,Imageurl,Price:Price*total,total,
        PublicationDate,Rating,Genre,ExpectedDelivery:d.toString()}
        


    const getDetails=await getorderBookData({Email})

    if(getDetails)
    {
    
        const addData=await UpdateorderBook([{Email},{$push:{OrderedBooks:bookDetails}}])

        if(!addData)
        {
            return response.status(503).send({Msg:"Error Occurred"})
        }
    }
    else
    {
        const updateData=await orderBook({FirstName,LastName,Email,Mobile,Address,User,OrderedBooks:[bookDetails]})
       
        if(!updateData)
        {
            return response.status(503).send({Msg:"Error Occurred"})
        }
    }
    
    const update = await updateBookData([{_id:ObjectId(id)},{$set:{Available:Available-total}}])
    const {modifiedCount}=update;

    if(!modifiedCount)
    {
        return response
        .status(400)
        .send({ msg: "Error Occured" });   
    }

    const delCartData=await UpdateCartData([{Email},{$pull:{OrderedBooks:{_id}}}])

    if(!delCartData)
    {
        return response.status(503).send({Msg:"Error Occurred"})
    }

    
    const Message=`<b>Greetings ${FirstName} ${LastName}</b>
    <p>Book Ordered Successfully</p>
    <b>Order Summary</b>
    <p>Name : ${BookName}</p>
    <p>Author : ${Author}</p>
    <p>Total Books Ordered : ${total} Nos</p>
    <p>Bill Payment : Rs.${(Price*total)}</p>
    <p>Payment Method : Cash On Delivery</p>
    <b>Expected Delivery before ${d}</b>
    <p>Delivery Address</p>
    <p>${FirstName} ${LastName}</p>
    <p>${Address}</p>
    <p>Mobile : ${Mobile}</p><br/>
    <p>Regards,</p>
    <p>Book Store Team</p>`;
const responseMsg=`Books Ordered`;

const obj={Email,Message,response,responseMsg}
Mail(obj)

})




router.route('/getorderbooks')
.post(auth,async (request,response)=>{

    const {Email}=request.body
    if(!Email)
    {
        // const getData=await getorderBooks()
        // if(!getData)
        // {
        // return response.send({Msg:'Books Not Yet Ordered'})
        //  }
        // return response.send(getData)
        return response.status(404).send({Msg:'User Not Found'})

    }

    const getData=await getorderBooks({Email})
    if(!getData)
    {
        return response.send({Msg:'Books Not Yet Ordered'})
    }
    return response.send(getData)

})

router.route('/userOrders')
.post(auth,async(request,response)=>{
  const {Email}=request.body
  if(!Email)
  {
    return response.status(400).send({Msg:"All Fields Required"})
  }
  const check=await getUser({Email})
  if(!check)
  {
    return response.status(404).send({Msg:"User not Found"})
  }
  const {User}=check;
  if(User==='Admin')
  {
    const userData=await getcustomerBooks({User:{$eq:'User'}})
    return response.send(userData);
}
return response.status(401).send({Msg:"Not Authorized"})
  
})







router.route('/addtocart/:id')
.post(auth,async (request,response)=>{
    const {Email}=request.body;
    const {id}=request.params;
    console.log(Email,id);
    if(!(id && Email))
    {
        return response.status(400).send({Msg:"All Fields Required"});
    }

    const getUserData=await getUser({Email});

    if(!getUserData)
    {
        return response.status(404).send({Msg:'Not Found'})
    }

    const {FirstName,LastName,Mobile,Address,User}=getUserData

    const getBookData=await getBooksById({_id:ObjectId(id)});
    if(!getBookData)
    {
        return response.status(404).send({Msg:'Books Not Found'})
    }

    const { _id,BookName,Author,Description,Language,Publisher,Imageurl,Price,Available,PublicationDate,
        Rating,Genre}=getBookData

   const bookDetails={_id,BookName,Author,Description,Language,Publisher,Imageurl,Price,Available,
    PublicationDate,Rating,Genre}
    
   const checkBook=await getCartData({Email,OrderedBooks:{$elemMatch:{_id:ObjectId(id)}}})

if(checkBook)
{
    return response.status(400).send({Msg:'Book Already added to cart'})
}

const getDetails=await getCartData({Email})

if(getDetails)
{

    const addData=await UpdateCartData([{Email},{$push:{OrderedBooks:bookDetails}}])

    if(!addData)
    {
        return response.status(503).send({Msg:"Error Occurred"})
    }
}
else
{
    const updateData=await AddCartData({FirstName,LastName,Email,Mobile,Address,User,OrderedBooks:[bookDetails]})
   
    if(!updateData)
    {
        return response.status(503).send({Msg:"Error Occurred"})
    }
}

    return response.send({Msg:'Book Added to Cart'})

})

router.route('/deletecart/:id')
.delete(auth,async(request,response)=>{
    const {Email}=request.body
    const {id}=request.params

    if(!(Email && id))
    {
        return response.status(400).send({Msg:'All Fields Required'})
    }

    const getDetails=await getCartData({Email})

    if(!getDetails)
    {
        return response.status(404).send({Msg:'User Not Found'})
    }
    // const getBookData=await getBooksById({_id:ObjectId(id)});
    const delCartData=await UpdateCartData([{Email},{$pull:{OrderedBooks:{_id:ObjectId(id)}}}])
    if(!delCartData)
    {
        return response.status(404).send({Msg:'Book Not found'})
    }
    return response.send({Msg:'Book Removed from cart'})

})


router.route('/getcartdata')
.post(auth,async (request,response)=>{

    const {Email}=request.body
    console.log(Email);
    const getData=await getCartData({Email})
    if(!getData)
    {
        return response.status(400).send({Msg:'Not Found'})
    }
    return response.send(getData)

})


router.route('/get/:id')
.get(async (request,response)=>{
    const {id}=request.params
   
    if(!id)
    {
        return response.status(404).send({Msg:'Not Found'})
    }

    var get=await getData(id)
    // if(id==='Author')
    // {
         
    // }
    // else if(id==='Genre')
    // {
    //      get=await getData([{},{projection:{Genre:1,_id:0}},id])
    // }

    if(!get)
    {
        return response.status(404).send({Msg:'Not Found'})
    }

    return response.send(get)

})

router.route('/getnewarrivals')
.get(async (request,response)=>{
    const getBooks=await getNewBooks()
    if(!getBooks)
    {
        return response.status(404).send({Msg:'Books unavailable'})
    }
    return response.send(getBooks)
})


router.route('/deletebook/:id')
.delete(auth,async (request,response)=>{
        const{id}=request.params;
        if(!id)
        {
            return response.status(400).send({Msg:'Error Occured'})
        }
     const Del=await DeleteBook({_id:ObjectId(id)})
    if(!Del)
    {
        return response.status(400).send({Msg:'Error Occured'})
    }
    return response.send({Msg:"Book Removed Successfully "})

})




export const bookRouter=router