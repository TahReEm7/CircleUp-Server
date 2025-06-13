require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_CLUSTER}/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=Tahreem`;

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FIREBASE_KEY_BASE64, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware to verify Firebase ID token from Authorization header
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })

}

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).send({ message: "unauthorized access" });
    }

    const token = authHeader.split(" ")[1];
    const userInfo = await admin.auth().verifyIdToken(token);
    console.log("✅ Verified Firebase user:", userInfo);

    req.tokenEmail = userInfo.email;
    next();
  } catch (err) {
    console.error("❌ Firebase token verification failed:", err);
    return res.status(401).send({ message: "invalid or expired token" });
  }
};



// Global Collection
let socialEventCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB);
    socialEventCollection = db.collection("events");
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1); // Exit if MongoDB connection fails
  }
}

run();

// Routes
app.get('/', (req, res) => {
  res.send("🎉 Social Events API is running!");
});



// Add new event
app.post('/events',verifyFirebaseToken, async (req, res) => {
  const event = req.body;
  try {
    const result = await socialEventCollection.insertOne({
      ...event,
      attendees: [],
      status: 'upcoming',
    });
    res.send({ message: 'Event created', insertedId: result.insertedId });
  } catch (err) {
    res.status(500).send({ message: 'Failed to create event' });
  }
});


// Get all events
app.get('/events', async (req, res) => {
  try {
    const { search, eventType } = req.query;

    const query = {
      status: 'upcoming'  // Only return upcoming events
    };

    // 🔍 Search by title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // 🏷️ Filter by eventType
    if (eventType && eventType !== 'All') {
      query.eventType = eventType;
    }

    const events = await socialEventCollection.find(query).toArray();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get single event by ID
app.get('/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const event = await socialEventCollection.findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).send({ message: 'Event not found.' });
    }

    res.send(event);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error fetching event.' });
  }
});

app.patch('/events/:id' , async (req, res) => {
  const id = req.params.id;
  const { email, ...updateFields } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid event ID' });
  }

  try {
    if (email) {
      // Handle joining event
      const updateResult = await socialEventCollection.updateOne(
        { _id: new ObjectId(id), attendees: { $ne: email } },
        { $push: { attendees: email } }
      );

      if (updateResult.modifiedCount === 0) {
        return res.status(400).send({ message: 'You have already joined or event not found.' });
      }

      return res.send({ message: 'Successfully joined the event.' });
    } else if (Object.keys(updateFields).length > 0) {
      // Handle event data update
      const result = await socialEventCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }

      return res.status(200).json({ message: 'Event updated successfully' });
    } else {
      return res.status(400).json({ message: 'No valid update fields provided' });
    }
  } catch (err) {
    console.error('PATCH error:', err);
    return res.status(500).json({ message: 'Server error while updating event' });
  }
});

// Cancel event participation
app.patch('/events/:id/cancel', verifyFirebaseToken, async (req, res) => {
  const id = req.params.id;
  const { email } = req.body;

  if (!ObjectId.isValid(id) || !email) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const result = await socialEventCollection.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { attendees: email } }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).send({ message: 'Event not found or email was not an attendee.' });
    }

    res.send({ message: 'Successfully removed attendee from event.' });
  } catch (err) {
    console.error('❌ Failed to cancel join:', err);
    res.status(500).send({ message: 'Internal server error' });
  }
});


// DELETE /events/:id - delete an event by its ID
app.delete('/events/:id',verifyFirebaseToken , async (req, res) => {
  const id = req.params.id;

  try {
    const result = await socialEventCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'Event not found.' });
    }

    res.send({ message: 'Event deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Failed to delete event.' });
  }
});





// Start Server
// app.listen(port, () => {
//   console.log(`🚀 Server running at http://localhost:${port}`);
// });
