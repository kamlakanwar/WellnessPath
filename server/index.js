const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const jwt = require("jsonwebtoken")
const port = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());

//verify token 
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
      return res.status(401).send({ error: true, message: 'Unauthorize access' })
  }
  const token = authorization?.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
      if (err) {
          return res.status(403).send({ error: true, message: 'forbidden user or token has expired' })
      }
      req.decoded = decoded;
      next()
  })
}

//mongodb connection
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
async function run() {
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

    app.post("/api/set-token", async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_SECRET, {
        expiresIn: '24h'
    });
    res.send({token})
    })
 
    //middleware for admin and instructor
    const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        if (user.role === 'admin') {
            next()
        }
        else {
            return res.status(401).send({ error: true, message: 'Unauthorize access' })
        }
    }
    
    const verifyInstructor = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        if (user.role === 'instructor' || user.role === 'admin') {
            next()
        }
        else {
            return res.status(401).send({ error: true, message: 'Unauthorize access' })
        }
    }

    app.post('/new-user', async(req, res) =>{
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    })

    app.get('/users', async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.send(users);
    })

     // GET USER BY ID
     app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const user = await userCollection.findOne(query);
      res.send(user);
    })

    // GET USER BY EMAIL
    app.get('/user/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
  })
  // Delete a user

  app.delete('/delete-user/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
  })
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

    // Add routes here that use the collections
    app.post('/new-class', verifyJWT, verifyAdmin, async (req, res) => {
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
       app.get('/classes/:email',verifyJWT, verifyAdmin, async(req, res) =>{
            const email = req.params.email;
            const query = {instructorEmail:email};
            const result = await classesCollection.find(query).toArray();
            res.send(result);
       });

       //Manage classes
       app.get('/classes-manage', async(req, res) =>{
            const result = await classesCollection.find().toArray();
            res.send(result);
       })

       //update classes status and reason
       app.patch('/change-status/:id',verifyJWT, verifyAdmin, async(req, res)=> {
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
        app.put('/update-class/:id',verifyJWT, verifyAdmin, async(req,res) =>{
            const id = req.params.id;
            const updatedClass = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedClass.name,
                    description: updatedClass.description,
                    price: updatedClass.price,
                    availableSeats: parseInt(updatedClass.availableSeats),
                    videoLink: updatedClass.videoLink,
                    status: 'pending'
                }
        };
        const result = await classesCollection.updateOne(filter,updateDoc,options);
        res.send(result);
        });
        
        //cart routes
        app.post('/add-to-cart',verifyJWT, async(req, res) =>{
          const newCartItem = req.body;
          const result = await cartCollection.insertOne(newCartItems);
          res.send(result);
        });

        //get cart items by id 
        app.get('/cart-item/:id', verifyJWT,async (req, res)=> {
          const id = req.params.id;
          const email = req.body.email;
          const query = {
            classId: id,
            userMail: email
          };
          projection ={classID: 1};
          const result = await cartCollection.findOne(query, {projection: projection});
          res.send(result);
        });
      
        //cart info by user
        app.get('/cart/:email', verifyJWT,async (req, res) => {
          const email = req.params.email;
          const query = { userMail: email };
          const projection = { classId: 1 };
          const carts = await cartCollection.find(query, { projection: projection }).toArray();
          const classIds = carts.map(cart => new ObjectId(cart.classId));
          const query2 = { _id: { $in: classIds } };
          const result = await classesCollection.find(query2).toArray();
          res.send(result);
        })

        //delete cart item 
        app.delete('/delete-cart-item/:id',verifyJWT, async (req, res) => {
          const id = req.params.id;
          const query = { classId: id };
          const result = await cartCollection.deleteOne(query);
          res.send(result);
        })

        //payment routes
        app.post('/create-payment-intent', verifyJWT,async (req, res)=>{
          const {price} = req.body;
          const amount = parseInt(price) *100;
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types: ['card'],
        });
        res.send({
            clientSecret: paymentIntent.client_secret
        });
        })
         // post payment info to db
        // POST PAYMENT INFO 
        app.post('/payment-info', async (req, res) => {
          const paymentInfo = req.body;
          const classesId = paymentInfo.classesId;
          const userEmail = paymentInfo.userEmail;
          const singleClassId = req.query.classId;
          let query;
          if (singleClassId) {
              query = { classId: singleClassId, userMail: userEmail };
          } else {
              query = { classId: { $in: classesId } };
          }
          const classesQuery = { _id: { $in: classesId.map(id => new ObjectId(id)) } }
          const classes = await classesCollection.find(classesQuery).toArray();
          const newEnrolledData = {
              userEmail: userEmail,
              classesId: classesId.map(id => new ObjectId(id)),
              transactionId: paymentInfo.transactionId,
          }
          const updatedDoc = {
              $set: {
                  totalEnrolled: classes.reduce((total, current) => total + current.totalEnrolled, 0) + 1 || 0,
                  availableSeats: classes.reduce((total, current) => total + current.availableSeats, 0) - 1 || 0,
              }
          }

          const updatedResult = await classesCollection.updateMany(classesQuery, updatedDoc, { upsert: true });
          const enrolledResult = await enrolledCollection.insertOne(newEnrolledData);
          const deletedResult = await cartCollection.deleteMany(query);
          const paymentResult = await paymentCollection.insertOne(paymentInfo);
          res.send({ paymentResult, deletedResult, enrolledResult, updatedResult });
      });


      app.get('/payment-history/:email', async (req, res) => {
          const email = req.params.email;
          const query = { userEmail: email };
          const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
          res.send(result);
      });
      //payment history length
      app.get('/payment-history-length/:email', async (req, res) => {
          const email = req.params.email;
          const query = { userEmail: email };
          const total = await paymentCollection.countDocuments(query);
          res.send({ total });
      });

      // ! ENROLLED ROUTES

      app.get('/popular_classes', async (req, res) => {
        const result = await classesCollection.find().sort({ totalEnrolled: -1 }).limit(100).toArray();
        res.send(result);
    })


    app.get('/popular-instructors', async (req, res) => {
        const pipeline = [
            {
                $group: {
                    _id: "$instructorEmail",
                    totalEnrolled: { $sum: "$totalEnrolled" },
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "email",
                    as: "instructor"
                }
            },
            {
                $project: {
                    _id: 0,
                    instructor: {
                        $arrayElemAt: ["$instructor", 0]
                    },
                    totalEnrolled: 1
                }
            },
            {
                $sort: {
                    totalEnrolled: -1
                }
            },
            {
                $limit: 100
            }
        ]
        const result = await classesCollection.aggregate(pipeline).toArray();
        res.send(result);
    })

    // Admins stats 
    app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {
      // Get approved classes and pending classes and instructors 
      const approvedClasses = (await classesCollection.find({ status: 'approved' }).toArray()).length;
      const pendingClasses = (await classesCollection.find({ status: 'pending' }).toArray()).length;
      const instructors = (await userCollection.find({ role: 'instructor' }).toArray()).length;
      const totalClasses = (await classesCollection.find().toArray()).length;
      const totalEnrolled = (await enrolledCollection.find().toArray()).length;
      const result = {
          approvedClasses,
          pendingClasses,
          instructors,
          totalClasses,
          totalEnrolled,
          // totalRevenueAmount
      }
      res.send(result);

  })

  // !GET ALL INSTrUCTOR  

  app.get('/instructors', async (req, res) => {
      const result = await userCollection.find({ role: 'instructor' }).toArray();
      res.send(result);
  })

  app.get('/enrolled-classes/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const pipeline = [
          {
              $match: query
          },
          {
              $lookup: {
                  from: "classes",
                  localField: "classesId",
                  foreignField: "_id",
                  as: "classes"
              }
          },
          {
              $unwind: "$classes"
          },
          {
              $lookup: {
                  from: "users",
                  localField: "classes.instructorEmail",
                  foreignField: "email",
                  as: "instructor"
              }
          },
          {
              $project: {
                  _id: 0,
                  classes: 1,
                  instructor: {
                      $arrayElemAt: ["$instructor", 0]
                  }
              }
          }

      ]
      const result = await enrolledCollection.aggregate(pipeline).toArray();
      // const result = await enrolledCollection.find(query).toArray();
      res.send(result);
  })

  // Applied route 
  app.post('/as-instructor', async (req, res) => {
      const data = req.body;
      const result = await appliedCollection.insertOne(data);
      res.send(result);
  })
  app.get('/applied-instructors/:email',   async (req, res) => {
      const email = req.params.email;
      const result = await appliedCollection.findOne({email});
      res.send(result);
  });

      // Send a ping to confirm a successful connection
       // await client.db("admin").command({ ping: 1 });
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