const express = require('express');
const bodyParser = require('body-parser');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs');
const app = express();
var PORT = process.env.PORT || 3000;
const db = knex({
  client: 'pg',
  connection: {
    connectionString : process.env.DATABASE_URL,
    ssl: false
  }
});
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

   //testing connection
   app.get('/', (req,res)=>{
     res.json("successfully connected to the server");
   });
    //login API
    app.post('/api/login', (req,res)=>{
      const{email,password}= req.body;
      db.select('*').from('cm_user').where('email','=',email).then(data=>
       {
         if(bcrypt.compareSync(password, data[0].password))
         {
           db.update({
             last_login: new Date()
           }).into('cm_user').then(()=>
           res.json({status:"200",message:"success",data:data[0]}))
           .catch(err=> {res.status(400).json("error"), console.log(err);});
         }else
         {
          res.json({status:"200",message:"wrong password",data:""});
         }
       }
     ).catch(err=>{res.status(403).json({status:"403",message:"failed to login",data:""})});
    });



  // register user
    app.post('/api/signup',(req,res)=>
    {
      const{username,email,password,phone}= req.body;
      let hash = bcrypt.hashSync(password);
      db.select('email').from('cm_user').where('email','=',email)
      .then( data=>{
          if(data[0] != null)
          {
            res.json("Already registered.")
          }
          else
          {
            db.transaction(trx =>{
                 trx.insert({
                   username:username,
                   email: email,
                   password : hash,
                   created_on: new Date()
                 })
                 .into('cm_user')
                 .returning(['email','user_id'])
                 .then(data =>
                   {
                     return trx('cm_profile')
                     .returning('*')
                     .insert({
                       user_id: data[0].user_id,
                       phone: phone,
                       email: data[0].email
                     }).then(user => {res.json(user[0])})
                     })
                     .then(trx.commit)
                     .catch(trx.rollback)
            }).catch(err => {res.status(400).json("unable to register user")});
          }
      }).catch(()=> res.status(400).json("Error! Try again later."));

    });

    //profile api
    app.post('/api/profile',(req,res)=>{
      const{user_id}= req.body;
      db.select('*').from('cm_profile').where('user_id','=',user_id).then(data=>{res.json(data[0])}).catch(()=> res.status(400).json("error"));
    });

    //update profile data
     app.post('/api/updateprofile',(req,res)=>{
       const{first_name,last_name,dob,user_id}= req.body;
     db.update({
        first_name : first_name,
        last_name : last_name,
        dob : dob
      }).into('cm_profile').where('user_id','=',user_id).then(()=>res.json("Successfully updated")).catch(()=> res.status(400).json("error"));
     });


app.listen(PORT,()=>{console.log('server is running on port '+PORT);});
