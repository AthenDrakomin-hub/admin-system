/**
 * Parameter validation utilities for backend APIs
 * Provides consistent validation and error messages
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: `字段 ${field} 不能为空`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate string enum values
 */
export function validateEnum(
  data: Record<string, any>,
  field: string,
  allowedValues: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const value = data[field];

  if (value !== undefined && value !== null && !allowedValues.includes(value)) {
    errors.push({
      field,
      message: `字段 ${field} 的值无效，允许的值: ${allowedValues.join(', ')}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate numeric range
 */
export function validateNumberRange(
  data: Record<string, any>,
  field: string,
  min?: number,
  max?: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const value = data[field];

  if (value !== undefined && value !== null) {
    const num = Number(value);
    if (isNaN(num)) {
      errors.push({
        field,
        message: `字段 ${field} 必须是数字`,
      });
    } else {
      if (min !== undefined && num < min) {
        errors.push({
          field,
          message: `字段 ${field} 不能小于 ${min}`,
        });
      }
      if (max !== undefined && num > max) {
        errors.push({
          field,
          message: `字段 ${field} 不能大于 ${max}`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate string length
 */
export function validateStringLength(
  data: Record<string, any>,
  field: string,
  min?: number,
  max?: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const value = data[field];

  if (value !== undefined && value !== null) {
    const str = String(value);
    if (min !== undefined && str.length < min) {
      errors.push({
        field,
        message: `字段 ${field} 长度不能小于 ${min} 个字符`,
      });
    }
    if (max !== undefined && str.length > max) {
      errors.push({
        field,
        message: `字段 ${field} 长度不能大于 ${max} 个字符`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Combined validation function
 */
export function validate(
  data: Record<string, any>,
  rules: {
    required?: string[];
    enum?: { field: string; values: string[] }[];
    numberRange?: { field: string; min?: number; max?: number }[];
    stringLength?: { field: string; min?: number; max?: number }[];
  }
): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Validate required fields
  if (rules.required) {
    const result = validateRequired(data, rules.required);
    allErrors.push(...result.errors);
  }

  // Validate enum values
  if (rules.enum) {
    for (const rule of rules.enum) {
      const result = validateEnum(data, rule.field, rule.values);
      allErrors.push(...result.errors);
    }
  }

  // Validate number range
  if (rules.numberRange) {
    for (const rule of rules.numberRange) {
      const result = validateNumberRange(data, rule.field, rule.min, rule.max);
      allErrors.push(...result.errors);
    }
  }

  // Validate string length
  if (rules.stringLength) {
    for (const rule of rules.stringLength) {
      const result = validateStringLength(data, rule.field, rule.min, rule.max);
      allErrors.push(...result.errors);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Create validation middleware for Next.js API routes
 */
export function createValidator(rules: Parameters<typeof validate>[1]) {
  return async function validator(data: Record<string, any>) {
    const result = validate(data, rules);
    
    if (!result.valid) {
      throw new Error(
        `参数验证失败: ${result.errors.map(e => `${e.field}: ${e.message}`).join('; ')}`
      );
    }
    
    return data;
  };
}

// Common validation rules for specific APIs
export const tradeAuditRules = {
  required: ['orderId', 'action', 'adminId', 'adminName'],
  enum: [
    { field: 'action', values: ['approve', 'reject'] },
  ],
  stringLength: [
    { field: 'reason', max: 500 },
  ],
};

export const financeAuditRules = {
  required: ['type', 'requestId', 'action', 'adminId', 'adminName'],
  enum: [
    { field: 'type', values: ['recharge', 'withdraw'] },
    { field: 'action', values: ['approve', 'reject'] },
  ],
  stringLength: [
    { field: 'reason', max: 500 },
  ],
};

export const fundAdjustRules = {
  required: ['userId', 'amount', 'type', 'currency', 'adminId', 'adminName'],
  enum: [
    { field: 'type', values: ['add', 'reduce'] },
    { field: 'currency', values: ['CNY', 'HKD', 'USD'] },
  ],
  numberRange: [
    { field: 'amount', min: 0.01 },
  ],
  stringLength: [
    { field: 'remark', max: 500 },
  ],
};
