import { useCallback } from 'react';

interface CognitoAuthenticationResult {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  ExpiresIn: number;
  TokenType: string;
}

interface CognitoInitiateAuthResponse {
  ChallengeName?: 'NEW_PASSWORD_REQUIRED';
  Session?: string;
  AuthenticationResult?: CognitoAuthenticationResult;
}

interface CognitoCodeDeliveryDetails {
  Destination: string;
  DeliveryMedium: string;
  AttributeName: string;
}

interface CognitoForgotPasswordResponse {
  CodeDeliveryDetails: CognitoCodeDeliveryDetails;
}

interface CognitoErrorBody {
  __type?: string;
  message?: string;
}

/** Typed, retryable Cognito failure — callers branch on `type` (e.g. `NotAuthorizedException`, `InvalidPasswordException`). */
export class CognitoAuthError extends Error {
  constructor(
    public readonly type: string,
    message: string,
  ) {
    super(message);
    this.name = 'CognitoAuthError';
  }
}

// Cognito's public User Pool API is called directly with `fetch` (no AWS SDK, no server hop) —
// this is a third-party identity-provider call outside the fitness-api boundary, not a case
// covered by the "no direct fetch in hooks" rule, which governs calls to our own backend
// (see 023-first-time-login research.md R3, 028-subsequent-login plan.md Constitution Check II).
async function callCognito<T>(target: string, body: Record<string, unknown>): Promise<T> {
  const region = process.env.NEXT_PUBLIC_COGNITO_REGION;
  const cognitoEndpoint = `https://cognito-idp.${region}.amazonaws.com`;
  const response = await fetch(cognitoEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok) {
    const errorBody = json as CognitoErrorBody;
    throw new CognitoAuthError(
      errorBody.__type ?? 'UnknownError',
      errorBody.message ?? 'Cognito authentication failed',
    );
  }

  return json as T;
}

/**
 * Amazon Cognito `InitiateAuth` / `RespondToAuthChallenge` for the email+password sign-in path —
 * shared by the first-time-login (temporary password + forced change) and regular login
 * (028-subsequent-login) screens. `initiateAuth` alone covers a returning staff member's normal
 * sign-in; `respondToNewPassword` is only needed by the first-time-login challenge step.
 * `forgotPassword` / `confirmForgotPassword` (029-password-reset) cover the self-service
 * reset flow via the same public, unauthenticated Cognito API.
 */
export function useCognitoAuth() {
  const initiateAuth = useCallback(
    ({ email, password }: { email: string; password: string }) =>
      callCognito<CognitoInitiateAuthResponse>('InitiateAuth', {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }),
    [],
  );

  const respondToNewPassword = useCallback(
    ({
      username,
      session,
      newPassword,
    }: {
      username: string;
      session: string;
      newPassword: string;
    }) =>
      callCognito<CognitoInitiateAuthResponse>('RespondToAuthChallenge', {
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
        ChallengeResponses: { USERNAME: username, NEW_PASSWORD: newPassword },
        Session: session,
      }),
    [],
  );

  const forgotPassword = useCallback(
    ({ email }: { email: string }) =>
      callCognito<CognitoForgotPasswordResponse>('ForgotPassword', {
        ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
        Username: email,
      }),
    [],
  );

  const confirmForgotPassword = useCallback(
    ({ email, code, newPassword }: { email: string; code: string; newPassword: string }) =>
      callCognito<Record<string, never>>('ConfirmForgotPassword', {
        ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      }),
    [],
  );

  return { initiateAuth, respondToNewPassword, forgotPassword, confirmForgotPassword };
}
