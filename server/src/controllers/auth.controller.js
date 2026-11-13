import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { catchAsync } from '../middleware/error.middleware.js';
import User from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';
import { validatePassword } from '../utils/password.js';

const signAccessToken = (userId, tokenVersion) => {
  return jwt.sign({ userId, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    algorithm: 'HS256'
  });
};

const signRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    algorithm: 'HS256'
  });
};

const hashRefreshToken = async (token) => {
  return bcrypt.hash(token, 12);
};

const verifyRefreshTokenHash = async (token, hash) => {
  return bcrypt.compare(token, hash);
};

const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const revokeAllUserTokens = async (userId) => {
  await User.findByIdAndUpdate(userId, { 
    refreshToken: null,
    $inc: { tokenVersion: 1 }
  });
};

export const register = catchAsync(async (req, res) => {
  const { name, email, password, role, campId, phone } = req.body;
  
  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }
  
  // Validate role
  const allowedRoles = ['coordinator', 'dispatcher', 'admin'];
  const userRole = allowedRoles.includes(role) ? role : 'coordinator';
  
  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: userRole,
    campId: campId || undefined,
    phone
  });
  
  // Generate tokens
  const accessToken = signAccessToken(user._id, user.tokenVersion);
  const refreshToken = signRefreshToken(user._id);
  
  // Store hashed refresh token
  user.refreshToken = await hashRefreshToken(refreshToken);
  await user.save();
  
  setRefreshTokenCookie(res, refreshToken);
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: user.toJSON(),
      accessToken
    }
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }
  
  // Find user with password
  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }
  
  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }
  
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }
  
  // Generate tokens
  const accessToken = signAccessToken(user._id, user.tokenVersion);
  const refreshToken = signRefreshToken(user._id);
  
  // Store hashed refresh token
  user.refreshToken = await hashRefreshToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();
  
  setRefreshTokenCookie(res, refreshToken);
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      accessToken
    }
  });
});

export const refresh = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
  if (!refreshToken) {
    throw new AppError('Refresh token required', 401);
  }
  
  // Verify refresh token signature
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  
  // Find user and verify stored refresh token hash
  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || !user.refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }
  
  const isValid = await verifyRefreshTokenHash(refreshToken, user.refreshToken);
  
  if (!isValid) {
    // Token reuse detected - revoke all tokens for this user
    await revokeAllUserTokens(user._id);
    throw new AppError('Invalid refresh token - possible token reuse detected', 401);
  }
  
  // Generate new tokens (rotation)
  const newAccessToken = signAccessToken(user._id, user.tokenVersion);
  const newRefreshToken = signRefreshToken(user._id);
  
  // Update stored refresh token hash
  user.refreshToken = await hashRefreshToken(newRefreshToken);
  await user.save();
  
  setRefreshTokenCookie(res, newRefreshToken);
  
  res.json({
    success: true,
    data: {
      accessToken: newAccessToken
    }
  });
});

export const logout = catchAsync(async (req, res) => {
  // Clear refresh token from user
  if (req.userId) {
    await revokeAllUserTokens(req.userId);
  }
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.userId);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.json({
    success: true,
    data: { user: user.toJSON() }
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const { name, phone } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.userId,
    { name, phone },
    { new: true, runValidators: true }
  );
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Profile updated',
    data: { user: user.toJSON() }
  });
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password required', 400);
  }

  // Validate new password using shared utility
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new AppError(validation.errors[0], 400);
  }

  const user = await User.findById(req.userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});