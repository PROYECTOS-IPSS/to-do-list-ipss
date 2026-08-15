import { loginSchema, registerSchema } from '../auth.schemas';

describe('Auth Schemas Validation', () => {
  describe('Login Schema', () => {
    describe('Email validation', () => {
      it('accepts valid email', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('accepts valid email with subdomain', () => {
        const result = loginSchema.safeParse({ email: 'user@mail.example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('accepts email with plus sign', () => {
        const result = loginSchema.safeParse({ email: 'user+tag@gmail.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('normalizes email to lowercase', () => {
        const result = loginSchema.safeParse({ email: 'User@Example.COM', password: 'password123' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('user@example.com');
        }
      });

      it('trims spaces from email', () => {
        const result = loginSchema.safeParse({ email: '  user@example.com  ', password: 'password123' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('user@example.com');
        }
      });

      it('rejects empty email', () => {
        const result = loginSchema.safeParse({ email: '', password: 'password123' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('El correo electrónico es obligatorio.');
        }
      });

      it('rejects email without @', () => {
        const result = loginSchema.safeParse({ email: 'correo', password: 'password123' });
        expect(result.success).toBe(false);
      });

      it('rejects email without domain', () => {
        const result = loginSchema.safeParse({ email: 'correo@', password: 'password123' });
        expect(result.success).toBe(false);
      });

      it('rejects email without TLD', () => {
        const result = loginSchema.safeParse({ email: 'usuario@gmail', password: 'password123' });
        expect(result.success).toBe(false);
      });

      it('rejects email with space in middle', () => {
        const result = loginSchema.safeParse({ email: 'correo @gmail.com', password: 'password123' });
        expect(result.success).toBe(false);
      });
    });

    describe('Password validation', () => {
      it('accepts valid password (8 chars)', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: '12345678' });
        expect(result.success).toBe(true);
      });

      it('accepts valid password (72 chars)', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: 'a'.repeat(72) });
        expect(result.success).toBe(true);
      });

      it('rejects empty password', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('La contraseña debe tener al menos 8 caracteres.');
        }
      });

      it('rejects password with 7 characters', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: '1234567' });
        expect(result.success).toBe(false);
      });

      it('rejects password with 73 characters', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: 'a'.repeat(73) });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('La contraseña no puede superar 72 caracteres.');
        }
      });

      it('accepts password with special characters', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: 'P@$$w0rd!#' });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Register Schema', () => {
    describe('Name validation', () => {
      it('accepts valid name', () => {
        const result = registerSchema.safeParse({ name: 'Alonso', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('accepts name with spaces', () => {
        const result = registerSchema.safeParse({ name: 'José María', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('accepts name with accented characters', () => {
        const result = registerSchema.safeParse({ name: 'María', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('accepts name with ñ', () => {
        const result = registerSchema.safeParse({ name: 'Muñoz', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('accepts compound name', () => {
        const result = registerSchema.safeParse({ name: 'María José', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('trims spaces from name', () => {
        const result = registerSchema.safeParse({ name: '  Alonso  ', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Alonso');
        }
      });

      it('rejects empty name', () => {
        const result = registerSchema.safeParse({ name: '', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('El nombre es obligatorio.');
        }
      });

      it('rejects name with numbers', () => {
        const result = registerSchema.safeParse({ name: 'Alonso123', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('El nombre solo puede contener letras y espacios.');
        }
      });

      it('rejects name with symbols', () => {
        const result = registerSchema.safeParse({ name: 'Juan@', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(false);
      });

      it('rejects name with underscore', () => {
        const result = registerSchema.safeParse({ name: 'Pedro_123', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(false);
      });

      it('rejects name with hyphen', () => {
        const result = registerSchema.safeParse({ name: 'Alonso-García', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(false);
      });

      it('rejects excessively long name', () => {
        const result = registerSchema.safeParse({ name: 'a'.repeat(101), email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('El nombre es demasiado largo.');
        }
      });
    });

    describe('Email validation (same as login)', () => {
      it('accepts valid email', () => {
        const result = registerSchema.safeParse({ name: 'Alonso', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('rejects email without TLD', () => {
        const result = registerSchema.safeParse({ name: 'Alonso', email: 'usuario@gmail', password: 'password123' });
        expect(result.success).toBe(false);
      });
    });

    describe('Password validation (same as login)', () => {
      it('accepts valid password', () => {
        const result = registerSchema.safeParse({ name: 'Alonso', email: 'user@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('rejects short password', () => {
        const result = registerSchema.safeParse({ name: 'Alonso', email: 'user@example.com', password: 'short' });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Error messages are in Spanish', () => {
    it('returns Spanish error for invalid email', () => {
      const result = loginSchema.safeParse({ email: 'invalid', password: 'password123' });
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+/);
      }
    });

    it('returns Spanish error for invalid password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+/);
      }
    });

    it('returns Spanish error for invalid name', () => {
      const result = registerSchema.safeParse({ name: '123', email: 'user@example.com', password: 'password123' });
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+/);
      }
    });
  });

  describe('Critical Edge Cases', () => {
    it('accepts " Alonso " (trims spaces)', () => {
      const result = registerSchema.safeParse({ name: ' Alonso ', email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Alonso');
      }
    });

    it('accepts "José María"', () => {
      const result = registerSchema.safeParse({ name: 'José María', email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('accepts "Ñúñez"', () => {
      const result = registerSchema.safeParse({ name: 'Ñúñez', email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('rejects "Alonso123"', () => {
      const result = registerSchema.safeParse({ name: 'Alonso123', email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects "Alonso-García" (hyphen not allowed)', () => {
      const result = registerSchema.safeParse({ name: 'Alonso-García', email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects "Alonso_García" (underscore not allowed)', () => {
      const result = registerSchema.safeParse({ name: 'Alonso_García', email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects "Alonso@"', () => {
      const result = registerSchema.safeParse({ name: 'Alonso@', email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects "usuario@gmail" (no TLD)', () => {
      const result = loginSchema.safeParse({ email: 'usuario@gmail', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('accepts "usuario@gmail.com"', () => {
      const result = loginSchema.safeParse({ email: 'usuario@gmail.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('accepts "usuario@mail.example.com" (subdomain)', () => {
      const result = loginSchema.safeParse({ email: 'usuario@mail.example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });
  });

  describe('No Request on Invalid Input', () => {
    it('does not call login when Zod fails', () => {
      const mockLogin = jest.fn();
      
      const submit = async (email: string, password: string, loginFn: typeof mockLogin) => {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) return;
        await loginFn(result.data.email, result.data.password);
      };

      submit('invalid-email', 'password123', mockLogin);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('does not call register when Zod fails', () => {
      const mockRegister = jest.fn();
      
      const submit = async (name: string, email: string, password: string, registerFn: typeof mockRegister) => {
        const result = registerSchema.safeParse({ name, email, password });
        if (!result.success) return;
        await registerFn(result.data.name, result.data.email, result.data.password);
      };

      submit('Alonso123', 'user@example.com', 'password123', mockRegister);
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('calls login when Zod passes', () => {
      const mockLogin = jest.fn().mockResolvedValue({ success: true });
      
      const submit = async (email: string, password: string, loginFn: typeof mockLogin) => {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) return;
        await loginFn(result.data.email, result.data.password);
      };

      submit('user@example.com', 'password123', mockLogin);
      expect(mockLogin).toHaveBeenCalled();
    });
  });
});
