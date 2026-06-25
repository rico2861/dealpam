import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
declare class ForgotPasswordDto {
    email: string;
}
declare class ResetPasswordDto {
    token: string;
    password: string;
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    login(dto: LoginDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    refresh(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(token: string): Promise<void>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
export {};
