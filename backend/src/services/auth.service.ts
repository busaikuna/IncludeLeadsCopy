import { timingSafeEqual } from 'node:crypto';
import { DatabaseError } from 'pg';
import { AppError } from '../errors/app-error';
import type { User } from '../models/user';
import * as userRepository from '../repositories/user.repository';
import { generateToken } from '../utils/generate-token';
import { comparePassword, hashPassword } from '../utils/password';

interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

interface LoginResult {
  token: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}

const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

function validateRegistrationInput(data: unknown): RegisterUserInput {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('name' in data) ||
    typeof data.name !== 'string' ||
    !('email' in data) ||
    typeof data.email !== 'string' ||
    !('password' in data) ||
    typeof data.password !== 'string'
  ) {
    throw new AppError(400, 'Informe nome, e-mail e senha como texto.');
  }

  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password;

  if (!name) {
    throw new AppError(400, 'O nome é obrigatório.');
  }

  if (name.includes('\0')) {
    throw new AppError(400, 'O nome contém um caractere inválido.');
  }

  if (email.includes('\0') || !EMAIL_PATTERN.test(email)) {
    throw new AppError(400, 'Informe um e-mail válido.');
  }

  if ([...password].length < 8) {
    throw new AppError(400, 'A senha deve ter pelo menos 8 caracteres.');
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new AppError(400, 'A senha deve ter no máximo 72 bytes.');
  }

  return { name, email, password };
}

function toPublicUser(user: User): Omit<User, 'passwordHash'> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    error instanceof DatabaseError &&
    error.code === '23505' &&
    error.constraint === 'users_email_key'
  );
}

export async function registerUser(
  requester: Pick<User, 'id' | 'role'> | null,
  data: unknown,
): Promise<Omit<User, 'passwordHash'>> {
  if (!requester) {
    throw new AppError(401, 'Autenticação necessária.');
  }

  if (requester.role !== 'GESTOR') {
    throw new AppError(
      403,
      'Apenas gestores podem cadastrar usuários do Comercial.',
    );
  }

  const { name, email, password } = validateRegistrationInput(data);

  if (await userRepository.findByEmail(email)) {
    throw new AppError(409, 'Este e-mail já está cadastrado.');
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await userRepository.create({ name, email, passwordHash });

    return toPublicUser(user);
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw new AppError(409, 'Este e-mail já está cadastrado.');
    }

    throw error;
  }
}

export async function setupManager(
  setupToken: string | undefined,
  data: unknown,
): Promise<Omit<User, 'passwordHash'>> {
  const secret = process.env.SETUP_TOKEN;

  if (!secret || !secret.trim() || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new AppError(503, 'Cadastro inicial indisponível.');
  }

  const expectedToken = Buffer.from(secret, 'utf8');
  const providedToken = Buffer.from(setupToken ?? '', 'utf8');

  if (
    providedToken.length !== expectedToken.length ||
    !timingSafeEqual(providedToken, expectedToken)
  ) {
    throw new AppError(403, 'Chave de configuração ausente ou inválida.');
  }

  const { name, email, password } = validateRegistrationInput(data);
  const passwordHash = await hashPassword(password);

  try {
    const user = await userRepository.createManagerIfNone({
      name,
      email,
      passwordHash,
    });

    if (!user) {
      throw new AppError(409, 'Já existe um gestor cadastrado.');
    }

    return toPublicUser(user);
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw new AppError(409, 'Este e-mail já está cadastrado.');
    }

    throw error;
  }
}

export async function loginUser(data: unknown): Promise<LoginResult> {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('email' in data) ||
    typeof data.email !== 'string' ||
    !('password' in data) ||
    typeof data.password !== 'string'
  ) {
    throw new AppError(400, 'Informe e-mail e senha como texto.');
  }

  const email = data.email.trim().toLowerCase();
  const password = data.password;

  if (email.includes('\0') || !EMAIL_PATTERN.test(email)) {
    throw new AppError(400, 'Informe um e-mail válido.');
  }

  if (!password.length) {
    throw new AppError(400, 'A senha é obrigatória.');
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new AppError(400, 'A senha deve ter no máximo 72 bytes.');
  }

  const user = await userRepository.findByEmail(email);

  if (!user) {
    // Executa o bcrypt também quando o e-mail não existe.
    await hashPassword(password);
    throw new AppError(401, INVALID_CREDENTIALS_MESSAGE);
  }

  if (!(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, INVALID_CREDENTIALS_MESSAGE);
  }

  return {
    token: generateToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function getAuthenticatedUser(
  requester: Pick<User, 'id'> | null,
): Promise<Omit<User, 'passwordHash'>> {
  if (!requester) {
    throw new AppError(401, 'Autenticação necessária.');
  }

  const user = await userRepository.findById(requester.id);

  if (!user) {
    throw new AppError(401, 'Autenticação inválida.');
  }

  return toPublicUser(user);
}
