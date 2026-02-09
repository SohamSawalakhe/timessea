import { Injectable } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(details: any) {
    // Check if user exists by Google ID
    const userByGoogleId = await this.usersService.findOne({
      googleId: details.googleId,
    });
    if (userByGoogleId) return userByGoogleId;

    // Check if user exists by email
    const userByEmail = await this.usersService.findOne({
      email: details.email,
    });
    if (userByEmail) {
      // Connect googleId to existing user if not present
      // For now just return the user, assuming implied linking
      // Ideally we would update the user to add googleId here
      // But define update in UsersService first?
      // Let's just return the user for now to avoid complexity without update method
      return userByEmail;
    }

    // Create new user
    return this.usersService.create({
      email: details.email,
      name: `${details.firstName} ${details.lastName}`,
      picture: details.picture,
      googleId: details.googleId,
      provider: 'google',
    });
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };

    // Generate access token (short-lived: 15 minutes)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    // Generate refresh token (long-lived: 7 days)
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async createRefreshToken(userId: string): Promise<string> {
    // Generate a secure random token
    const token = randomBytes(64).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store in database
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async refreshAccessToken(refreshToken: string) {
    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new Error('Refresh token expired');
    }

    // Generate new access token
    const payload = { email: storedToken.user.email, sub: storedToken.user.id };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    // Optionally: Rotate refresh token (generate new one and delete old)
    // This is more secure but requires updating the cookie
    // For now, we'll keep the same refresh token

    return {
      access_token: accessToken,
      user: storedToken.user,
    };
  }

  async revokeRefreshToken(token: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
