'use strict';

const { validationResult } = require('express-validator');

/**
 * Runs express-validator results and returns 400 if any errors
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/**
 * Standard API response helpers
 */
function ok(res, data, meta = {}) {
  return res.json({ success: true, data, ...meta });
}

function err(res, message, status = 500, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

module.exports = { validate, ok, err };
