const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const config = require("./config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = mysql.createPool(config);
const verifyToken = require("./verifyToken")

require("dotenv").config();

router.post("/users",(req,res)=>{
     const {userID,userName,faceembed} = req.body;
    const faceembedJson = JSON.stringify(faceembed);
    const query = "INSERT INTO userreg(userID, userName, Faceembed) VALUES (?, ?, ?)"
    pool.query(
        query,
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

router.get("/allusers",(req,res)=>{

    const query = "SELECT * FROM userreg";

    pool.query(query,(err, results)=>{
        if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }
      const users = results.map(row => ({
      userID: row.userID,
      userName: row.userName,
      isLoggedIn: row.isLoggedIn,
      faceembed: row.Faceembed,
      
    }));
        res.json(users);
    });
});
// For Login
router.post("/login", (req, res) => {
  const { userID, log_in_time } = req.body;
const query = "INSERT INTO face_logs (userID, log_in_time) VALUES (?, ?)"
  pool.query(
    query, 
    [userID, log_in_time],
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
// UpdateLog Table
router.put("/updateLog", (req, res) => {
  const { userID, isLoggedIn } = req.body;
console.log(userID,isLoggedIn);
  const query = "UPDATE userreg SET isLoggedIn = ? WHERE userID = ?";
  
  pool.query(query, [isLoggedIn, userID], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Database error"); // ✅ use return
    }

    if (result.affectedRows > 0) {
      return res.status(200).send("Update successful");
    } else {
      return res.status(404).send("User not found");
    }
  });
});

// Logout 
router.post("/logout", (req, res) => {
  const { userID, log_in_time } = req.body;
const query = "UPDATE face_logs  SET log_out_time = ? WHERE userID = ?  ORDER BY log_id DESC  LIMIT 1;"
  pool.query(
    query, 
    [ log_in_time,userID],
    (err, result) => {
      if (err) {
        console.error("Database error: ", err);
        res.status(500).send("Database error");
      } else {
        res.send("Logout successfully");
      }
    }
  );
});


router.get("/getattendance",(req,res)=>{
      const {startDate, endDate} = req.query;
        if (!startDate || !endDate) {
    return res.status(400).send("Please provide startDate and endDate");
  }
  const query =  `
   SELECT log_id,f.userID AS empID,u.userName AS empName,
   DATE_FORMAT(f.log_in_time, '%Y-%m-%d') AS date,
   DATE_FORMAT(f.log_in_time, '%H:%i:%s') AS check_in,
   DATE_FORMAT(f.log_out_time, '%H:%i:%s') AS check_out,
   DATE_FORMAT(log_in_time, '%Y-%m-%d %H:%i:%s') AS Login_Time,
  DATE_FORMAT(log_out_time, '%Y-%m-%d %H:%i:%s') AS Logout_Time,
    CASE 
    WHEN f.log_out_time < f.log_in_time 
      THEN SEC_TO_TIME(TIME_TO_SEC(f.log_out_time) + 86400 - TIME_TO_SEC(f.log_in_time))
    ELSE 
      TIMEDIFF(f.log_out_time, f.log_in_time)
  END AS duration,
   CASE
    WHEN DATE(f.log_in_time) <> DATE(f.log_out_time) THEN 'Yes'
    ELSE 'No'
  END AS is_midnight_shift
    from face_logs f 
   JOIN userreg u ON f.userID = u.userID
    where DATE(f.log_in_time) BETWEEN ? AND ? ORDER BY f.log_in_time;
  `;
    pool.query(query, [startDate, endDate], (err, results) => {
    if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }        
        res.json(results);
   
    });
});

router.get("/getallemp",(req,res)=>{
    const query = "SELECT userID, userName FROM userreg";
    pool.query(query,(err, results)=>{
        if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }
        res.json(results);
    } );
});   

router.get("/getspecificattendance",(req,res)=>{
      const {userID, startDate, endDate} = req.query; 
        if (!userID || !startDate || !endDate) {
    return res.status(400).send("Please provide userID, startDate and endDate");
  } 
    const query = `SELECT log_id,f.userID AS empID,u.userName AS empName,
   DATE_FORMAT(f.log_in_time, '%Y-%m-%d') AS date,
   DATE_FORMAT(f.log_in_time, '%H:%i:%s') AS check_in,
    DATE_FORMAT(f.log_out_time, '%H:%i:%s') AS check_out,
       DATE_FORMAT(log_in_time, '%Y-%m-%d %H:%i:%s') AS Login_Time,
  DATE_FORMAT(log_out_time, '%Y-%m-%d %H:%i:%s') AS Logout_Time,
     CASE 
    WHEN f.log_out_time < f.log_in_time 
      THEN SEC_TO_TIME(TIME_TO_SEC(f.log_out_time) + 86400 - TIME_TO_SEC(f.log_in_time))
    ELSE 
      TIMEDIFF(f.log_out_time, f.log_in_time)
  END AS duration,
   CASE
    WHEN DATE(f.log_in_time) <> DATE(f.log_out_time) THEN 'Yes'
    ELSE 'No'
  END AS is_midnight_shift from face_logs f 
   JOIN userreg u ON f.userID = u.userID
    where f.userID = ? AND DATE(f.log_in_time) BETWEEN ? AND ? ORDER BY f.log_in_time;
  `;
    pool.query(query, [userID, startDate, endDate], (err, results) => {
    if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }
        res.json(results);
    });
} );
router.post("/register", async (req, res) => {
  console.log("✅ Register endpoint hit");
  const { username, email, password,role } = req.body;
  if (!username || !email || !password  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = "INSERT INTO users (full_name, email, password,role) VALUES (?, ?,?,?)";
    pool.query(query, [username, email, hashedPassword,role], (err, result) => {
      if (err) {
        console.error("❌ Database insert error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "User registered successfully", user_id: result.insertId  });
    });
  } catch (err) {
    console.error("⚠️ Error in register route:", err);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/logindashboard", (req, res) => {

  const { email, password } = req.body;

 if (!email || !password || email.trim() === '' || password.trim() === '') {
  console.log("inside");
  return res.status(400).json({ message: "All fields are required" });
}
  const query = "SELECT * FROM users WHERE email = ?";

  pool.query(query, [email], async (err, results) => {
       
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });
 

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });
  
    // ✅ Generate JWT
    const token = jwt.sign(
      { user_id: user.id, username: user.username},
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );
   
    res.json({
      message: "Login successful",
      token,
      user: { id: user.user_ID, username: user.full_name, email: user.email, id: user.id}, 
        });
  });
});
router.get("/protected", verifyToken, (req, res) => {
  const userId = req.user.user_id;
     const query = "SELECT * FROM users WHERE id = ?"; 
       pool.query(query, [userId], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
     if (results.length === 0)
      return res.status(401).json({ message: "No User Found" });
     res.json(results,{ message: "This is protected",cstatus : 'verified', user: req.user });
    } );
});
// get all roles details

