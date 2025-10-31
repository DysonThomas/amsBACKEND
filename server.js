const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const app = express();
const cors = require("cors");
const connectDB = require("./db");
const authRoute = require("./authRoute");
const port = process.env.PORT || 3000;
app.use(cors({
  origin:[
'http://localhost:4200', 
  ] , // Your Angular app URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));


connectDB();

app.use("/api/user", authRoute);

app.listen(port, () => {
  console.log(`🚀 Server running on port: ${port}`);
});


// For Mobile App  