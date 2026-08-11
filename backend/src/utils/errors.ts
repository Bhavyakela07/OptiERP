export class AppError extends Error {
  public statusCode: number;
  public details?: any[];

  constructor(message: string, statusCode: number, details?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Validation failed', details?: any[]) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Missing/invalid token') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Authenticated but role not permitted') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Business rule violation', details?: any[]) {
    super(message, 422, details);
  }
}
