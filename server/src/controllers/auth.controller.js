import jwt from 'jsonwebtoken';
import { catchAsync } from '../middleware/error.middleware.js';
import User from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';

const signAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
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

const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  
  // Store refresh token
  user.refreshToken = refreshToken;
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
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  
  // Store refresh token
  user.refreshToken = refreshToken;
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
  
  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  
  // Find user and verify stored refresh token
  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }
  
  // Generate new tokens
  const newAccessToken = signAccessToken(user._id);
  const newRefreshToken = signRefreshToken(user._id);
  
  // Update stored refresh token
  user.refreshToken = newRefreshToken;
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
    await User.findByIdAndUpdate(req.userId, { refreshToken: null });
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
  
  if (newPassword.length < 12) {
    throw new AppError('New password must be at least 12 characters', 400);
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