const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.once("open", () => console.log("Connected to MongoDB"));

// Visitor Schema
const visitorSchema = new mongoose.Schema({
    userId: String,
    timestamp: { type: Date, default: Date.now },
    fake: { type: Boolean, default: false },
});

const Visitor = mongoose.model("Visitor", visitorSchema);

// Route to delete all users
app.post("/admin/delete-all", async (req, res) => {
    const { adminKey } = req.body;

    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    try {
        await Visitor.deleteMany({});
        res.status(200).json({ message: "All user data deleted successfully" });
    } catch (error) {
        console.error("Error deleting user data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route to delete a specific number of users
app.post("/admin/delete-some", async (req, res) => {
    const { adminKey, count } = req.body;

    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    if (!count || isNaN(count) || count <= 0) {
        return res.status(400).json({ message: "Invalid count value" });
    }

    try {
        // Find the oldest records, limit to `count`
        const recordsToDelete = await Visitor.find({}).sort({ timestamp: 1 }).limit(count);

        if (recordsToDelete.length === 0) {
            return res.status(200).json({ message: "No records to delete" });
        }

        // Delete the found records
        const idsToDelete = recordsToDelete.map((record) => record._id);
        await Visitor.deleteMany({ _id: { $in: idsToDelete } });

        res.status(200).json({ message: `${recordsToDelete.length} user(s) deleted successfully` });
    } catch (error) {
        console.error("Error deleting user data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route to fetch real users
app.get("/admin/real-users", async (req, res) => {
    const { adminKey } = req.query;

    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    try {
        const realUsers = await Visitor.find({ fake: false }).sort({ timestamp: 1 });
        res.status(200).json({ data: realUsers });
    } catch (error) {
        console.error("Error fetching real users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route to fetch fake users
app.get("/admin/fake-users", async (req, res) => {
    const { adminKey } = req.query;

    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    try {
        const fakeUsers = await Visitor.find({ fake: true }).sort({ timestamp: 1 });
        res.status(200).json({ data: fakeUsers });
    } catch (error) {
        console.error("Error fetching fake users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Start the server
const port = process.env.ADMIN_PORT || 4000;
app.listen(port, () => console.log(`Admin backend running on port ${port}`));
