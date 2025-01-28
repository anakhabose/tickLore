const userSchema = require('../model/userModel');

const checkSession = (req,res,next)=>{
    if(req.session.user){
        next();
    }else{
        res.redirect('/user/login')
    }
};
 const checkBlockStatus= async (req, res, next) => {
        try {
            if (req.session && req.session.user) {
                const user = await userSchema.findById(req.session.user);
                
                if (user && !user.status) {
                    delete req.session.user;
                    return res.redirect('/user/login');
                }
                next();
            } else {
                next();
            }
        } catch (error) {
            console.error("Block status check error:", error);
            next();
        }
    };

const isLogin = (req,res,next)=>{
    if(req.session.user){
        res.redirect('/user/home');
    }else{
        next();
    }
}

module.exports = {checkSession,isLogin,checkBlockStatus};