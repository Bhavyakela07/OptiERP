import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db';
import { LoginInput, CreateUserInput } from './auth.schema';
import { UnauthorizedError, ConflictError } from '../../utils/errors';

export async function loginUser(input: LoginInput) {
  const result = await query(
    `SELECT id, name, email, password_hash, role FROM users WHERE email = $1`,
    [input.email]
  );

  const user = result.rows[0];
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-mini-erp-crm-2026';
  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    secret,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

export async function getUserById(id: string) {
  const result = await query(
    `SELECT id, name, email, role FROM users WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new UnauthorizedError('User not found');
  }
  return result.rows[0];
}

export async function createUserByAdmin(input: CreateUserInput) {
  const existing = await query(`SELECT id FROM users WHERE email = $1`, [input.email]);
  if (existing.rows.length > 0) {
    throw new ConflictError('User with this email already exists');
  }

  const hash = await bcrypt.hash(input.password, 10);
  const res = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [input.name, input.email, hash, input.role]
  );

  return res.rows[0];
}

export async function listAllUsers() {
  const res = await query(
    `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`
  );
  return res.rows;
}
