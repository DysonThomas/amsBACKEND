const express = require("express");
const mysql = require("mysql2");
const app = express();
app.use(express.json());
const PORT = 3000;

app.get("/",(req,res)=>{
    res.send("running");

})

app.listen(PORT,"0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const db = mysql.createPool({
    connectionLimit:100,
    host:"localhost",
    user:"root",
    password:"Qwerty3!",
    database:"ams",
    port: 3306
})

db.getConnection((err,connection)=>{
    if(err){
     console.error("DB connection failed: ", err);
    return;
    } 
    console.log ("DB connected successful: " + connection.threadId)    
    connection.release();
});
app.post("/users",(req,res)=>{
     const {userID,userName,faceembed} = req.body;
    const faceembedJson = JSON.stringify(faceembed);

    db.query(
        "INSERT INTO userreg(userID, userName, Faceembed) VALUES (?, ?, ?)",
         [userID,userName, faceembedJson],
         (err, result) => {
               if (err) {
                res.status(500).send("Database error");
            } else {
                res.send("User inserted successfully");
            }
         }
        
    )
});

app.get("/allusers",(req,res)=>{

    db.query("SELECT * FROM userreg",(err, results)=>{
        if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }
      const users = results.map(row => ({
      userID: row.userID,
      userName: row.userName,
    faceembed: row.Faceembed 
    }));
        res.json(users);
    });
});

app.post("/log", (req, res) => {
  const { userID, detected_time } = req.body;

  db.query(
    "INSERT INTO face_logs (userID, detected_time) VALUES (?, ?)", 
    [userID, detected_time],
    (err, result) => {
      if (err) {
        console.error("Database error: ", err);
        res.status(500).send("Database error");
      } else {
        res.send("Log inserted successfully");
      }
    }
  );
});

