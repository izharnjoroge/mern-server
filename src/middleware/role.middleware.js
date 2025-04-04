function verifyRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.isAdmin)) {
      console.log(req.user.isAdmin);
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}

module.exports = verifyRole;
