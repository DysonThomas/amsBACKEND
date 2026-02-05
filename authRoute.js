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
     const {userID,userName,faceembed,storeId} = req.body;
    const faceembedJson = JSON.stringify(faceembed);
    const query = "INSERT INTO userreg(userID, userName, Faceembed, storeId) VALUES (?, ?, ?, ?)"
    pool.query(
        query,
         [userID,userName, faceembedJson,storeId],
         (err, result) => {
               if (err) {
                res.status(500).send("Database error");
            }
             
            else if(result.affectedRows>0){
                res.json({ message: "User registered successfully" });
              const subQuery = "INSERT INTO employees (emp_id) VALUES (?)";
              pool.query(subQuery, [userID], (err, result) => {
                if (err) {
                  console.error("Error inserting into employees table:", err);
                }
              });
            }else{
                res.status(400).json({ message: "Failed to register user" });
         }
      }
        
    )
});
// get all  details from userreg table based on storeId

router.get("/allusers",(req,res)=>{ 
    const {storeId} = req.query;
    console.log("Fetching users for storeId:", storeId);
    const query = "SELECT * FROM userreg WHERE storeId = ? and isActive = 1";
    pool.query(query,[storeId],(err, results)=>{

        if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    } 
      const users = results.map(row => ({
      userID: row.userID,
      userName: row.userName,
      isLoggedIn: row.isLoggedIn,
      isActive: row.isActive,
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
      const {startDate, endDate, storeId} = req.query;
        if (!startDate || !endDate || !storeId) {
    return res.status(400).send("Please provide startDate, endDate and storeId");
  }
  const query =  `
   SELECT log_id,f.userID AS empID,u.userName AS empName,
   DATE_FORMAT(f.log_in_time, '%Y-%m-%d') AS date,
   DATE_FORMAT(f.log_in_time, '%H:%i:%s') AS check_in,
   DATE_FORMAT(f.log_out_time, '%H:%i:%s') AS check_out,
   DATE_FORMAT(log_in_time, '%Y-%m-%d %H:%i:%s') AS Login_Time,
  DATE_FORMAT(log_out_time, '%Y-%m-%d %H:%i:%s') AS Logout_Time,
  DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
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
    where DATE(f.log_in_time) BETWEEN ? AND ? AND u.storeId = ? ORDER BY f.log_in_time;
  `;
    pool.query(query, [startDate, endDate, storeId], (err, results) => {
    if (err) {    
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }        
        res.json(results);
   
    });
});

router.get("/getallemp",(req,res)=>{
  const{storeId} = req.query;
  console.log("Fetching all employees for storeId:", storeId);
    const query = "SELECT userID, userName FROM userreg WHERE storeId = ?";
    pool.query(query,[storeId],(err, results)=>{
        if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }
        res.json(results);
    } );
});   

router.get("/getspecificattendance",(req,res)=>{
      const {userID, startDate, endDate, storeId} = req.query; 
        if (!userID || !startDate || !endDate || !storeId) {
    return res.status(400).send("Please provide userID, startDate, endDate and storeId");
  } 
    const query = `SELECT log_id,f.userID AS empID,u.userName AS empName,
   DATE_FORMAT(f.log_in_time, '%Y-%m-%d') AS date,
   DATE_FORMAT(f.log_in_time, '%H:%i:%s') AS check_in,
    DATE_FORMAT(f.log_out_time, '%H:%i:%s') AS check_out,
       DATE_FORMAT(log_in_time, '%Y-%m-%d %H:%i:%s') AS Login_Time,
  DATE_FORMAT(log_out_time, '%Y-%m-%d %H:%i:%s') AS Logout_Time,
    DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
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
    where f.userID = ? AND DATE(f.log_in_time) BETWEEN ? AND ? AND u.storeId = ? ORDER BY f.log_in_time;
  `;
    pool.query(query, [userID, startDate, endDate, storeId], (err, results) => {
    if (err) {
      console.error("Fetch error: ", err);
      return res.status(500).send("Database error");
    }
        res.json(results);
    });
} );
router.post("/register", async (req, res) => {
  const { username, email, password,role,storeId } = req.body;
  if (!username || !email || !password  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = "INSERT INTO dashboardusers (full_name, email, password,role,storeId) VALUES (?, ?,?,?,?)";
    pool.query(query, [username, email, hashedPassword,role,storeId], (err, result) => {
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

  return res.status(400).json({ message: "All fields are required" });
}
  const query = "SELECT * FROM dashboardusers WHERE email = ?";

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
      user: { id: user.user_ID, username: user.full_name, email: user.email, id: user.id,storeId: user.storeId ,role:user.role}, 
        });
  });
});
router.get("/protected", verifyToken, (req, res) => {
  const userId = req.user.user_id;
     const query = "SELECT * FROM dashboardusers WHERE id = ?"; 
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
router.post("/setUpdateLog", verifyToken, (req, res) => {
  const userId = req.user.user_id;
  const {
    log_id,
    actualLogInTime,
    actualLogOutTime,
    actionType,
    newCheckIn,
    newCheckOut,
    approved_by,
    emp_id
  } = req.body;

  // Validation
  if (!log_id || !actionType || !approved_by || !emp_id) {
    return res.status(400).json({
      message: "Missing required fields",
      required: ["log_id", "actionType", "approved_by", "emp_id"]
    });
  }

  // Validate actionType
  const validActions = ['Update', 'Delete', 'Create'];
  if (!validActions.includes(actionType)) {
    return res.status(400).json({
      message: "Invalid action type",
      validActions
    });
  }

  const query = `
    INSERT INTO update_logs (
      user_id,
      whoApproved,
      record_id,
      action_type,
      actual_login_time,
      actual_logout_time,
      updated_login_time,
      updated_logout_time,
      emp_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId,
    approved_by,
    log_id,
    actionType,
    actualLogInTime || null,
    actualLogOutTime || null,
    newCheckIn || null,
    newCheckOut || null,
    emp_id
  ];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error("Database error inserting update log:", err);
      
      // Check for specific error types
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: "Duplicate log entry",
          error: "This log record already exists"
        });
      }
      
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          message: "Invalid reference",
          error: "Referenced record does not exist"
        });
      }

      return res.status(500).json({
        message: "Failed to create log record",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    res.status(201).json({
      message: "Log record created successfully",
      status: 'recorded',
      logId: result.insertId
    });
  });
});
router.get("/getRoles", (req, res) => {
  
     const query = "SELECT * FROM roles "; 
       pool.query(query, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
     if (results.length === 0)
      return res.status(401).json({ message: "No User Found" });
     res.json(results);
    } );
});
router.put("/closeshift",verifyToken,(req,res)=>{
   const { userId } = req.body;


  const query= "Update userreg set isLoggedIn=false where userID= ? ";
  pool.query(query,[userId],(err,result)=>{
      if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
       res.status(200).json({ message: "Updated Sucess Fully ",status:'recorded' });

  });
});
router.delete("/deleteShift",verifyToken,(req,res)=>{
const log_id = req.query.log_id

const query = "DELETE FROM face_logs WHERE log_id = ?";
pool.query(query,[log_id],(err,result)=>{
if (err) return res.status(500).json({ error: err });

if(result.affectedRows>0){
res.json({ message: "item deleted successfully" });
}else{
     res.status(400).json({ message: "Failed to delete item" });
}
});
});
router.get("/getLog",verifyToken,(req,res)=>{
   const { startDate,endDate } = req.query;
   const query =`SELECT 
  u.id,
  us.full_name AS Dashboard_User,
  r.role_name AS Approver,
  u.record_id AS RecordID,
  u.action_type AS Action,
  ur.userName AS EmployeeName,
  DATE_FORMAT(u.actual_login_time, '%Y-%m-%d %H:%i:%s') AS actual_login_time,
  DATE_FORMAT(u.actual_logout_time, '%Y-%m-%d %H:%i:%s') AS actual_logout_time,
  DATE_FORMAT(u.updated_login_time, '%Y-%m-%d %H:%i:%s') AS updated_login_time,
  DATE_FORMAT(u.updated_logout_time, '%Y-%m-%d %H:%i:%s') AS updated_logout_time,
  DATE_FORMAT(u.updated_on, '%Y-%m-%d %H:%i:%s') AS updated_on
FROM ams.update_logs u
LEFT JOIN users us ON u.user_id = us.id
LEFT JOIN roles r ON u.whoApproved = r.role_id
LEFT JOIN userreg ur ON ur.userID = u.emp_id
WHERE u.updated_on BETWEEN ? AND ?;
`
  pool.query(query,[startDate,endDate], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
     if (results.length === 0)
      return res.status(401).json({ message: "No Log Found" });
     res.json(results);
    } );
  });
router.get("/getTotalHours", verifyToken, (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Start date and end date are required" });
  }

  const query = `
    SELECT 
      f.userID AS empID,
      u.userName AS empName,
      SEC_TO_TIME(SUM(
        CASE 
          WHEN f.log_out_time < f.log_in_time 
            THEN TIME_TO_SEC(f.log_out_time) + 86400 - TIME_TO_SEC(f.log_in_time)
          ELSE 
            TIME_TO_SEC(TIMEDIFF(f.log_out_time, f.log_in_time))
        END
      )) AS total_working_hours
    FROM face_logs f
    JOIN userreg u ON f.userID = u.userID
    WHERE DATE(f.log_in_time) BETWEEN DATE(?) AND DATE(?)  
    GROUP BY f.userID, u.userName
    ORDER BY u.userName;
  `;

  pool.query(query, [startDate, endDate], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No attendance found for the given date range" });
    }

    res.status(200).json(results);
  });
});

// api to get all  employee details 

router.get("/getAllEmployeeDetails", verifyToken, (req, res) => {
  const { storeId } = req.query;
  const query = "SELECT u.userID, u.userName, u.isLoggedIn, u.isActive,u.isEdit, e.department,e.phone_number,e.email FROM userreg u join employees e on u.userID=e.emp_id WHERE u.storeId = ?";   
  pool.query(query,[storeId], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({ error: err.message });
    } 
    res.status(200).json(results);
  });
} );   

// api to update employee details
router.put("/updateEmployeeDetails", verifyToken, (req, res) => {

  const {
    userID,
    department,
    phone_number,
    email,
    address,
    startdate,
    enddate,
    userName
  } = req.body;

  const updateEmployeeQuery = `
    UPDATE employees
    SET department = ?, phone_number = ?, email = ?, address = ?, startdate = ?, enddate = ?
    WHERE emp_id = ?
  `;

  pool.query(
    updateEmployeeQuery,
    [department, phone_number, email, address, startdate, enddate, userID],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "No employee found with that ID" });
      }

      // Update userreg table
      const updateUserRegQuery = `
        UPDATE userreg SET userName = ? WHERE userID = ?
      `;

      pool.query(updateUserRegQuery, [userName, userID], (err) => {
        if (err) {
          console.error("Database error updating userreg:", err);
          return res.status(500).json({ message: "Error updating user name" });
        }

        return res.status(200).json({
          message: "Employee details updated successfully",
          status: "Updated"
        });
      });
    }
  );
});

// api to change the status of employee
router.put("/changeEmployeeStatus", verifyToken, (req, res) => {
  const { userID, isActive } = req.body;

  const query = "UPDATE userreg SET isActive = ? WHERE userID = ?";

  pool.query(query, [isActive, userID], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No employee found with that ID" });
    }

    return res.status(200).json({
      message: "Employee status updated successfully",
      status: "Updated"
    });
  });
});

// api to update employee status
router.put("/updateEmployeeStatus", verifyToken, (req, res) => {
  const { userID, isActive } = req.body;
 
  const query = "UPDATE userreg SET isActive = ? WHERE userID = ?";

  pool.query(query, [isActive, userID], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No employee found with that ID" });
    }
    return res.status(200).json({
      message: "Employee status updated successfully",
      status: "Updated"
    });
  }
);
});

router.put("/updatenewface", verifyToken, (req, res) => {
  const { userID, isEdit } = req.body;
  const query = "UPDATE userreg SET isEdit = ? WHERE userID = ?";

  pool.query(query, [isEdit, userID], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No employee found with that ID" });
    }
    return res.status(200).json({
      message: "Employee edit status updated successfully",
      status: "Updated"
    });
  }
);
});
// get all store
router.get("/getAllStores", (req, res) => {
  
     const query = "SELECT * FROM storemaster";

    pool.query(query, async (err, results) => { 
    if (err) return res.status(500).json({ error: err.message });
     if (results.length === 0)
      return res.status(401).json({ message: "No Store Found" });
     
      res.json(results);
    } );
});
// Update store details using storeId
router.put("/updateStoreDetails", verifyToken, (req, res) => {
  const {
    storeId,  
    name,
    address
  } = req.body;
  const query = `
    UPDATE storemaster
    SET name = ?, address = ?
    WHERE storeId = ?
  `;
  pool.query(
    query,
    [name, address, storeId],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      } 
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "No store found with that ID" });
      }
      return res.status(200).json({
        message: "Store details updated successfully",
        status: "Updated"
      });
    }
  );
});
// Update store status using storeID
router.put("/updateStoreStatus", verifyToken, (req, res) => {

  const { storeId, isActive } = req.body;

  const query = "UPDATE storemaster SET isActive = ? WHERE storeId = ?";
  pool.query(query, [isActive, storeId], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No store found with that ID" });
    }
      

    return res.status(200).json({
      message: "Store status updated successfully",
      status: "Updated"
    });
  }
);        
});

// api to get store details using storeid
router.get("/getStoreDetails", (req, res) => {
 console.log("Fetching store details with query:", req.query);
  const { storeId } = req.query;
  const query = "SELECT * FROM storemaster WHERE storeId = ?";
  pool.query(query, [storeId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No store found with that ID" });
    }
    return res.status(200).json(results[0]);
  });
});

// Api to  fetch employee details by isEdit status and storeId
router.get("/getEmployeesByEditStatus", (req, res) => {
  console.log("Fetching employees with isEdit = 1 and storeId:", req.query.storeId);
  const {  storeId } = req.query;
  const query = "SELECT userID, userName, isEdit FROM userreg WHERE isEdit = 1 AND storeId = ?";
  pool.query(query, [storeId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.status(200).json(results);
  });
}); 


// update faceembed and isEdit based on the storeID
router.put("/updateFaceEmbed", (req, res) => {
  const { userID, faceembed,userName } = req.body;
  const faceembedJson = JSON.stringify(faceembed);
  const query = "UPDATE userreg SET Faceembed = ?, userName = ?, isEdit = 0 WHERE userID = ?";
  pool.query(query, [faceembedJson, userName, userID], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No employee found with that ID" });
    }

    return res.status(200).json({
      message: "Face embed updated successfully",
      status: "Updated"
    });
  }
);
}
);

// fetch storeId from  dashboardusers using user id
router.get("/getStoreId", (req, res) => {
  console.log("Fetching storeId with query:", req.query);
  const { userId } = req.query;
  console.log("User ID:", userId);
  const query = "SELECT storeId FROM dashboardusers WHERE id = ?";
  pool.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No user found with that ID" });
    }
    return res.status(200).json({ storeId: results[0].storeId });
  }
);
} );

// get all dashboard users
router.get("/getDashbaordemployees", (req, res) => {
  const { storeId } = req.query;
    if (!storeId) {
    return res.status(400).json({ message: "storeId is required" });
  }
  console.log("Fetching all dashboard users for storeId:", storeId);
  const query = "SELECT d.*, r.role_name FROM dashboardusers d JOIN roles r ON d.role = r.role_id WHERE d.storeId = ?";
  pool.query(query, [storeId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.status(200).json(results);
  }
);
} );

// Update dashboard user details
router.put("/updateDashboardUser", verifyToken, (req, res) => {
  const { id, full_name, email, role } = req.body;
  if(full_name===undefined || email===undefined || role===undefined){
    return res.status(400).json({ message: "full_name, email, and role are required" });
  }
  const query = `
    UPDATE dashboardusers
    SET full_name = ?, email = ?, role = ?
    WHERE id = ?
  `;
  pool.query(
    query,  
    [full_name, email, role, id],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      } 
      if (result.affectedRows === 0) {        
        return res.status(404).json({ message: "No dashboard user found with that ID" });
      }
      return res.status(200).json({
        message: "Dashboard user details updated successfully",
        status: "Updated"
      });
    } 
  );
});

// Api to  add new dashboard user 
router.post("/addDashboardUser", verifyToken, async (req, res) => {
  const { full_name, email, password, role, storeId } = req.body;
  if (!full_name || !email || !password || !role || !storeId) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = "INSERT INTO dashboardusers (full_name, email, password, role, storeId) VALUES (?, ?, ?, ?, ?)";
    pool.query(query, [full_name, email, hashedPassword, role, storeId], (err, result) => {
      if (err) {
        console.error("❌ Database insert error:", err);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({ message: "Dashboard user added successfully", user_id: result.insertId });
    });
  }
  catch (err) {
    console.error("⚠️ Error in addDashboardUser route:", err);
    res.status(500).json({ message: "Server error" });
  }
}); 


// Api to change password of dashboard user
router.put("/changePassword", verifyToken, async (req, res) => {
  const { userId,newPassword } = req.body;
  console.log("Changing password for user ID:", userId);
  if (!userId || !newPassword) {
    return res.status(400).json({ message: "userId and newPassword are required" });
  }
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = "UPDATE dashboardusers SET password = ? WHERE id = ?";

    pool.query(query, [hashedPassword, userId ], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }   
      if (result.affectedRows === 0) {  
        return res.status(404).json({ message: "No dashboard user found with that ID" });
      }
      return res.status(200).json({   
        message: "Password changed successfully",
        status: "Updated"
      });
    }
    );  
  } catch (err) { 
    console.error("Error in changePassword route:", err); 
    res.status(500).json({ message: "Server error" });  
  }   
});   
// get employee name using the userID 
router.get("/getEmployeeName", (req, res) => {
  const { userId } = req.query;
  console.log("Fetching employee name for userID:", userId);
  const query = "SELECT full_name FROM dashboardusers WHERE id = ?";
  pool.query(query, [userId], (err, results) => {
    if (err) {  
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err });

    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No dashboard user found with that ID" });
    }
    return res.status(200).json({ full_name: results[0].full_name });
  } 
);    
} );  

// Api to add new attendance 
router.post("/addAttendance", verifyToken, (req, res) => {
  const { userID, log_in_time, log_out_time } = req.body;
  const query = "INSERT INTO face_logs (userID, log_in_time, log_out_time) VALUES (?, ?, ?)";
  
  pool.query(
    query,
    [userID, log_in_time, log_out_time],
    (err, result) => {
      if (err) {
        console.error("Database error: ", err);
        return res.status(500).json({ error: "Database error", message: err.message });
      } 
      else {    
        return res.status(200).json({ 
          message: "Attendance added successfully",
          success: true,
          insertId: result.insertId
        });
      }
    }
  );
});





    


  


module.exports = router;
