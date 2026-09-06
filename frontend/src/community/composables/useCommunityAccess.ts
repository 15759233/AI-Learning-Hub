import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { COMMUNITY_VERIFICATION_REQUIRED_EVENT } from '../../services/api/client'

export function useCommunityAccess() {
  const auth = useAuthStore()
  const canWrite = computed(() => auth.user?.communityWriteEnabled === true)
  const requireWrite = () => {
    if (canWrite.value) return true
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(COMMUNITY_VERIFICATION_REQUIRED_EVENT))
    return false
  }
  const message = computed(() => auth.user?.identityVerificationStatus === 'pending'
    ? '认证资料审核中，审核通过后即可参与社区互动。'
    : auth.user?.identityVerificationStatus === 'rejected'
      ? '认证未通过，请查看审核意见并重新提交。'
      : auth.user?.identityVerificationStatus === 'revoked'
        ? '认证已撤销，请重新提交资料。'
        : '完成校园实名认证后即可发帖、评论和参与互动。')
  return { canWrite, requireWrite, message }
}
