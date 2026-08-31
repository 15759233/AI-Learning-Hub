export interface AuthUser {
  revision?: number
  profileRevision?: number
  sessionVersion?: number
  grade?: string | null
  schoolId?: string | null
  departmentId?: string | null
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  school: string | null
  major: string | null
  onboardingCompleted: boolean
  emailVerificationRequired: boolean
  roles: string[]
  permissions: string[]
}
export interface AuthSessionDto { user: AuthUser; accessToken: string; expiresIn: number }
export interface RegisterInput {
  displayName: string; email: string; password: string; agreementVersion: string; inviteCode?: string
}
export interface RegistrationSettingsDto {
  revision?: number
  expectedRevision?: number
  mode: 'open' | 'invite' | 'closed'
  emailVerification: boolean
  agreementVersion: string
  passwordMinLength: number
  schoolRequired: boolean
}
export interface RegistrationConfigDto extends RegistrationSettingsDto {
  mailAvailable: boolean
  inviteAvailable: boolean
}
export interface PasswordForgotInput { email: string }
export interface PasswordResetInput { token: string; password: string }
export interface OnboardingInput { schoolId?: string; departmentId?: string; major: string; grade: string; headline: string; themeIds: string[]; expectedRevision?: number; expectedProfileRevision?: number }
export interface UsernameInput { username: string }
export interface AdminUserDto {
  id: string; username: string; displayName: string; email: string; status: string
  registrationSource: string; school: { id: string; name: string } | null
  major: string | null; grade: string | null; lastLoginAt: string | null
  createdAt: string; onboardingCompleted: boolean; communityPostCount: number
  userType: string
  department?: { name: string } | null
}
export interface UserStatusInput { status: 'active' | 'disabled' | 'locked'; reason?: string; expectedRevision?: number }
