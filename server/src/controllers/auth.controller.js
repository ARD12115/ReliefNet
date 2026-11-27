import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { validatePassword } from '../utils/password.js';
import { sequelize } from '../config/db.js';
import User from '../models/User.js';
import Camp from '../models/Camp.js';

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
  await User.update(
    { refreshToken: null, tokenVersion: sequelize.literal('tokenVersion + 1') },
    { where: { id: userId } }
  );
};

export const register = catchAsync(async (req, res) => {
  const { name, email, password, role, campId, phone } = req.body;

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const allowedRoles = ['coordinator'];
  const userRole = allowedRoles.includes(role) ? role : 'coordinator';

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: userRole,
    campId: campId || undefined,
    phone
  });

  const accessToken = signAccessToken(user.id, user.tokenVersion);
  const refreshToken = signRefreshToken(user.id);

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

  const user = await User.unscoped().findOne({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  const accessToken = signAccessToken(user.id, user.tokenVersion);
  const refreshToken = signRefreshToken(user.id);

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

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.unscoped().findByPk(decoded.userId);
  if (!user || !user.refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  const isValid = await verifyRefreshTokenHash(refreshToken, user.refreshToken);

  if (!isValid) {
    await revokeAllUserTokens(user.id);
    throw new AppError('Invalid refresh token - possible token reuse detected', 401);
  }

  const newAccessToken = signAccessToken(user.id, user.tokenVersion);
  const newRefreshToken = signRefreshToken(user.id);

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
  const user = await User.findByPk(req.userId);

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

  const [, [user]] = await User.update(
    { name, phone },
    { where: { id: req.userId }, returning: true }
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

  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new AppError(validation.errors[0], 400);
  }

  const user = await User.unscoped().findByPk(req.userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
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

// Admin-only user management
export const getUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, role, isActive } = req.query;
  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const skip = (page - 1) * limit;
  const users = await User.findAll({
    where,
    attributes: { exclude: ['password', 'refreshToken'] },
    offset: skip,
    limit: parseInt(limit),
    order: [['createdAt', 'DESC']],
    include: [{ model: Camp, as: 'camp', attributes: ['id', 'name'] }]
  });

  const total = await User.count({ where });

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getUser = catchAsync(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password', 'refreshToken'] },
    include: [{ model: Camp, as: 'camp', attributes: ['id', 'name'] }]
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user: user.toJSON() }
  });
});

export const updateUser = catchAsync(async (req, res) => {
  const { name, phone, role, campId, isActive } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (role) updateData.role = role;
  if (campId !== undefined) updateData.campId = campId || null;
  if (isActive !== undefined) updateData.isActive = isActive;

  const [, [user]] = await User.update(updateData, {
    where: { id: req.params.id },
    returning: true,
    attributes: { exclude: ['password', 'refreshToken'] },
    include: [{ model: Camp, as: 'camp', attributes: ['id', 'name'] }]
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // If role or campId changed, revoke tokens to force re-auth
  if (role || campId !== undefined) {
    await revokeAllUserTokens(user.id);
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user: user.toJSON() }
  });
});

export const deleteUser = catchAsync(async (req, res) => {
  // Soft delete - deactivate user
  const [, [user]] = await User.update(
    { isActive: false },
    { where: { id: req.params.id }, returning: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Revoke all tokens
  await revokeAllUserTokens(user.id);

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
});
