const express = require("express");
const mysql = require("mysql2");
const app = express();
const cors = require("cors");
app.use(cors({
  origin: 'http://localhost:4200',  // Your Angular app URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
// For Web App

app.get("/getattendance",(req,res)=>{
      const {startDate, endDate} = req.query;
        if (!startDate || !endDate) {
    return res.status(400).send("Please provide startDate and endDate");
  }
   const sql = `
   SELECT f.userID AS empID,u.userName AS empName,
   DATE_FORMAT(MIN(f.detected_time), '%Y-%m-%d') AS date,
   DATE_FORMAT(MIN(f.detected_time), '%H:%i:%s') AS check_in,
   DATE_FORMAT(MAX(f.detected_time), '%H:%i:%s') AS check_out,
   TIMEDIFF(MAX(f.detected_time),
   MIN(f.detected_time)) AS duration from face_logs f 
   JOIN userreg u ON f.userID = u.userID
    where DATE(f.detected_time) BETWEEN ? AND ? GROUP BY f.userID, DATE(f.detected_time)
  `;
    db.query(sql, [startDate, endDate], (err, results) => {
    if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }        
        res.json(results);
   
    });
});

app.get("/getallemp",(req,res)=>{
    db.query("SELECT userID, userName FROM userreg",(err, results)=>{
        if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }
        res.json(results);
    } );
});   

app.get("/getspecificattendance",(req,res)=>{
      const {userID, startDate, endDate} = req.query; 
        if (!userID || !startDate || !endDate) {
    return res.status(400).send("Please provide userID, startDate and endDate");
  } 
    const sql = `SELECT f.userID AS empID,u.userName AS empName,
   DATE_FORMAT(MIN(f.detected_time), '%Y-%m-%d') AS date,
   DATE_FORMAT(MIN(f.detected_time), '%H:%i:%s') AS check_in,
    DATE_FORMAT(MAX(f.detected_time), '%H:%i:%s') AS check_out,
    TIMEDIFF(MAX(f.detected_time),mIN(f.detected_time)) AS duration from face_logs f 
   JOIN userreg u ON f.userID = u.userID
    where f.userID = ? AND DATE(f.detected_time) BETWEEN ? AND ? GROUP BY f.userID, DATE(f.detected_time) 
  `;
    db.query(sql, [userID, startDate, endDate], (err, results) => {
    if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }
        res.json(results);
    });
} );

// For Mobile App  