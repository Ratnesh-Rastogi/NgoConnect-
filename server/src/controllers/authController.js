import * as authService from '../services/authService.js';
import { toAuthUser } from '../mappers/userMapper.js';
import { config } from '../config/env.js';

// Standard cookie options for httpOnly JWT session
const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Register new donor or NGO account and attach httpOnly cookie
export const register = async (req, res, next) => {
  try {
    const { token, user } = await authService.registerUser(req.body);
    res.cookie('token', token, getCookieOptions());
    res.status(201).json({
      token,
      user: toAuthUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// Login user and set httpOnly cookie
export const login = async (req, res, next) => {
  try {
    const { token, user } = await authService.loginUser(req.body);
    res.cookie('token', token, getCookieOptions());
    res.status(200).json({
      token,
      user: toAuthUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// Logout user and clear httpOnly cookie
export const logout = async (req, res, next) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax'
    });
    res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Current authenticated user's session profile
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({
      user: toAuthUser(user)
    });
  } catch (error) {
    next(error);
  }
};
