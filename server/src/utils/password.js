export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  
  // Check password complexity (Unicode-aware)
  if (!/\p{Lu}/u.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/\p{Ll}/u.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/\p{N}/u.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/\p{P}/u.test(password)) {
    errors.push('Password must contain special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true
};