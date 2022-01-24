import express from 'express'
import {createUser,getUser,updateUser,PasswordGenerator,getAllUsers} from './UserDb.js'
import jwt from 'jsonwebtoken'
import dotenv from "dotenv";
import  Mail  from "./Mail.js";
import bcrypt from 'bcrypt'
import {auth} from './Token.js'
import {UpdateCartData,UpdateorderBook} from './BooksDb.js'
import {client} from './index.js'
dotenv.config();
const router=express.Router()


// Signup
router.route('/signup')
.post(async(request,response)=>{

    const {FirstName,LastName,Email,Password}=request.body;

    if(!(FirstName&&LastName&&Email&&Password))
    {
        return response.status(400).send({Msg:'All Fields Required'})
    }

    if(Password.length<8)
    {
        return response.status(400).send({Msg:'Password Must Be Longer'})    
    }

    const getData=await getUser({Email});

    if(getData)
    {
        return response.status(400).send({Msg:'User Already Exists'}) 
    }
    const date=new Date()
    const TimeStamp=`${date.toLocaleDateString()},${date.toLocaleTimeString()}`;

    const hashedPassword=await PasswordGenerator(Password);

    const SignupToken=jwt.sign({id:date.toLocaleTimeString()},process.env.key)

    const create = await createUser({
      FirstName,
      LastName,
      Email,
      Password: hashedPassword,
      TimeStamp,
      Login:'',
      Address:'',
      Mobile:'',
      Status: "InActive",
      User:'User',
      SignupToken,
    });
    const {insertedId}= create;
    if(!insertedId)
    {
        return response.status(500).send({Msg:'Error Occurred'})
    }
    const link=`https://bookstore--application.herokuapp.com/user/verification/${SignupToken}`;
    const Message=`<b>Greetings ${FirstName} ${LastName}</b>
                   <p>Welcome to the Book Store </p>
                   <p>Your Account has been Successfully Created</p>
                   <a href=${link}>Click The Link To Complete the Verification Process</a>
                   <br/><br/>
                   <b>Two step verification is Mandatory to activate the account</b>
                   <br/>
                   <p>Regards</p>
                   <p>Book Store Team</p>`;

    const responseMsg=`Mail Sent for Verification`;

    const obj={Email,Message,response,responseMsg}

    Mail(obj);
})


// Two Step Verification
router.route('/verification/:id')
.get(async (request,response)=>{
    const {id}=request.params

    
    const getData=await getUser({SignupToken:id});

    if(!getData)
    {
        return response.status(400).send({Msg:'Not a Valid link'})
    }

    const {_id,SignupToken}=getData;

    const date=new Date();
    const Created=`${date.toLocaleDateString()},${date.toLocaleTimeString()}`

    const Activate = await updateUser([
      { _id },
      {
        $set: { Status: "Active", ActivatedTime: Created },
        $unset: { SignupToken },
      },
    ]);

    const{modifiedCount}=Activate;
    if(!modifiedCount)
    {
        return response.status(500).send({Msg:'Error Occurred'})
    }
    return response.redirect(`https://book-storeapplication.netlify.app/tverification`)
})



// Login
router.route('/login')
.post(async (request,response)=>{
    const {Email,Password}=request.body;

    const getData=await getUser({Email});
    if(Password.length<8)
    {
        return response.status(400).send({Msg:'Password Must Be longer'})
    }

    if(!getData)
    {
        return response.status(404).send({Msg:'User Not Found'})
    }

    const {_id,Status,Password:dbPassword,User,FirstName}=getData;

    if(Status==='InActive')
    {
      return response
        .status(400)
        .send({ Msg:'Please Complete Verification' });
    }

    const passwordMatch = await bcrypt.compare(Password, dbPassword);
    const date=new Date();
    const loginTime=`${date.toLocaleDateString()},${date.toLocaleTimeString()}`
    const token = jwt.sign({ id:_id}, process.env.key,{ expiresIn: '24h' });

    if (!passwordMatch) 
    {
      return response
      .status(400)
      .send({ Msg: "Invalid login credentials : Password" });  
    }
    
    
    const update=await updateUser([{_id},{$set:{Login:loginTime}}])

    
    return response.send({msg: "Login successful",token,User,FirstName,Email})

})


