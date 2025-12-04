export interface LoginResponse {
  user: {
    id: string;

    email: string;

    username: string;

    fullName?: string | null;

    avatarUrl?: string | null;

    createdAt: string;

    updatedAt: string;
  };

  accessToken: string;
}

