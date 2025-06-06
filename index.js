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
app.post('/events', async (req, res) => {
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
    const events = await socialEventCollection.find().toArray();
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

// PATCH /events/:id - add user email to attendees array
app.patch('/events/:id', async (req, res) => {
  const id = req.params.id;
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ message: 'Email is required to join the event.' });
  }

  try {
    // Add the email to attendees array if not already present
    const updateResult = await socialEventCollection.updateOne(
      { _id: new ObjectId(id), attendees: { $ne: email } }, // Only add if not present
      { $push: { attendees: email } }
    );

    if (updateResult.modifiedCount === 0) {
      // Email was already in attendees or event not found
      return res.status(400).send({ message: 'You have already joined or event not found.' });
    }

    res.send({ message: 'Successfully joined the event.' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Failed to join event.' });
  }
});

// DELETE /events/:id - delete an event by its ID
app.delete('/events/:id', async (req, res) => {
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
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
