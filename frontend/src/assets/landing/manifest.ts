import heroArms from './illustrations/landing-hero-robot-arms.webp'
import ctaRobot from './illustrations/landing-cta-robot.webp'
import robotCar from './covers/landing-feature-robot-car.webp'
import robotVision from './covers/landing-feature-robot-vision.webp'
import aiWorkspace from './covers/landing-feature-ai-workspace.webp'
import learningQuestion from './icons/icon-learning-question.svg'
import noteSharing from './icons/icon-note-sharing.svg'
import labProject from './icons/icon-lab-project.svg'
import challengeCompetition from './icons/icon-challenge-competition.svg'
import followCommunity from './icons/icon-follow-community.svg'
import growthAchievement from './icons/icon-growth-achievement.svg'

export const landingAssets = {
  heroArms, ctaRobot, robotCar, robotVision, aiWorkspace,
  learningQuestion, noteSharing, labProject, challengeCompetition, followCommunity, growthAchievement,
} as const

export type LandingAssetKey = keyof typeof landingAssets
export const landingAsset = (key: string, fallback: LandingAssetKey) =>
  Object.hasOwn(landingAssets, key) ? landingAssets[key as LandingAssetKey] : landingAssets[fallback]
