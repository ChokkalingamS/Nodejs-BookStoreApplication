import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export default function Mail(obj)
 {
    const {Email,Message,response,responseMsg}=obj;
    console.log(responseMsg);

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.email,
        pass: process.env.password,
      },
    });
    console.log(Email);
    const mailOptions = {
      from: process.env.email,
      to:Email,
      subject:"Mail from Book Store Application",
      html:Message,
    };
  
    transport.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log("err");
        return response.status(400).send('Error Occured')
      } else {
          return response.send({Msg:responseMsg})
        
      }
    });
  }
  