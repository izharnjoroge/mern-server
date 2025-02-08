const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

async function login(req, res) {
    try {
        const { userEmail, userPassword } = req.body;

        // Await the user query
        const user = await User.findOne({ userEmail });

        if (!user) {
            return res.status(404).json({ message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(userPassword, user.userPassword);

        if (!isMatch) {
            return res.status(400).json({ message: "Wrong password" });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.userRole },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error });
    }
}

async function register(req, res) {
    try {
        const { userName, userEmail, userPassword, userRole } = req.body;

        const hashedPassword = await bcrypt.hash(userPassword, 10);

        const createdUser = new User({
            userName,
            userEmail,
            userPassword: hashedPassword,
            userRole
        });

        await createdUser.save();

        res.status(201).json({ message: "User Created Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error });
    }
}

module.exports = { login, register };
