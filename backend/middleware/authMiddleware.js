import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.error('❌ No token provided in request to ' + req.originalUrl);
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`✅ Token decoded for ${req.originalUrl}: id=${decoded.id}, role=${decoded.role}`);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    console.error(`❌ Token verification failed for ${req.originalUrl}: ${error.message}`);
    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

export const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      console.error(`❌ Access denied to ${req.originalUrl}: User role=${req.user?.role || 'undefined'}, Required roles=${roles.join(', ')}`);
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
    console.log(`✅ Authorized for ${req.originalUrl}: User role=${req.user.role}`);
    next();
  };
};