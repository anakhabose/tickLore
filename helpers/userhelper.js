const userSchema = require('../model/userModel');

module.exports={
    addUser:(data)=>{
        return new Promise((resolve,reject)=>{
            const userObj = new userSchema(data);
            userObj.save().then((data)=>{
                if(data){
                    resolve({status:true})
                }else{
                    reject({status:false})
                }
            })
        })
    }
}