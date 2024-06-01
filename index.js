const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    const BeAvolunteersCollection = client.db('halpes').collection('beAvolunteer');



    //! Volunteer Posts 

    app.get('/volunteer', async(req, res) => {
      const result = await volunteerPostsCollection.find().toArray();
      res.send(result);
    })

    app.get("/volunteer/:id", async(req, res) => {
      const id = req.params.id;
     
      const query = {_id: new ObjectId(id)};
      const result = await volunteerPostsCollection.findOne(query);
      res.send(result);
    })

    app.post('/volunteer', async (req, res) => {
      const volunteerData = req.body;
      
     
      const result = await volunteerPostsCollection.insertOne(volunteerData);
      res.send(result);
    })


    //! Be A Volunteer 
    app.post('/beAvolunteer', async (req, res) => {
      const beAvolunteerData = req.body;
      const alreadyApplied = await BeAvolunteersCollection.findOne(
        {
        volunteerEmail: beAvolunteerData.volunteerEmail,
        volunteerPostId: beAvolunteerData.volunteerPostId
      }
      )
      if(alreadyApplied) {
        return res.status(400).send('You have already Requested for this post');
      }
      const result = await BeAvolunteersCollection.insertOne(beAvolunteerData);

      const query = {_id: new ObjectId(beAvolunteerData.volunteerPostId)};

      const updateDoc = {
        $inc: {
          numberOfVolunteersNeeded: -1}
      }

     await volunteerPostsCollection.updateOne(query, updateDoc);
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
