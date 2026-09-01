import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida que un valor sea un string no vacío (ignorando espacios). Se usa
// para no depender de checks "falsy" (" " es truthy en JS y pasaría un
// simple `if (!value)`).
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validar datos obligatorios (SB-019)
    // El backend valida de forma independiente del frontend: no alcanza con
    // que los campos existan, deben ser strings no vacíos (rechaza espacios
    // en blanco) y, en el caso del email, tener un formato válido.
    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        error: 'Los campos name, email y password son obligatorios.'
      });
    }

    const normalizedEmail = email.trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        error: 'El email ingresado no tiene un formato válido.'
      });
    }

    // 2. Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
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
        name: name.trim(),
        email: normalizedEmail,
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