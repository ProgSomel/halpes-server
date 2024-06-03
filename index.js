const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "https://halpes-72133.web.app", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};

//! middleWire
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

//! JWT Verify MiddleWire
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      req.user = decoded;
    next();

    });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dzik2b9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const volunteerPostsCollection = client
      .db("halpes")
      .collection("volunteerPosts");

    const BeAvolunteersCollection = client
      .db("halpes")
      .collection("beAvolunteer");

    //! JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //! clear token on logout
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    //! Volunteer Posts

    app.get("/volunteer", async (req, res) => {
      const searchedText = req.query.search;

      let query = {};
      if (searchedText) {
        query = { title: searchedText };
      }
      const result = await volunteerPostsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/volunteer/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await volunteerPostsCollection.findOne(query);
      res.send(result);
    });

    app.get("/volunteer/volunteerByEmail/:email",
      verifyToken,
      async (req, res) => {
        const tokenEmail = req.user?.email;
        const email = req.params.email;
        if (tokenEmail !== email) {
          return res.send(403).send({ message: "forbidden access" });
        }
        const query = { organizerEmail: email };
        const result = await volunteerPostsCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.post("/volunteer", verifyToken, async (req, res) => {
      const volunteerData = req.body;
      const result = await volunteerPostsCollection.insertOne(volunteerData);
      res.send(result);
    });

    app.put("/volunteer/updatePost/:id", async (req, res) => {
      const id = req.params.id;
      const volunteerData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          ...volunteerData,
        },
      };
      const result = await volunteerPostsCollection.updateOne(
        query,
        updateDoc,
        options
      );

      res.send(result);
    });

    app.delete("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerPostsCollection.deleteOne(query);
      res.send(result);
    });

    //! Be A Volunteer
    app.post("/beAvolunteer", async (req, res) => {
      const beAvolunteerData = req.body;
      const alreadyApplied = await BeAvolunteersCollection.findOne({
        volunteerEmail: beAvolunteerData.volunteerEmail,
        volunteerPostId: beAvolunteerData.volunteerPostId,
      });
      if (alreadyApplied) {
        return res.status(400).send("You have already Requested for this post");
      }
      const result = await BeAvolunteersCollection.insertOne(beAvolunteerData);

      const query = { _id: new ObjectId(beAvolunteerData.volunteerPostId) };

      const updateDoc = {
        $inc: {
          numberOfVolunteersNeeded: -1,
        },
      };

      await volunteerPostsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/beAvolunteer/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user?.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.send(403).send({ message: "forbidden access" });
      }
      const query = { volunteerEmail: email };
      const result = await BeAvolunteersCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/beAvolunteer/:id", async (req, res) => {
      const id = req.params.id;
      const result = await BeAvolunteersCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
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
