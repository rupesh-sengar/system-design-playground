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

export class UnauthorizedRequestError extends HttpError {
  constructor(message: string) {
    super(message, 401);
  }
}
