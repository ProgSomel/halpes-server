const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();


const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  optionSuccessStatus: 200,
};

//! middleWire
app.use(cors(corsOptions));
app.use(express.json());

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dzik2b9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {

    const volunteerPostsCollection = client.db('halpes').collection('volunteerPosts');



    //! Volunteer Posts 

    app.get('/volunteer', async(req, res) => {
      const result = await volunteerPostsCollection.find().toArray();
      res.send(result);
    })

    app.post('/volunteer', async (req, res) => {
      const volunteerData = req.body;
      
     
      const result = await volunteerPostsCollection.insertOne(volunteerData);
      res.send(result);
    })

    
    
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
   
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Halpes Server is Running");
});

app.listen(port, async (req, res) => {
  console.log(`Halpes Server is listening on port ${port}`);
});
