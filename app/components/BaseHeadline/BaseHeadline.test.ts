// @vitest-environment nuxt
import { expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BaseHeadline from '../../../components/BaseHeadline/BaseHeadline.vue'

it('should render correct headline tag', async () => {
  const component = await mountSuspended(BaseHeadline, {
    props: {
      element: 'h1',
      size: 'lg',
      text: 'Test Headline',
    },
  })
  const header = component.find('h1')
  expect(header).toBeDefined()
})
