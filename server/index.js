const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Middleware
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@wellnesspath.xqszy.mongodb.net/?retryWrites=true&w=majority&appName=WellnessPath`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Create the MongoDB client and establish the connection at the start
async function connectToDatabase() {
  try {
    // Connect the client to MongoDB
    await client.connect();
    console.log("Successfully connected to MongoDB");

    // Create the database and collections
    const database = client.db("WellnessPath");
    const userCollection = database.collection("users");
    const classesCollection = database.collection("classes");
    const cartCollection = database.collection("cart");
    const paymentCollection = database.collection("payments");
    const enrolledConnection = database.collection("enrolled");
    const appliedCollection = database.collection("applied");

    // Add routes here that use the collections
    app.post('/new-class', async (req, res) => {
        const newClass = req.body;

    // Insert new class into the "classes" collection
        const result = await classesCollection.insertOne(newClass);
        res.send(result);
      })

      app.get('/classes', async(req, res) =>{
        const query = {status: 'approved'};
        const result = await classesCollection.find().toArray();
        res.send(result);
      })

       //get classes by instructor email address
       app.get('/classes/:email', async(req, res) =>{
            const email = req.params.email;
            const query = {instructorEmail:email};
            const result = await classesCollection.find(query).toArray();
            res.send(result);
       });

        //get classes by instructor email address
        app.get('classes/:email')
        
        // UPDATE USER
        app.put('/update-user/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.option,
                    address: updatedUser.address,
                    phone: updatedUser.phone,
                    about: updatedUser.about,
                    photoUrl: updatedUser.photoUrl,
                    skills: updatedUser.skills ? updatedUser.skills : null,
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

       //Manage classes
       app.get('/classes-manage', async(req, res) =>{
            const result = await classesCollection.find().toArray();
            res.send(result);
       })

       //update classes status and reason
       app.patch('/change-status/:id',async(req, res)=> {
        const id= req.params.id;
        const status = req.body.status;
        const reason = req.body.reason;
        const filter = {_id:new ObjectId(id)};
        const options = {upsert: true};
        const updateDoc = {
            $set: {
                status: status,
                reason:reason,
            },
        };
        const result = await classesCollection.updateOne(filter, updateDoc, options);
        res.send(result);
       })

       //get approved classes
       app.get('approved-classes', async(req,res) =>{
        const query = {status: 'approved'};
        const result = await classesCollection.find(query).toArray();

       });

        //get single class detail
        app.get('/class/:id', async(req,res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await classesCollection.findOne(query);
        res.send(result);
        })
        
        //update class details 
        app.put('/update-class/:id',async(req,res) =>{
            const id = req.params.id;
        })

      // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('WellnessPath Server is running!');
})


// Listen
app.listen(port, () => {
    console.log(`SERVER IS RUNNING ON PORT ${port}`);
})