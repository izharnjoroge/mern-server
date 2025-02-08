const jwt = require("jsonwebtoken")



function verifyToken(req,res,next){
    let token;
    let header = req.headers.Authorization || req.headers.authorization;

    if(header && header.startsWith("Bearer")){
        token = header.split(" ")[1];

        if(!token){
            return  res.status(401).json({message:"Missing token,access denied"})
        }

        try {
            const decode = jwt.verify(token,process.env.JWT_SECRET)
            req.user = decode;
            console.log("user",req.user)
            return next()
        } catch (error) {
            res.status(400).json({message:"Invalid Token"})
        }


    }else{
        return  res.status(401).json({message:"Missing token,access denied"})
    }
}


module.exports = verifyToken