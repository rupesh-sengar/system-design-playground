export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message: string) {
    super(message, 503);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedRequestError extends HttpError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenRequestError extends HttpError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class PaymentRequiredRequestError extends HttpError {
  constructor(message: string) {
    super(message, 402);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message: string) {
    super(message, 429);
  }
}
