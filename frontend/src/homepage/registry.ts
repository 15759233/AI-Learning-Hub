import type { Component } from 'vue'
import { HOMEPAGE_MODULE_REGISTRY, type HomepageModuleKey } from '@ai-learning-hub/contracts'
import HeroBannerModule from './modules/HeroBannerModule.vue'
import AbilityMethodModule from './modules/AbilityMethodModule.vue'
import ThemeDirectionModule from './modules/ThemeDirectionModule.vue'
import FeaturedCourseModule from './modules/FeaturedCourseModule.vue'
import FeaturedLabModule from './modules/FeaturedLabModule.vue'
import MakerProjectModule from './modules/MakerProjectModule.vue'
import FrontierNewsModule from './modules/FrontierNewsModule.vue'
import ResourceToolsModule from './modules/ResourceToolsModule.vue'
import WeeklyChallengeModule from './modules/WeeklyChallengeModule.vue'
import GrowthSummaryModule from './modules/GrowthSummaryModule.vue'
import StudentActivityModule from './modules/StudentActivityModule.vue'
import BottomActionModule from './modules/BottomActionModule.vue'

const components: Record<HomepageModuleKey, Component> = {
  hero_banner: HeroBannerModule,
  ability_method: AbilityMethodModule,
  theme_direction: ThemeDirectionModule,
  weekly_featured: FeaturedCourseModule,
  featured_labs: FeaturedLabModule,
  maker_projects: MakerProjectModule,
  frontier_news: FrontierNewsModule,
  resource_tools: ResourceToolsModule,
  weekly_challenge: WeeklyChallengeModule,
  growth_summary: GrowthSummaryModule,
  student_activity: StudentActivityModule,
  bottom_action: BottomActionModule,
}

export const homepageRegistry = Object.fromEntries(
  (Object.keys(HOMEPAGE_MODULE_REGISTRY) as HomepageModuleKey[]).map((key) => [key, components[key]]),
) as Record<HomepageModuleKey, Component>
