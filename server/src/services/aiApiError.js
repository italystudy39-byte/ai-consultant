export class AiApiError extends Error {
  constructor(provider, operation, message, statusCode) {
    super(message);
    this.provider = provider;
    this.operation = operation;
    this.statusCode = statusCode;
  }
}
