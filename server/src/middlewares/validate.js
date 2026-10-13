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

// Middleware generator that validates req.query against a provided Zod schema
export const validateQuery = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.query);
    req.query = parsed; // Replace with sanitized/validated data
    next();
  } catch (error) {
    next(error);
  }
};