router.get("/getRoles", (req, res) => {
  
     const query = "SELECT * FROM roles"; 
       pool.query(query, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
     if (results.length === 0)
      return res.status(401).json({ message: "No User Found" });
     res.json(results);
    } );
});

//  api to updatye face logs 

router.put("/updatefacerec",verifyToken,(req,res)=>{
  
    const { log_id, newCheckIn, newCheckOut } = req.body;
    console.log(log_id, newCheckIn, newCheckOut);
    if (!log_id) {
    return res.status(400).json({ message: "Missing log_id" });
  }
  const query= "UPDATE face_logs  SET log_in_time = ?, log_out_time = ?, updated_at = NOW() WHERE log_id = ?";
  pool.query(query,[newCheckIn,newCheckOut,log_id],(err,result)=>{
      if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
      if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No record found with that log_id" });
    }
    res.status(200).json({ message: "Face record updated successfully!",status:'Updated' });

  });
});
router.post("/setUpdateLog",verifyToken,(req,res)=>{
   const userId = req.user.user_id;
    const { log_id,actualLogInTime,actualLogOutTime,actionType,newCheckIn, newCheckOut, approved_by } = req.body;
  const query= "INSERT into update_logs (user_id,whoApproved,record_id,action_type,actual_login_time,actual_logout_time,updated_login_time,updated_logout_time) Values (?,?,?,?,?,?,?,?)";
  pool.query(query,[userId,approved_by,log_id,actionType,actualLogInTime,actualLogOutTime,newCheckIn,newCheckOut],(err,result)=>{
      if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json({ message: "Log record updated successfully!",status:'recorded' });

  });
});
router.get("/getRoles", (req, res) => {
  
     const query = "SELECT * FROM update_logs "; 
       pool.query(query, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
     if (results.length === 0)
      return res.status(401).json({ message: "No User Found" });
     res.json(results);
    } );
});


module.exports = router;
