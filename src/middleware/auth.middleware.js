const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  try {
    let token;
    const header = req.headers.Authorization || req.headers.authorization;

    if (!header || !header.startsWith('Bearer')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    token = header.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Missing token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      _id: decoded.id,
      isAdmin: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
}

module.exports = verifyToken;
