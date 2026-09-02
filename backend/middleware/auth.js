const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const auth = req.headers.authorization;
  if (!auth)
    return res.status(401).json({ error: 'missing auth' });

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer')
    return res.status(401).json({ error: 'invalid auth format' });

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');

    req.userId = decoded.userId;

    // Flexible userType detection
    if (decoded.userType) {
      req.userType = decoded.userType;
    } else if (decoded.role === 'employer' || decoded.role === 'company') {
      req.userType = 'EmployersProfile';
    } else {
      req.userType = 'Profile';
    }

    next();
  } catch (err) {
    console.error('[auth] Token verification failed:', err);
    return res.status(401).json({ error: 'invalid token' });
  }
};
