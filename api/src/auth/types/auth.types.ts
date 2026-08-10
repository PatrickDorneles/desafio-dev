export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  user: UserProfile;
}

export interface JwtUser {
  sub: string;
}
