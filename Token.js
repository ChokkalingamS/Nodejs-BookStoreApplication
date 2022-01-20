import jwt from 'jsonwebtoken'


const auth=async (request,response,next)=>{
    try 
    {
        const token=await request.header('x-auth-token')

        if(!token)
        {
            return response.status(401).send({Msg:'Unauthorized'})
        }

        const verify=jwt.verify(token,process.env.key)
        console.log(verify);
        next();
    } 
    catch (error)
    {
        response.status(403).send({Msg:error.message})
    }
}


export {auth}