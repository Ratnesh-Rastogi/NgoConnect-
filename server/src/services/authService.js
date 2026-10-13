import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

// Register a new user (donor or NGO)
export const registerUser = async (data) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() }
  });

  if (existingUser) {
    throw new AppError('An account with this email address already exists.', 409);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);

  // Use a transaction so User and NgoProfile are committed atomically
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role
      }
    });

    if (data.role === 'ngo') {
      const existingReg = await tx.ngoProfile.findUnique({
        where: { regNumber: data.regNumber }
      });
      if (existingReg) {
        throw new AppError('An NGO with this registration number already exists.', 409);
      }

      let categoryId = data.categoryId;
      if (!categoryId && data.category) {
        const cat = await tx.category.findFirst({
          where: {
            OR: [
              { id: data.category },
              { slug: data.category.toLowerCase().replace(/\s+/g, '-') },
              { name: { contains: data.category, mode: 'insensitive' } }
            ]
          }
        });
        if (cat) {
          categoryId = cat.id;
        }
      }
      if (!categoryId) {
        const defaultCat = await tx.category.findFirst();
        categoryId = defaultCat?.id;
      }

      await tx.ngoProfile.create({
        data: {
          userId: user.id,
          orgName: data.orgName,
          regNumber: data.regNumber,
          description: data.description,
          categoryId,
          contactPhone: data.contactPhone,
          address: data.address,
          city: data.city,
          verificationDocUrl: data.verificationDocUrl || null,
          verificationStatus: 'PENDING' // Newly registered NGOs always start as PENDING
        }
      });
    }

    return tx.user.findUnique({
      where: { id: user.id },
      include: { ngoProfile: true }
    });
  });

  const token = jwt.sign(
    { id: newUser.id, role: newUser.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return { token, user: newUser };
};

// Log in an existing user
export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { ngoProfile: true }
  });

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return { token, user };
};

// Retrieve current logged in user profile
export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ngoProfile: true }
  });

  if (!user) {
    throw new AppError('User profile not found.', 404);
  }

  return user;
};
