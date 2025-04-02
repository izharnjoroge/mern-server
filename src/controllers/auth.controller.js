const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

async function login(req, res) {
    try {
        const { userEmail, userPassword } = req.body;

        // Find the user
        const user = await User.findOne({ userEmail });

        console.log(user)

        if (!user) {
            return res.status(404).json({ message: "User does not exist" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(userPassword, user.userPassword);

        if (!isMatch) {
            return res.status(400).json({ message: "Wrong password" });
        }

        // Generate access token
        const accessToken = jwt.sign(
            { id: user._id, role: user.userRole },
            process.env.JWT_SECRET,
            { expiresIn: "15m" } 
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
            { id: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" } 
        );

     

       
        user.refreshToken = refreshToken;
        await user.save();

        // Send tokens to the client
        res.status(200).json({ accessToken, refreshToken });
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
            userRole,
            refreshToken:""
        });

        await createdUser.save();

        res.status(201).json({ message: "User Created Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error });
    }
}

async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token is required" });
        }

        // Verify the refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Find the user
        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        // Generate a new access token
        const accessToken = jwt.sign(
            { id: user._id, role: user.userRole },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.status(200).json({ accessToken });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error });
    }
}



module.exports = { login, register,refreshToken};
