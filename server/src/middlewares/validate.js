// Middleware generator that validates req.body against a provided Zod schema
export const validateBody = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed; // Replace with sanitized/validated data
    next();
  } catch (error) {
    next(error);
  }
};