// Forgot Password
router.route('/forgotpassword')
.post(async (request,response)=>{
    const {Email}=request.body;
    if(!Email)
    {
        return response.status(400).send({Msg:"All Fields Required"})
    }

    const getData=await getUser({Email});

    if(!getData)
    {
        return response.status(404).send({Msg:"Invalid Credentials"})
    }

    const {_id,FirstName,LastName}=getData
    const token = jwt.sign({ id:_id }, process.env.key);

    const update = await updateUser([{_id},{$set:{Password:token}}]);
    const {modifiedCount}=update;
  
    if(!modifiedCount)
    {
      return response
        .status(400)
        .send({ msg: "Error Occurred" });
    }
    
    const link = `https://bookstore--application.herokuapp.com/user/forgotpassword/verify/${token}`;
    const Message=`<p>Greetings ${FirstName} ${LastName}</p>
    <p>Forgot Password</p>
    <a href=${link}>Click the link to reset the password </a>
    <p>Regards</p>
    <p>Book Store Team</p>`
    
    const responseMsg='Password Reset Link Sent To Email'
    
    const obj={Email,Message,response,responseMsg}
   
    Mail(obj);

})


// Forgot Password Verification
router.route('/forgotpassword/verify/:id')
.get(async (request,response)=>{
    
    const {id:token}=request.params
    if(!token)
    {
        return response.status(400).send({Msg:"Error Occurred"})
    }

    const tokenVerify = await getUser({ Password: token });
    
  if (!tokenVerify) {
    return response.status(400).send({ msg: "Link Expired" });
  }
  return response.redirect(`https://book-storeapplication.netlify.app/updatepassword/${token}`)

})


// Change Password
router.route('/updatepassword')
.post(async (request,response)=>
{
    const {token,Password}=request.body;

    if(!(token&&Password))
    {
        return response.status(400).send({Msg:"All Fields Required"})
    }

    const data = await getUser({ Password: token });

   if(!data)
   {
    return response.status(400).send({Msg:'Link Expired'})
   }

  const { _id } = data;
   
  if (Password.length < 8) 
  {
    return response.status(401).send({Msg:"Password Must be longer"});
  }

  const hashedPassword = await PasswordGenerator(Password);

  const update = await updateUser([{_id},{$set:{Password:hashedPassword}}]);

  const {modifiedCount}=update

  if(!modifiedCount)
  {
    return response
      .status(400)
      .send({ msg: "Error Occured" });
  }
    
  return response.send({Msg:'Password Changed Successfully'});
    
})


// User Profile Update
router.route('/profileupdate')
.put(auth,async (request,response)=>{
    const {FirstName,LastName,Email,Address,Mobile}=request.body;

    if(!(FirstName && LastName && Email && Address && Mobile))
    {
        return response.status(400).send({Msg:"All Fields Required"})
    }

    const getData=await getUser({Email})

    if(!getData)
    {
        return response.status(404).send({Msg:"User Not Found"})
    }

    const {_id}=getData

    const update=await updateUser([{_id},{$set:{FirstName,LastName,Address,Mobile}}])
    
    const updateCart=await UpdateCartData([{Email},{$set:{FirstName,LastName,Address,Mobile}}])

    const updateOrder=await UpdateorderBook([{Email},{$set:{FirstName,LastName,Address,Mobile}}])

    const {modifiedCount}=update

    if(!modifiedCount)
    {
        return response.status(400).send({Msg:'No Changes'})
    }

   return  response.send({Msg:"Profile Updated"})

})


// Get user details
router.route('/getuser')
.post(auth,async(request,response)=>{
  const {Email}=request.body
  if(!Email)
  {
    return response.status(400).send({Msg:"All Fields Required"})
  }

  
  const obj={FirstName:1,LastName:1,Email:1,Address:1,Mobile:1,Status:1,User:1}
  const data=await client.db('Books').collection('Users').findOne({Email},{projection:obj})
  if(!data)
  {
    return response.status(404).send({Msg:"User not Found"})
  }
  return response.send(data)
})


// Get All Users
router.route('/getallusers')
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
 
    const {User}=check
    if(User==='Admin')
    {
        const userData=await getAllUsers({User:{$eq:'User'}})
        return response.send(userData);
    }
    return response.status(401).send({Msg:"Not Authorized"})
})





export const userRouter=router;