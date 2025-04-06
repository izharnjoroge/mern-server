const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { successResponse, errorResponse } = require('../errors/errors');

async function login(req, res) {
  try {
    const { userEmail, userPassword } = req.body;

    const user = await User.findOne({ userEmail });

    if (!user) {
      return errorResponse(res, 'User does not exist', 404, null);
    }

    const isMatch = await bcrypt.compare(userPassword, user.userPassword);

    if (!isMatch) {
      return errorResponse(res, 'Wrong Password', 400, null);
    }

    // Generate access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.userRole },
      process.env.JWT_SECRET,
      { expiresIn: '1hr' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    successResponse(res, { accessToken, refreshToken });
  } catch (error) {
    errorResponse(res, 'Something went wrong', 500, error);
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
      refreshToken: '',
    });

    await createdUser.save();

    successResponse(res, 'User created');
  } catch (error) {
    errorResponse(res, 'Something went wrong', 500, error);
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 'Refresh token is missing', 401, null);
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find the user
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return errorResponse(res, 'Invalid refresh token', 403, null);
    }

    // Generate a new access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.userRole },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    successResponse(res, { accessToken, refreshToken });
  } catch (error) {
    errorResponse(res, 'Something went wrong', 500, error);
  }
}

module.exports = { login, register, refreshToken };
