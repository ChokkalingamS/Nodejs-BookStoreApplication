import express from 'express'
import {createUser,getUser,updateUser,PasswordGenerator} from './UserDb.js'
import jwt from 'jsonwebtoken'
import dotenv from "dotenv";
import  Mail  from "./Mail.js";
import bcrypt from 'bcrypt'
import {auth} from './Token.js'
import {UpdateCartData,UpdateorderBook} from './BooksDb.js'
dotenv.config();
const router=express.Router()


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
    const link=`http://localhost:1000/user/verification/${SignupToken}`;
    const Message=`<b>Greetings ${FirstName} ${LastName}</b>
                   <p>Welcome to the Book Store </p>
                   <p>Your Account has been Successfully Created</p>
                   <a href=${link}>Click The Link To Complete the Verification Process</a>
                   <br/><br/>
                   <b>Two step verification is Mandatory to activate the account</b>
                   <br/>
                   <p>Regards</p>
                   <p>Book Store Team</p>`;
    const responseMsg=`Account Created`;

    const obj={Email,Message,response,responseMsg}

    Mail(obj);
})


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
  
   
    // return response.send({Msg:'Two Step Verification Completed'})
    return response.redirect(`http://localhost:3000/tverification`)
  
})




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

    const {_id,Status,Password:dbPassword}=getData;

    if(Status==='InActive')
    {
      return response
        .status(400)
        .send({ msg:'Account InActive' });
    }

    
    const passwordMatch = await bcrypt.compare(Password, dbPassword);
    const date=new Date();
    const loginTime=`${date.toLocaleDateString()},${date.toLocaleTimeString()}`
    const token = jwt.sign({ id:_id}, process.env.key,{ expiresIn: '24h' });

    if (!passwordMatch) 
    {
      return response
      .status(400)
      .send({ msg: "Invalid login credentials : Password" });  
    }
    
    
    const update=await updateUser([{_id},{$set:{Login:loginTime}}])

    // response.redirect("localhost:3000/Dashboard")
    return response.send({msg: "Login successful",token});



})

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
        return response.status(404).send({Msg:"User Not Found"})
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
    
    const link = `http://localhost:1000/user/forgotpassword/verify/${token}`;
    const Message=`<p>Greetings ${FirstName} ${LastName}</p>
    <p>Forgot Password</p>
    <a href=${link}>Click the link to reset the password </a>
    <p>Regards</p>
    <p>Book Store Team</p>`
    
    const responseMsg='Mail Sent'
    
    const obj={Email,Message,response,responseMsg}
   
    Mail(obj);

})


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
  
  // return response.send('Verification Completed')

  return response.redirect(`http://localhost:3000/updatepassword/${token}`)

})



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
  
//   const result = await getuser({ Mailid });
  
  return response.send({Msg:'Password Changed Successfully'});
    
})


router.route('/profileupdate')
.post(auth,async (request,response)=>{
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
        return response.status(400).send('UserData Already Exists')
    }

   return  response.send({Msg:"Profile Updated"})

})






export const userRouter=router;