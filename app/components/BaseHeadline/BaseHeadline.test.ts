// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { expect, it } from 'vitest'
import BaseHeadline from './BaseHeadline.vue'

it('should render correct headline tag', async () => {
  const component = await mountSuspended(BaseHeadline, {
    props: {
      element: 'h1',
      size: 'lg',
      text: 'Test Headline',
    },
  })
  const header = component.find('h1')
  expect(header.exists()).toBe(true)
  expect(header.text()).toBe('Test Headline')
})
