import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg
      }))
    });
  }
  next();
};

// Input sanitization and validation rules
export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be 6-100 characters long'),
  handleValidationErrors
];

export const validateCampaign = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .escape()
    .withMessage('Campaign name must be 1-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .escape()
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors
];

export const validateEmailConfig = [
  body('senderEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('senderPassword')
    .optional()
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be 6-100 characters if provided'),
  body('dailyLimit')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Daily limit must be between 1 and 10000'),
  handleValidationErrors
];

export const validateEmailSending = [
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .escape()
    .withMessage('Subject must be 1-200 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be 1-5000 characters'),
  body('targetSection')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Section must contain only uppercase letters, numbers, and underscores'),
  handleValidationErrors
];

export const validateStudentId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Student ID must be a positive integer'),
  handleValidationErrors
];

export const validateCampaignId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),
  handleValidationErrors
];

export const validateQueryParams = [
  query('campaignId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),
  query('section')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Section must contain only uppercase letters, numbers, and underscores'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  handleValidationErrors
];

// XSS protection for text content
export const sanitizeHtml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// SQL injection protection - additional layer
export const validateSqlInput = (input: string): boolean => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(;|--|\/\*|\*\/|xp_|sp_)/i,
    /(\b(OR|AND)\b.*[=<>])/i
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(input));
};
