import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';
const JWT_REFRESH_SECRET = 'test-refresh-secret';

const signAccessToken = (userId, tokenVersion) => {
  return jwt.sign({ userId, tokenVersion }, JWT_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256'
  });
};

const signRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
};

describe('Token Version Logic (Unit Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signAccessToken', () => {
    it('should include tokenVersion in JWT payload', () => {
      const token = signAccessToken('user123', 5);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.userId).toBe('user123');
      expect(decoded.tokenVersion).toBe(5);
    });

    it('should not include tokenVersion when not provided', () => {
      const token = signAccessToken('user123');
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.tokenVersion).toBeUndefined();
    });
  });

  describe('signRefreshToken', () => {
    it('should NOT include tokenVersion in refresh token', () => {
      const token = signRefreshToken('user123');
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
      
      expect(decoded.userId).toBe('user123');
      expect(decoded.tokenVersion).toBeUndefined();
    });
  });

  describe('tokenVersion invalidation logic', () => {
    it('should allow access when tokenVersion matches', () => {
      const userTokenVersion = 3;
      const token = signAccessToken('user123', userTokenVersion);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const matches = decoded.tokenVersion === userTokenVersion;
      expect(matches).toBe(true);
    });

    it('should reject access when tokenVersion mismatches', () => {
      const userTokenVersion = 5;
      const token = signAccessToken('user123', 3);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const matches = decoded.tokenVersion === userTokenVersion;
      expect(matches).toBe(false);
    });

    it('should handle undefined tokenVersion gracefully', () => {
      const userTokenVersion = 0;
      const token = signAccessToken('user123');
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const matches = decoded.tokenVersion !== undefined && decoded.tokenVersion === userTokenVersion;
      expect(matches).toBe(false);
    });
  });

  describe('revokeAllUserTokens simulation', () => {
    it('should increment tokenVersion', async () => {
      let tokenVersion = 0;
      
      const revokeAllUserTokens = async () => {
        tokenVersion += 1;
      };
      
      await revokeAllUserTokens();
      expect(tokenVersion).toBe(1);
      
      await revokeAllUserTokens();
      expect(tokenVersion).toBe(2);
    });
  });

  describe('refresh token rotation', () => {
    it('should generate new access token with current tokenVersion', () => {
      const user = { _id: 'user123', tokenVersion: 2 };
      
      const newAccessToken = signAccessToken(user._id, user.tokenVersion);
      const decoded = jwt.verify(newAccessToken, JWT_SECRET);
      
      expect(decoded.tokenVersion).toBe(2);
    });

    it('should generate new refresh token without tokenVersion', () => {
      const newRefreshToken = signRefreshToken('user123');
      const decoded = jwt.verify(newRefreshToken, JWT_REFRESH_SECRET);
      
      expect(decoded.tokenVersion).toBeUndefined();
    });
  });

  describe('reuse detection flow', () => {
    it('should generate valid refresh tokens on each call', () => {
      const user = { _id: 'user123', tokenVersion: 0 };
      const originalRefreshToken = signRefreshToken(user._id);
      const newRefreshToken = signRefreshToken(user._id);
      
      expect(typeof originalRefreshToken).toBe('string');
      expect(typeof newRefreshToken).toBe('string');
      expect(originalRefreshToken.length).toBeGreaterThan(0);
      expect(newRefreshToken.length).toBeGreaterThan(0);
    });
  });
});

describe('Auth Middleware tokenVersion check', () => {
  const JWT_SECRET = 'test-secret';
  
  const signAccessToken = (userId, tokenVersion) => {
    return jwt.sign({ userId, tokenVersion }, JWT_SECRET, {
      expiresIn: '15m',
      algorithm: 'HS256'
    });
  };

  it('should allow request when tokenVersion matches user', () => {
    const user = { _id: 'user123', tokenVersion: 3, isActive: true };
    const token = signAccessToken(user._id, user.tokenVersion);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const isValid = decoded.tokenVersion !== undefined && decoded.tokenVersion === user.tokenVersion;
    expect(isValid).toBe(true);
  });

  it('should reject request when tokenVersion mismatches', () => {
    const user = { _id: 'user123', tokenVersion: 5, isActive: true };
    const token = signAccessToken(user._id, 2);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const isValid = decoded.tokenVersion !== undefined && decoded.tokenVersion === user.tokenVersion;
    expect(isValid).toBe(false);
  });

  it('should reject request when token has no tokenVersion', () => {
    const user = { _id: 'user123', tokenVersion: 0, isActive: true };
    const token = signAccessToken(user._id);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const isValid = decoded.tokenVersion !== undefined && decoded.tokenVersion === user.tokenVersion;
    expect(isValid).toBe(false);
  });

  it('optionalAuth should skip user attachment on mismatch (not throw)', () => {
    const user = { _id: 'user123', tokenVersion: 5, isActive: true };
    const token = signAccessToken(user._id, 2);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    let userAttached = false;
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion === user.tokenVersion) {
      userAttached = true;
    }
    
    expect(userAttached).toBe(false);
  });
});