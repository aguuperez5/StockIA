import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validar datos obligatorios (SB-019)
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Los campos name, email y password son obligatorios.' 
      });
    }

    // 2. Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'El email ya se encuentra registrado.' 
      });
    }

    // 3. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Registrar el usuario en la BD (SB-016, SB-018)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
};